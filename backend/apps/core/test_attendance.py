import copy
import json

from django.test import Client, TestCase

from .attendance_views import initial_attendance


class AttendanceTests(TestCase):
    endpoint = "/api/v1/attendance/"

    def sample(self):
        session = copy.deepcopy(initial_attendance()["sessions"][5])
        return {k: v for k, v in session.items() if k not in {"id", "updatedAt"}}

    def put(self, session=None, revision=0, client=None, **headers):
        return (client or self.client).put(
            self.endpoint,
            data=json.dumps({"session": session or self.sample(), "revision": revision}),
            content_type="application/json",
            **headers,
        )

    def test_csrf_and_persistence_without_duplicate_sessions(self):
        client = Client(enforce_csrf_checks=True)
        payload = client.get(self.endpoint).json()
        self.assertEqual(self.put(client=client).status_code, 403)
        session = self.sample()
        session["marks"][6] = {
            "studentId": session["marks"][6]["studentId"],
            "status": "Late",
            "remarks": "Arrived at 08:15",
        }
        response = self.put(session, client=client, HTTP_X_CSRFTOKEN=payload["csrfToken"])
        self.assertEqual(response.status_code, 200)
        saved = client.get(self.endpoint).json()
        self.assertEqual(saved["revision"], 1)
        self.assertEqual(len(saved["data"]["sessions"]), len(payload["data"]["sessions"]))
        result = next(s for s in saved["data"]["sessions"] if s["id"] == "reference-0-5")
        self.assertEqual(result["marks"][6]["status"], "Late")

    def test_duplicate_missing_and_wrong_class_students_rejected(self):
        original = self.sample()
        for marks in [
            original["marks"][:-1],
            original["marks"] + [original["marks"][0]],
            [
                {**m, "studentId": "unknown"} if i == 0 else m
                for i, m in enumerate(original["marks"])
            ],
            [original["marks"][0] if i == 1 else m for i, m in enumerate(original["marks"])],
        ]:
            with self.subTest(size=len(marks)):
                self.assertEqual(self.put({**original, "marks": marks}).status_code, 400)
        self.assertEqual(self.client.get(self.endpoint).json()["revision"], 0)

    def test_dates_scope_subject_and_status_validation(self):
        for key, value in [
            ("date", "2026-02-30"),
            ("date", "2999-01-01"),
            ("date", "20261003"),
            ("year", "2026 - 2027"),
            ("term", "Term 2"),
            ("subject", "Unknown"),
            ("teacher", " "),
        ]:
            with self.subTest(key=key):
                self.assertEqual(self.put({**self.sample(), key: value}).status_code, 400)
        session = self.sample()
        session["marks"][0]["status"] = "Holiday"
        self.assertEqual(self.put(session).status_code, 400)
        session["marks"][0]["status"] = "Present"
        session["marks"][0]["remarks"] = "x" * 501
        self.assertEqual(self.put(session).status_code, 400)

    def test_stale_revision_cannot_overwrite_saved_marks(self):
        session = self.sample()
        session["marks"][0]["status"] = "Absent"
        self.assertEqual(self.put(session).status_code, 200)
        self.assertEqual(self.put(revision=0).status_code, 409)
        saved = self.client.get(self.endpoint).json()
        self.assertEqual(saved["revision"], 1)
        self.assertEqual(saved["data"]["sessions"][5]["marks"][0]["status"], "Absent")

    def test_new_session_is_scoped_by_subject_and_date(self):
        session = self.sample()
        session["subject"] = "Science"
        response = self.put(session)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["data"]["sessions"]), 37)
        session["marks"][0]["remarks"] = "Updated session"
        response = self.put(session, revision=1)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["data"]["sessions"]), 37)

    def test_reference_counts_and_unmarked_students_reconcile(self):
        data = self.client.get(self.endpoint).json()["data"]
        marks = [m for s in data["sessions"] if s["date"] == "2026-10-03" for m in s["marks"]]
        self.assertEqual(len(data["students"]), 192)
        self.assertEqual(len(marks) + data["opening"]["total"], 1245)
        self.assertEqual(
            sum(m["status"] == "Present" for m in marks) + data["opening"]["present"], 1148
        )
        self.assertEqual(
            sum(m["status"] == "Absent" for m in marks) + data["opening"]["absent"], 68
        )
        self.assertEqual(sum(m["status"] == "Late" for m in marks) + data["opening"]["late"], 28)
        self.assertEqual(sum(m["status"] == "Not Marked" for m in marks), 1)
