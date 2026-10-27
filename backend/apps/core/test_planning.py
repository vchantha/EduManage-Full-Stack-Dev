from django.test import override_settings
import json

from django.test import Client, TestCase


@override_settings(EDUMANAGE_AUTH_REQUIRED=False)
class PlanningTests(TestCase):
    endpoint = "/api/v1/planning/"

    def sample(self):
        return {
            "years": [
                {
                    "id": "y1",
                    "name": "2025 - 2026",
                    "start": "2025-08-01",
                    "end": "2026-07-31",
                    "status": "Active",
                    "students": 7842,
                    "description": "Sample school year",
                }
            ],
            "terms": [],
            "subjects": [],
            "topics": [],
            "events": [],
            "materials": [],
        }

    def test_round_trip_requires_and_accepts_csrf(self):
        client = Client(enforce_csrf_checks=True)
        self.assertEqual(
            client.put(
                self.endpoint,
                data=json.dumps({"data": self.sample()}),
                content_type="application/json",
            ).status_code,
            403,
        )
        token = client.get(self.endpoint).json()["csrfToken"]
        self.assertEqual(
            client.put(
                self.endpoint,
                data=json.dumps({"data": self.sample()}),
                content_type="application/json",
                HTTP_X_CSRFTOKEN=token,
            ).status_code,
            200,
        )
        self.assertEqual(Client().get(self.endpoint).json()["data"], self.sample())

    def test_invalid_date_does_not_replace_data(self):
        self.client.put(
            self.endpoint, data=json.dumps({"data": self.sample()}), content_type="application/json"
        )
        invalid = self.sample()
        invalid["years"][0]["end"] = "2024-01-01"
        response = self.client.put(
            self.endpoint, data=json.dumps({"data": invalid}), content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client.get(self.endpoint).json()["data"], self.sample())

    def test_multiple_active_years_are_rejected(self):
        invalid = self.sample()
        invalid["years"].append({**invalid["years"][0], "id": "y2", "name": "2026 - 2027"})
        self.assertEqual(
            self.client.put(
                self.endpoint, data=json.dumps({"data": invalid}), content_type="application/json"
            ).status_code,
            400,
        )

    def test_calendar_event_requires_an_existing_year(self):
        invalid = self.sample()
        invalid["events"] = [
            {
                "id": "e1",
                "yearId": "missing",
                "title": "Exam",
                "date": "2025-10-20",
                "endDate": "2025-10-20",
                "time": "09:00",
                "type": "Examination",
                "description": "Exam",
            }
        ]
        self.assertEqual(
            self.client.put(
                self.endpoint, data=json.dumps({"data": invalid}), content_type="application/json"
            ).status_code,
            400,
        )
