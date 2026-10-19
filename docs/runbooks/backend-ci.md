# Backend CI

The GitHub Actions backend-tests workflow runs on backend changes and manually. It starts PostgreSQL 17 and Redis 7, installs development requirements, checks Ruff lint/format, Django system checks, migration drift, applies migrations and runs pytest against PostgreSQL. Production deployment is not part of this workflow.
