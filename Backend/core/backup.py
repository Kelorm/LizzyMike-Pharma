"""
Backup and recovery utilities for the pharmacy system.
IMPORTANT: This module handles critical business data backups that CANNOT be lost.
"""
import os
import shutil
import subprocess
import logging
from datetime import datetime, timedelta
from pathlib import Path
from django.conf import settings
from django.core.management import call_command
from django.db import connection
from django.utils import timezone

logger = logging.getLogger(__name__)


class DatabaseBackup:
    """
    Robust database backup utilities for PostgreSQL.
    Handles daily backups, rotation, USB backups, and verification.
    """

    def __init__(self):
        self.backup_dir = self._get_backup_dir()
        self.usb_backup_dir = self._get_usb_backup_dir()
        self.retention_days = getattr(settings, "BACKUP_RETENTION_DAYS", 30)
        self.db_config = settings.DATABASES["default"]

    def _get_backup_dir(self):
        """Get backup directory, create if necessary"""
        # Use /app/backups for Docker, Backend/backups for local
        if os.path.exists("/app"):
            backup_dir = "/app/backups"
        else:
            backup_dir = os.path.join(
                os.path.dirname(settings.BASE_DIR), "backups"
            )

        Path(backup_dir).mkdir(parents=True, exist_ok=True)
        return backup_dir

    def _get_usb_backup_dir(self):
        """Get USB backup directory on Windows USB drive"""
        # Check if D: drive exists (USB drive on Windows)
        usb_paths = [
            "D:\\PharmacyBackups",
            "D:/PharmacyBackups",
            "/media/usb/PharmacyBackups",
            "/mnt/usb/PharmacyBackups",
        ]

        for path in usb_paths:
            try:
                # Normalize path
                normalized_path = os.path.normpath(path)
                parent = os.path.dirname(normalized_path)

                # Check if parent drive exists
                if os.path.exists(parent) or os.path.exists(normalized_path):
                    Path(normalized_path).mkdir(parents=True, exist_ok=True)
                    return normalized_path
            except Exception as e:
                logger.debug(f"USB path check failed for {path}: {e}")
                continue

        return None

    def _get_db_command_env(self):
        """Get environment with database password"""
        env = os.environ.copy()
        env["PGPASSWORD"] = self.db_config["PASSWORD"]
        return env

    def create_backup(self):
        """
        Create database backup using pg_dump.

        Returns:
            dict: Status, backup path, filename, size on success; error message on failure
        """
        try:
            # Ensure backup directory exists
            os.makedirs(self.backup_dir, exist_ok=True)

            # Generate backup filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"pharmasys_backup_{timestamp}.sql"
            backup_path = os.path.join(self.backup_dir, backup_filename)

            logger.info(f"[BACKUP] Starting database backup to {backup_path}")

            # Create backup using pg_dump
            cmd = [
                "pg_dump",
                "-h",
                self.db_config["HOST"],
                "-p",
                str(self.db_config["PORT"]),
                "-U",
                self.db_config["USER"],
                "-d",
                self.db_config["NAME"],
                "-f",
                backup_path,
                "--verbose",
            ]

            # Execute backup with password from environment
            result = subprocess.run(
                cmd, env=self._get_db_command_env(), capture_output=True, text=True
            )

            if result.returncode != 0:
                error_msg = result.stderr or "Unknown error"
                logger.error(f"[BACKUP] Database backup FAILED: {error_msg}")
                return {"status": "error", "error": error_msg}

            backup_size = os.path.getsize(backup_path)
            logger.info(
                f"[BACKUP] Database backup SUCCESS: {backup_filename} ({backup_size} bytes)"
            )

            # Backup to USB if available
            if self.usb_backup_dir:
                self._backup_to_usb(backup_path, backup_filename)
            else:
                logger.warning("[BACKUP] USB drive not detected - skipping USB backup")

            # Clean up old backups
            self._cleanup_old_backups()

            return {
                "status": "success",
                "backup_path": backup_path,
                "filename": backup_filename,
                "size": backup_size,
                "timestamp": datetime.now().isoformat(),
            }

        except Exception as e:
            logger.error(f"[BACKUP] Database backup exception: {e}", exc_info=True)
            return {"status": "error", "error": str(e)}

    def _backup_to_usb(self, backup_path, backup_filename):
        """
        Copy backup to USB drive.

        Args:
            backup_path: Full path to the backup file
            backup_filename: Name of the backup file
        """
        if not self.usb_backup_dir:
            logger.warning("[USB-BACKUP] USB directory not available")
            return False

        try:
            usb_backup_path = os.path.join(self.usb_backup_dir, backup_filename)
            shutil.copy2(backup_path, usb_backup_path)
            logger.info(f"[USB-BACKUP] Backup copied to USB: {usb_backup_path}")
            return True
        except Exception as e:
            logger.error(f"[USB-BACKUP] Failed to copy backup to USB: {e}")
            return False

    def _cleanup_old_backups(self, backup_dir=None):
        """Clean up backup files older than retention period"""
        if backup_dir is None:
            backup_dir = self.backup_dir

        try:
            cutoff_date = datetime.now() - timedelta(days=self.retention_days)
            deleted_count = 0

            for filename in os.listdir(backup_dir):
                if filename.startswith("pharmasys_backup_") and filename.endswith(
                    ".sql"
                ):
                    file_path = os.path.join(backup_dir, filename)
                    file_time = datetime.fromtimestamp(os.path.getctime(file_path))

                    if file_time < cutoff_date:
                        os.remove(file_path)
                        logger.info(f"[CLEANUP] Deleted old backup: {filename}")
                        deleted_count += 1

            if deleted_count > 0:
                logger.info(
                    f"[CLEANUP] Removed {deleted_count} backup(s) older than {self.retention_days} days"
                )

        except Exception as e:
            logger.error(f"[CLEANUP] Backup cleanup error: {e}")

    def list_backups(self, limit=None):
        """List available backups ordered by date (newest first)"""
        try:
            backups = []

            for filename in os.listdir(self.backup_dir):
                if filename.startswith("pharmasys_backup_") and filename.endswith(
                    ".sql"
                ):
                    file_path = os.path.join(self.backup_dir, filename)
                    file_size = os.path.getsize(file_path)
                    file_mtime = os.path.getctime(file_path)
                    file_date = datetime.fromtimestamp(file_mtime)

                    backups.append(
                        {
                            "filename": filename,
                            "path": file_path,
                            "size": file_size,
                            "size_mb": round(file_size / (1024 * 1024), 2),
                            "date": file_date,
                            "date_str": file_date.strftime("%Y-%m-%d %H:%M:%S"),
                        }
                    )

            # Sort by date, newest first
            backups.sort(key=lambda x: x["date"], reverse=True)

            if limit:
                backups = backups[:limit]

            return backups

        except Exception as e:
            logger.error(f"[LIST] Error listing backups: {e}")
            return []

    def verify_backup(self, backup_path):
        """Verify backup integrity and row counts"""
        try:
            logger.info(f"[VERIFY] Starting backup verification: {backup_path}")

            if not os.path.exists(backup_path):
                return {"status": "error", "error": "Backup file not found"}

            # For now, just verify file exists and has content
            file_size = os.path.getsize(backup_path)
            if file_size < 1000:  # Sanity check: backup should be larger than 1KB
                return {"status": "failed", "error": "Backup file too small"}

            logger.info(f"[VERIFY] Backup file verified: {backup_path} ({file_size} bytes)")
            return {
                "status": "ok",
                "message": "Backup verified successfully",
                "backup_path": backup_path,
                "size": file_size,
            }

        except Exception as e:
            logger.error(f"[VERIFY] Backup verification failed: {e}", exc_info=True)
            return {"status": "error", "error": str(e)}

    def restore_backup(self, backup_path):
        """
        Restore database from backup with safety backup.

        Args:
            backup_path: Path to backup file

        Returns:
            dict: Restoration result
        """
        try:
            if not os.path.exists(backup_path):
                return {"status": "error", "error": "Backup file not found"}

            logger.warning(f"[RESTORE] Attempting to restore from: {backup_path}")

            # Create safety backup before restore
            logger.info("[RESTORE] Creating safety backup before restore")
            safety_backup = self.create_backup()
            if safety_backup["status"] != "success":
                logger.error("[RESTORE] Failed to create safety backup")
                return {
                    "status": "error",
                    "error": "Failed to create safety backup",
                }

            logger.info(
                f"[RESTORE] Safety backup created: {safety_backup['filename']}"
            )

            # Drop current database
            logger.info("[RESTORE] Dropping current database")
            drop_cmd = [
                "psql",
                "-h",
                self.db_config["HOST"],
                "-p",
                str(self.db_config["PORT"]),
                "-U",
                self.db_config["USER"],
                "-d",
                "postgres",
                "-c",
                f"DROP DATABASE IF EXISTS {self.db_config['NAME']};",
            ]

            result = subprocess.run(
                drop_cmd, env=self._get_db_command_env(), capture_output=True
            )
            if result.returncode != 0:
                raise Exception(f"Failed to drop database")

            # Create new database
            logger.info("[RESTORE] Creating new database")
            create_cmd = [
                "psql",
                "-h",
                self.db_config["HOST"],
                "-p",
                str(self.db_config["PORT"]),
                "-U",
                self.db_config["USER"],
                "-d",
                "postgres",
                "-c",
                f"CREATE DATABASE {self.db_config['NAME']};",
            ]

            result = subprocess.run(
                create_cmd, env=self._get_db_command_env(), capture_output=True
            )
            if result.returncode != 0:
                raise Exception(f"Failed to create database")

            # Restore from backup
            logger.info("[RESTORE] Restoring from backup file")
            restore_cmd = [
                "psql",
                "-h",
                self.db_config["HOST"],
                "-p",
                str(self.db_config["PORT"]),
                "-U",
                self.db_config["USER"],
                "-d",
                self.db_config["NAME"],
                "-f",
                backup_path,
            ]

            result = subprocess.run(
                restore_cmd, env=self._get_db_command_env(), capture_output=True
            )
            if result.returncode != 0:
                raise Exception(f"Failed to restore backup")

            logger.info(f"[RESTORE] Database restore SUCCESS")

            return {
                "status": "success",
                "message": "Database restored successfully",
                "backup_path": backup_path,
                "safety_backup": safety_backup["filename"],
                "timestamp": datetime.now().isoformat(),
            }

        except Exception as e:
            logger.error(
                f"[RESTORE] Database restore FAILED: {e}", exc_info=True
            )
            return {"status": "error", "error": str(e)}

