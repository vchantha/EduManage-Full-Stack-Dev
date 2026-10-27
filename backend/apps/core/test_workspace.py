from django.test import override_settings
import json

from django.test import Client, TestCase


@override_settings(EDUMANAGE_AUTH_REQUIRED=False)
class WorkspaceTests(TestCase):
    endpoint = "/api/v1/workspace/"

    def test_empty_workspace_issues_csrf_token(self):
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["data"])
        self.assertTrue(response.json()["csrfToken"])

    def test_write_requires_csrf(self):
        client = Client(enforce_csrf_checks=True)
        response = client.put(
            self.endpoint, data=json.dumps({"data": {}}), content_type="application/json"
        )
        self.assertEqual(response.status_code, 403)

    def test_valid_workspace_persists_between_requests(self):
        client = Client(enforce_csrf_checks=True)
        token = client.get(self.endpoint).json()["csrfToken"]
        record = {
            "academicYear": "2025 - 2026",
            "term": "Term 1",
            "id": "test-1",
            "name": "Test Curriculum",
            "code": "TEST",
            "description": "Test record",
            "levels": "Grade 10",
            "subjects": 8,
            "version": "v1.0",
            "status": "Draft",
            "date": "2025-10-06",
            "teacher": "Sarah Kim",
            "room": "A101",
            "subject": "Mathematics",
            "className": "Grade 10A",
            "time": "08:00",
        }
        data = {"Curriculum": [record], "Subject Allocation": [], "Lesson Plans": []}
        response = client.put(
            self.endpoint,
            data=json.dumps({"data": data}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Client().get(self.endpoint).json()["data"], data)

    def test_invalid_payload_does_not_replace_saved_data(self):
        data = {"Curriculum": [], "Subject Allocation": [], "Lesson Plans": []}
        self.client.put(
            self.endpoint, data=json.dumps({"data": data}), content_type="application/json"
        )
        response = self.client.put(
            self.endpoint,
            data=json.dumps({"data": {"Curriculum": [{"name": "Incomplete record"}]}}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client.get(self.endpoint).json()["data"], data)
