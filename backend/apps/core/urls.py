from django.urls import path
from .views import health
from .workspace_views import workspace
from .dashboard_views import dashboard

urlpatterns = [
    path("dashboard/", dashboard, name="dashboard"),
    path("health/", health, name="health"),
    path("workspace/", workspace, name="workspace"),
]
