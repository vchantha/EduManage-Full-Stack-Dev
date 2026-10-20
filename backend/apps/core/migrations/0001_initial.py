from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []

    operations = [
        migrations.CreateModel(
            name="AcademicWorkspace",
            fields=[
                (
                    "name",
                    models.CharField(
                        default="default", max_length=50, primary_key=True, serialize=False
                    ),
                ),
                ("data", models.JSONField(default=dict)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
