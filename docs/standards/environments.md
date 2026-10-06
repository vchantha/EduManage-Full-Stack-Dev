# Environment Standard

Development runs locally with Docker Compose. Staging is production-like and used for integration/UAT. Production uses external secret management, persistent PostgreSQL storage, backups, health checks and controlled deployment. Never commit environment secrets. Keep configuration names consistent across environments and vary values through environment injection.
