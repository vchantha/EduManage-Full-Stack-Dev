from django.urls import path
from .views import health
from .workspace_views import workspace
from .dashboard_views import dashboard
from .planning_views import planning
from .examination_views import examinations
from .library_views import library
from .finance_views import finance
from .settings_views import school_settings
from .attendance_views import attendance
from .auth_views import auth_session, auth_login, auth_logout, auth_settings, auth_sessions

urlpatterns = [
    path("auth/session/", auth_session, name="auth-session"),
    path("auth/login/", auth_login, name="auth-login"),
    path("auth/logout/", auth_logout, name="auth-logout"),
    path("auth/policy/", auth_settings, name="auth-policy"),
    path("auth/sessions/", auth_sessions, name="auth-sessions"),
    path("attendance/", attendance, name="attendance"),
    path("settings/", school_settings, name="school-settings"),
    path("finance/", finance, name="finance"),
    path("library/", library, name="library"),
    path("examinations/", examinations, name="examinations"),
    path("planning/", planning, name="planning"),
    path("dashboard/", dashboard, name="dashboard"),
    path("health/", health, name="health"),
    path("workspace/", workspace, name="workspace"),
]
