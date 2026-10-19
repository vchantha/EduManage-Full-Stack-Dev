# Backend CI

GitHub Actions workflow: `.github/workflows/backend-tests.yml`.

On backend changes, run Python syntax, Ruff lint/format, PostgreSQL/Redis service health, and pytest. Once Django `manage.py` exists, also run Django system checks, migration drift checks and migrations. Until Django is scaffolded, a repository foundation test runs; this does **not** constitute application test coverage.

To run locally from `backend/`: `pip install -r requirements/dev.txt && ruff check . && ruff format --check . && pytest -q tests`.
