# AshuCloud

A cloud-based file storage platform — upload, organize, preview, and share files from anywhere.

## Overview

AshuCloud lets users securely upload and manage files through a clean web interface. Files are stored in Cloudflare R2 with metadata in PostgreSQL. The platform features folder management, automatic file versioning, Redis-cached metadata, expiring share links, and an in-app preview modal for images, PDFs, videos, and text files.

## Live Demo

[ashucloud.vercel.app](https://ashucloud.vercel.app/login)

## Features

- **User Authentication** — Register and login with JWT-based authentication
- **Folder Management** — Create nested folders, navigate with breadcrumbs, delete recursively
- **File Upload** — Upload any file type into any folder
- **File Versioning** — Uploading a file with the same name auto-increments the version
- **In-App Preview** — View images, PDFs, videos, and text files directly in the browser
- **Download** — Get files via presigned Cloudflare R2 URLs (file bytes never pass through the server)
- **Share Links** — Generate expiring public share links (24-hour TTL) with token-based access
- **Search** — Find files by name with debounced search
- **Soft Delete** — Deleted files are marked as removed but not permanently lost
- **Redis Caching** — File metadata is cached for fast repeated lookups

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6, Axios |
| Backend | Python, FastAPI, SQLAlchemy 2.x, Pydantic v2 |
| Database | PostgreSQL (Neon) |
| Cache | Redis (Upstash) |
| File Storage | Cloudflare R2 (S3-compatible) |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Deployment | Render (backend, Docker) + Vercel (frontend) |

## Architecture

```
React (Vercel)
      |
  FastAPI (Render)
      |
  -------------------------
  |          |            |
Neon      Upstash       Cloudflare R2
PostgreSQL  Redis        File Storage
(metadata)  (cache)      (actual files)
```

## API Endpoints

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Get JWT token |

### Folders

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/folders` | Yes | Create folder |
| GET | `/folders` | Yes | List folders (root or by `parent_id`) |
| GET | `/folders/{id}` | Yes | Get folder details |
| DELETE | `/folders/{id}` | Yes | Delete folder and all contents recursively |

### Files

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/files/upload` | Yes | Upload file to R2, save metadata |
| GET | `/files` | Yes | List files (root or by `folder_id`) |
| GET | `/files/search?q=` | Yes | Search files by name |
| GET | `/files/{id}` | Yes | Get file metadata (Redis cached) |
| GET | `/files/{id}/download` | Yes | Get presigned R2 URL (1hr expiry) |
| DELETE | `/files/{id}` | Yes | Soft delete file |
| POST | `/files/{id}/share` | Yes | Create expiring share link |
| GET | `/share/{token}` | No | Public access via share token |
| GET | `/health` | No | Health check |

## Project Structure

```
ashucloud/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, router registration
│   │   ├── config.py            # Pydantic settings (reads .env)
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   ├── deps.py              # get_db, get_current_user dependencies
│   │   ├── models/              # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── folder.py
│   │   │   ├── file.py
│   │   │   └── shared_link.py
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   │   ├── user.py
│   │   │   ├── folder.py
│   │   │   ├── file.py
│   │   │   └── shared_link.py
│   │   ├── routers/             # FastAPI route handlers
│   │   │   ├── auth.py
│   │   │   ├── folders.py
│   │   │   ├── files.py
│   │   │   └── shared.py
│   │   └── services/
│   │       ├── auth_service.py  # JWT + bcrypt logic
│   │       ├── r2.py            # boto3 client for Cloudflare R2
│   │       └── cache.py         # Redis get/set/delete
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api/axios.js          # Axios instance with JWT interceptor
    │   ├── context/AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx     # Main file manager
    │   │   └── Share.jsx         # Public shared file page
    │   └── components/
    │       ├── Navbar.jsx
    │       ├── FileList.jsx
    │       ├── FolderTree.jsx
    │       └── ProtectedRoute.jsx
    ├── package.json
    └── vercel.json
```

## Local Setup

### Prerequisites

- Python 3.12+
- Node.js 18+
- A Cloudflare R2 bucket
- A PostgreSQL database (Neon free tier works)
- A Redis instance (Upstash free tier works)

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in your credentials in .env
uvicorn app.main:app --reload
# API running at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:8000
npm run dev
# App running at http://localhost:5173
```

## Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://user:password@host/dbname
JWT_SECRET=your-jwt-secret
R2_ACCESS_KEY=your-r2-access-key
R2_SECRET_KEY=your-r2-secret-key
R2_BUCKET=your-bucket-name
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
REDIS_URL=rediss://...
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:8000
```

## Deployment

The app is deployed on:

- **Frontend** — [Vercel](https://vercel.com) (set `VITE_API_URL` to your backend URL)
- **Backend** — [Render](https://render.com) using the provided Dockerfile (set all backend env vars in the dashboard)

Tables are auto-created on backend startup via SQLAlchemy `Base.metadata.create_all()`.
