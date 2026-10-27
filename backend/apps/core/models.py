from django.db import models
from django.conf import settings
from django.utils import timezone


class AcademicWorkspace(models.Model):
    """The single-school local academic workspace, persisted in PostgreSQL."""

    name = models.CharField(max_length=50, primary_key=True, default="default")
    data = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)


class LoginThrottle(models.Model):
    key = models.CharField(max_length=64, primary_key=True)
    failures = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)


class AccountSecurity(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    password_signature = models.CharField(max_length=64)
    password_changed_at = models.DateTimeField(default=timezone.now)


class SchoolSession(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    session_key = models.CharField(max_length=40, unique=True)
    created_at = models.DateTimeField(default=timezone.now)
    last_seen = models.DateTimeField(default=timezone.now)
