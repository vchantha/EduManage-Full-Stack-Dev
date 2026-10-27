"""Server-side OIDC. Provider identities are explicitly mapped to existing staff."""

import json
import time
from urllib.parse import urlsplit
from uuid import UUID

from authlib.integrations.django_client import OAuth
from authlib.integrations.base_client.errors import OAuthError
from joserfc.errors import JoseError
from django.conf import settings
from django.contrib.auth import get_user_model, login
from django.http import HttpResponseRedirect, JsonResponse
from django.views.decorators.http import require_http_methods
from requests.exceptions import RequestException

from .auth_policy import auth_policy
from .models import SchoolSession


def configuration(provider):
    if provider not in {"google", "microsoft"}:
        return None
    prefix = provider.upper()
    values = settings.EDUMANAGE_SSO
    origin = values.get("PUBLIC_ORIGIN", "").rstrip("/")
    parsed = urlsplit(origin)
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.netloc
        or parsed.path
        or parsed.query
        or parsed.fragment
        or parsed.username
        or parsed.password
        or (parsed.scheme == "http" and parsed.hostname not in {"localhost", "127.0.0.1"})
    ):
        return None
    client_id = values.get(f"{prefix}_CLIENT_ID", "")
    secret = values.get(f"{prefix}_CLIENT_SECRET", "")
    if not client_id or not secret:
        return None
    issuer = "https://accounts.google.com"
    if provider == "microsoft":
        try:
            tenant = str(UUID(values.get("MICROSOFT_TENANT_ID", "")))
        except (ValueError, TypeError, AttributeError):
            return None
        issuer = f"https://login.microsoftonline.com/{tenant}/v2.0"
    try:
        identities = json.loads(values.get(f"{prefix}_SUBJECTS") or "{}")
    except (ValueError, TypeError):
        return None
    if not isinstance(identities, dict) or not all(
        isinstance(sub, str) and sub and isinstance(username, str) and username
        for sub, username in identities.items()
    ):
        return None
    return {
        "client_id": client_id,
        "client_secret": secret,
        "issuer": issuer,
        "subjects": identities,
        "origin": origin,
        "redirect_uri": f"{origin}/api/auth/sso/{provider}/callback",
    }


def provider_status():
    policy = auth_policy()
    return {
        name: {"configured": bool(configuration(name)), "enabled": policy[f"{name}Login"]}
        for name in ("google", "microsoft")
    }


def oidc_client(provider, config):
    registry = OAuth()
    return registry.register(
        name=provider,
        client_id=config["client_id"],
        client_secret=config["client_secret"],
        server_metadata_url=f"{config['issuer']}/.well-known/openid-configuration",
        client_kwargs={
            "scope": "openid profile email",
            "code_challenge_method": "S256",
            "token_endpoint_auth_method": "client_secret_post",
            "timeout": 15,
        },
    )


@require_http_methods(["POST"])
def sso_start(request, provider):
    if len(request.body) > 8192:
        return JsonResponse({"error": "Sign-in request is too large."}, status=413)
    config = configuration(provider)
    if not config or not auth_policy()[f"{provider}Login"]:
        return JsonResponse(
            {"error": "This sign-in provider is not enabled. Contact your school administrator."},
            status=503,
        )
    try:
        body = json.loads(request.body)
        remember = body.get("remember", False)
        if type(remember) is not bool:
            raise ValueError
    except (ValueError, TypeError, AttributeError):
        return JsonResponse({"error": "Invalid sign-in request."}, status=400)
    request.session["sso_attempt"] = {
        "provider": provider,
        "created": time.time(),
        "remember": remember,
    }
    try:
        response = oidc_client(provider, config).authorize_redirect(
            request, config["redirect_uri"], prompt="select_account"
        )
        return JsonResponse({"url": response["Location"]})
    except (OAuthError, JoseError, RequestException, ValueError, KeyError):
        request.session.pop("sso_attempt", None)
        return JsonResponse(
            {"error": "Could not reach the sign-in provider. Try again later."}, status=502
        )


@require_http_methods(["GET"])
def sso_callback(request, provider):
    config = configuration(provider)
    # The return address is fixed configuration, never a request-controlled next URL.
    origin = config["origin"] if config else "/"
    attempt = request.session.pop("sso_attempt", None)
    error = "Sign-in could not be verified. Please try again."
    if (
        config
        and auth_policy()[f"{provider}Login"]
        and attempt
        and attempt.get("provider") == provider
        and 0 <= time.time() - attempt.get("created", 0) <= 300
    ):
        try:
            token = oidc_client(provider, config).authorize_access_token(
                request,
                claims_options={"iss": {"essential": True, "value": config["issuer"]}},
            )
            # Authlib verifies signature, audience, expiry, issuer, nonce and state.
            claims = token.get("userinfo", {})
            username = config["subjects"].get(claims.get("sub"))
            user = (
                get_user_model()
                .objects.filter(username=username, is_staff=True, is_active=True)
                .first()
                if username
                else None
            )
            if user:
                old_key = request.session.session_key
                login(request, user, backend="django.contrib.auth.backends.ModelBackend")
                if old_key:
                    SchoolSession.objects.filter(session_key=old_key).delete()
                request.session["auth_method"] = provider
                policy = auth_policy()
                request.session.set_expiry(
                    14 * 86400 if attempt["remember"] and policy["rememberMe"] else 0
                )
                request.session.save()
                SchoolSession.objects.update_or_create(
                    session_key=request.session.session_key, defaults={"user": user}
                )
                return HttpResponseRedirect(config["origin"] + "/")
            error = "This provider account is not linked to an active school administrator."
            if isinstance(claims.get("sub"), str):
                # A verified public account identifier, never an access or ID token.
                request.session["sso_link_hint"] = {"provider": provider, "subject": claims["sub"]}
        except (OAuthError, JoseError, RequestException, ValueError, KeyError, TypeError):
            pass
    request.session["sso_error"] = error
    return HttpResponseRedirect(origin.rstrip("/") + "/")
