# BeeKeep - Vercel Deployment Guide

## Quick Deployment Steps

### 1. Prepare Repository

```bash
# Push code to GitHub repository
git add .
git commit -m "Prepare for Vercel deployment with secure API"
git push origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "New Project"
3. Import your BeeKeep repository
4. **IMPORTANT:** Before clicking Deploy, go to "Environment Variables"
5. Add environment variable:
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key (get from [platform.openai.com](https://platform.openai.com))
6. Click "Deploy"

### 3. Get Your OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign in or create account
3. Go to API Keys section
4. Create new secret key
5. Copy the key (it starts with `sk-...`)

### 4. Test Deployment

- Visit your Vercel app URL
- Try recording a voice memo about bees
- Verify transcription and analysis works

## Security ✅

- API key is stored securely server-side
- Never exposed to users or browser
- All OpenAI calls happen server-side only

## Cost Estimate

- **Vercel hosting:** FREE (hobby plan)
- **OpenAI API:** ~$0.01-0.05 per recording session
- **Monthly estimate:** $1-5 for typical use

## User Access

- Send user the Vercel app URL
- Works on any device with web browser
- No technical setup required for users

## Support

If deployment fails:

1. Check environment variable is set correctly
2. Verify OpenAI API key is valid
3. Check Vercel build logs for errors

The app is now production-ready and secure! 🚀
