# Quick Start: Deploy Frontend to Vercel

## Your Backend URL
**Backend**: https://jeeva-ai-backend-sms7.onrender.com

## Deploy in 5 Minutes

### 1. Go to Vercel
Visit: https://vercel.com and sign in with GitHub

### 2. Import Repository
- Click "Add New..." → "Project"
- Select `jeeva_ai_frontend` repository
- Click "Import"

### 3. Configure Project
Vercel will auto-detect Vite. Just verify:
- **Framework Preset**: Vite ✅
- **Root Directory**: `./` ✅
- **Build Command**: `npm run build` ✅
- **Output Directory**: `dist` ✅

### 4. Add Environment Variable
**IMPORTANT**: Before deploying, add this environment variable:

1. Click "Environment Variables"
2. Add:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://jeeva-ai-backend-sms7.onrender.com`
   - **Environment**: Select all (Production, Preview, Development)
3. Click "Add"

### 5. Deploy
Click "Deploy" button

### 6. Update Backend CORS (After Deployment) ⚠️ IMPORTANT

**Your Frontend**: https://jeevaai.vercel.app/

1. Go to Render dashboard → Your backend service (`jeeva-ai-backend-sms7`)
2. Go to "Environment" tab
3. Update `CORS_ALLOWED_ORIGINS`:
   ```
   https://jeevaai.vercel.app,https://jeevaai-git-main.vercel.app,http://localhost:8080,http://localhost:3000
   ```
4. **Save and redeploy backend** (Render will auto-redeploy)
5. Wait 2-3 minutes for deployment to complete

**This is critical!** Without this, your frontend won't be able to make API calls to the backend.

## That's It! 🎉

Your frontend will be live at: `https://your-app.vercel.app`

## Troubleshooting

**CORS Errors?**
- Make sure backend CORS includes your Vercel domain
- Check browser console for specific error

**API Not Working?**
- Verify `VITE_API_BASE_URL` is set correctly in Vercel
- Check backend is running: https://jeeva-ai-backend-sms7.onrender.com

**Build Fails?**
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`

