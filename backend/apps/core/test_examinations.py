from django.test import override_settings
import json

from django.test import Client, TestCase


@override_settings(EDUMANAGE_AUTH_REQUIRED=False)
class ExaminationTests(TestCase):
    endpoint = "/api/v1/examinations/"

    def sample(self):
        return {
            "exams": [
                {
                    "id": "exam1",
                    "name": "Unit Test",
                    "subjects": "Mathematics",
                    "className": "Grade 10",
                    "date": "2026-10-25",
                    "time": "08:00",
                    "year": "2026 - 2027",
                    "term": "Term 1",
                    "status": "Grading",
                    "students": 30,
                    "submissions": 1,
                    "average": 85,
                    "passRate": 100,
                }
            ],
            "results": [
                {
                    "id": "result1",
                    "examId": "exam1",
                    "studentId": "QA001",
                    "studentName": "Example Student",
                    "className": "Grade 10",
                    "subject": "Mathematics",
                    "score": 85,
                }
            ],
            "subjects": [{"id": "subject1", "name": "Mathematics", "code": "MAT", "passMark": 50}],
        }

    def put(self, data, client=None, **headers):
        return (client or self.client).put(
            self.endpoint,
            data=json.dumps({"data": data}),
            content_type="application/json",
            **headers,
        )

    def test_csrf_and_persistence(self):
        client = Client(enforce_csrf_checks=True)
        self.assertEqual(self.put(self.sample(), client).status_code, 403)
        token = client.get(self.endpoint).json()["csrfToken"]
        self.assertEqual(self.put(self.sample(), client, HTTP_X_CSRFTOKEN=token).status_code, 200)
        self.assertEqual(Client().get(self.endpoint).json()["data"], self.sample())

    def test_invalid_mark_preserves_existing_data(self):
        self.put(self.sample())
        data = self.sample()
        data["results"][0]["score"] = 101
        self.assertEqual(self.put(data).status_code, 400)
        self.assertEqual(self.client.get(self.endpoint).json()["data"], self.sample())

    def test_grade_requires_matching_exam_and_class(self):
        for key, value in [("examId", "missing"), ("className", "Grade 9")]:
            data = self.sample()
            data["results"][0][key] = value
            self.assertEqual(self.put(data).status_code, 400)

    def test_duplicate_grades_and_invalid_dates(self):
        data = self.sample()
        data["results"].append({**data["results"][0], "id": "result2"})
        self.assertEqual(self.put(data).status_code, 400)
        data = self.sample()
        data["exams"][0]["date"] = "2026-02-30"
        self.assertEqual(self.put(data).status_code, 400)
