import json
from collections import Counter
from datetime import date

from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from .models import AcademicWorkspace

SCHEMA = {
    "students": {"id", "name", "className"},
    "feeTypes": {
        "id",
        "name",
        "color",
        "openingExpectedCents",
        "openingCollectedCents",
        "openingOverdueCents",
    },
    "invoices": {
        "id",
        "number",
        "studentId",
        "feeTypeId",
        "amountCents",
        "issueDate",
        "dueDate",
        "year",
        "term",
        "note",
        "cancelled",
    },
    "payments": {
        "id",
        "invoiceId",
        "amountCents",
        "date",
        "method",
        "reference",
        "receipt",
        "voided",
        "voidReason",
    },
}
MONEY = {"amountCents", "openingExpectedCents", "openingCollectedCents", "openingOverdueCents"}


@ensure_csrf_cookie
@require_http_methods(["GET", "PUT"])
def finance(request):
    """Local invoice/payment records; this endpoint never transfers money."""
    if request.method == "GET":
        saved = AcademicWorkspace.objects.filter(pk="finance").first()
        return JsonResponse(
            {"data": saved.data if saved else None, "csrfToken": get_token(request)}
        )
    if len(request.body) > 2_000_000:
        return JsonResponse({"error": "Finance workspace is too large."}, status=413)
    try:
        data = json.loads(request.body)["data"]
        if not isinstance(data, dict) or set(data) != set(SCHEMA):
            raise ValueError("Invalid finance collections.")
        for collection, fields in SCHEMA.items():
            rows = data[collection]
            if not isinstance(rows, list) or len(rows) > 5000:
                raise ValueError("Each collection supports up to 5,000 records.")
            ids = set()
            for row in rows:
                if not isinstance(row, dict) or set(row) != fields:
                    raise ValueError("Invalid finance record.")
                for key, value in row.items():
                    if key in MONEY:
                        if (
                            isinstance(value, bool)
                            or not isinstance(value, int)
                            or not 0 <= value <= 1000000000000
                        ):
                            raise ValueError(
                                "Amounts must be whole cents from 0 to 1,000,000,000,000."
                            )
                    elif key in {"cancelled", "voided"}:
                        if not isinstance(value, bool):
                            raise ValueError("Invalid record status.")
                    elif not isinstance(value, str) or len(value) > 2000:
                        raise ValueError("Invalid text value.")
                if not row["id"] or row["id"] in ids:
                    raise ValueError("Record IDs must be unique.")
                ids.add(row["id"])
                for key in {"name", "className", "number", "receipt"} & fields:
                    if not row[key].strip():
                        raise ValueError(
                            "Names, invoice numbers, and receipt numbers are required."
                        )
                if (
                    collection == "feeTypes"
                    and row["openingCollectedCents"] + row["openingOverdueCents"]
                    > row["openingExpectedCents"]
                ):
                    raise ValueError(
                        "Collected and overdue opening amounts cannot exceed expected fees."
                    )
                if collection in {"invoices", "payments"} and row["amountCents"] <= 0:
                    raise ValueError("Invoice and payment amounts must be greater than zero.")
        students = {row["id"] for row in data["students"]}
        fees = {row["id"] for row in data["feeTypes"]}
        invoices = {row["id"]: row for row in data["invoices"]}
        numbers = set()
        for invoice in invoices.values():
            if invoice["studentId"] not in students or invoice["feeTypeId"] not in fees:
                raise ValueError("Invoices must reference an existing student and fee type.")
            number = invoice["number"].strip().casefold()
            if number in numbers:
                raise ValueError("Invoice numbers must be unique.")
            numbers.add(number)
            date.fromisoformat(invoice["issueDate"])
            date.fromisoformat(invoice["dueDate"])
            if invoice["dueDate"] < invoice["issueDate"]:
                raise ValueError("Due date must be on or after the invoice date.")
            if invoice["term"] not in {"Term 1", "Term 2"}:
                raise ValueError("Invalid academic term.")
        receipts = set()
        paid = Counter()
        for payment in data["payments"]:
            invoice = invoices.get(payment["invoiceId"])
            if not invoice:
                raise ValueError("Payments must belong to an existing invoice.")
            date.fromisoformat(payment["date"])
            if payment["date"] < invoice["issueDate"]:
                raise ValueError("Payment date cannot precede the invoice date.")
            if payment["method"] not in {"Bank Transfer", "Cash", "Credit Card", "Other"}:
                raise ValueError("Select a valid payment method.")
            receipt = payment["receipt"].strip().casefold()
            if receipt in receipts:
                raise ValueError("Receipt numbers must be unique.")
            receipts.add(receipt)
            if payment["voided"]:
                if not payment["voidReason"].strip():
                    raise ValueError("A reason is required to void a payment record.")
            else:
                if invoice["cancelled"]:
                    raise ValueError("Cancelled invoices cannot have active payments.")
                paid[invoice["id"]] += payment["amountCents"]
        if any(amount > invoices[invoice_id]["amountCents"] for invoice_id, amount in paid.items()):
            raise ValueError("Payments cannot exceed the invoice amount.")
    except (KeyError, TypeError, ValueError) as error:
        return JsonResponse({"error": str(error)}, status=400)
    AcademicWorkspace.objects.update_or_create(pk="finance", defaults={"data": data})
    return JsonResponse({"status": "saved"})
