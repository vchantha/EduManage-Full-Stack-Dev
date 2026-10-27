import copy
import json
import time
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

from authlib.jose import JsonWebKey, jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from django.contrib.auth import get_user_model
from django.test import Client, TestCase, override_settings
from requests import Response

from .auth_policy import AUTH_DEFAULTS
from .models import AcademicWorkspace, SchoolSession
from .sso import configuration


SSO = {
    "PUBLIC_ORIGIN": "http://localhost:3000",
    "GOOGLE_CLIENT_ID": "google-test-client",
    "GOOGLE_CLIENT_SECRET": "test-secret-not-real",
    "GOOGLE_SUBJECTS": '{"google-subject":"admin"}',
    "MICROSOFT_CLIENT_ID": "microsoft-test-client",
    "MICROSOFT_CLIENT_SECRET": "test-secret-not-real",
    "MICROSOFT_TENANT_ID": "11111111-1111-1111-1111-111111111111",
    "MICROSOFT_SUBJECTS": '{"microsoft-subject":"admin"}',
}


@override_settings(EDUMANAGE_SSO=SSO, EDUMANAGE_AUTH_REQUIRED=True)
class SSOTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username="admin", password="Test_Strong42!", is_staff=True
        )
        cls.private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        cls.key = cls.private.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
        cls.public = JsonWebKey.import_key(
            cls.private.public_key().public_bytes(
                serialization.Encoding.PEM,
                serialization.PublicFormat.SubjectPublicKeyInfo,
            ),
            {"kid": "test-key"},
        ).as_dict()

    def setUp(self):
        self.policy = copy.deepcopy(AUTH_DEFAULTS)
        self.policy.update(googleLogin=True, microsoftLogin=True)
        AcademicWorkspace.objects.create(
            name="auth-policy", data={"policy": self.policy, "revision": 0}
        )
        self.nonce = ""
        self.claim_changes = {}
        self.provider = "google"
        self.token_calls = 0
        self.invalid_signature = False

    def provider_response(self, session, method, url, **kwargs):
        config = configuration(self.provider)
        issuer = config["issuer"]
        data = {}
        if url.endswith("/.well-known/openid-configuration"):
            data = {
                "issuer": issuer,
                "authorization_endpoint": issuer + "/authorize",
                "token_endpoint": issuer + "/token",
                "jwks_uri": issuer + "/keys",
                "id_token_signing_alg_values_supported": ["RS256"],
            }
        elif url == issuer + "/keys":
            data = {"keys": [self.public]}
        elif url == issuer + "/token":
            self.token_calls += 1
            form = kwargs.get("data", {})
            if isinstance(form, str):
                form = {k: v[0] for k, v in parse_qs(form).items()}
            self.assertTrue(form.get("code_verifier"))
            self.assertEqual(form.get("redirect_uri"), config["redirect_uri"])
            claims = {
                "iss": issuer,
                "aud": config["client_id"],
                "iat": int(time.time()),
                "exp": int(time.time()) + 300,
                "nonce": self.nonce,
                "sub": self.provider + "-subject",
            }
            claims.update(self.claim_changes)
            encoded = jwt.encode({"alg": "RS256", "kid": "test-key"}, claims, self.key)
            if self.invalid_signature:
                parts = encoded.split(b".")
                parts[2] = (b"A" if parts[2][:1] != b"A" else b"B") + parts[2][1:]
                encoded = b".".join(parts)
            data = {
                "access_token": "test-access-token",
                "token_type": "Bearer",
                "id_token": encoded.decode(),
            }
        else:
            self.fail(f"Unexpected provider endpoint: {url}")
        response = Response()
        response.status_code = 200
        response._content = json.dumps(data).encode()
        response.headers["Content-Type"] = "application/json"
        return response

    def start(self, client=None, **extra):
        client = client or self.client
        response = client.post(
            f"/api/v1/auth/sso/{self.provider}/start/",
            data=json.dumps({"remember": True}),
            content_type="application/json",
            **extra,
        )
        self.assertEqual(response.status_code, 200, response.content)
        params = parse_qs(urlsplit(response.json()["url"]).query)
        self.nonce = params["nonce"][0]
        self.assertEqual(params["code_challenge_method"], ["S256"])
        self.assertTrue(params["code_challenge"][0])
        return params["state"][0]

    def callback(self, state, client=None):
        return (client or self.client).get(
            f"/api/v1/auth/sso/{self.provider}/callback/", {"state": state, "code": "test-code"}
        )

    def test_both_providers_signed_token_login_and_logout(self):
        for provider in ("google", "microsoft"):
            with self.subTest(provider=provider):
                self.provider = provider
                client = Client(enforce_csrf_checks=True)
                csrf = client.get("/api/v1/auth/session/").json()["csrfToken"]
                self.assertEqual(
                    client.post(
                        f"/api/v1/auth/sso/{provider}/start/",
                        data="{}",
                        content_type="application/json",
                    ).status_code,
                    403,
                )
                with patch(
                    "requests.sessions.Session.request",
                    autospec=True,
                    side_effect=self.provider_response,
                ):
                    state = self.start(client, HTTP_X_CSRFTOKEN=csrf)
                    result = self.callback(state, client)
                self.assertEqual(result["Location"], "http://localhost:3000/")
                session = client.get("/api/v1/auth/session/").json()
                self.assertTrue(session["authenticated"])
                self.assertEqual(client.session["auth_method"], provider)
                self.assertEqual(client.session.get_expiry_age(), 14 * 86400)
                self.assertNotIn("test-access-token", json.dumps(dict(client.session)))
                self.assertEqual(
                    client.post(
                        "/api/v1/auth/logout/",
                        data="{}",
                        content_type="application/json",
                        HTTP_X_CSRFTOKEN=session["csrfToken"],
                    ).status_code,
                    200,
                )
                self.assertFalse(client.get("/api/v1/auth/session/").json()["authenticated"])
        self.assertFalse(SchoolSession.objects.exists())

    def test_invalid_claims_state_and_replay_are_rejected(self):
        cases = [
            {"nonce": "wrong"},
            {"iss": "https://attacker.test"},
            {"aud": "wrong"},
            {"exp": int(time.time()) - 600},
            {"sub": "unlinked-subject"},
        ]
        for changes in cases:
            with self.subTest(changes=changes):
                self.claim_changes = changes
                with patch(
                    "requests.sessions.Session.request",
                    autospec=True,
                    side_effect=self.provider_response,
                ):
                    state = self.start()
                    self.callback(state)
                self.assertFalse(self.client.get("/api/v1/auth/session/").json()["authenticated"])
        self.claim_changes = {}
        with patch(
            "requests.sessions.Session.request", autospec=True, side_effect=self.provider_response
        ):
            state = self.start()
            before = self.token_calls
            self.callback("wrong-state")
            self.assertEqual(self.token_calls, before)
            self.callback(state)
        self.assertFalse(self.client.get("/api/v1/auth/session/").json()["authenticated"])
        self.assertEqual(get_user_model().objects.count(), 1)

    def test_unlinked_subject_hint_and_staff_requirement(self):
        for staff, active in [(False, True), (True, False)]:
            get_user_model().objects.filter(pk=self.user.pk).update(
                is_staff=staff, is_active=active
            )
            with patch(
                "requests.sessions.Session.request",
                autospec=True,
                side_effect=self.provider_response,
            ):
                self.callback(self.start())
            result = self.client.get("/api/v1/auth/session/").json()
            self.assertFalse(result["authenticated"])
            self.assertEqual(
                result["ssoLinkHint"], {"provider": "google", "subject": "google-subject"}
            )
            self.assertIsNone(self.client.get("/api/v1/auth/session/").json()["ssoLinkHint"])

    def test_expired_attempt_and_provider_denial(self):
        with patch(
            "requests.sessions.Session.request", autospec=True, side_effect=self.provider_response
        ):
            state = self.start()
            session = self.client.session
            session["sso_attempt"]["created"] = time.time() - 301
            session.save()
            self.callback(state)
            self.assertEqual(self.token_calls, 0)
            state = self.start()
            self.client.get(
                "/api/v1/auth/sso/google/callback/", {"state": state, "error": "access_denied"}
            )
        self.assertFalse(self.client.get("/api/v1/auth/session/").json()["authenticated"])

    def test_configuration_and_policy_guards(self):
        self.client.force_login(self.user)
        result = self.client.get("/api/v1/auth/policy/").json()
        self.assertTrue(result["providers"]["google"]["configured"])
        self.assertNotIn(SSO["GOOGLE_CLIENT_SECRET"], json.dumps(result))
        for override in [
            {"PUBLIC_ORIGIN": "http://evil.test"},
            {"GOOGLE_CLIENT_SECRET": ""},
            {"GOOGLE_SUBJECTS": "invalid"},
        ]:
            with (
                self.subTest(override=override),
                override_settings(EDUMANAGE_SSO={**SSO, **override}),
            ):
                self.assertIsNone(configuration("google"))
                self.assertEqual(
                    self.client.post(
                        "/api/v1/auth/sso/google/start/", data="{}", content_type="application/json"
                    ).status_code,
                    503,
                )
        with override_settings(EDUMANAGE_SSO={**SSO, "MICROSOFT_TENANT_ID": "common"}):
            self.assertIsNone(configuration("microsoft"))

    def test_disabled_provider_is_rejected(self):
        self.policy["googleLogin"] = False
        AcademicWorkspace.objects.filter(name="auth-policy").update(
            data={"policy": self.policy, "revision": 0}
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/sso/google/start/", data="{}", content_type="application/json"
            ).status_code,
            503,
        )

    def test_invalid_signature_and_successful_callback_replay(self):
        with patch(
            "requests.sessions.Session.request", autospec=True, side_effect=self.provider_response
        ):
            self.invalid_signature = True
            self.callback(self.start())
            self.assertFalse(self.client.get("/api/v1/auth/session/").json()["authenticated"])
            self.invalid_signature = False
            state = self.start()
            self.callback(state)
            self.assertTrue(self.client.get("/api/v1/auth/session/").json()["authenticated"])
            self.client.post("/api/v1/auth/logout/", data="{}", content_type="application/json")
            before = self.token_calls
            self.callback(state)
            self.assertEqual(self.token_calls, before)
            self.assertFalse(self.client.get("/api/v1/auth/session/").json()["authenticated"])
