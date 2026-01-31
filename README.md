# TeleVault

**TeleVault** is a production-ready Telegram-backed cloud storage platform built with Python, FastAPI, and React. It leverages Telegram channels as storage backends, allowing you to store and retrieve files with chunk-based streaming.

## 🌟 Features

- **Telegram Storage Engine**: Files are split into chunks and stored in Telegram channels
- **Multi-Bot Support**: Uses multiple bot tokens for parallel uploads/downloads and rate limit handling
- **JWT Authentication**: Secure access and refresh token system
- **Role-Based Access Control**: Viewer, Editor, and Admin roles per storage
- **Folder Hierarchy**: Organize files in nested folders
- **Streaming Upload/Download**: Efficient memory usage with streaming
- **RESTful API**: Clean, stateless FastAPI backend
- **React Frontend**: Minimal, functional SPA for file management

## 🏗️ Architecture

### Backend Stack
- **Python 3.11+**
- **FastAPI** - Modern async web framework
- **SQLModel** - ORM for PostgreSQL
- **Neon PostgreSQL** - Managed cloud database
- **python-telegram-bot** - Telegram API integration
- **JWT** - Authentication with access/refresh tokens

### Frontend Stack
- **React 18**
- **Vite** - Fast development build tool
- **Axios** - HTTP client with interceptors
- **React Router** - Client-side routing

## 📋 Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- Docker and Docker Compose (for deployment)
- Neon PostgreSQL database account
- Telegram bot tokens (1 or more)
- Telegram channel(s) for storage

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd televault
```

### 2. Set Up Backend

#### Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

#### Configure Environment

Copy the example environment file and edit it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL=postgresql://user:password@your-neon-host.neon.tech/televault

# JWT Secret (generate a secure random string)
JWT_SECRET_KEY=your-super-secret-key-here

# Telegram Bot Tokens (comma-separated for multiple bots)
TELEGRAM_BOT_TOKENS=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11,789012:XYZ-GHI5678jkLmn-abc12P3q4r567st89

# Chunk Size (20MB default)
TELEGRAM_CHUNK_SIZE=20971520
```

#### Initialize Database

The database will be automatically initialized when you start the application.

### 3. Set Up Frontend

```bash
cd frontend
npm install
```

### 4. Run in Development Mode

#### Start Backend

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
API documentation at `http://localhost:8000/docs`

#### Start Frontend

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 🐳 Docker Deployment

### 1. Configure Environment

Create `backend/.env` with your production configuration (see above).

### 2. Build and Run

```bash
docker-compose up -d
```

The application will be available at `http://localhost:8000`

### 3. Check Status

```bash
docker-compose ps
docker-compose logs -f backend
```

## 📚 API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation.

### Authentication Endpoints

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get tokens
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user info

### Storage Endpoints

- `POST /storages` - Create new storage
- `GET /storages` - List accessible storages
- `GET /storages/{id}` - Get storage details
- `DELETE /storages/{id}` - Delete storage (owner only)

### Permission Endpoints

- `POST /storages/{id}/permissions` - Grant permission
- `PUT /storages/{id}/permissions/{user_id}` - Update permission
- `DELETE /storages/{id}/permissions/{user_id}` - Revoke permission
- `GET /storages/{id}/permissions` - List permissions

### Folder Endpoints

- `POST /storages/{id}/folders` - Create folder
- `GET /storages/{id}/folders` - List folders
- `GET /storages/{id}/folders/{folder_id}` - Get folder details
- `DELETE /storages/{id}/folders/{folder_id}` - Delete folder

### File Endpoints

- `POST /storages/{id}/files` - Upload file (multipart/form-data)
- `GET /storages/{id}/files` - List files
- `GET /storages/{id}/files/{file_id}` - Get file metadata
- `GET /storages/{id}/files/{file_id}/download` - Download file
- `DELETE /storages/{id}/files/{file_id}` - Delete file

## 🔑 Setting Up Telegram

### 1. Create Bot Tokens

1. Talk to [@BotFather](https://t.me/botfather) on Telegram
2. Create a new bot with `/newbot`
3. Save the bot token
4. Repeat for multiple bots (recommended for better rate limit handling)

### 2. Create Storage Channel

1. Create a new Telegram channel
2. Add your bot(s) as administrators with posting rights
3. Get the channel ID:
   - Forward a message from the channel to [@userinfobot](https://t.me/userinfobot)
   - Use the channel ID (format: `-1001234567890`)

### 3. Configure TeleVault

Add the channel when creating a new storage in the web interface.

## 🔒 Security Considerations

- **JWT Secrets**: Use strong, randomly generated secrets in production
- **HTTPS**: Always use HTTPS in production environments
- **Bot Tokens**: Keep bot tokens secure and never commit them to version control
- **Database**: Use strong passwords and enable SSL for database connections
- **CORS**: Configure appropriate CORS origins for your frontend domain

## 🎯 Usage

### Creating a Storage

1. Register/login to TeleVault
2. Click "Create Storage"
3. Enter a name and your Telegram channel ID
4. Click "Create"

### Uploading Files

1. Navigate to a storage
2. Click "Upload File"
3. Select a file (will be automatically chunked and uploaded)
4. Wait for upload to complete

### Downloading Files

1. Navigate to a storage
2. Click "Download" on any file
3. File will be streamed and reassembled automatically

### Managing Folders

1. Create folders to organize files
2. Navigate into folders by clicking "Open"
3. Upload files directly into folders

### Access Control

Storage owners can grant permissions to other users:

- **Viewer**: Can view and download files
- **Editor**: Can upload, download, and delete files
- **Admin**: Full control including permission management

## 🛠️ Development

### Project Structure

```
televault/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Configuration settings
│   │   ├── database.py          # Database connection
│   │   ├── models.py            # SQLModel database models
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── auth.py              # JWT authentication
│   │   ├── permissions.py       # Access control
│   │   ├── telegram_worker.py   # Telegram integration
│   │   └── routers/             # API route handlers
│   │       ├── auth.py
│   │       ├── storage.py
│   │       ├── folders.py
│   │       └── files.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── StorageView.jsx
│   │   ├── api.js               # API client with axios
│   │   ├── App.jsx              # Main app component
│   │   ├── main.jsx             # Entry point
│   │   └── index.css            # Global styles
│   ├── package.json
│   └── vite.config.js
├── Dockerfile
├── docker-compose.yml
└── README.md
```

### Database Models

- **User**: User accounts
- **Storage**: Storage volumes (mapped to Telegram channels)
- **StoragePermission**: Access control entries
- **Folder**: Folder hierarchy
- **File**: File metadata
- **FileChunk**: Chunk metadata (message IDs, bot indices)
- **RefreshToken**: JWT refresh tokens

### Adding New Features

1. Define models in `models.py`
2. Create schemas in `schemas.py`
3. Add business logic in appropriate service files
4. Create API routes in `routers/`
5. Update frontend components as needed

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

## 📝 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `JWT_SECRET_KEY` | Secret key for JWT signing | - | Yes |
| `JWT_ALGORITHM` | JWT algorithm | HS256 | No |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime | 30 | No |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime | 7 | No |
| `TELEGRAM_BOT_TOKENS` | Comma-separated bot tokens | - | Yes |
| `TELEGRAM_CHUNK_SIZE` | Chunk size in bytes | 20971520 | No |
| `CORS_ORIGINS` | Allowed CORS origins | localhost | No |

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is provided as-is for educational and commercial use.

## 🐛 Troubleshooting

### Database Connection Issues

- Verify your `DATABASE_URL` is correct
- Check if your Neon database is accessible
- Ensure SSL is properly configured

### Telegram API Errors

- Verify bot tokens are valid
- Check bot has admin rights in the channel
- Ensure channel ID format is correct (starts with `-100`)

### File Upload Failures

- Check Telegram rate limits
- Verify chunk size is within limits (20MB recommended)
- Ensure sufficient bot tokens for rotation

### Frontend Not Connecting

- Verify backend is running on port 8000
- Check CORS configuration
- Confirm API proxy settings in `vite.config.js`

## 💡 Tips

- Use multiple bot tokens to avoid rate limiting
- Keep chunk size at 20MB for optimal performance
- Regularly backup your database
- Monitor Telegram API usage
- Use Redis for caching in high-traffic scenarios

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review API documentation at `/docs`
- Open an issue on GitHub

---

Built with ❤️ using FastAPI, React, and Telegram
