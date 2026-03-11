# Pharmasys Production Deployment Guide

## Overview
This guide covers deploying the Pharmasys pharmacy management system to production using Docker, PostgreSQL, Redis, and Nginx.

## Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **RAM**: Minimum 4GB, Recommended 8GB+
- **CPU**: Minimum 2 cores, Recommended 4 cores+
- **Storage**: Minimum 50GB SSD
- **Network**: Stable internet connection

### Software Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Git
- SSL Certificate (Let's Encrypt recommended)

## Quick Start

### 1. Clone Repository
```bash
git clone <repository-url>
cd pharmasys
```

### 2. Environment Configuration
```bash
# Copy environment template
cp env.example .env

# Edit environment variables
nano .env
```

### 3. Configure Environment Variables
```bash
# Django Settings
SECRET_KEY=your-super-secret-key-here
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
TIME_ZONE=UTC

# Database Configuration
DB_NAME=pharmasys
DB_USER=pharmasys_user
DB_PASSWORD=your-secure-db-password
DB_HOST=db
DB_PORT=5432

# CORS Settings
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# Redis Configuration
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Security Settings
SECURE_SSL_REDIRECT=True
```

### 4. Deploy with Docker
```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 5. Initial Setup
```bash
# Create superuser
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Run initial migrations
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Collect static files
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

## Detailed Configuration

### Database Setup
The system uses PostgreSQL for production. The database is automatically configured via Docker Compose.

```bash
# Connect to database
docker-compose -f docker-compose.prod.yml exec db psql -U pharmasys_user -d pharmasys

# Create backup
docker-compose -f docker-compose.prod.yml exec backend python manage.py backup --type database
```

### SSL Configuration
For HTTPS, configure SSL certificates:

```bash
# Using Let's Encrypt
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Update nginx configuration
# Add SSL settings to nginx/nginx.conf
```

### Monitoring Setup
The system includes comprehensive monitoring:

```bash
# Health check endpoint
curl https://yourdomain.com/health/

# View system metrics
curl https://yourdomain.com/api/health/
```

## Security Configuration

### Firewall Setup
```bash
# UFW configuration
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### SSL/TLS Security
- TLS 1.2+ required
- HSTS headers enabled
- Secure cookie settings
- CSRF protection

### Access Control
- Rate limiting enabled
- IP whitelisting available
- Session security
- Audit logging

## Backup and Recovery

### Automated Backups
```bash
# Create full backup
docker-compose -f docker-compose.prod.yml exec backend python manage.py backup --type full

# Schedule backups with cron
0 2 * * * docker-compose -f docker-compose.prod.yml exec backend python manage.py backup --type full
```

### Manual Backup
```bash
# Database backup
docker-compose -f docker-compose.prod.yml exec backend python manage.py backup --type database

# Media backup
docker-compose -f docker-compose.prod.yml exec backend python manage.py backup --type media
```

### Restore from Backup
```bash
# Restore database
docker-compose -f docker-compose.prod.yml exec backend python manage.py restore /backups/backup_file.sql --confirm

# Full system restore
docker-compose -f docker-compose.prod.yml exec backend python manage.py restore /backups/backup_file.sql --media-backup /backups/media_backup.tar.gz --confirm
```

## Monitoring and Maintenance

### Health Monitoring
```bash
# Check system health
curl https://yourdomain.com/health/

# View detailed metrics
curl https://yourdomain.com/api/health/
```

### Log Management
```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs backend

# View nginx logs
docker-compose -f docker-compose.prod.yml logs nginx

# View database logs
docker-compose -f docker-compose.prod.yml logs db
```

### Performance Monitoring
- System metrics via `/health/` endpoint
- Database performance monitoring
- Cache performance tracking
- Business metrics collection

## Scaling and Optimization

### Horizontal Scaling
```yaml
# Scale backend services
docker-compose -f docker-compose.prod.yml up --scale backend=3

# Scale celery workers
docker-compose -f docker-compose.prod.yml up --scale celery=5
```

### Performance Optimization
- Enable Redis caching
- Configure CDN for static files
- Optimize database queries
- Enable gzip compression

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database status
docker-compose -f docker-compose.prod.yml exec db pg_isready

# Reset database
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d db
```

#### Redis Connection Issues
```bash
# Check Redis status
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# Reset Redis
docker-compose -f docker-compose.prod.yml restart redis
```

#### Static Files Issues
```bash
# Recollect static files
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# Check nginx configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -t
```

### Log Analysis
```bash
# View error logs
docker-compose -f docker-compose.prod.yml logs backend | grep ERROR

# View access logs
docker-compose -f docker-compose.prod.yml logs nginx | grep "GET\|POST"
```

## Security Checklist

- [ ] Change default passwords
- [ ] Configure SSL certificates
- [ ] Enable firewall
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Review access logs
- [ ] Update dependencies
- [ ] Test disaster recovery

## Maintenance Schedule

### Daily
- Monitor system health
- Check backup status
- Review error logs

### Weekly
- Update dependencies
- Review security logs
- Test backup restoration

### Monthly
- Security audit
- Performance review
- Capacity planning

## Support and Documentation

### API Documentation
- Available at `/api/docs/`
- Swagger UI interface
- Authentication required

### System Documentation
- Health check: `/health/`
- Metrics: `/api/health/`
- Admin interface: `/admin/`

### Contact Information
- System Administrator: admin@yourdomain.com
- Technical Support: support@yourdomain.com
- Emergency Contact: +1-XXX-XXX-XXXX

## Version Information
- Application Version: 1.0.0
- Django Version: 4.2.7
- React Version: 19.1.0
- PostgreSQL Version: 15
- Redis Version: 7

---

**Important**: Always test deployments in a staging environment before deploying to production. Keep backups current and test restoration procedures regularly.





