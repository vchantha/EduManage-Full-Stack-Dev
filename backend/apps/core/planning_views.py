import json
from datetime import date

from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from .models import AcademicWorkspace

SCHEMA = {
    "years": {"id", "name", "start", "end", "status", "students", "description"},
    "terms": {"id", "yearId", "name", "start", "end", "status", "weeks", "classes", "students"},
    "subjects": {"id", "name", "code", "grade", "teacher"},
    "topics": {
        "id",
        "yearId",
        "chapter",
        "title",
        "objectives",
        "periods",
        "start",
        "end",
        "progress",
        "subject",
        "grade",
        "term",
    },
    "events": {"id", "yearId", "title", "date", "endDate", "time", "type", "description"},
    "materials": {"id", "topicId", "title", "url", "type"},
}
NUMBERS = {"students", "weeks", "classes", "periods", "progress"}


@ensure_csrf_cookie
@require_http_methods(["GET", "PUT"])
def planning(request):
    """Local single-school planning data; not an externally authenticated API."""
    if request.method == "GET":
        saved = AcademicWorkspace.objects.filter(pk="planning").first()
        return JsonResponse(
            {"data": saved.data if saved else None, "csrfToken": get_token(request)}
        )
    if len(request.body) > 2_000_000:
        return JsonResponse({"error": "Planning workspace is too large."}, status=413)
    try:
        data = json.loads(request.body)["data"]
        if not isinstance(data, dict) or set(data) != set(SCHEMA):
            raise ValueError("Invalid planning collections.")
        for key, fields in SCHEMA.items():
            if not isinstance(data[key], list) or len(data[key]) > 2000:
                raise ValueError("Each collection supports up to 2,000 records.")
            ids = set()
            for row in data[key]:
                if not isinstance(row, dict) or set(row) != fields:
                    raise ValueError("Invalid planning record.")
                for field, value in row.items():
                    if field in NUMBERS:
                        if (
                            not isinstance(value, int)
                            or isinstance(value, bool)
                            or not 0 <= value <= 1000000
                        ):
                            raise ValueError("Invalid numeric value.")
                    elif not isinstance(value, str) or len(value) > 10000:
                        raise ValueError("Invalid text value.")
                if not row["id"] or row["id"] in ids:
                    raise ValueError("A unique record ID is required.")
                ids.add(row["id"])
                for field in ("start", "end", "date", "endDate"):
                    if field in row:
                        date.fromisoformat(row[field])
                if "start" in row and row["start"] > row["end"]:
                    raise ValueError("End date must follow start date.")
                if "date" in row and row["date"] > row["endDate"]:
                    raise ValueError("Event end date must follow start date.")
                if "progress" in row and row["progress"] > 100:
                    raise ValueError("Progress must be between 0 and 100.")
                for field in ("name", "title"):
                    if field in row and not row[field].strip():
                        raise ValueError("A name or title is required.")
        year_ids = {row["id"] for row in data["years"]}
        if sum(row["status"] == "Active" for row in data["years"]) > 1:
            raise ValueError("Only one academic year may be active.")
        if any(
            row["yearId"] not in year_ids
            for key in ("terms", "topics", "events")
            for row in data[key]
        ):
            raise ValueError("An existing academic year is required.")
        topic_ids = {row["id"] for row in data["topics"]}
        if any(row["topicId"] not in topic_ids for row in data["materials"]):
            raise ValueError("Materials must belong to an existing topic.")
        if any(
            not row["url"].startswith(("https://", "http://", "/learning/"))
            for row in data["materials"]
        ):
            raise ValueError("Material links must use HTTP or HTTPS.")
    except (KeyError, ValueError, TypeError) as error:
        return JsonResponse({"error": str(error)}, status=400)
    AcademicWorkspace.objects.update_or_create(pk="planning", defaults={"data": data})
    return JsonResponse({"status": "saved"})
