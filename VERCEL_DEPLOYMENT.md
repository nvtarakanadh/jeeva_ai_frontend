# Frontend Deployment Guide - Vercel

## Prerequisites
- GitHub account
- Vercel account (free tier available)
- Backend deployed at: https://jeeva-ai-backend-sms7.onrender.com

## Step 1: Push Frontend to GitHub

Make sure your frontend code is pushed to GitHub:
```bash
cd Jeeva_AI_FrontEnd
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel**: https://vercel.com
2. **Sign up/Login** with your GitHub account
3. **Click "Add New..." → "Project"**
4. **Import your repository**: `jeeva_ai_frontend`
5. **Configure Project**:
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

6. **Add Environment Variables**:
   Click "Environment Variables" and add:
   ```
   VITE_API_BASE_URL=https://jeeva-ai-backend-sms7.onrender.com
   ```
   - **Environment**: Production, Preview, Development (select all)
   - Click "Add"

7. **Click "Deploy"**

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   cd Jeeva_AI_FrontEnd
   vercel
   ```

4. **Add Environment Variable**:
   ```bash
   vercel env add VITE_API_BASE_URL
   # Enter: https://jeeva-ai-backend-sms7.onrender.com
   # Select: Production, Preview, Development
   ```

5. **Redeploy**:
   ```bash
   vercel --prod
   ```

## Step 3: Verify Deployment

1. **Check your deployment URL**: Vercel will provide a URL like `https://your-app.vercel.app`
2. **Test the application**:
   - Open the URL in your browser
   - Try logging in
   - Check if API calls are working

## Step 4: Update CORS on Backend (If Needed)

If you get CORS errors, make sure your backend allows your Vercel domain:

1. Go to Render dashboard → Your backend service
2. Go to Environment variables
3. Update `CORS_ALLOWED_ORIGINS`:
   ```
   CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-git-main.vercel.app
   ```
4. Redeploy backend

## Environment Variables

### Required for Production:
- `VITE_API_BASE_URL`: Your backend URL
  - Production: `https://jeeva-ai-backend-sms7.onrender.com`
  - Development: `http://localhost:8000`

### Optional:
- Add any other environment variables your app needs

## Custom Domain (Optional)

1. Go to your project in Vercel dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## Troubleshooting

### Build Fails:
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Check for TypeScript errors

### API Calls Fail:
- Verify `VITE_API_BASE_URL` is set correctly
- Check browser console for errors
- Verify backend CORS settings include your Vercel domain

### 404 Errors on Routes:
- Vercel.json is already configured with rewrites
- If issues persist, check `vercel.json` configuration

## Post-Deployment Checklist

- [ ] Frontend deployed successfully
- [ ] Environment variable `VITE_API_BASE_URL` set
- [ ] Backend CORS updated to include Vercel domain
- [ ] Login/Registration working
- [ ] API calls working
- [ ] All routes accessible

## Quick Reference

- **Backend URL**: https://jeeva-ai-backend-sms7.onrender.com
- **Frontend URL**: https://your-app.vercel.app (after deployment)
- **Environment Variable**: `VITE_API_BASE_URL=https://jeeva-ai-backend-sms7.onrender.com`

