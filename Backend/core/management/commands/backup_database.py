"""
Django management command to create immediate database backup.
Usage: python manage.py backup_database
"""
import os
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from core.backup import DatabaseBackup


class Command(BaseCommand):
    help = "Create an immediate database backup"

    def add_arguments(self, parser):
        parser.add_argument(
            "--verify",
            action="store_true",
            help="Verify backup after creation",
        )
        parser.add_argument(
            "--usb-only",
            action="store_true",
            help="Only copy to USB, don't create new backup",
        )

    def handle(self, *args, **options):
        backup = DatabaseBackup()

        if options["usb_only"]:
            self.stdout.write(
                self.style.WARNING("⚠️  USB-Only Mode - Copying existing backups to USB")
            )
            backups = backup.list_backups(limit=5)
            if not backups:
                raise CommandError("No backups found to copy to USB")

            if not backup.usb_backup_dir:
                raise CommandError(
                    "❌ USB drive not detected! "
                    "Connect USB drive (D:) to continue"
                )

            for b in backups:
                if backup._backup_to_usb(b["path"], b["filename"]):
                    self.stdout.write(
                        self.style.SUCCESS(f"  ✓ Copied {b['filename']}")
                    )

            self.stdout.write(
                self.style.SUCCESS(
                    f"\n✓ Backups copied to: {backup.usb_backup_dir}"
                )
            )
            return

        # Create backup
        self.stdout.write(
            self.style.WARNING("\n🔄 Creating database backup...")
        )
        result = backup.create_backup()

        if result["status"] != "success":
            raise CommandError(f"Backup failed: {result.get('error', 'Unknown error')}")

        self.stdout.write(
            self.style.SUCCESS(f"\n✓ BACKUP SUCCESS")
        )
        self.stdout.write(f"  Filename: {result['filename']}")
        self.stdout.write(f"  Path: {result['backup_path']}")
        self.stdout.write(f"  Size: {result['size']:,} bytes")

        # Show USB status
        if backup.usb_backup_dir:
            self.stdout.write(
                self.style.SUCCESS(f"  ✓ USB Backup: {backup.usb_backup_dir}")
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    "  ⚠️  USB drive not detected - no USB copy created"
                )
            )

        # Verify if requested
        if options["verify"]:
            self.stdout.write(self.style.WARNING("\n🔍 Verifying backup..."))
            verify_result = backup.verify_backup(result["backup_path"])

            if verify_result["status"] == "ok":
                self.stdout.write(
                    self.style.SUCCESS(f"\n✓ BACKUP VERIFIED")
                )
                self.stdout.write(
                    f"  Tables verified: {verify_result.get('tables_verified', 0)}"
                )
            else:
                raise CommandError(
                    f"Verification failed: {verify_result.get('message', 'Unknown error')}"
                )

        # Show latest backups
        self.stdout.write(self.style.WARNING("\n📋 Latest 5 Backups:"))
        backups = backup.list_backups(limit=5)
        for i, b in enumerate(backups, 1):
            self.stdout.write(
                f"  {i}. {b['filename']} - {b['size_mb']}MB - {b['date_str']}"
            )
