from apps.core.test_finance import FinanceTests
from apps.core.test_settings import SettingsTests
from apps.core.test_attendance import AttendanceTests
from apps.core.test_library import LibraryTests
from apps.core.test_examinations import ExaminationTests
from apps.core.test_dashboard import DashboardTests
from apps.core.test_workspace import WorkspaceTests
from apps.core.test_planning import PlanningTests

__all__ = [
    "DashboardTests",
    "WorkspaceTests",
    "PlanningTests",
    "ExaminationTests",
    "LibraryTests",
    "FinanceTests",
    "SettingsTests",
    "AttendanceTests",
]
