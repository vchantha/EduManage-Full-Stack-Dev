import base64
import copy
import json
import re
import time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.core.exceptions import ValidationError
from django.core.validators import validate_email, URLValidator
from django.db import connection, transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from .models import AcademicWorkspace

STARTED = time.monotonic()
DEFAULTS = {
    "school": {
        "name": "Bright Future School",
        "shortName": "BFS",
        "type": "Primary & Secondary",
        "established": "2010",
        "address": "#123, Street 456, Sangkat Boeung Keng Kang\nPhnom Penh, Cambodia",
        "phone": "+855 23 123 456",
        "email": "info@brightfutureschool.edu.kh",
        "website": "https://www.brightfutureschool.edu.kh",
        "logo": "",
    },
    "preferences": {
        "language": "English",
        "timezone": "Asia/Phnom_Penh",
        "dateFormat": "DD/MM/YYYY",
        "timeFormat": "12-hour (AM/PM)",
        "firstDay": "Monday",
        "currency": "USD",
        "autoStudentId": True,
        "emailEnabled": True,
        "smsEnabled": False,
    },
    "grading": {
        "scale": "Percentage (0–100)",
        "passMark": "50",
        "precision": "1",
        "classCapacity": "40",
        "studentPrefix": "STU",
    },
    "notifications": {
        "attendance": True,
        "fees": True,
        "exams": True,
        "digest": "Daily",
        "replyTo": "info@brightfutureschool.edu.kh",
    },
    "system": {
        "schoolCode": "BFS",
        "supportEmail": "info@brightfutureschool.edu.kh",
        "sessionNotice": "Welcome to Bright Future School",
    },
    "integrations": {
        "website": "https://www.brightfutureschool.edu.kh",
        "helpUrl": "",
        "calendarUrl": "",
    },
    "appearance": {"accent": "Orange", "density": "Comfortable", "showDescriptions": True},
    "directory": [
        {
            "id": "admin-example",
            "name": "John Doe",
            "email": "admin@example.school",
            "role": "Administrator",
            "status": "Active",
        }
    ],
}


def validate(data):
    if not isinstance(data, dict) or set(data) != set(DEFAULTS):
        raise ValueError("Invalid settings sections.")
    for section, defaults in DEFAULTS.items():
        if section == "directory":
            continue
        values = data[section]
        if not isinstance(values, dict) or set(values) != set(defaults):
            raise ValueError(f"Invalid {section} fields.")
        for key, default in defaults.items():
            value = values[key]
            if isinstance(default, bool):
                if not isinstance(value, bool):
                    raise ValueError("Switch values must be true or false.")
            elif not isinstance(value, str) or len(value) > (2_800_000 if key == "logo" else 2000):
                raise ValueError("Invalid settings text.")
    school = data["school"]
    if not school["name"].strip() or not school["shortName"].strip():
        raise ValueError("School name and short name are required.")
    if school["type"] not in {"Primary & Secondary", "Primary", "Secondary", "Higher Education"}:
        raise ValueError("Select a valid school type.")
    if (
        not re.fullmatch(r"\d{4}", school["established"])
        or not 1800 <= int(school["established"]) <= timezone.now().year
    ):
        raise ValueError("Established year must be between 1800 and the current year.")
    for value in [
        school["email"],
        data["notifications"]["replyTo"],
        data["system"]["supportEmail"],
    ]:
        if value:
            validate_email(value)
    for value in [school["website"], *data["integrations"].values()]:
        if value:
            URLValidator(schemes=["http", "https"])(value)
    logo = school["logo"]
    if logo:
        match = re.fullmatch(r"data:image/(png|jpeg);base64,([A-Za-z0-9+/=]+)", logo)
        if not match:
            raise ValueError("Logo must be a PNG or JPEG image.")
        raw = base64.b64decode(match[2], validate=True)
        valid_signature = (
            raw.startswith(b"\x89PNG\r\n\x1a\n")
            if match[1] == "png"
            else raw.startswith(b"\xff\xd8\xff")
        )
        if len(raw) > 2 * 1024 * 1024 or not valid_signature:
            raise ValueError("Logo must be a valid PNG/JPEG no larger than 2 MB.")
    choices = {
        ("preferences", "language"): {"English", "Khmer"},
        ("preferences", "dateFormat"): {"DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"},
        ("preferences", "timeFormat"): {"12-hour (AM/PM)", "24-hour"},
        ("preferences", "firstDay"): {"Monday", "Sunday", "Saturday"},
        ("preferences", "currency"): {"USD", "KHR"},
        ("grading", "scale"): {"Percentage (0–100)", "Letter grades (A–F)"},
        ("grading", "precision"): {"0", "1", "2"},
        ("notifications", "digest"): {"Daily", "Weekly", "Off"},
        ("appearance", "accent"): {"Orange", "Blue", "Green"},
        ("appearance", "density"): {"Comfortable", "Compact"},
    }
    for (section, key), options in choices.items():
        if data[section][key] not in options:
            raise ValueError(f"Invalid {key} option.")
    ZoneInfo(data["preferences"]["timezone"])
    for key, low, high in [("passMark", 0, 100), ("classCapacity", 1, 500)]:
        value = data["grading"][key]
        if not value.isdigit() or not low <= int(value) <= high:
            raise ValueError(f"{key} must be from {low} to {high}.")
    if not re.fullmatch(r"[A-Z0-9-]{1,12}", data["grading"]["studentPrefix"]):
        raise ValueError("Student prefix supports 1–12 uppercase letters, numbers, or hyphens.")
    directory = data["directory"]
    if not isinstance(directory, list) or len(directory) > 500:
        raise ValueError("The directory supports up to 500 entries.")
    ids, emails = set(), set()
    for person in directory:
        if not isinstance(person, dict) or set(person) != {"id", "name", "email", "role", "status"}:
            raise ValueError("Invalid directory entry.")
        if any(
            not isinstance(value, str) or not value.strip() or len(value) > 200
            for value in person.values()
        ):
            raise ValueError("Complete all directory fields.")
        validate_email(person["email"])
        if person["id"] in ids or person["email"].casefold() in emails:
            raise ValueError("Directory IDs and emails must be unique.")
        ids.add(person["id"])
        emails.add(person["email"].casefold())
        if person["role"] not in {"Administrator", "Teacher", "Accountant", "Librarian"} or person[
            "status"
        ] not in {"Active", "Inactive"}:
            raise ValueError("Invalid directory role or status.")


def system_info():
    version = "Unknown"
    if connection.vendor == "postgresql":
        with connection.cursor() as cursor:
            cursor.execute("SHOW server_version")
            version = "PostgreSQL " + cursor.fetchone()[0].split(" ")[0]
    else:
        version = connection.vendor
    return {
        "version": "1.0.0",
        "database": version,
        "workerUptimeSeconds": int(time.monotonic() - STARTED),
        "checkedAt": timezone.now().isoformat(),
    }


@ensure_csrf_cookie
@require_http_methods(["GET", "PUT"])
def school_settings(request):
    if request.method == "GET":
        saved = AcademicWorkspace.objects.filter(pk="settings").first()
        planning = AcademicWorkspace.objects.filter(pk="planning").first()
        envelope = (
            saved.data
            if saved
            else {"data": copy.deepcopy(DEFAULTS), "revision": 0, "logs": [], "lastExport": None}
        )
        return JsonResponse(
            {
                **envelope,
                "csrfToken": get_token(request),
                "systemInfo": system_info(),
                "academicData": {key: planning.data[key] for key in ("years", "terms")}
                if planning
                else None,
            }
        )
    if len(request.body) > 3_000_000:
        return JsonResponse({"error": "Settings payload exceeds 3 MB."}, status=413)
    try:
        payload = json.loads(request.body)
        data, revision = payload["data"], payload["revision"]
        if type(revision) is not int or revision < 0:
            raise ValueError("Invalid settings revision.")
        action = payload.get("action", "save")
        if action not in {"save", "export", "reset"}:
            raise ValueError("Invalid settings action.")
        validate(data)
        with transaction.atomic():
            saved, _ = AcademicWorkspace.objects.get_or_create(
                pk="settings", defaults={"data": {"revision": 0, "logs": [], "lastExport": None}}
            )
            saved = AcademicWorkspace.objects.select_for_update().get(pk=saved.pk)
            previous = saved.data
            if previous["revision"] != revision:
                return JsonResponse(
                    {"error": "Settings changed in another window. Reload before saving."},
                    status=409,
                )
            stamp = timezone.now().isoformat()
            sections = [key for key in DEFAULTS if data[key] != previous.get("data", DEFAULTS)[key]]
            logs = [{"at": stamp, "action": action, "sections": sections}] + previous["logs"]
            envelope = {
                "data": data,
                "revision": revision + 1,
                "logs": logs[:100],
                "lastExport": stamp if action == "export" else previous["lastExport"],
            }
            saved.data = envelope
            saved.save(update_fields=["data", "updated_at"])
        return JsonResponse(envelope)
    except (KeyError, TypeError, ValueError, ValidationError, ZoneInfoNotFoundError) as error:
        return JsonResponse({"error": str(error)}, status=400)
