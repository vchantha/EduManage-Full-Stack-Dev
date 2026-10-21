import json
from collections import Counter
from datetime import date

from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from .models import AcademicWorkspace

SCHEMA = {
    "books": {
        "id",
        "title",
        "author",
        "isbn",
        "category",
        "copies",
        "historicalBorrowed",
        "openingLoans",
        "color",
    },
    "borrowers": {"id", "name", "type", "className", "email"},
    "loans": {"id", "bookId", "borrowerId", "borrowedDate", "dueDate", "returnedDate", "year"},
    "reminders": {"id", "loanId", "date", "note"},
}
CATEGORIES = {"Textbooks", "Reference", "Fiction", "Science", "History", "Others"}


@ensure_csrf_cookie
@require_http_methods(["GET", "PUT"])
def library(request):
    if request.method == "GET":
        saved = AcademicWorkspace.objects.filter(pk="library").first()
        return JsonResponse(
            {"data": saved.data if saved else None, "csrfToken": get_token(request)}
        )
    if len(request.body) > 2_000_000:
        return JsonResponse({"error": "Library workspace is too large."}, status=413)
    try:
        data = json.loads(request.body)["data"]
        if not isinstance(data, dict) or set(data) != set(SCHEMA):
            raise ValueError("Invalid library collections.")
        for collection, fields in SCHEMA.items():
            rows = data[collection]
            if not isinstance(rows, list) or len(rows) > 5000:
                raise ValueError("Each collection supports up to 5,000 records.")
            ids = set()
            for row in rows:
                if not isinstance(row, dict) or set(row) != fields:
                    raise ValueError("Invalid library record.")
                for key, value in row.items():
                    if key in {"copies", "historicalBorrowed", "openingLoans"}:
                        if (
                            isinstance(value, bool)
                            or not isinstance(value, int)
                            or not 0 <= value <= 1000000
                        ):
                            raise ValueError(
                                "Book counts must be whole numbers from 0 to 1,000,000."
                            )
                    elif not isinstance(value, str) or len(value) > 2000:
                        raise ValueError("Invalid text value.")
                if not row["id"] or row["id"] in ids:
                    raise ValueError("Record IDs must be unique.")
                ids.add(row["id"])
                for field in {"title", "name"} & fields:
                    if not row[field].strip():
                        raise ValueError("A title or name is required.")
                if collection == "books" and row["category"] not in CATEGORIES:
                    raise ValueError("Select a valid book category.")
                if collection == "books" and row["openingLoans"] > row["copies"]:
                    raise ValueError("Opening loans cannot exceed total copies.")
                if collection == "borrowers" and row["type"] not in {"Student", "Teacher", "Staff"}:
                    raise ValueError("Select a valid borrower type.")
        books = {row["id"]: row for row in data["books"]}
        borrowers = {row["id"] for row in data["borrowers"]}
        active = Counter()
        active_pairs = set()
        for loan in data["loans"]:
            if loan["bookId"] not in books or loan["borrowerId"] not in borrowers:
                raise ValueError("Loans must reference an existing book and borrower.")
            date.fromisoformat(loan["borrowedDate"])
            date.fromisoformat(loan["dueDate"])
            if loan["dueDate"] < loan["borrowedDate"]:
                raise ValueError("Due date must follow the borrowing date.")
            if loan["returnedDate"]:
                date.fromisoformat(loan["returnedDate"])
                if loan["returnedDate"] < loan["borrowedDate"]:
                    raise ValueError("Return date must follow the borrowing date.")
            else:
                active[loan["bookId"]] += 1
                pair = (loan["bookId"], loan["borrowerId"])
                if pair in active_pairs:
                    raise ValueError("This borrower already has an active loan for this book.")
                active_pairs.add(pair)
        if any(
            count + books[book_id]["openingLoans"] > books[book_id]["copies"]
            for book_id, count in active.items()
        ):
            raise ValueError("There are not enough available copies for these loans.")
        loan_ids = {row["id"] for row in data["loans"]}
        for reminder in data["reminders"]:
            if reminder["loanId"] not in loan_ids:
                raise ValueError("Reminders must belong to an existing loan.")
            date.fromisoformat(reminder["date"])
    except (KeyError, TypeError, ValueError) as error:
        return JsonResponse({"error": str(error)}, status=400)
    AcademicWorkspace.objects.update_or_create(pk="library", defaults={"data": data})
    return JsonResponse({"status": "saved"})
