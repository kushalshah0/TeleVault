# 🚀 Quick Start Guide

Get TeleVault Next.js running in 5 minutes!

## Step 1: Install Dependencies

```bash
cd televault-nextjs
npm install
```

## Step 2: Configure Environment

Create `.env.local` file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in:

```bash
# 1. Database URL (get from Neon.tech or use local PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/televault"

# 2. JWT Secret (generate random string)
JWT_SECRET="use-openssl-rand-base64-32-to-generate-this"

# 3. Telegram Bot Token (get from @BotFather)
TELEGRAM_BOT_TOKEN_1="your_bot_token_here"

# 4. App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Step 3: Set Up Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations (creates tables)
npm run prisma:migrate
```

## Step 4: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

## Step 5: Create Your First Account

1. Click "Sign up"
2. Enter username, email, password
3. Click "Sign Up"
4. You're in! 🎊

## Step 6: Create Storage & Upload File

1. You'll need a Telegram channel ID
2. Create storage with channel ID
3. Upload a file
4. Watch the parallel chunking in action! ⚡

---

## 🔧 Troubleshooting

### "Cannot find module '@prisma/client'"

```bash
npm run prisma:generate
```

### "Invalid DATABASE_URL"

- Check your PostgreSQL connection string
- Make sure database is running
- Test connection: `psql $DATABASE_URL`

### "No Telegram bot tokens configured"

- Set at least `TELEGRAM_BOT_TOKEN_1` in `.env.local`
- Get token from [@BotFather](https://t.me/botfather)

---

## 📦 Next Steps

### Get More Bot Tokens (Optional but Recommended)

More bots = faster parallel uploads!

```bash
# Add up to 5 bot tokens
TELEGRAM_BOT_TOKEN_2="second_bot_token"
TELEGRAM_BOT_TOKEN_3="third_bot_token"
TELEGRAM_BOT_TOKEN_4="fourth_bot_token"
TELEGRAM_BOT_TOKEN_5="fifth_bot_token"
```

### Deploy to Production

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment guide.

---

## ✅ You're Ready!

Your TeleVault Next.js app is running with:
- ✅ No CORS issues (same domain)
- ✅ Parallel chunking (fast uploads)
- ✅ Real-time progress
- ✅ TypeScript type safety
- ✅ Modern stack

**Enjoy! 🎉**
