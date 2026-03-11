"""
Backup and recovery utilities for the pharmacy system
"""
import os
import shutil
import subprocess
import logging
from datetime import datetime, timedelta
from django.conf import settings
from django.core.management import call_command
from django.db import connection
from django.utils import timezone
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

class DatabaseBackup:
    """Database backup utilities"""
    
    def __init__(self):
        self.backup_dir = getattr(settings, 'BACKUP_DIR', '/backups')
        self.aws_s3_bucket = getattr(settings, 'AWS_BACKUP_BUCKET', None)
        self.retention_days = getattr(settings, 'BACKUP_RETENTION_DAYS', 30)
    
    def create_backup(self):
        """Create database backup"""
        try:
            # Ensure backup directory exists
            os.makedirs(self.backup_dir, exist_ok=True)
            
            # Generate backup filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f"pharmasys_backup_{timestamp}.sql"
            backup_path = os.path.join(self.backup_dir, backup_filename)
            
            # Get database configuration
            db_config = settings.DATABASES['default']
            
            # Create backup using pg_dump
            cmd = [
                'pg_dump',
                '-h', db_config['HOST'],
                '-p', str(db_config['PORT']),
                '-U', db_config['USER'],
                '-d', db_config['NAME'],
                '-f', backup_path,
                '--verbose',
                '--no-password'
            ]
            
            # Set password via environment variable
            env = os.environ.copy()
            env['PGPASSWORD'] = db_config['PASSWORD']
            
            # Execute backup
            result = subprocess.run(cmd, env=env, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info(f"Database backup created: {backup_path}")
                
                # Upload to S3 if configured
                if self.aws_s3_bucket:
                    self.upload_to_s3(backup_path, backup_filename)
                
                # Clean up old backups
                self.cleanup_old_backups()
                
                return {
                    'status': 'success',
                    'backup_path': backup_path,
                    'filename': backup_filename,
                    'size': os.path.getsize(backup_path)
                }
            else:
                logger.error(f"Database backup failed: {result.stderr}")
                return {
                    'status': 'error',
                    'error': result.stderr
                }
                
        except Exception as e:
            logger.error(f"Database backup error: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def upload_to_s3(self, local_path, filename):
        """Upload backup to S3"""
        try:
            s3_client = boto3.client('s3')
            
            s3_key = f"database-backups/{filename}"
            
            s3_client.upload_file(
                local_path,
                self.aws_s3_bucket,
                s3_key,
                ExtraArgs={
                    'ServerSideEncryption': 'AES256',
                    'StorageClass': 'STANDARD_IA'
                }
            )
            
            logger.info(f"Backup uploaded to S3: s3://{self.aws_s3_bucket}/{s3_key}")
            
        except ClientError as e:
            logger.error(f"S3 upload failed: {e}")
            raise
    
    def cleanup_old_backups(self):
        """Clean up old backup files"""
        try:
            cutoff_date = datetime.now() - timedelta(days=self.retention_days)
            
            for filename in os.listdir(self.backup_dir):
                if filename.startswith('pharmasys_backup_'):
                    file_path = os.path.join(self.backup_dir, filename)
                    file_time = datetime.fromtimestamp(os.path.getctime(file_path))
                    
                    if file_time < cutoff_date:
                        os.remove(file_path)
                        logger.info(f"Deleted old backup: {filename}")
                        
        except Exception as e:
            logger.error(f"Backup cleanup error: {e}")
    
    def restore_backup(self, backup_path):
        """Restore database from backup"""
        try:
            db_config = settings.DATABASES['default']
            
            # Drop and recreate database
            drop_cmd = [
                'psql',
                '-h', db_config['HOST'],
                '-p', str(db_config['PORT']),
                '-U', db_config['USER'],
                '-d', 'postgres',
                '-c', f'DROP DATABASE IF EXISTS {db_config["NAME"]};'
            ]
            
            create_cmd = [
                'psql',
                '-h', db_config['HOST'],
                '-p', str(db_config['PORT']),
                '-U', db_config['USER'],
                '-d', 'postgres',
                '-c', f'CREATE DATABASE {db_config["NAME"]};'
            ]
            
            restore_cmd = [
                'psql',
                '-h', db_config['HOST'],
                '-p', str(db_config['PORT']),
                '-U', db_config['USER'],
                '-d', db_config['NAME'],
                '-f', backup_path
            ]
            
            env = os.environ.copy()
            env['PGPASSWORD'] = db_config['PASSWORD']
            
            # Execute restore
            subprocess.run(drop_cmd, env=env, check=True)
            subprocess.run(create_cmd, env=env, check=True)
            subprocess.run(restore_cmd, env=env, check=True)
            
            logger.info(f"Database restored from: {backup_path}")
            return {'status': 'success'}
            
        except Exception as e:
            logger.error(f"Database restore error: {e}")
            return {'status': 'error', 'error': str(e)}

class MediaBackup:
    """Media files backup utilities"""
    
    def __init__(self):
        self.media_dir = settings.MEDIA_ROOT
        self.backup_dir = getattr(settings, 'MEDIA_BACKUP_DIR', '/backups/media')
        self.aws_s3_bucket = getattr(settings, 'AWS_BACKUP_BUCKET', None)
    
    def create_backup(self):
        """Create media files backup"""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f"media_backup_{timestamp}.tar.gz"
            backup_path = os.path.join(self.backup_dir, backup_filename)
            
            # Create backup directory
            os.makedirs(self.backup_dir, exist_ok=True)
            
            # Create tar.gz archive
            cmd = [
                'tar',
                '-czf',
                backup_path,
                '-C',
                os.path.dirname(self.media_dir),
                os.path.basename(self.media_dir)
            ]
            
            subprocess.run(cmd, check=True)
            
            logger.info(f"Media backup created: {backup_path}")
            
            # Upload to S3 if configured
            if self.aws_s3_bucket:
                self.upload_to_s3(backup_path, backup_filename)
            
            return {
                'status': 'success',
                'backup_path': backup_path,
                'filename': backup_filename,
                'size': os.path.getsize(backup_path)
            }
            
        except Exception as e:
            logger.error(f"Media backup error: {e}")
            return {'status': 'error', 'error': str(e)}
    
    def upload_to_s3(self, local_path, filename):
        """Upload media backup to S3"""
        try:
            s3_client = boto3.client('s3')
            
            s3_key = f"media-backups/{filename}"
            
            s3_client.upload_file(
                local_path,
                self.aws_s3_bucket,
                s3_key,
                ExtraArgs={
                    'ServerSideEncryption': 'AES256',
                    'StorageClass': 'STANDARD_IA'
                }
            )
            
            logger.info(f"Media backup uploaded to S3: s3://{self.aws_s3_bucket}/{s3_key}")
            
        except ClientError as e:
            logger.error(f"S3 upload failed: {e}")
            raise

class BackupScheduler:
    """Backup scheduling and automation"""
    
    def __init__(self):
        self.db_backup = DatabaseBackup()
        self.media_backup = MediaBackup()
    
    def run_scheduled_backup(self):
        """Run scheduled backup"""
        logger.info("Starting scheduled backup...")
        
        # Database backup
        db_result = self.db_backup.create_backup()
        logger.info(f"Database backup result: {db_result}")
        
        # Media backup
        media_result = self.media_backup.create_backup()
        logger.info(f"Media backup result: {media_result}")
        
        return {
            'database': db_result,
            'media': media_result,
            'timestamp': timezone.now().isoformat()
        }
    
    def verify_backup_integrity(self, backup_path):
        """Verify backup file integrity"""
        try:
            if backup_path.endswith('.sql'):
                # Verify SQL backup
                with open(backup_path, 'r') as f:
                    content = f.read()
                    if 'CREATE TABLE' in content and 'INSERT INTO' in content:
                        return True
            elif backup_path.endswith('.tar.gz'):
                # Verify tar.gz backup
                result = subprocess.run(['tar', '-tzf', backup_path], 
                                      capture_output=True, text=True)
                return result.returncode == 0
            
            return False
            
        except Exception as e:
            logger.error(f"Backup verification error: {e}")
            return False

class DisasterRecovery:
    """Disaster recovery utilities"""
    
    def __init__(self):
        self.db_backup = DatabaseBackup()
    
    def full_system_restore(self, db_backup_path, media_backup_path=None):
        """Perform full system restore"""
        try:
            logger.info("Starting full system restore...")
            
            # Restore database
            db_result = self.db_backup.restore_backup(db_backup_path)
            if db_result['status'] != 'success':
                return db_result
            
            # Restore media files if provided
            if media_backup_path:
                self.restore_media_files(media_backup_path)
            
            # Run migrations
            call_command('migrate')
            
            # Collect static files
            call_command('collectstatic', '--noinput')
            
            logger.info("Full system restore completed")
            return {'status': 'success'}
            
        except Exception as e:
            logger.error(f"System restore error: {e}")
            return {'status': 'error', 'error': str(e)}
    
    def restore_media_files(self, media_backup_path):
        """Restore media files from backup"""
        try:
            # Extract media backup
            cmd = ['tar', '-xzf', media_backup_path, '-C', '/tmp']
            subprocess.run(cmd, check=True)
            
            # Copy to media directory
            extracted_dir = '/tmp/media'
            if os.path.exists(extracted_dir):
                shutil.rmtree(settings.MEDIA_ROOT)
                shutil.move(extracted_dir, settings.MEDIA_ROOT)
            
            logger.info("Media files restored")
            
        except Exception as e:
            logger.error(f"Media restore error: {e}")
            raise





