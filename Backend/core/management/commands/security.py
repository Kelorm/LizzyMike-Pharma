"""
Django management command to manage account security.

Provides commands to:
- List currently locked accounts
- Unlock specific accounts
- View failed login attempts
- View security events
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Manage account security - view locked accounts, unlock users, view security events'

    def add_arguments(self, parser):
        parser.add_argument(
            'action',
            choices=['locked', 'unlock', 'attempts', 'events', 'clear'],
            help='Action to perform'
        )
        parser.add_argument(
            'username',
            nargs='?',
            help='Username (required for unlock action)'
        )
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days to look back for events/attempts (default: 7)'
        )

    def handle(self, *args, **options):
        action = options.get('action')
        username = options.get('username')
        days = options.get('days')

        if action == 'locked':
            self.list_locked_accounts()
        elif action == 'unlock':
            if not username:
                self.stdout.write(self.style.ERROR('Username required for unlock action'))
                return
            self.unlock_account(username)
        elif action == 'attempts':
            self.show_failed_attempts(days)
        elif action == 'events':
            self.show_security_events(days)
        elif action == 'clear':
            self.clear_old_records(days)

    def list_locked_accounts(self):
        """List all currently locked accounts."""
        try:
            from core.models import LockedAccount
            
            locked = LockedAccount.objects.all()
            
            if not locked:
                self.stdout.write(self.style.SUCCESS('No locked accounts'))
                return
            
            self.stdout.write(self.style.HTTP_INFO('\nLocked Accounts:'))
            self.stdout.write('=' * 70)
            
            for account in locked:
                expires = account.expires_at()
                is_expired = account.is_expired()
                
                status = self.style.WARNING('EXPIRED') if is_expired else self.style.ERROR('LOCKED')
                
                self.stdout.write(f"\nUsername: {account.username}")
                self.stdout.write(f"  Status: {status}")
                self.stdout.write(f"  Locked at: {account.locked_at}")
                self.stdout.write(f"  Expires at: {expires}")
                self.stdout.write(f"  IP Address: {account.ip_address or 'N/A'}")
            
            self.stdout.write(f"\nTotal: {locked.count()} locked account(s)")
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {e}'))

    def unlock_account(self, username):
        """Unlock a specific account."""
        try:
            from core.models import LockedAccount
            
            try:
                locked = LockedAccount.objects.get(username=username)
                locked.delete()
                self.stdout.write(self.style.SUCCESS(f'Account "{username}" has been unlocked'))
                
                # Record the event
                from core.models import SecurityEvent
                SecurityEvent.objects.create(
                    event_type='account_unlocked',
                    username=username,
                    details='Manually unlocked by admin'
                )
                
            except LockedAccount.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'Account "{username}" is not locked'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {e}'))

    def show_failed_attempts(self, days):
        """Show recent failed login attempts."""
        try:
            from core.models import FailedLoginAttempt
            
            since = timezone.now() - timedelta(days=days)
            attempts = FailedLoginAttempt.objects.filter(attempt_time__gte=since)
            
            self.stdout.write(self.style.HTTP_INFO(f'\nFailed Login Attempts (last {days} days):'))
            self.stdout.write('=' * 70)
            
            # Group by username
            from collections import Counter
            username_counts = Counter(attempts.values_list('username', flat=True))
            
            for username, count in username_counts.most_common(20):
                self.stdout.write(f"  {username}: {count} attempts")
            
            self.stdout.write(f"\nTotal: {attempts.count()} failed attempts from {len(username_counts)} users")
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {e}'))

    def show_security_events(self, days):
        """Show recent security events."""
        try:
            from core.models import SecurityEvent
            
            since = timezone.now() - timedelta(days=days)
            events = SecurityEvent.objects.filter(timestamp__gte=since)
            
            self.stdout.write(self.style.HTTP_INFO(f'\nSecurity Events (last {days} days):'))
            self.stdout.write('=' * 70)
            
            # Group by event type
            from collections import Counter
            event_counts = Counter(events.values_list('event_type', flat=True))
            
            for event_type, count in event_counts.most_common():
                self.stdout.write(f"  {event_type}: {count}")
            
            # Show recent events
            self.stdout.write(self.style.HTTP_INFO('\nRecent Events:'))
            for event in events.order_by('-timestamp')[:10]:
                self.stdout.write(f"  [{event.timestamp}] {event.event_type} - {event.username or event.ip_address}")
            
            self.stdout.write(f"\nTotal: {events.count()} events")
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {e}'))

    def clear_old_records(self, days):
        """Clear old security records."""
        try:
            from core.models import FailedLoginAttempt, APIRequestLog
            
            since = timezone.now() - timedelta(days=days)
            
            # Clear failed login attempts
            deleted_attempts = FailedLoginAttempt.objects.filter(
                attempt_time__lt=since
            ).delete()[0]
            
            # Clear old API logs (keep more recent)
            older = timezone.now() - timedelta(days=min(days, 90))
            deleted_logs = APIRequestLog.objects.filter(
                timestamp__lt=older
            ).delete()[0]
            
            self.stdout.write(self.style.SUCCESS(f'Cleared old records:'))
            self.stdout.write(f"  - {deleted_attempts} failed login attempts")
            self.stdout.write(f"  - {deleted_logs} API request logs")
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {e}'))