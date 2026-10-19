# EduManage academic workspace

Open http://localhost:3000 after starting Docker Desktop and the stack.

Implemented pages from the design reference:
- Curriculum: list, subject mapping, learning areas, version history and coverage charts.
- Subject Allocation: class, teacher and subject views.
- Lesson Plans: calendar, date filtering, review states and approval.

All three pages support search, filters, CSV export, details, creation, editing, duplication and deletion. Summary totals reflect the saved sample records. The initial records are demonstration school data from the design, not a complete live school database.

Records are stored in PostgreSQL through a same-origin Django endpoint. The database uses a persistent Docker volume. Browser requests include a CSRF token. This is a local, single-school demonstration; authentication, separate user roles and multi-school permissions must be implemented before external deployment. Navigation outside the three academic pages is a placeholder.

From this repository folder:

```powershell
docker compose -f compose.yaml -f compose.local.yaml up -d --build --wait
docker compose -f compose.yaml -f compose.local.yaml ps
docker compose -f compose.yaml -f compose.local.yaml logs --tail 100 frontend backend
```

Stop without deleting school data:

```powershell
docker compose -f compose.yaml -f compose.local.yaml down
```

Both web ports are bound only to 127.0.0.1. Frontend: http://localhost:3000. Backend health: http://localhost:8000/api/v1/health/.

Keep .env private. Do not remove Docker volumes unless intentionally deleting all data.

Backend workspace tests:

```powershell
docker compose -f compose.yaml -f compose.local.yaml exec -T backend python manage.py test apps.core.test_workspace --noinput
```
