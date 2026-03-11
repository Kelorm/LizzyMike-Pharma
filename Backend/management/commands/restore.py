"""
Django management command for restoring backups
"""
from django.core.management.base import BaseCommand
from core.backup import DatabaseBackup, DisasterRecovery

class Command(BaseCommand):
    help = 'Restore system from backup'
    
    def add_arguments(self, parser):
        parser.add_argument(
            'backup_path',
            help='Path to backup file'
        )
        parser.add_argument(
            '--media-backup',
            help='Path to media backup file (optional)'
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm restore operation'
        )
    
    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(
                self.style.WARNING(
                    'This will overwrite the current database!'
                )
            )
            self.stdout.write(
                'Use --confirm flag to proceed with restore'
            )
            return
        
        backup_path = options['backup_path']
        media_backup = options.get('media_backup')
        
        self.stdout.write(f'Restoring from backup: {backup_path}')
        
        # Create disaster recovery instance
        dr = DisasterRecovery()
        
        # Perform restore
        result = dr.full_system_restore(backup_path, media_backup)
        
        if result['status'] == 'success':
            self.stdout.write(
                self.style.SUCCESS('System restore completed successfully')
            )
        else:
            self.stdout.write(
                self.style.ERROR(f"Restore failed: {result['error']}")
            )





