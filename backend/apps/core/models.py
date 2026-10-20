from django.db import models


class AcademicWorkspace(models.Model):
    """The single-school local academic workspace, persisted in PostgreSQL."""

    name = models.CharField(max_length=50, primary_key=True, default="default")
    data = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)
