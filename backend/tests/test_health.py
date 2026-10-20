import pytest
from django.urls import reverse


@pytest.mark.django_db
def test_health_returns_ok(client):
    response = client.get(reverse("health"))
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


@pytest.mark.django_db
def test_postgresql_connection_works():
    from django.db import connection

    assert connection.vendor == "postgresql"
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        assert cursor.fetchone()[0] == 1
