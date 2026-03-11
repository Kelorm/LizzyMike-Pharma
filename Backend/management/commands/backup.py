"""
Django management command for creating backups
"""
from django.core.management.base import BaseCommand
from core.backup import DatabaseBackup, MediaBackup, BackupScheduler

class Command(BaseCommand):
    help = 'Create system backups'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--type',
            choices=['database', 'media', 'full'],
            default='full',
            help='Type of backup to create'
        )
        parser.add_argument(
            '--upload-s3',
            action='store_true',
            help='Upload backup to S3'
        )
    
    def handle(self, *args, **options):
        backup_type = options['type']
        
        if backup_type == 'database':
            self.backup_database()
        elif backup_type == 'media':
            self.backup_media()
        elif backup_type == 'full':
            self.backup_full()
    
    def backup_database(self):
        """Create database backup"""
        self.stdout.write('Creating database backup...')
        
        db_backup = DatabaseBackup()
        result = db_backup.create_backup()
        
        if result['status'] == 'success':
            self.stdout.write(
                self.style.SUCCESS(
                    f"Database backup created: {result['backup_path']}"
                )
            )
        else:
            self.stdout.write(
                self.style.ERROR(f"Database backup failed: {result['error']}")
            )
    
    def backup_media(self):
        """Create media backup"""
        self.stdout.write('Creating media backup...')
        
        media_backup = MediaBackup()
        result = media_backup.create_backup()
        
        if result['status'] == 'success':
            self.stdout.write(
                self.style.SUCCESS(
                    f"Media backup created: {result['backup_path']}"
                )
            )
        else:
            self.stdout.write(
                self.style.ERROR(f"Media backup failed: {result['error']}")
            )
    
    def backup_full(self):
        """Create full system backup"""
        self.stdout.write('Creating full system backup...')
        
        scheduler = BackupScheduler()
        result = scheduler.run_scheduled_backup()
        
        self.stdout.write(
            self.style.SUCCESS('Full backup completed')
        )
        self.stdout.write(f"Database: {result['database']['status']}")
        self.stdout.write(f"Media: {result['media']['status']}")





