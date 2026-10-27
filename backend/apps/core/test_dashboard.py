from django.test import override_settings
import json

from django.test import Client, TestCase


@override_settings(EDUMANAGE_AUTH_REQUIRED=False)
class DashboardTests(TestCase):
    endpoint = "/api/v1/dashboard/"

    def data(self):
        return {
            "students": [
                {
                    "id": "STU00123",
                    "name": "Sophea Chan",
                    "className": "Grade 10A",
                    "status": "Active",
                    "email": "",
                    "year": "2025 - 2026",
                }
            ],
            "teachers": [],
            "classes": [],
            "attendance": [],
            "events": [],
        }

    def test_dashboard_records_persist(self):
        client = Client(enforce_csrf_checks=True)
        token = client.get(self.endpoint).json()["csrfToken"]
        response = client.put(
            self.endpoint,
            data=json.dumps({"data": self.data()}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Client().get(self.endpoint).json()["data"], self.data())

    def test_dashboard_write_requires_csrf(self):
        response = Client(enforce_csrf_checks=True).put(
            self.endpoint, data=json.dumps({"data": self.data()}), content_type="application/json"
        )
        self.assertEqual(response.status_code, 403)

    def test_invalid_attendance_does_not_overwrite_dashboard(self):
        self.client.put(
            self.endpoint, data=json.dumps({"data": self.data()}), content_type="application/json"
        )
        invalid = self.data()
        invalid["attendance"] = [
            {
                "id": "a1",
                "studentId": "missing",
                "date": "2026-10-20",
                "status": "Present",
                "year": "2025 - 2026",
            }
        ]
        response = self.client.put(
            self.endpoint, data=json.dumps({"data": invalid}), content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client.get(self.endpoint).json()["data"], self.data())
