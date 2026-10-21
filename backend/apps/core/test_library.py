import json

from django.test import Client, TestCase


class LibraryTests(TestCase):
    endpoint = "/api/v1/library/"

    def sample(self):
        return {
            "books": [
                {
                    "id": "book1",
                    "title": "Mathematics",
                    "author": "School",
                    "isbn": "9780000000001",
                    "category": "Textbooks",
                    "copies": 1,
                    "historicalBorrowed": 0,
                    "openingLoans": 0,
                    "color": "blue",
                }
            ],
            "borrowers": [
                {
                    "id": "borrower1",
                    "name": "Example Student",
                    "type": "Student",
                    "className": "Grade 10",
                    "email": "",
                }
            ],
            "loans": [
                {
                    "id": "loan1",
                    "bookId": "book1",
                    "borrowerId": "borrower1",
                    "borrowedDate": "2026-10-21",
                    "dueDate": "2026-11-04",
                    "returnedDate": "",
                    "year": "2026 - 2027",
                }
            ],
            "reminders": [],
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

    def test_stock_cannot_be_over_issued(self):
        self.put(self.sample())
        data = self.sample()
        data["books"][0]["copies"] = 0
        self.assertEqual(self.put(data).status_code, 400)
        self.assertEqual(self.client.get(self.endpoint).json()["data"], self.sample())

    def test_book_and_borrower_references(self):
        for key in ["bookId", "borrowerId"]:
            data = self.sample()
            data["loans"][0][key] = "missing"
            self.assertEqual(self.put(data).status_code, 400)

    def test_return_releases_stock_and_requires_valid_dates(self):
        data = self.sample()
        data["loans"][0]["returnedDate"] = "2026-10-22"
        data["loans"].append({**data["loans"][0], "id": "loan2", "returnedDate": ""})
        self.assertEqual(self.put(data).status_code, 200)
        data["loans"][0]["returnedDate"] = "2026-10-20"
        self.assertEqual(self.put(data).status_code, 400)

    def test_duplicate_loans_and_orphan_reminders(self):
        data = self.sample()
        data["loans"].append({**data["loans"][0], "id": "loan2"})
        self.assertEqual(self.put(data).status_code, 400)
        data = self.sample()
        data["reminders"] = [
            {
                "id": "reminder1",
                "loanId": "missing",
                "date": "2026-10-21",
                "note": "Example reminder",
            }
        ]
        self.assertEqual(self.put(data).status_code, 400)
