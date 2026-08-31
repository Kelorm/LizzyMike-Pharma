"""
Django management command to restore database from backup.
Usage: python manage.py restore_backup [backup_filename]

IMPORTANT: This will overwrite the current database!
A safety backup is automatically created before restoration.
"""
import os
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from core.backup import DatabaseBackup


class Command(BaseCommand):
    help = "Restore database from a backup file"

    def add_arguments(self, parser):
        parser.add_argument(
            "backup_filename",
            nargs="?",
            type=str,
            help="Backup filename to restore (optional - will prompt if not provided)",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Skip confirmation prompts (DANGEROUS)",
        )

    def handle(self, *args, **options):
        backup = DatabaseBackup()
        backup_filename = options.get("backup_filename")
        force = options.get("force", False)

        # List available backups
        backups = backup.list_backups()
        if not backups:
            raise CommandError("❌ No backups found")

        self.stdout.write(self.style.WARNING("\n📋 AVAILABLE BACKUPS:"))
        self.stdout.write(self.style.WARNING("=" * 70))

        for i, b in enumerate(backups, 1):
            marker = "→" if i == 1 else " "
            self.stdout.write(
                f"{marker} {i}. {b['filename']:<40} {b['size_mb']:>8}MB  {b['date_str']}"
            )

        # Get backup to restore
        if backup_filename:
            # Find backup by filename
            selected_backup = None
            for b in backups:
                if b["filename"] == backup_filename:
                    selected_backup = b
                    break

            if not selected_backup:
                raise CommandError(
                    f"❌ Backup '{backup_filename}' not found"
                )
        else:
            # Let user select
            if not force:
                self.stdout.write("\nSelect backup to restore (default is 1):")
                choice = input("Enter number (1-{}): ".format(len(backups)))

                if not choice.strip():
                    choice = "1"

                try:
                    choice_num = int(choice)
                    if choice_num < 1 or choice_num > len(backups):
                        raise ValueError
                    selected_backup = backups[choice_num - 1]
                except (ValueError, IndexError):
                    raise CommandError(f"❌ Invalid choice: {choice}")
            else:
                selected_backup = backups[0]  # Use most recent

        self.stdout.write(self.style.WARNING("\n" + "=" * 70))
        self.stdout.write("⚠️  RESTORE DATABASE - CONFIRMATION REQUIRED")
        self.stdout.write("=" * 70)
        self.stdout.write(f"\nSelected backup: {selected_backup['filename']}")
        self.stdout.write(f"Size: {selected_backup['size_mb']}MB")
        self.stdout.write(f"Date: {selected_backup['date_str']}")
        self.stdout.write(f"\n🔴 WARNING: This will OVERWRITE the current database!")
        self.stdout.write(f"✓ A safety backup will be created automatically first.")
        self.stdout.write("\nThis action CANNOT be undone if something goes wrong!")

        if not force:
            self.stdout.write("\nType 'RESTORE' (uppercase) to confirm, or anything else to cancel:")
            confirmation = input()

            if confirmation != "RESTORE":
                self.stdout.write(self.style.WARNING("❌ Restore cancelled"))
                return

        # Perform restore
        self.stdout.write(self.style.WARNING("\n🔄 RESTORING DATABASE..."))
        self.stdout.write("   ⏳ Creating safety backup...")
        self.stdout.write("   ⏳ Dropping current database...")
        self.stdout.write("   ⏳ Creating new database...")
        self.stdout.write("   ⏳ Restoring from backup...")

        result = backup.restore_backup(selected_backup["path"])

        if result["status"] != "success":
            raise CommandError(
                f"❌ RESTORE FAILED: {result.get('error', 'Unknown error')}"
            )

        self.stdout.write(self.style.SUCCESS("\n✓ DATABASE RESTORE SUCCESSFUL"))
        self.stdout.write(f"  Restored from: {selected_backup['filename']}")
        self.stdout.write(
            f"  Safety backup created: {result.get('safety_backup', 'N/A')}"
        )
        self.stdout.write("\n✓ Database is now restored and ready to use!")
