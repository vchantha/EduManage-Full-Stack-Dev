from django.urls import path
from .views import health
from .workspace_views import workspace

urlpatterns = [path('health/', health, name='health'), path('workspace/', workspace, name='workspace')]
