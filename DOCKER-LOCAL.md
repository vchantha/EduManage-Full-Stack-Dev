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

## School Settings

Open Settings for the school information and preferences layout from the reference, six top-level tabs, and all ten sidebar sections. School name, contact information, PNG/JPEG logo, preferences, class/grading planning defaults, directory records, notification choices, school identifiers, integration reference links, and Settings appearance persist in PostgreSQL through the CSRF-protected settings API. Use Save Changes to persist edits or Discard Changes to restore saved values. A revision check rejects stale saves from another browser window.

Academic year and term cards follow the header selection and saved academic planning records, with the existing reference data as the initial fallback. Edit Academic Year opens the existing Academics workspace. System information reports the actual PostgreSQL version and the serving worker's uptime rather than reference backup or uptime figures. Dates in the Settings calendar use the saved date format, and activity timestamps use the saved time zone and time format.

Users & Roles is a contact directory with role labels and a responsibility guide; it does not create sign-in accounts, send invitations, or enforce permissions. Notification preferences are stored without sending email/SMS; delivery providers are not configured. Class defaults do not regrade examinations or rename student IDs. Language, currency, ID-generation, and notification choices are configuration defaults; they do not translate the existing application, convert the USD finance ledger, or activate delivery. Appearance previews apply to Settings pages. Integration URLs are stored without contacting or syncing the referenced services.

Data Management downloads a JSON settings snapshot containing the school configuration and directory, not a full database backup. The last export time and latest 100 settings activity events are recorded without logging field values. Reset Settings requires confirmation and restores display/notification preferences while preserving school information, directory, and all other module records. Logos are restricted to PNG/JPEG up to 2 MB; the server body limit accommodates base64 encoding.

Validation: production Next.js/TypeScript build, Ruff lint and format checks, Django system and migration checks, and 37 passing backend tests (plus 10 validation subtests). Settings coverage includes CSRF, persistence, stale revisions, invalid options/contacts/grading, duplicate directory entries, logo signatures and the 2 MB encoded-request boundary, academic record exposure, and export metadata. Browser checks cover saved school/preferences after reload, directory edits, invalid pass marks, settings JSON download, preference reset, oversized and valid logo uploads, logo persistence and restoring the default image, all Settings sections, search, appearance preview, term filtering, academic navigation, and desktop/mobile layout. Temporary edits were restored to the reference values; no browser console errors remained.

## Attendance

Open Attendance for the reference dashboard, class register, status/remark editing, selection and bulk marking, CSV import, attendance history, student summaries, and analytics. Attendance saves explicitly with Save Attendance. Registers are identified by academic year, term, class, date, and subject; re-saving updates the same session. In-progress drafts remain separate while changing class/date/subject within the Attendance workspace. Export Draft CSV or save before leaving the workspace or reloading. The CSRF-protected API validates the complete class roster and rejects duplicate/unknown student IDs, missing students, invalid statuses, future or malformed dates, unsupported subjects, mismatched year/term, excessive remarks, and stale revisions from another browser window.

The dedicated demonstration roster contains 192 students across six classes and 36 saved example sessions. The reference date is 3 October 2026, with 1,053 opening students (960 present, 66 absent, 27 late). Combined with the tracked roster this gives 1,245 students, 1,148 present, 68 absent, 28 late, and one not marked. The image's 29 late plus the unmarked student would overcount the total; the implemented counts reconcile. Opening counts apply only to the reference date/year/term. Other dates use tracked records. School daily status uses each student's latest saved lesson status for that date, while class/term analytics count student-session opportunities. Late and Not Marked are separate from Present.

Class registers include all 32 students with pagination, editable remarks, teacher selection, bulk status updates for selected students, and display options. Import uses the downloaded studentId/status/remarks template, supports BOM/quoted fields/commas/newlines, and rejects duplicate or non-roster IDs before staging changes for review. Imported changes persist only after Save Attendance. Reports filter saved sessions by class and inclusive date bounds and download CSV; drafts and opening aggregates are excluded from detailed reports. Exports protect spreadsheet formula prefixes. Student history shows saved lesson records. Weekly/monthly charts leave gaps for dates without records, and attendance rates are calculated from saved data.

Validation: production Next.js/TypeScript build, Ruff lint/format, Django system and migration checks, and 43 passing backend tests plus 21 validation subtests. Independent frontend checks cover CSV parsing and template round trips, invalid and duplicate imports, exact status counters, session identity, and daily status precedence. Browser checks cover saving and reload persistence, bulk marking and discard, CSV import preview/save/reload, restoring temporary test edits, downloaded-template reimport, filtered report export (32 student rows, 28 present and one unmarked), student history, analytics, pagination, term filtering, and desktop/mobile layouts. No browser console errors remained.

## Sign-in, Logout & Session Security

The application now opens on the reference sign-in page and uses Django administrator accounts. All school workspace APIs require an active staff account; health and the public authentication endpoints remain available without sign-in. Existing school records are preserved. No default username/password or permanent test administrator is installed.

First administrator setup is interactive. From the repository directory, run `docker compose -f compose.yaml -f compose.local.yaml exec backend python manage.py createsuperuser`, then enter your own username, email, and strong password. Sign in at http://localhost:3000. Existing Django staff/superuser accounts can also sign in. Directory role labels in Settings do not create authentication accounts or grant access.

Settings > General includes School Information, System Preferences, Login & Logout, Session & Security, and Appearance navigation. Login and session policy is stored separately with revision checks. It supports Remember Me (14-day cookie), database-backed sign-in lockout, password expiry tracking, strong-password validation in Django password forms, logout confirmation, a login/logged-out destination, optional clearing of EduManage browser preference keys, ending the account's tracked sessions on logout, inactivity timeout, and a header logout control. Password sign-in cannot be disabled while no SSO provider exists. Google and Microsoft SSO remain visibly disabled and server-side enabling is rejected. Forgot Password provides administrator contact guidance without sending a reset email.

Login rotates the session and CSRF token. Session cookies are HttpOnly and SameSite=Lax; local HTTP uses non-Secure cookies, with DJANGO_SECURE_COOKIES=true available for an HTTPS deployment. Logout is CSRF-protected and invalidates the server session. Session & Security lists the signed-in administrator's own tracked sessions and allows revocation with confirmation. Background status polling does not count as activity; actual interaction or school API activity renews the idle timer. Password expiry tracking begins at the first sign-in after this feature is enabled and resets when a changed password hash is detected. The UI includes the reference logout-confirmation modal and logged-out illustration.

Validation: production Next.js/TypeScript build, Ruff lint/format, Django system and migration-drift checks, and 53 passing backend tests plus 21 subtests. Authentication tests cover login/logout CSRF, token rotation, username/email login, secure cookie attributes, all school API guards, non-administrator denial, lockouts across aliases, remember-me expiry, logout invalidation, inactivity without polling renewal, policy validation/stale writes, session revocation, logout-all, password expiry/strength, and compatibility with existing Django administrator sessions. Existing business validation tests isolate their prior behavior with the authentication guard disabled only in those test cases.

Public browser review verified the sign-in layout, password-help dialog, invalid-login error, and disabled SSO buttons. Signed-in browser review of the security settings and logout screens remains pending: automatic approval review rejected creation of a temporary privileged administrator account without specific authorization. No test administrator or stored test password was created. The database still has no administrator accounts; create your own interactively or explicitly authorize a temporary test account before those browser checks.
