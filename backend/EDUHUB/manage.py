#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    # Use lowercase module names
    settings_module = (
        "eduhubke.settings.deployment"  # Production (Render)
        if os.getenv("RENDER_EXTERNAL_HOSTNAME")
        else "EDUHUB.settings.base"  # Local dev
    )
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", settings_module)

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Did you run `pip install -r requirements.txt`?"
        ) from exc

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()