import json

from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from .models import AcademicWorkspace

SCHEMA = {
    "students": {"id", "name", "className", "status", "email", "year"},
    "teachers": {"id", "name", "subject", "email", "year"},
    "classes": {"id", "name", "teacher", "room", "year"},
    "attendance": {"id", "studentId", "date", "status", "year"},
    "events": {"id", "title", "date", "time", "kind", "year"},
}


@ensure_csrf_cookie
@require_http_methods(["GET", "PUT"])
def dashboard(request):
    """Local demonstration school dashboard; same CSRF policy as academics."""
    if request.method == "GET":
        saved = AcademicWorkspace.objects.filter(pk="dashboard").first()
        return JsonResponse(
            {"data": saved.data if saved else None, "csrfToken": get_token(request)}
        )

    if len(request.body) > 2_000_000:
        return JsonResponse({"error": "Dashboard data is too large."}, status=413)
    try:
        data = json.loads(request.body)["data"]
        if not isinstance(data, dict) or set(data) != set(SCHEMA):
            raise ValueError("Invalid dashboard collections.")
        for collection, fields in SCHEMA.items():
            records = data[collection]
            if not isinstance(records, list) or len(records) > 2000:
                raise ValueError("Each collection supports up to 2,000 records.")
            ids = set()
            for record in records:
                if not isinstance(record, dict) or set(record) != fields:
                    raise ValueError("Invalid dashboard record.")
                if any(
                    not isinstance(value, str) or len(value) > 2000 for value in record.values()
                ):
                    raise ValueError("Invalid text value.")
                if not record["id"] or record["id"] in ids:
                    raise ValueError("Every record requires a unique ID.")
                ids.add(record["id"])
        if any(r["status"] not in ("Active", "Inactive") for r in data["students"]):
            raise ValueError("Invalid student status.")
        if any(r["status"] not in ("Present", "Absent", "Late") for r in data["attendance"]):
            raise ValueError("Invalid attendance status.")
        student_ids = {r["id"] for r in data["students"]}
        if any(r["studentId"] not in student_ids for r in data["attendance"]):
            raise ValueError("Attendance must reference an existing student.")
    except (ValueError, TypeError, KeyError) as error:
        return JsonResponse({"error": str(error)}, status=400)
    AcademicWorkspace.objects.update_or_create(pk="dashboard", defaults={"data": data})
    return JsonResponse({"status": "saved"})
