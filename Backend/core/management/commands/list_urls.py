"""
Management command: list_urls
Lists all registered Django URL patterns with their view names and methods.

Usage:
    python manage.py list_urls
    python manage.py list_urls --format=json
    python manage.py list_urls --filter=api
"""

from django.core.management.base import BaseCommand
from django.urls import get_resolver
from django.urls.resolvers import URLPattern, URLResolver
import json
from pathlib import Path


class Command(BaseCommand):
    help = 'List all registered Django URL patterns'

    def add_arguments(self, parser):
        parser.add_argument(
            '--format',
            type=str,
            default='table',
            choices=['table', 'json', 'csv'],
            help='Output format (table, json, or csv)'
        )
        parser.add_argument(
            '--filter',
            type=str,
            help='Filter URLs containing this string'
        )
        parser.add_argument(
            '--version',
            action='store_true',
            help='Show API version patterns only'
        )

    def handle(self, *args, **options):
        resolver = get_resolver()
        urls = self.get_all_urls(resolver)

        # Filter if requested
        if options['filter']:
            urls = [u for u in urls if options['filter'].lower() in u['pattern'].lower()]

        if options['version']:
            urls = [u for u in urls if '/api/v' in u['pattern']]

        # Format output
        fmt = options['format']
        if fmt == 'json':
            self.output_json(urls)
        elif fmt == 'csv':
            self.output_csv(urls)
        else:
            self.output_table(urls)

    def get_all_urls(self, resolver, prefix=''):
        """Recursively get all URL patterns from the resolver."""
        urls = []
        
        for pattern in resolver.url_patterns:
            if isinstance(pattern, URLResolver):
                # Nested URL patterns (includes)
                nested_prefix = prefix + str(pattern.pattern)
                urls.extend(self.get_all_urls(pattern, nested_prefix))
            elif isinstance(pattern, URLPattern):
                # Actual URL endpoint
                full_pattern = prefix + str(pattern.pattern)
                
                # Get view information
                view = pattern.callback
                view_name = getattr(view, '__name__', str(view))
                
                # Get HTTP methods for viewsets/views
                methods = self.get_view_methods(view)
                
                urls.append({
                    'pattern': full_pattern,
                    'name': pattern.name or 'N/A',
                    'view': view_name,
                    'methods': methods,
                })
        
        return urls

    def get_view_methods(self, view):
        """Extract HTTP methods from a view."""
        methods = []
        
        # Check for ViewSet or APIView
        if hasattr(view, 'cls'):
            # Class-based view
            view_class = view.cls
            for method in ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']:
                if hasattr(view_class, method):
                    methods.append(method.upper())
        elif hasattr(view, 'actions'):
            # ViewSet with actions
            if hasattr(view, 'actions'):
                for action_method in view.actions.values():
                    methods.append(action_method.upper())
        else:
            # Try to infer from standard method attributes
            for method in ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']:
                if hasattr(view, method):
                    methods.append(method.upper())
        
        return ', '.join(sorted(set(methods))) if methods else 'N/A'

    def output_table(self, urls):
        """Output URLs in table format."""
        # Calculate column widths
        pattern_width = max(len(u['pattern']) for u in urls) if urls else 20
        name_width = max(len(u['name']) for u in urls) if urls else 10
        view_width = max(len(u['view']) for u in urls) if urls else 10
        methods_width = max(len(u['methods']) for u in urls) if urls else 8

        pattern_width = max(pattern_width, len('Pattern'))
        name_width = max(name_width, len('Name'))
        view_width = max(view_width, len('View'))
        methods_width = max(methods_width, len('Methods'))

        # Header
        self.stdout.write(self.style.SUCCESS('=' * (pattern_width + name_width + view_width + methods_width + 12)))
        self.stdout.write(
            f"{'Pattern':<{pattern_width}} | {'Name':<{name_width}} | {'View':<{view_width}} | {'Methods':<{methods_width}}"
        )
        self.stdout.write(self.style.SUCCESS('=' * (pattern_width + name_width + view_width + methods_width + 12)))

        # Rows
        for url in urls:
            self.stdout.write(
                f"{url['pattern']:<{pattern_width}} | {url['name']:<{name_width}} | {url['view']:<{view_width}} | {url['methods']:<{methods_width}}"
            )

        # Footer
        self.stdout.write(self.style.SUCCESS('=' * (pattern_width + name_width + view_width + methods_width + 12)))
        self.stdout.write(self.style.SUCCESS(f"\nTotal endpoints: {len(urls)}"))

        # Group by API version
        v1_urls = [u for u in urls if '/api/v1' in u['pattern']]
        admin_urls = [u for u in urls if '/admin' in u['pattern']]
        other_urls = [u for u in urls if u not in v1_urls and u not in admin_urls]

        self.stdout.write(f"\n📊 Summary:")
        self.stdout.write(f"  • API v1 endpoints: {len(v1_urls)}")
        self.stdout.write(f"  • Admin endpoints: {len(admin_urls)}")
        self.stdout.write(f"  • Other endpoints: {len(other_urls)}")

    def output_json(self, urls):
        """Output URLs in JSON format."""
        output = {
            'total': len(urls),
            'endpoints': urls,
            'summary': {
                'api_v1': len([u for u in urls if '/api/v1' in u['pattern']]),
                'admin': len([u for u in urls if '/admin' in u['pattern']]),
                'other': len([u for u in urls if '/api/v1' not in u['pattern'] and '/admin' not in u['pattern']]),
            }
        }
        self.stdout.write(json.dumps(output, indent=2))

    def output_csv(self, urls):
        """Output URLs in CSV format."""
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=['pattern', 'name', 'view', 'methods'])
        writer.writeheader()
        writer.writerows(urls)
        
        self.stdout.write(output.getvalue())
