#!/usr/bin/env python3
"""
Environment Variables Generator for Pharmasys Free Deployment
This script generates the exact environment variables you need for Railway and Vercel
"""

import secrets
import string
import sys

def generate_secret_key():
    """Generate a secure Django secret key"""
    alphabet = string.ascii_letters + string.digits + '!@#$%^&*(-_=+)'
    return ''.join(secrets.choice(alphabet) for _ in range(50))

def generate_railway_vars(railway_url, vercel_url):
    """Generate Railway environment variables"""
    secret_key = generate_secret_key()
    
    print("🚂 RAILWAY BACKEND ENVIRONMENT VARIABLES")
    print("=" * 50)
    print("Copy these variables to your Railway backend service:")
    print()
    
    variables = {
        "DJANGO_SETTINGS_MODULE": "pharmasys.settings_free",
        "SECRET_KEY": secret_key,
        "DEBUG": "False",
        "ALLOWED_HOSTS": railway_url,
        "DB_NAME": "railway",
        "DB_USER": "postgres",
        "DB_PASSWORD": "(Get from Railway database service)",
        "DB_HOST": "(Get from Railway database service)",
        "DB_PORT": "5432",
        "CORS_ALLOWED_ORIGINS": vercel_url,
        "CSRF_TRUSTED_ORIGINS": vercel_url,
        "LOW_STOCK_THRESHOLD": "0.2",
        "EXPIRY_WARNING_MONTHS": "3",
        "TAX_RATE": "0.03"
    }
    
    for key, value in variables.items():
        print(f"{key}={value}")
    
    print()
    print("📝 IMPORTANT NOTES:")
    print("- Replace (Get from Railway database service) with actual values")
    print("- You can find these in your PostgreSQL service → Variables tab")
    print("- Replace the URLs with your actual Railway and Vercel domains")

def generate_vercel_vars(railway_url):
    """Generate Vercel environment variables"""
    print("\n⚡ VERCEL FRONTEND ENVIRONMENT VARIABLES")
    print("=" * 50)
    print("Copy these variables to your Vercel project:")
    print()
    
    variables = {
        "REACT_APP_API_URL": railway_url,
        "REACT_APP_ENVIRONMENT": "production",
        "REACT_APP_VERSION": "1.0.0",
        "GENERATE_SOURCEMAP": "false",
        "NODE_ENV": "production"
    }
    
    for key, value in variables.items():
        print(f"{key}={value}")
    
    print()
    print("📝 IMPORTANT NOTES:")
    print("- Make sure to set these for Production environment")
    print("- Replace the Railway URL with your actual backend URL")

def main():
    print("🔧 Pharmasys Environment Variables Generator")
    print("=" * 50)
    print()
    
    # Get URLs from user
    railway_url = input("Enter your Railway backend URL (e.g., https://your-app.railway.app): ").strip()
    if not railway_url:
        railway_url = "https://your-app.railway.app"
        print(f"Using default: {railway_url}")
    
    vercel_url = input("Enter your Vercel frontend URL (e.g., https://your-app.vercel.app): ").strip()
    if not vercel_url:
        vercel_url = "https://your-app.vercel.app"
        print(f"Using default: {vercel_url}")
    
    print()
    
    # Generate variables
    generate_railway_vars(railway_url, vercel_url)
    generate_vercel_vars(railway_url)
    
    print("\n🎯 NEXT STEPS:")
    print("1. Copy the Railway variables to your Railway backend service")
    print("2. Copy the Vercel variables to your Vercel project")
    print("3. Get the database credentials from Railway PostgreSQL service")
    print("4. Redeploy both services")
    print("5. Test your application!")
    
    print("\n✅ Your environment variables are ready!")

if __name__ == "__main__":
    main()




