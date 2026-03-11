# 🚀 Complete Beginner's Guide: Deploy Pharmasys to Free Hosting

This guide will help you deploy your pharmacy management system to free hosting services. No credit card required!

## 📋 What You'll Get

- **Backend API**: https://your-app.railway.app (or .onrender.com)
- **Frontend Website**: https://your-app.vercel.app (or .netlify.app)
- **Database**: PostgreSQL (free tier)
- **Total Cost**: $0/month

## 🛠️ Prerequisites

- GitHub account (free)
- Railway account (free)
- Vercel account (free)
- Basic understanding of copying/pasting URLs

## 📚 Step-by-Step Deployment

### Step 1: Prepare Your Code on GitHub

1. **Go to GitHub.com** and sign up/login
2. **Create a new repository**:
   - Click "New repository"
   - Name it: `pharmasys`
   - Make it **Public** (required for free hosting)
   - Don't initialize with README
   - Click "Create repository"

3. **Upload your code**:
   ```bash
   # In your project folder, run these commands:
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/pharmasys.git
   git push -u origin main
   ```

### Step 2: Deploy Backend to Railway (Free)

1. **Go to Railway.app** and sign up with GitHub
2. **Create a new project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `pharmasys` repository
   - Click "Deploy Now"

3. **Set up the database**:
   - In your Railway project, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway will create a free PostgreSQL database

4. **Configure environment variables**:
   - Go to your backend service
   - Click "Variables" tab
   - Add these variables:

   ```
   DJANGO_SETTINGS_MODULE=pharmasys.settings_free
   SECRET_KEY=your-super-secret-key-here-make-it-long-and-random
   DEBUG=False
   ALLOWED_HOSTS=your-app.railway.app
   DB_NAME=railway
   DB_USER=postgres
   DB_PASSWORD=(Railway will provide this)
   DB_HOST=(Railway will provide this)
   DB_PORT=5432
   ```

5. **Deploy**:
   - Railway will automatically deploy your app
   - Wait for "Deployed" status
   - Your backend will be at: `https://your-app.railway.app`

### Step 3: Deploy Frontend to Vercel (Free)

1. **Go to Vercel.com** and sign up with GitHub
2. **Create a new project**:
   - Click "New Project"
   - Import your `pharmasys` repository
   - **Important**: Set Root Directory to `pharmasys-frontend`
   - Click "Deploy"

3. **Configure environment variables**:
   - Go to Project Settings → Environment Variables
   - Add:
   ```
   REACT_APP_API_URL=https://your-app.railway.app
   ```

4. **Redeploy**:
   - Go to Deployments tab
   - Click "Redeploy"

### Step 4: Update Backend CORS Settings

1. **Go back to Railway** (your backend)
2. **Add your frontend domain** to environment variables:
   ```
   CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
   CSRF_TRUSTED_ORIGINS=https://your-frontend.vercel.app
   ```

3. **Redeploy** your backend

## 🎯 Alternative Free Hosting Options

### Backend Alternatives:
- **Render.com**: Similar to Railway
- **Heroku**: Limited free tier (sleeps after 30 min)
- **Fly.io**: 3 free apps

### Frontend Alternatives:
- **Netlify**: Similar to Vercel
- **GitHub Pages**: Free but limited

## 🔧 Troubleshooting

### Common Issues:

1. **"Build Failed"**:
   - Check your `requirements-free.txt` file
   - Make sure all dependencies are listed

2. **"Database Connection Error"**:
   - Verify your database credentials in Railway
   - Make sure you're using `settings_free.py`

3. **"CORS Error"**:
   - Add your frontend domain to `CORS_ALLOWED_ORIGINS`
   - Redeploy backend

4. **"Static Files Not Loading"**:
   - Make sure `whitenoise` is in requirements
   - Check `STATIC_ROOT` setting

### Getting Help:

1. **Check logs**:
   - Railway: Go to your service → "Deployments" → Click on deployment → "View Logs"
   - Vercel: Go to your project → "Functions" → "View Function Logs"

2. **Test your API**:
   - Visit: `https://your-app.railway.app/api/health/`
   - Should return: `{"status": "healthy"}`

## 📱 Testing Your Deployment

1. **Backend Health Check**:
   ```
   https://your-app.railway.app/api/health/
   ```

2. **Frontend**:
   ```
   https://your-frontend.vercel.app
   ```

3. **Admin Panel**:
   ```
   https://your-app.railway.app/admin/
   Username: admin
   Password: admin123
   ```

## 🎉 Success Checklist

- [ ] Backend deployed to Railway/Render
- [ ] Frontend deployed to Vercel/Netlify
- [ ] Database connected and working
- [ ] CORS configured correctly
- [ ] Admin panel accessible
- [ ] Frontend can communicate with backend
- [ ] All features working (login, inventory, sales, etc.)

## 💡 Pro Tips

1. **Always test locally first**:
   ```bash
   cd pharmasys
   python manage.py runserver
   ```

2. **Keep your secrets safe**:
   - Never commit `.env` files
   - Use environment variables in hosting platforms

3. **Monitor your usage**:
   - Free tiers have limits
   - Railway: 500 hours/month
   - Vercel: 100GB bandwidth/month

4. **Backup your database**:
   - Export data regularly
   - Free tiers can be deleted without notice

## 🚀 Next Steps

Once deployed:
1. **Customize your domain** (optional)
2. **Set up monitoring** (optional)
3. **Add more features**
4. **Share with users**

## 🆘 Need Help?

If you get stuck:
1. Check the logs first
2. Verify environment variables
3. Test each component separately
4. Ask for help in the comments

**Congratulations! You've just deployed a full-stack application to the cloud for free!** 🎊
