# TeleVault

Cloud storage powered by Telegram channels.

## Features

- **Telegram Storage** - Store files in Telegram channels
- **Chunked Uploads** - Upload large files with 4MB chunks
- **Parallel Uploads** - Multiple bots for faster uploads
- **JWT Auth** - Secure authentication with refresh tokens

## Tech Stack

Next.js 14, TypeScript, Prisma, PostgreSQL, Telegram Bot API

## Quick Start

```bash
npm install
```

Create `.env.local`:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret"
TELEGRAM_BOT_TOKEN_1="..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

```bash
npm run prisma:migrate
npm run dev
```

## Scripts

```bash
npm run dev      # Development
npm run build    # Production build
npm run start    # Start production server
```
