import hashlib
import json
from datetime import timedelta

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.sessions.models import Session
from django.db import transaction
from django.db.models import Q
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from .auth_policy import AUTH_DEFAULTS, auth_policy, password_expired
from .models import AcademicWorkspace, LoginThrottle, SchoolSession
from .sso import configuration, provider_status

DUMMY_PASSWORD = make_password("not-a-real-account-password")


def identity(user):
    return {
        "id": user.pk,
        "username": user.get_username(),
        "name": user.get_full_name() or user.get_username(),
        "role": "School Administrator",
    }


@ensure_csrf_cookie
@require_http_methods(["GET"])
def auth_session(request):
    user = request.user
    return JsonResponse(
        {
            "authenticated": bool(user.is_authenticated and user.is_active and user.is_staff),
            "user": identity(user) if user.is_authenticated and user.is_staff else None,
            "policy": auth_policy(),
            "csrfToken": get_token(request),
            "setupRequired": not get_user_model()
            .objects.filter(is_active=True, is_staff=True)
            .exists(),
            "providers": provider_status(),
            "ssoError": request.session.pop("sso_error", ""),
            "ssoLinkHint": request.session.pop("sso_link_hint", None),
        }
    )


@ensure_csrf_cookie
@require_http_methods(["POST"])
def auth_login(request):
    if len(request.body) > 8192:
        return JsonResponse({"error": "Sign-in request is too large."}, status=413)
    try:
        body = json.loads(request.body)
        identifier, password = body["identifier"], body["password"]
        remember = body.get("remember", False)
        if (
            not isinstance(identifier, str)
            or not identifier.strip()
            or len(identifier) > 254
            or not isinstance(password, str)
            or not password
            or len(password) > 1024
            or not isinstance(remember, bool)
        ):
            raise ValueError("Enter your username or email and password.")
    except (ValueError, KeyError, TypeError):
        return JsonResponse({"error": "Enter your username or email and password."}, status=400)
    policy = auth_policy()
    users = list(
        get_user_model().objects.filter(
            Q(username__iexact=identifier.strip()) | Q(email__iexact=identifier.strip())
        )[:2]
    )
    candidate = users[0] if len(users) == 1 else None
    canonical = str(candidate.pk) if candidate else identifier.strip().casefold()
    keys = [
        hashlib.sha256(("account:" + canonical).encode()).hexdigest(),
        hashlib.sha256(("ip:" + request.META.get("REMOTE_ADDR", "local")).encode()).hexdigest(),
    ]
    now = timezone.now()
    with transaction.atomic():
        for key in sorted(keys):
            LoginThrottle.objects.get_or_create(key=key)
        counters = list(
            LoginThrottle.objects.select_for_update().filter(key__in=keys).order_by("key")
        )
        if any(c.locked_until and c.locked_until > now for c in counters):
            return JsonResponse(
                {
                    "error": "Sign-in is temporarily locked. Try again later or contact your administrator."
                },
                status=429,
            )
        user = (
            authenticate(request, username=candidate.get_username(), password=password)
            if candidate and policy["passwordLogin"]
            else None
        )
        if not candidate:
            check_password(password, DUMMY_PASSWORD)
        if not user or not user.is_active or not user.is_staff:
            for counter in counters:
                if (
                    counter.updated_at + timedelta(minutes=policy["lockMinutes"]) <= now
                    or counter.locked_until
                ):
                    counter.failures = 0
                counter.failures += 1
                counter.locked_until = (
                    now + timedelta(minutes=policy["lockMinutes"])
                    if counter.failures >= policy["maxAttempts"]
                    else None
                )
                counter.save()
            return JsonResponse(
                {
                    "error": "Unable to sign in. Check your credentials or contact your administrator."
                },
                status=401,
            )
        if password_expired(user, policy):
            return JsonResponse(
                {"error": "Your password has expired. Contact your administrator to update it."},
                status=403,
            )
        LoginThrottle.objects.filter(key__in=keys).delete()
        previous_key = request.session.session_key
        login(request, user)
        request.session["auth_method"] = "password"
        if previous_key:
            SchoolSession.objects.filter(session_key=previous_key).delete()
        request.session.set_expiry(14 * 86400 if remember and policy["rememberMe"] else 0)
        request.session.save()
        SchoolSession.objects.update_or_create(
            session_key=request.session.session_key, defaults={"user": user, "last_seen": now}
        )
    return JsonResponse(
        {
            "authenticated": True,
            "user": identity(user),
            "policy": policy,
            "csrfToken": get_token(request),
        }
    )


@require_http_methods(["POST"])
def auth_logout(request):
    policy = auth_policy()
    if request.user.is_authenticated:
        sessions = (
            SchoolSession.objects.filter(user=request.user)
            if policy["endAllSessions"]
            else SchoolSession.objects.filter(session_key=request.session.session_key)
        )
        keys = list(sessions.values_list("session_key", flat=True))
        Session.objects.filter(session_key__in=keys).delete()
        sessions.delete()
    logout(request)
    response = JsonResponse(
        {
            "redirect": policy["redirectAfterLogout"],
            "clearBrowserSession": policy["clearBrowserSession"],
        }
    )
    response.delete_cookie("sessionid", path="/", samesite="Lax")
    return response


@ensure_csrf_cookie
@require_http_methods(["GET", "PUT"])
def auth_settings(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"error": "Administrator sign-in required."}, status=403)
    if request.method == "GET":
        saved = AcademicWorkspace.objects.filter(pk="auth-policy").first()
        return JsonResponse(
            {
                "policy": auth_policy(),
                "revision": saved.data["revision"] if saved else 0,
                "providers": provider_status(),
                "csrfToken": get_token(request),
            }
        )
    if len(request.body) > 8192:
        return JsonResponse({"error": "Policy is too large."}, status=413)
    try:
        payload = json.loads(request.body)
        policy, revision = payload["policy"], payload["revision"]
        if (
            not isinstance(policy, dict)
            or set(policy) != set(AUTH_DEFAULTS)
            or type(revision) is not int
        ):
            raise ValueError("Invalid security settings.")
        for key, value in AUTH_DEFAULTS.items():
            if type(policy[key]) is not type(value):
                raise ValueError("Invalid security setting type.")
        if not policy["passwordLogin"]:
            raise ValueError("Keep password sign-in enabled for administrator recovery.")
        for provider in ("google", "microsoft"):
            if policy[f"{provider}Login"] and not configuration(provider):
                raise ValueError(
                    f"Configure {provider.title()} credentials and account links on the server first."
                )
        for key, options in {
            "maxAttempts": {3, 5, 10},
            "lockMinutes": {15, 30, 60},
            "passwordExpiryDays": {0, 30, 60, 90},
            "idleMinutes": {5, 15, 30, 60},
            "redirectAfterLogout": {"Login Page", "Logged Out Page"},
        }.items():
            if policy[key] not in options:
                raise ValueError(f"Invalid {key} option.")
        with transaction.atomic():
            saved, _ = AcademicWorkspace.objects.get_or_create(
                pk="auth-policy", defaults={"data": {"policy": AUTH_DEFAULTS, "revision": 0}}
            )
            saved = AcademicWorkspace.objects.select_for_update().get(pk=saved.pk)
            if saved.data["revision"] != revision:
                return JsonResponse(
                    {"error": "Security settings changed in another window. Reload before saving."},
                    status=409,
                )
            saved.data = {"policy": policy, "revision": revision + 1}
            saved.save(update_fields=["data", "updated_at"])
        return JsonResponse(saved.data)
    except (ValueError, TypeError, KeyError) as error:
        return JsonResponse({"error": str(error)}, status=400)


@require_http_methods(["GET", "POST"])
def auth_sessions(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"error": "Administrator sign-in required."}, status=403)
    if request.method == "POST":
        try:
            body = json.loads(request.body)
            selected = SchoolSession.objects.get(pk=body["id"], user=request.user)
        except (KeyError, ValueError, TypeError, SchoolSession.DoesNotExist):
            return JsonResponse({"error": "Select one of your active sessions."}, status=400)
        Session.objects.filter(session_key=selected.session_key).delete()
        selected.delete()
        return JsonResponse({"endedCurrent": selected.session_key == request.session.session_key})
    active_keys = Session.objects.filter(expire_date__gt=timezone.now()).values("session_key")
    policy = auth_policy()
    records = SchoolSession.objects.filter(user=request.user, session_key__in=active_keys)
    if policy["idleEnabled"]:
        records = records.filter(
            last_seen__gt=timezone.now() - timedelta(minutes=policy["idleMinutes"])
        )
    return JsonResponse(
        {
            "sessions": [
                {
                    "id": s.pk,
                    "created": s.created_at.isoformat(),
                    "lastSeen": s.last_seen.isoformat(),
                    "current": s.session_key == request.session.session_key,
                }
                for s in records.order_by("-last_seen")
            ]
        }
    )
