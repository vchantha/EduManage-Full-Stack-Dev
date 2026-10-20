import json

from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from .models import AcademicWorkspace

PAGES = {"Curriculum", "Subject Allocation", "Lesson Plans"}
FIELDS = {
    "academicYear",
    "term",
    "id",
    "name",
    "code",
    "description",
    "levels",
    "subjects",
    "version",
    "status",
    "date",
    "teacher",
    "room",
    "subject",
    "className",
    "time",
}


@ensure_csrf_cookie
@require_http_methods(["GET", "PUT"])
def workspace(request):
    # This local demonstration is bound to 127.0.0.1 by Docker Compose.
    # Add user authentication and school-level permissions before external deployment.
    if request.method == "GET":
        saved = AcademicWorkspace.objects.filter(pk="default").first()
        return JsonResponse(
            {"data": saved.data if saved else None, "csrfToken": get_token(request)}
        )

    if len(request.body) > 2_000_000:
        return JsonResponse({"error": "Workspace is too large."}, status=413)
    try:
        payload = json.loads(request.body)
        data = payload["data"]
        if not isinstance(data, dict) or set(data) != PAGES:
            raise ValueError("All three academic pages are required.")
        for records in data.values():
            if not isinstance(records, list) or len(records) > 2000:
                raise ValueError("Each page supports up to 2,000 records.")
            ids = set()
            for record in records:
                if not isinstance(record, dict) or set(record) != FIELDS:
                    raise ValueError("Invalid academic record.")
                if any(
                    not isinstance(value, str) or len(value) > 10000
                    for key, value in record.items()
                    if key != "subjects"
                ):
                    raise ValueError("Invalid text field.")
                if type(record["subjects"]) is not int or not 0 <= record["subjects"] <= 1000:
                    raise ValueError("Subject count must be between 0 and 1,000.")
                if not record["id"] or record["id"] in ids or not record["name"].strip():
                    raise ValueError("Records require a unique ID and a name.")
                ids.add(record["id"])
    except (KeyError, ValueError, TypeError) as error:
        return JsonResponse({"error": str(error)}, status=400)
    AcademicWorkspace.objects.update_or_create(pk="default", defaults={"data": data})
    return JsonResponse({"status": "saved"})
