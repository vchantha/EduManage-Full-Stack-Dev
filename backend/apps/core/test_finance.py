import json

from django.test import Client, TestCase


class FinanceTests(TestCase):
    endpoint = "/api/v1/finance/"

    def sample(self):
        return {
            "students": [{"id": "S1", "name": "Example Student", "className": "Grade 10A"}],
            "feeTypes": [
                {
                    "id": "F1",
                    "name": "Tuition Fee",
                    "color": "green",
                    "openingExpectedCents": 0,
                    "openingCollectedCents": 0,
                    "openingOverdueCents": 0,
                }
            ],
            "invoices": [
                {
                    "id": "I1",
                    "number": "INV-001",
                    "studentId": "S1",
                    "feeTypeId": "F1",
                    "amountCents": 120000,
                    "issueDate": "2026-10-01",
                    "dueDate": "2026-10-30",
                    "year": "2026 - 2027",
                    "term": "Term 1",
                    "note": "",
                    "cancelled": False,
                }
            ],
            "payments": [
                {
                    "id": "P1",
                    "invoiceId": "I1",
                    "amountCents": 60000,
                    "date": "2026-10-22",
                    "method": "Cash",
                    "reference": "",
                    "receipt": "RCP-001",
                    "voided": False,
                    "voidReason": "",
                }
            ],
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

    def test_money_requires_integer_cents_and_preserves_saved_data(self):
        self.put(self.sample())
        for amount in [-1, 12.5, True, 0]:
            data = self.sample()
            data["payments"][0]["amountCents"] = amount
            self.assertEqual(self.put(data).status_code, 400)
        self.assertEqual(self.client.get(self.endpoint).json()["data"], self.sample())

    def test_combined_payments_cannot_overpay(self):
        data = self.sample()
        data["payments"].append(
            {**data["payments"][0], "id": "P2", "receipt": "RCP-002", "amountCents": 60001}
        )
        self.assertEqual(self.put(data).status_code, 400)

    def test_references_and_cancelled_invoice(self):
        data = self.sample()
        data["payments"][0]["invoiceId"] = "missing"
        self.assertEqual(self.put(data).status_code, 400)
        data = self.sample()
        data["invoices"][0]["cancelled"] = True
        self.assertEqual(self.put(data).status_code, 400)

    def test_void_retains_record_and_releases_balance(self):
        data = self.sample()
        data["payments"][0].update(voided=True, voidReason="Correction")
        data["payments"].append(
            {
                **self.sample()["payments"][0],
                "id": "P2",
                "receipt": "RCP-002",
                "amountCents": 120000,
            }
        )
        self.assertEqual(self.put(data).status_code, 200)
        self.assertEqual(len(self.client.get(self.endpoint).json()["data"]["payments"]), 2)

    def test_dates_receipts_and_opening_balance_validation(self):
        data = self.sample()
        data["invoices"][0]["dueDate"] = "2026-09-30"
        self.assertEqual(self.put(data).status_code, 400)
        data = self.sample()
        data["payments"].append({**data["payments"][0], "id": "P2"})
        self.assertEqual(self.put(data).status_code, 400)
        data = self.sample()
        data["feeTypes"][0]["openingCollectedCents"] = 1
        self.assertEqual(self.put(data).status_code, 400)
