import copy
import hashlib
from datetime import timedelta

from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import logout
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.utils import timezone

from .models import AcademicWorkspace, AccountSecurity, SchoolSession

AUTH_DEFAULTS = {
    "passwordLogin": True,
    "googleLogin": False,
    "microsoftLogin": False,
    "rememberMe": True,
    "maxAttempts": 5,
    "lockMinutes": 30,
    "passwordExpiryDays": 90,
    "strongPassword": True,
    "logoutConfirmation": True,
    "redirectAfterLogout": "Logged Out Page",
    "clearBrowserSession": True,
    "endAllSessions": False,
    "idleEnabled": True,
    "idleMinutes": 30,
    "showLogoutHeader": True,
}


def auth_policy():
    saved = AcademicWorkspace.objects.filter(pk="auth-policy").first()
    return copy.deepcopy(saved.data["policy"] if saved else AUTH_DEFAULTS)


def password_state(user):
    signature = hashlib.sha256(user.password.encode()).hexdigest()
    state, _ = AccountSecurity.objects.get_or_create(
        user=user, defaults={"password_signature": signature}
    )
    if state.password_signature != signature:
        state.password_signature = signature
        state.password_changed_at = timezone.now()
        state.save(update_fields=["password_signature", "password_changed_at"])
    return state


def password_expired(user, policy):
    days = policy["passwordExpiryDays"]
    return bool(
        days and timezone.now() >= password_state(user).password_changed_at + timedelta(days=days)
    )


class SchoolPasswordValidator:
    def validate(self, password, user=None):
        strong = auth_policy()["strongPassword"]
        if len(password) < (12 if strong else 8):
            raise ValidationError(
                "Use at least 12 characters." if strong else "Use at least 8 characters."
            )
        if strong and not (
            any(c.islower() for c in password)
            and any(c.isupper() for c in password)
            and any(c.isdigit() for c in password)
            and any(not c.isalnum() for c in password)
        ):
            raise ValidationError("Use uppercase and lowercase letters, a number, and a symbol.")

    def get_help_text(self):
        return "Use a strong password with at least 12 characters, mixed-case letters, a number, and a symbol."


class SchoolAccessMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path.startswith("/api/v1/") or request.path == "/api/v1/health/":
            return self.get_response(request)
        from django.conf import settings

        public = request.path in {
            "/api/v1/auth/session/",
            "/api/v1/auth/login/",
            "/api/v1/auth/logout/",
        }
        public = public or request.path in {
            f"/api/v1/auth/sso/{provider}/{action}/"
            for provider in ("google", "microsoft")
            for action in ("start", "callback")
        }
        if request.user.is_authenticated:
            policy = auth_policy()
            tracked = SchoolSession.objects.filter(session_key=request.session.session_key).first()
            if not tracked and request.user.is_staff and request.session.session_key:
                tracked, _ = SchoolSession.objects.get_or_create(
                    user=request.user, session_key=request.session.session_key
                )
            expired = (
                tracked
                and policy["idleEnabled"]
                and tracked.last_seen + timedelta(minutes=policy["idleMinutes"]) <= timezone.now()
            )
            uses_password = request.session.get("auth_method", "password") == "password"
            if expired or (uses_password and password_expired(request.user, policy)):
                if tracked:
                    tracked.delete()
                logout(request)
                request.user = AnonymousUser()
            elif tracked:
                # Background status polling must not keep an idle browser alive.
                if (
                    request.headers.get("X-School-Activity") == "1"
                    or request.path != "/api/v1/auth/session/"
                ):
                    tracked.last_seen = timezone.now()
                    tracked.save(update_fields=["last_seen"])
        if settings.EDUMANAGE_AUTH_REQUIRED and not public:
            if not request.user.is_authenticated:
                return JsonResponse({"error": "Sign in to continue."}, status=401)
            if not request.user.is_active or not request.user.is_staff:
                return JsonResponse(
                    {"error": "A school administrator account is required."}, status=403
                )
        response = self.get_response(request)
        response["Cache-Control"] = "no-store"
        return response
