from django.test import override_settings
import base64
import copy
import json

from django.test import Client, TestCase

from .settings_views import DEFAULTS
from .models import AcademicWorkspace


@override_settings(EDUMANAGE_AUTH_REQUIRED=False)
class SettingsTests(TestCase):
    endpoint = "/api/v1/settings/"

    def test_saved_academic_year_and_terms_are_available_to_settings(self):
        academic = {
            "years": [{"id": "Y", "name": "2026 - 2027"}],
            "terms": [{"id": "T", "yearId": "Y", "name": "Term 2"}],
        }
        AcademicWorkspace.objects.create(pk="planning", data=academic)
        self.assertEqual(self.client.get(self.endpoint).json()["academicData"], academic)

    def test_two_megabyte_logo_fits_encoded_request_limit(self):
        data = copy.deepcopy(DEFAULTS)
        raw = b"\x89PNG\r\n\x1a\n" + b"x" * (2 * 1024 * 1024 - 8)
        data["school"]["logo"] = "data:image/png;base64," + base64.b64encode(raw).decode()
        self.assertEqual(self.put(data).status_code, 200)
        data["school"]["logo"] = "data:image/png;base64," + base64.b64encode(raw + b"x").decode()
        self.assertEqual(self.put(data, revision=1).status_code, 400)

    def put(self, data=None, revision=0, client=None, action="save", **headers):
        return (client or self.client).put(
            self.endpoint,
            data=json.dumps(
                {"data": data or copy.deepcopy(DEFAULTS), "revision": revision, "action": action}
            ),
            content_type="application/json",
            **headers,
        )

    def test_csrf_persistence_and_system_information(self):
        client = Client(enforce_csrf_checks=True)
        initial = client.get(self.endpoint).json()
        self.assertEqual(initial["revision"], 0)
        self.assertIn("database", initial["systemInfo"])
        self.assertEqual(self.put(client=client).status_code, 403)
        data = copy.deepcopy(DEFAULTS)
        data["school"]["name"] = "Updated School"
        response = self.put(data, client=client, HTTP_X_CSRFTOKEN=initial["csrfToken"])
        self.assertEqual(response.status_code, 200)
        saved = client.get(self.endpoint).json()
        self.assertEqual(saved["data"]["school"]["name"], "Updated School")
        self.assertEqual(saved["revision"], 1)
        self.assertEqual(saved["logs"][0]["sections"], ["school"])

    def test_stale_revision_cannot_overwrite_saved_settings(self):
        self.assertEqual(self.put().status_code, 200)
        data = copy.deepcopy(DEFAULTS)
        data["school"]["name"] = "Stale Window"
        self.assertEqual(self.put(data, revision=0).status_code, 409)
        self.assertEqual(
            self.client.get(self.endpoint).json()["data"]["school"]["name"],
            DEFAULTS["school"]["name"],
        )

    def test_invalid_options_contacts_and_amounts_do_not_persist(self):
        cases = [
            ("school", "email", "invalid"),
            ("school", "website", "javascript:alert(1)"),
            ("school", "established", "9999"),
            ("school", "name", "  "),
            ("preferences", "timezone", "Unknown/Place"),
            ("preferences", "smsEnabled", "true"),
            ("preferences", "currency", "BAD"),
            ("grading", "passMark", "101"),
            ("grading", "classCapacity", "0"),
            ("grading", "studentPrefix", "bad prefix"),
        ]
        for section, key, value in cases:
            with self.subTest(key=key):
                data = copy.deepcopy(DEFAULTS)
                data[section][key] = value
                self.assertEqual(self.put(data).status_code, 400)
        self.assertEqual(self.client.get(self.endpoint).json()["revision"], 0)

    def test_rejects_unsafe_logo_and_duplicate_directory(self):
        data = copy.deepcopy(DEFAULTS)
        data["school"]["logo"] = "data:image/svg+xml;base64,PHN2Zz4="
        self.assertEqual(self.put(data).status_code, 400)
        data["school"]["logo"] = "data:image/png;base64,YmFk"
        self.assertEqual(self.put(data).status_code, 400)
        data["school"]["logo"] = ""
        data["directory"].append({**data["directory"][0], "id": "second"})
        self.assertEqual(self.put(data).status_code, 400)

    def test_export_metadata_and_logs_do_not_include_private_values(self):
        response = self.put(action="export")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIsNotNone(payload["lastExport"])
        self.assertEqual(payload["logs"][0]["action"], "export")
        self.assertNotIn("info@", json.dumps(payload["logs"]))
        self.assertEqual(self.put(revision=1, action="delete").status_code, 400)

    def test_directory_edits_and_reset_preserve_school_records(self):
        data = copy.deepcopy(DEFAULTS)
        data["directory"][0]["status"] = "Inactive"
        data["school"]["name"] = "School Record"
        self.assertEqual(self.put(data).status_code, 200)
        data["preferences"]["emailEnabled"] = False
        self.assertEqual(self.put(data, revision=1, action="reset").status_code, 200)
        saved = self.client.get(self.endpoint).json()["data"]
        self.assertEqual(saved["school"]["name"], "School Record")
        self.assertEqual(saved["directory"][0]["status"], "Inactive")
