import json
from datetime import date
from math import isfinite

from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from .models import AcademicWorkspace

FIELDS = {
    "exams": {
        "id",
        "name",
        "subjects",
        "className",
        "date",
        "time",
        "year",
        "term",
        "status",
        "students",
        "submissions",
        "average",
        "passRate",
    },
    "results": {"id", "examId", "studentId", "studentName", "className", "subject", "score"},
    "subjects": {"id", "name", "code", "passMark"},
}


@ensure_csrf_cookie
@require_http_methods(["GET", "PUT"])
def examinations(request):
    """Persistent examination workspace for the existing local school demo."""
    if request.method == "GET":
        saved = AcademicWorkspace.objects.filter(pk="examinations").first()
        return JsonResponse(
            {"data": saved.data if saved else None, "csrfToken": get_token(request)}
        )
    if len(request.body) > 2_000_000:
        return JsonResponse({"error": "Examinations workspace is too large."}, status=413)
    try:
        data = json.loads(request.body)["data"]
        if not isinstance(data, dict) or set(data) != set(FIELDS):
            raise ValueError("Invalid examination collections.")
        for collection, fields in FIELDS.items():
            rows = data[collection]
            if not isinstance(rows, list) or len(rows) > 5000:
                raise ValueError("Each collection supports up to 5,000 records.")
            ids = set()
            for row in rows:
                if not isinstance(row, dict) or set(row) != fields:
                    raise ValueError("Invalid examination record.")
                for key, value in row.items():
                    if key in {
                        "students",
                        "submissions",
                        "average",
                        "passRate",
                        "score",
                        "passMark",
                    }:
                        limit = 100000 if key in {"students", "submissions"} else 100
                        if (
                            isinstance(value, bool)
                            or not isinstance(value, (int, float))
                            or not isfinite(value)
                            or not 0 <= value <= limit
                        ):
                            raise ValueError(
                                "Marks must be between 0 and 100 and counts must be nonnegative."
                            )
                        if key in {"students", "submissions"} and not isinstance(value, int):
                            raise ValueError("Student and submission counts must be whole numbers.")
                    elif not isinstance(value, str) or len(value) > 2000:
                        raise ValueError("Invalid text value.")
                if not row["id"] or row["id"] in ids:
                    raise ValueError("Record IDs must be unique.")
                ids.add(row["id"])
                for key in {"name", "studentId", "studentName", "className", "subject"} & fields:
                    if not row[key].strip():
                        raise ValueError("A name, class, and student ID are required.")
                if collection == "exams":
                    date.fromisoformat(row["date"])
                    if row["status"] not in {"Draft", "Scheduled", "Grading", "Completed"}:
                        raise ValueError("Invalid examination status.")
                    if row["term"] not in {"Term 1", "Term 2"}:
                        raise ValueError("Invalid examination term.")
        exams = {row["id"]: row for row in data["exams"]}
        names = {row["name"] for row in data["subjects"]}
        result_keys = set()
        for result in data["results"]:
            exam = exams.get(result["examId"])
            if not exam or exam["className"] != result["className"]:
                raise ValueError("Grades must belong to an existing exam and its class.")
            if result["subject"] not in names:
                raise ValueError("An existing examination subject is required.")
            key = (result["examId"], result["studentId"].strip().casefold(), result["subject"])
            if key in result_keys:
                raise ValueError("A student may have only one mark per exam and subject.")
            result_keys.add(key)
    except (KeyError, ValueError, TypeError) as error:
        return JsonResponse({"error": str(error)}, status=400)
    AcademicWorkspace.objects.update_or_create(pk="examinations", defaults={"data": data})
    return JsonResponse({"status": "saved"})
