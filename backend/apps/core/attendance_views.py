import copy
import json
from datetime import date, timedelta

from django.db import transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from .models import AcademicWorkspace

STATUSES = {"Present", "Absent", "Late", "Not Marked"}


def initial_attendance():
    classes, students, sessions = [], [], []
    names = [
        "Sophea Chan",
        "Dara Kim",
        "Sreyneang Lim",
        "Visal Chhun",
        "Monika Sok",
        "Kosal Tep",
        "Dara Sopheak",
        "Chan Rothana",
        "Kim Sokha",
        "Sok Piseth",
        "Chan Sreymom",
        "Lim Dara",
        "Kong Vannara",
        "Chea Raksmey",
        "Sok Chantha",
        "Dara Chhun",
    ]
    for index, (name, grade, teacher, historical) in enumerate(
        [
            ("Grade 10A", "Grade 10", "Sok Piseth", 28),
            ("Grade 9B", "Grade 9", "Sarah Kim", 29),
            ("Grade 8A", "Grade 8", "David Lee", 29),
            ("Grade 7A", "Grade 7", "Monika Sok", 30),
            ("Grade 11A", "Grade 11", "Rithy Sok", 27),
            ("Grade 12A", "Grade 12", "Dara Chhun", 28),
        ]
    ):
        class_id = f"class-{index + 1}"
        classes.append(
            {
                "id": class_id,
                "name": name,
                "grade": grade,
                "teacher": teacher,
                "year": "2025 - 2026",
                "term": "Term 1",
                "subjects": ["Mathematics", "English", "Science", "History", "Khmer", "Computer"],
            }
        )
        roster = []
        for n in range(32):
            student_id = f"STU{123 + index * 32 + n:05d}"
            student = {
                "id": student_id,
                "name": names[n] if n < len(names) else f"Example Student {n + 1:02d}",
                "classId": class_id,
            }
            roster.append(student)
            students.append(student)
        for day in range(6):
            session_date = (date(2026, 9, 28) + timedelta(days=day)).isoformat()
            marks = []
            for n, student in enumerate(roster):
                if day == 5:
                    status = (
                        "Present"
                        if index != 0 or n not in {2, 4, 6, 8}
                        else {2: "Absent", 4: "Late", 6: "Not Marked", 8: "Absent"}[n]
                    )
                else:
                    status = (
                        "Present" if n < historical else "Late" if n == historical else "Absent"
                    )
                remark = (
                    "Sick leave"
                    if day == 5 and index == 0 and n == 2
                    else "Arrived 15 minutes late"
                    if day == 5 and index == 0 and n == 4
                    else ""
                )
                marks.append({"studentId": student["id"], "status": status, "remarks": remark})
            sessions.append(
                {
                    "id": f"reference-{index}-{day}",
                    "classId": class_id,
                    "date": session_date,
                    "subject": "English" if index == 1 else "Mathematics",
                    "teacher": teacher,
                    "year": "2025 - 2026",
                    "term": "Term 1",
                    "marks": marks,
                    "updatedAt": "2026-10-03T08:00:00+00:00",
                }
            )
    return {
        "classes": classes,
        "students": students,
        "sessions": sessions,
        "opening": {
            "date": "2026-10-03",
            "year": "2025 - 2026",
            "term": "Term 1",
            "total": 1053,
            "present": 960,
            "absent": 66,
            "late": 27,
        },
    }


def validate_session(session, data):
    fields = {"classId", "date", "subject", "teacher", "year", "term", "marks"}
    if not isinstance(session, dict) or set(session) != fields:
        raise ValueError("Invalid attendance session fields.")
    for key in fields - {"marks"}:
        if not isinstance(session[key], str) or not session[key].strip() or len(session[key]) > 100:
            raise ValueError("Complete the class, date, subject, and teacher fields.")
    selected_date = date.fromisoformat(session["date"])
    if selected_date.isoformat() != session["date"] or selected_date > timezone.now().date():
        raise ValueError("Attendance requires a valid date that is not in the future.")
    classroom = next((c for c in data["classes"] if c["id"] == session["classId"]), None)
    if (
        not classroom
        or session["year"] != classroom["year"]
        or session["term"] != classroom["term"]
    ):
        raise ValueError("Select a class in the chosen academic year and term.")
    if session["subject"] not in classroom["subjects"]:
        raise ValueError("Select a subject offered by the class.")
    roster = {s["id"] for s in data["students"] if s["classId"] == classroom["id"]}
    if not isinstance(session["marks"], list) or len(session["marks"]) != len(roster):
        raise ValueError("Include every student in the class exactly once.")
    seen = set()
    for mark in session["marks"]:
        if not isinstance(mark, dict) or set(mark) != {"studentId", "status", "remarks"}:
            raise ValueError("Invalid student attendance fields.")
        if not all(isinstance(value, str) for value in mark.values()):
            raise ValueError("Attendance values must be text.")
        if mark["studentId"] not in roster or mark["studentId"] in seen:
            raise ValueError("Student IDs must be unique and belong to the selected class.")
        seen.add(mark["studentId"])
        if mark["status"] not in STATUSES or len(mark["remarks"]) > 500:
            raise ValueError("Select a valid status and use remarks of at most 500 characters.")


@ensure_csrf_cookie
@require_http_methods(["GET", "PUT"])
def attendance(request):
    if request.method == "GET":
        saved = AcademicWorkspace.objects.filter(pk="attendance").first()
        envelope = saved.data if saved else {"data": initial_attendance(), "revision": 0}
        return JsonResponse({**envelope, "csrfToken": get_token(request)})
    if len(request.body) > 300_000:
        return JsonResponse({"error": "Attendance session exceeds the size limit."}, status=413)
    try:
        payload = json.loads(request.body)
        session, revision = payload["session"], payload["revision"]
        if type(revision) is not int or revision < 0:
            raise ValueError("Invalid attendance revision.")
        with transaction.atomic():
            saved, _ = AcademicWorkspace.objects.get_or_create(
                pk="attendance", defaults={"data": {"data": initial_attendance(), "revision": 0}}
            )
            saved = AcademicWorkspace.objects.select_for_update().get(pk=saved.pk)
            previous = saved.data
            if previous["revision"] != revision:
                return JsonResponse(
                    {
                        "error": "Attendance changed in another window. Reload before saving; export your draft first if needed."
                    },
                    status=409,
                )
            data = copy.deepcopy(previous["data"])
            validate_session(session, data)
            existing = next(
                (
                    r
                    for r in data["sessions"]
                    if all(
                        r[key] == session[key]
                        for key in ["classId", "date", "subject", "year", "term"]
                    )
                ),
                None,
            )
            record = {
                **session,
                "id": existing["id"] if existing else f"session-{revision + 1}",
                "updatedAt": timezone.now().isoformat(),
            }
            if existing:
                data["sessions"] = [
                    record if r["id"] == existing["id"] else r for r in data["sessions"]
                ]
            else:
                if len(data["sessions"]) >= 5000:
                    raise ValueError("Attendance supports up to 5,000 sessions.")
                data["sessions"].append(record)
            envelope = {"data": data, "revision": revision + 1}
            saved.data = envelope
            saved.save(update_fields=["data", "updated_at"])
        return JsonResponse(envelope)
    except (KeyError, ValueError, TypeError) as error:
        return JsonResponse({"error": str(error)}, status=400)
