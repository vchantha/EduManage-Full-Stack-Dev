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

## School Dashboard

The default page now follows the School Dashboard reference: welcome banner, enrollment and attendance charts, quick actions, recent students, events and fee collection. Add Student, Add Teacher, Create Class, Record Attendance and Add Event save to PostgreSQL. Directories, student editing and report CSV export are available from the sidebar and cards. Academics still opens the existing three academic pages.

School-wide totals and financial/enrollment charts are demonstration data, with the sample school baseline matching the reference. Directories contain example records and records added through quick actions. User login and other unfinished modules remain outside this local demo.

Dashboard API tests: `python manage.py test apps.core.test_dashboard --noinput` inside the backend container.

Banner image: generated with the built-in image tool. The saved prompt and asset notes are in frontend/ASSET-NOTES.md.

## Additional reference pages

Overview, Academic Years, Academics Overview, Syllabus & Progress, and Academic Calendar now share the navigation. Planning records are stored in the planning workspace in PostgreSQL. Academic year, term, topic, subject, material, and event forms save through the CSRF-protected planning API. Calendar supports month, week, list, type filters, and event editing. Sample school figures and schedules are demonstration data; the current date is 20 October 2026. The original orange Dashboard and curriculum, allocation, and lesson pages remain accessible.

Validation: production Next.js build, Django system and migration checks, Ruff, 14 backend tests, and desktop browser review of the five new pages.

## Examinations

Open Examinations in the sidebar for the new reference layout, year and term selectors, exam summaries, performance charts, recent and scheduled examinations, class performance, top students, and quick actions. The submenu opens Grade Management, Report Cards, Timetable, and Subjects.

Create or edit exams, enter a student mark for an exam and subject, configure pass marks, export CSV reports, or open the academic calendar. Exams and marks persist in the examinations workspace in PostgreSQL through a CSRF-protected API. Re-entering the same student ID, exam, and subject updates that mark. Deleting an exam requires a second confirmation and also removes its marks.

Reference data is a local demonstration, with historical 2025-2026 exam dates. Past scheduled dates show "Past date" instead of an inaccurate countdown. Reference summary counts may exceed the five example individual marks. Once marks are entered or edited for an exam, that exam's summary is recalculated from its recorded marks. Pass rate cards average the graded exam pass rates; class enrollment counts each class once. Months without submitted exams are left empty in the trend chart.

Validation: production frontend build, Ruff, Django system and migration checks, and 18 passing backend tests, including CSRF, mark bounds, invalid dates, class/exam references, duplicate marks, and persistence.

## Library Management

Open Library in the sidebar for the reference dashboard: inventory and borrower totals, borrowing/return trends, category distribution, recent borrowings, overdue books, popular books, category availability, recent returns, and quick actions. Add and edit books, register borrowers, search by title/author/ISBN or a tracked borrower's name, issue loans, record returns, and export local CSV files from the directories.

Library records persist in PostgreSQL through the CSRF-protected library API. Inventory availability equals copies minus the opening loan balance minus active tracked loans, across all years. A borrower cannot receive the same book twice while their first loan is active. Returns release the tracked copy. Dates cannot run backwards. Book and borrower records with loan history cannot be removed; removing a loan also removes its local reminder notes and requires a second confirmation.

The reference is demonstration data: 3,482 copies across 16 example titles, 1,241 earlier borrowings plus 15 tracked loans, and opening borrower/overdue totals of 832/82. The dashboard totals therefore include opening balances while tables show tracked records. Category percentages and availability are calculated from inventory. Opening loans may include loans from earlier years. The growth percentages and April–September trend series are reference examples, not a comparison calculated from the tracked loans. The 12-month chart includes tracked October activity. Recent loan due dates are set in November so their On Time status is accurate as of 21 October 2026.

Remind opens a local follow-up note. Logging it does not send an email, SMS, or notification to a borrower. Validation: production frontend build, Ruff, Django checks and migration-drift check, and 23 passing backend tests including CSRF, stock limits, duplicate loans, dates, references, and persistence. Browser checks cover creating a book and borrower, issuing an overdue loan, persistence after reload, reminder logging, return/availability restoration, and cleanup of those temporary records.

## Fees & Finance

Open Fees & Finance for the reference dashboard, year and term filters, collection trend, fee status chart, invoice/payment tabs, fee categories, outstanding accounts, and recent payments. Create or edit an invoice, record a payment received by the school, download its HTML receipt, manage fee types and payer records, select invoices for CSV export, or generate summary and invoice-ledger reports.

Amounts are stored as integer USD cents. The finance API rejects fractional cents, negative or zero invoice/payment amounts, overpayments, duplicate invoice/receipt numbers, invalid references, and dates before the invoice date. Voiding a payment requires a reason and preserves the original record. Cancelled invoices remain in history and cannot retain active payments. Include cancelled / voided in the expanded ledger to inspect those records. Recording, voiding, or cancelling a ledger entry never transfers or refunds money.

The initial totals reconcile to the design: expected $125,980; collected $89,450; outstanding $36,530; overdue $24,330; current/partial $12,200. Five category totals are $82,000 / $18,500 / $6,200 / $4,800 / $14,480. These combine opening expected/collected/overdue balances of $119,380 / $86,500 / $21,280 with nine tracked invoices and four tracked payments. Opening amounts apply only to 2025-2026, Term 1. The payer card includes 1,238 reference opening payers plus seven example student records.

The donut partitions total fees into paid, current/partial, and overdue balances; Outstanding is their parent unpaid summary, not an additional donut slice. Partial invoices retain Partial status even after their due date; unpaid past-due invoices show Overdue. Monthly opening amounts are allocated by sample reference weights, and tracked invoice/payment amounts are added by their respective calendar dates. The monthly totals sum exactly to the selected period totals. Reference dates and statuses are evaluated as of 22 October 2026.

Validation: production TypeScript/Next.js build, Ruff, Django system/migration checks, 29 passing backend tests, and independent checks of reference totals, fee-category reconciliation, overdue arithmetic, and exact cent parsing.

Browser validation: created a temporary invoice, rejected an overpayment, recorded an exact-cent payment, reloaded to verify persistence, downloaded its receipt and the summary CSV, voided the temporary payment, and cancelled the temporary invoice while retaining history. Baseline totals were restored. Term filtering and desktop/mobile layouts passed; no browser console errors.
