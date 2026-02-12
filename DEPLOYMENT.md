# Pricing Studio - Deployment Guide

This guide will help you deploy Pricing Studio with backend storage using Vercel and Postgres.

## Prerequisites

- GitHub account
- Vercel account (free tier is sufficient)
- Node.js 18+ installed locally

## Local Development Setup

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Link to Vercel Project

```bash
vercel link
```

Follow the prompts to create a new project or link to an existing one.

### 3. Create Postgres Database

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Storage** tab
3. Click **Create Database** → Select **Postgres**
4. Name: `pricing-studio-db`
5. Region: Choose closest to your location
6. Click **Create**

### 4. Pull Environment Variables

```bash
vercel env pull .env.local
```

This creates `.env.local` with your database credentials.

### 5. Run Database Schema

1. Go to Vercel Dashboard → Storage → pricing-studio-db → **Query** tab
2. Copy the contents of `scripts/schema.sql`
3. Paste into the query editor and **Execute**

This creates the `quotes` and `settings` tables.

### 6. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Migrating Existing Data

If you have existing quotes in localStorage:

1. Open the app in your browser
2. Go to **Settings** tab
3. Click **"Migrate to Database"** button
4. Confirm the migration
5. Your localStorage data will be uploaded to Postgres

## Production Deployment

### Option 1: Automatic Deployment (Recommended)

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Add backend storage with Vercel Postgres"
   git push origin main
   ```

2. Vercel will automatically detect the push and deploy

3. Visit your production URL (shown in Vercel dashboard)

### Option 2: Manual Deployment

```bash
vercel --prod
```

## Post-Deployment

### 1. Run Migration in Production

1. Visit your production URL
2. Go to Settings
3. Click "Migrate to Database"
4. Confirm migration

Your localStorage data is now in the database!

### 2. Verify Deployment

Test these features:
- [ ] Create a new quote → Check it persists after refresh
- [ ] Edit a quote → Changes are saved
- [ ] Delete a quote → Removed permanently
- [ ] Update settings → Persisted across sessions
- [ ] Test from different device → Data syncs

## Monitoring

### Check Database Usage

1. Vercel Dashboard → Storage → pricing-studio-db → **Usage** tab
2. Monitor:
   - Storage used (free tier: 256MB)
   - Compute hours (free tier: 60 hours/month)

### View Logs

```bash
vercel logs
```

Or visit: Vercel Dashboard → Your Project → **Logs** tab

## Troubleshooting

### "Database connection failed"

**Solution:** Check environment variables are set in Vercel:
1. Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Ensure all `POSTGRES_*` variables are present

### "Migration failed"

**Solution:** Ensure database schema is created:
1. Go to Vercel → Storage → pricing-studio-db → **Query**
2. Re-run `scripts/schema.sql`

### Local development not connecting to database

**Solution:** Pull latest environment variables:
```bash
vercel env pull .env.local --force
```

## Cost Monitoring

### Free Tier Limits

- **Vercel**: 100GB bandwidth/month
- **Postgres**: 256MB storage, 60 compute hours/month

For a single user, you should **never exceed these limits**.

### Setting Up Alerts

1. Vercel Dashboard → Usage
2. Click "Set up alerts"
3. Configure alert at 80% usage

## Backup Strategy

### Manual Backup

1. Go to Settings → Data Backup
2. Click "Export Data"
3. Save the JSON file to a safe location

### Scheduled Backups (Optional)

You can set up automatic backups using Vercel Cron Jobs (future enhancement).

## Rolling Back

If something goes wrong:

1. **Revert code:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Restore from backup:**
   - Go to Settings
   - Click "Import Data"
   - Select your backup JSON file

## Security Notes

- The app has **no authentication** by default (personal use only)
- Keep your Vercel project private (don't share the URL)
- Database credentials are stored securely in Vercel environment variables
- Never commit `.env.local` to git (it's in `.gitignore`)

## Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Postgres Docs**: https://www.postgresql.org/docs/

## Architecture

```
Frontend (Next.js)
    ↓
API Routes (/api/quotes, /api/settings)
    ↓
Vercel Postgres
```

**Data Flow:**
1. User interacts with UI
2. Custom React hooks (`useQuotes`, `useSettings`) make API calls
3. API routes query/update Postgres
4. Data is cached in localStorage for offline access

**Hybrid Storage:**
- **Primary**: Postgres (source of truth)
- **Cache**: localStorage (fast initial render + offline support)
