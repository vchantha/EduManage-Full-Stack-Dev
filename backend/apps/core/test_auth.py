import copy
import json
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from .auth_policy import AUTH_DEFAULTS, SchoolPasswordValidator
from .models import AccountSecurity, LoginThrottle, SchoolSession


@override_settings(EDUMANAGE_AUTH_REQUIRED=True)
class AuthTests(TestCase):
    def test_existing_django_administrator_session_is_tracked(self):
        self.client.force_login(self.user)
        self.assertEqual(self.client.get("/api/v1/settings/").status_code, 200)
        self.assertEqual(SchoolSession.objects.filter(user=self.user).count(), 1)

    def setUp(self):
        self.password = "Test-only_Strong42!"
        self.user = get_user_model().objects.create_user(
            username="school-admin",
            email="admin@example.test",
            password=self.password,
            is_staff=True,
        )

    def signin(
        self, client=None, identifier="school-admin", password=None, remember=False, **headers
    ):
        return (client or self.client).post(
            "/api/v1/auth/login/",
            data=json.dumps(
                {
                    "identifier": identifier,
                    "password": password or self.password,
                    "remember": remember,
                }
            ),
            content_type="application/json",
            **headers,
        )

    def policy(self, policy=None, revision=0):
        return self.client.put(
            "/api/v1/auth/policy/",
            data=json.dumps(
                {"policy": policy or copy.deepcopy(AUTH_DEFAULTS), "revision": revision}
            ),
            content_type="application/json",
        )

    def test_login_csrf_cookie_rotation_and_email_login(self):
        client = Client(enforce_csrf_checks=True)
        token = client.get("/api/v1/auth/session/").json()["csrfToken"]
        self.assertEqual(self.signin(client).status_code, 403)
        response = self.signin(client, identifier="ADMIN@example.test", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(response.json()["csrfToken"], token)
        self.assertTrue(response.cookies["sessionid"]["httponly"])
        self.assertEqual(response.cookies["sessionid"]["samesite"], "Lax")
        self.assertTrue(client.get("/api/v1/auth/session/").json()["authenticated"])
        self.assertEqual(SchoolSession.objects.count(), 1)
        self.assertEqual(
            client.post(
                "/api/v1/auth/logout/", data="{}", content_type="application/json"
            ).status_code,
            403,
        )
        self.assertEqual(
            client.post(
                "/api/v1/auth/logout/",
                data="{}",
                content_type="application/json",
                HTTP_X_CSRFTOKEN=response.json()["csrfToken"],
            ).status_code,
            200,
        )

    def test_all_school_apis_require_administrator_session(self):
        for path in [
            "workspace",
            "dashboard",
            "planning",
            "examinations",
            "library",
            "finance",
            "attendance",
            "settings",
            "auth/policy",
            "auth/sessions",
        ]:
            self.assertEqual(self.client.get(f"/api/v1/{path}/").status_code, 401)
        self.assertEqual(self.client.get("/api/v1/health/").status_code, 200)
        normal = get_user_model().objects.create_user(username="normal", password=self.password)
        self.client.force_login(normal)
        self.assertEqual(self.client.get("/api/v1/finance/").status_code, 403)

    def test_lockout_uses_username_email_and_database_counters(self):
        for i in range(5):
            response = self.signin(
                identifier="admin@example.test" if i % 2 else "school-admin", password="wrong"
            )
            self.assertEqual(response.status_code, 401)
        self.assertEqual(self.signin().status_code, 429)
        LoginThrottle.objects.update(locked_until=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.signin().status_code, 200)

    def test_remember_me_and_logout_invalidates_session(self):
        self.assertEqual(self.signin(remember=True).status_code, 200)
        self.assertEqual(self.client.session.get_expiry_age(), 14 * 86400)
        response = self.client.post(
            "/api/v1/auth/logout/", data="{}", content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["redirect"], "Logged Out Page")
        self.assertFalse(self.client.get("/api/v1/auth/session/").json()["authenticated"])
        self.assertEqual(self.client.get("/api/v1/settings/").status_code, 401)
        self.assertEqual(SchoolSession.objects.count(), 0)

    def test_idle_timeout_and_background_polling(self):
        self.signin()
        before = timezone.now() - timedelta(minutes=20)
        SchoolSession.objects.update(last_seen=before)
        self.client.get("/api/v1/auth/session/")
        self.assertEqual(SchoolSession.objects.get().last_seen, before)
        self.client.get("/api/v1/auth/session/", HTTP_X_SCHOOL_ACTIVITY="1")
        self.assertGreater(SchoolSession.objects.get().last_seen, before)
        SchoolSession.objects.update(last_seen=timezone.now() - timedelta(minutes=31))
        self.assertFalse(self.client.get("/api/v1/auth/session/").json()["authenticated"])

    def test_policy_validation_and_stale_writes(self):
        self.signin()
        policy = copy.deepcopy(AUTH_DEFAULTS)
        policy["googleLogin"] = True
        self.assertEqual(self.policy(policy).status_code, 400)
        policy = copy.deepcopy(AUTH_DEFAULTS)
        policy["passwordLogin"] = False
        self.assertEqual(self.policy(policy).status_code, 400)
        policy = copy.deepcopy(AUTH_DEFAULTS)
        policy["maxAttempts"] = 2
        self.assertEqual(self.policy(policy).status_code, 400)
        policy["maxAttempts"] = 3
        self.assertEqual(self.policy(policy).status_code, 200)
        self.assertEqual(self.policy().status_code, 409)

    def test_revoke_own_session_and_reject_other_users_sessions(self):
        self.signin()
        second = Client()
        self.signin(second)
        sessions = self.client.get("/api/v1/auth/sessions/").json()["sessions"]
        self.assertEqual(len(sessions), 2)
        target = next(s for s in sessions if not s["current"])
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/sessions/",
                data=json.dumps({"id": target["id"]}),
                content_type="application/json",
            ).status_code,
            200,
        )
        self.assertFalse(second.get("/api/v1/auth/session/").json()["authenticated"])
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/sessions/",
                data=json.dumps({"id": 999999}),
                content_type="application/json",
            ).status_code,
            400,
        )

    def test_logout_all_and_password_expiry(self):
        self.signin()
        second = Client()
        self.signin(second)
        policy = copy.deepcopy(AUTH_DEFAULTS)
        policy["endAllSessions"] = True
        self.assertEqual(self.policy(policy).status_code, 200)
        self.client.post("/api/v1/auth/logout/", data="{}", content_type="application/json")
        self.assertFalse(second.get("/api/v1/auth/session/").json()["authenticated"])
        self.signin()
        AccountSecurity.objects.update(password_changed_at=timezone.now() - timedelta(days=91))
        self.assertFalse(self.client.get("/api/v1/auth/session/").json()["authenticated"])
        self.assertEqual(self.signin().status_code, 403)

    def test_password_validator_and_no_plaintext_storage(self):
        with self.assertRaises(ValidationError):
            SchoolPasswordValidator().validate("weak")
        SchoolPasswordValidator().validate(self.password)
        self.signin()
        state = AccountSecurity.objects.get(user=self.user)
        self.assertNotEqual(state.password_signature, self.password)
        self.assertNotIn(self.password, json.dumps(dict(self.client.session)))
