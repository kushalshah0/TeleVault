# TeleVault Deployment Guide

## Vercel Deployment

### 1. Prerequisites

- GitHub account
- Vercel account (connected to GitHub)
- PostgreSQL database (Neon, Supabase, or Railway)
- Telegram bot tokens (get from @BotFather)

### 2. Database Setup

#### Option A: Neon (Recommended - Free Tier)
1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string

#### Option B: Supabase
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → Database → Connection string

#### Option C: Railway
1. Go to [railway.app](https://railway.app)
2. Create a new project → Add PostgreSQL

### 3. Vercel Configuration

1. **Push code to GitHub** (branch: `main`)

2. **Import project in Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Add New → Project
   - Select `TeleVault` repository

3. **Configure settings:**
   - Framework Preset: `Next.js` (auto-detected)
   - Root Directory: `nextjs`
   - Build Command: `npm run build` (includes prisma generate)
   - Output Directory: `.next`

4. **Add Environment Variables:**

   | Variable | Description | Example |
   |----------|-------------|---------|
   | `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
   | `JWT_SECRET` | Random string (32+ chars) | `openssl rand -base64 32` |
   | `TELEGRAM_BOT_TOKENS` | Comma-separated bot tokens | `token1,token2,token3` |
   | `NEXT_PUBLIC_APP_URL` | Your Vercel URL | `https://your-app.vercel.app` |

5. **Deploy**

### 4. Database Migration

After first deploy, run Prisma migrate:

```bash
# Using Vercel CLI
vercel env pull .env.local
npx prisma migrate deploy

# Or from Vercel Dashboard
# Go to Deployments → Latest → Functions → prisma
```

Or set up a PostgreSQL connection pooler for Prisma Accelerate:
- Sign up at [prisma.io/data](https://www.prisma.io/data)
- Get your Data Proxy URL
- Update `DATABASE_URL` to use the proxy connection string

### 5. Telegram Bot Setup

1. Create bots via [@BotFather](https://t.me/botfather)
2. Get bot tokens (up to 5 recommended for parallel uploads)
3. Add bots to your Telegram channels as admins
4. Get channel IDs and add them via the app

### 6. Troubleshooting

**Build Errors:**
- Ensure all environment variables are set in Vercel
- Check that `DATABASE_URL` is valid

**Database Connection:**
- Verify `DATABASE_URL` is correct
- Check database allows Vercel IPs
- Use connection pooler for serverless (Neon/Prisma Accelerate)

**Environment Variables:**
- Go to Vercel Dashboard → Settings → Environment Variables
- Redeploy after changes

### 7. Local Development

```bash
cd nextjs
cp .env.example .env.local
# Edit .env.local with your values

npm install
npx prisma migrate dev
npm run dev
```
