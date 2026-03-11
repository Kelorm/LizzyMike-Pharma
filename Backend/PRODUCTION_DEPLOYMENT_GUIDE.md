# Pharmasys Production Deployment Guide

This guide will help you deploy the Pharmasys application to production.

## Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL 12+ (recommended) or SQLite
- Redis (for caching and Celery)
- Nginx (recommended for web server)
- SSL Certificate (for HTTPS)

## 1. Backend Deployment

### Step 1: Configure Environment Variables

1. Copy the environment template:
```bash
cp env.production.template .env
```

2. Edit the `.env` file with your production values:
```bash
nano .env
```

Key variables to update:
- `SECRET_KEY`: Generate a new secret key for production
- `DEBUG`: Set to `False`
- `ALLOWED_HOSTS`: Add your domain name
- `DB_*`: Configure your database settings
- `EMAIL_*`: Configure email settings
- `CORS_ALLOWED_ORIGINS`: Add your frontend domain

### Step 2: Database Setup

#### Option A: PostgreSQL (Recommended)
```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE pharmasys;
CREATE USER pharmasys_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE pharmasys TO pharmasys_user;
\q
```

#### Option B: SQLite (Development only)
SQLite will be used automatically if PostgreSQL is not configured.

### Step 3: Deploy Backend

1. Run the deployment script:
```bash
chmod +x scripts/deploy_production.sh
./scripts/deploy_production.sh
```

2. Or manually:
```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Create superuser
python manage.py createsuperuser
```

### Step 4: Start Backend Server

Using Gunicorn:
```bash
gunicorn --config gunicorn.conf.py pharmasys.wsgi:application
```

## 2. Frontend Deployment

### Step 1: Configure Environment Variables

Edit `pharmasys-frontend/env.production`:
```
REACT_APP_API_URL=https://your-api-domain.com
REACT_APP_ENVIRONMENT=production
REACT_APP_VERSION=1.0.0
GENERATE_SOURCEMAP=false
```

### Step 2: Build Frontend

```bash
cd pharmasys-frontend

# Install dependencies
npm install

# Build for production
npm run build:prod
```

### Step 3: Deploy Frontend

#### Option A: Using Nginx
```bash
# Copy built files to nginx directory
sudo cp -r build/* /var/www/html/

# Configure nginx (see nginx.conf)
sudo cp nginx.conf /etc/nginx/sites-available/pharmasys
sudo ln -s /etc/nginx/sites-available/pharmasys /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Option B: Using Docker
```bash
# Build and run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

## 3. Web Server Configuration (Nginx)

### SSL Configuration

1. Obtain SSL certificates (Let's Encrypt recommended):
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

2. Update nginx configuration for SSL:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Your application configuration
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## 4. Process Management

### Using systemd (Recommended)

Create service files for automatic startup:

#### Backend Service (`/etc/systemd/system/pharmasys-backend.service`):
```ini
[Unit]
Description=Pharmasys Backend
After=network.target

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=/path/to/pharmasys
Environment=DJANGO_SETTINGS_MODULE=pharmasys.settings_production
ExecStart=/path/to/venv/bin/gunicorn --config gunicorn.conf.py pharmasys.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
```

#### Celery Service (`/etc/systemd/system/pharmasys-celery.service`):
```ini
[Unit]
Description=Pharmasys Celery Worker
After=network.target

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=/path/to/pharmasys
Environment=DJANGO_SETTINGS_MODULE=pharmasys.settings_production
ExecStart=/path/to/venv/bin/celery -A pharmasys worker --loglevel=info
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable services:
```bash
sudo systemctl enable pharmasys-backend
sudo systemctl enable pharmasys-celery
sudo systemctl start pharmasys-backend
sudo systemctl start pharmasys-celery
```

## 5. Monitoring and Logging

### Log Files
- Django logs: `/path/to/pharmasys/logs/django.log`
- Nginx logs: `/var/log/nginx/`
- System logs: `journalctl -u pharmasys-backend`

### Health Checks
- Frontend: `https://yourdomain.com/health`
- Backend: `https://yourdomain.com/api/health/`

## 6. Backup Strategy

### Database Backup
```bash
# PostgreSQL
pg_dump -h localhost -U pharmasys_user pharmasys > backup_$(date +%Y%m%d).sql

# SQLite
cp db.sqlite3 backup_$(date +%Y%m%d).sqlite3
```

### Automated Backups
Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/pharmasys/scripts/backup.sh
```

## 7. Security Checklist

- [ ] Change default admin password
- [ ] Use strong SECRET_KEY
- [ ] Enable HTTPS
- [ ] Configure firewall (only ports 80, 443, 22)
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Backup strategy in place
- [ ] Database credentials secured

## 8. Troubleshooting

### Common Issues

1. **502 Bad Gateway**: Check if backend service is running
2. **Static files not loading**: Run `collectstatic` and check nginx configuration
3. **Database connection errors**: Verify database credentials and connection
4. **CORS errors**: Check CORS_ALLOWED_ORIGINS setting

### Debug Mode
To enable debug mode temporarily:
```bash
export DEBUG=True
python manage.py runserver
```

## 9. Performance Optimization

- Enable gzip compression in nginx
- Use Redis for caching
- Configure database connection pooling
- Monitor resource usage
- Use CDN for static assets

## Support

For issues and questions, check the logs and refer to the troubleshooting section above.




