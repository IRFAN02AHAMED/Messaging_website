# WhatsApp Clone Backend

Production-grade REST API backend for a WhatsApp clone, built with **FastAPI**, **PostgreSQL**, **SQLAlchemy 2.0**, and **Pydantic v2**.

## Architecture

```
API Layer (FastAPI Routers)
        ↓
Service Layer (Business Logic)
        ↓
Repository Layer (Database Access)
        ↓
PostgreSQL
```

### Key Design Principles

- **Clean Architecture** — strict separation of concerns across layers
- **Dependency Injection** — database sessions and services injected via FastAPI `Depends`
- **Repository Pattern** — isolated data access with no business logic
- **Service Pattern** — validation, orchestration, and domain rules
- **Single Responsibility** — each module owns one bounded context

## Project Structure

```
backend/
├── app/
│   ├── api/                 # FastAPI route handlers
│   ├── core/                # Config, logging, constants, exceptions
│   ├── database/            # Engine, session, migrations
│   ├── dependencies/        # DI providers
│   ├── models/              # SQLAlchemy ORM models
│   ├── repositories/        # Data access layer
│   ├── schemas/             # Pydantic request/response models
│   ├── services/            # Business logic layer
│   └── main.py              # Application entry point
├── logs/
├── migration.py             # Table creation entry point
├── requirements.txt
└── .env
```

## Prerequisites

- Python 3.11 or 3.12 (3.13+ may require updated pydantic wheels)
- PostgreSQL 14+

## Setup

### 1. Create virtual environment

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

Update `.env` with your PostgreSQL credentials:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/whatsapp_clone
```

### 4. Create the database

```bash
createdb whatsapp_clone
```

### 5. Run migrations

```bash
python migration.py
```

### 6. Start the server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

Once running, visit:

- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- Health Check: [http://localhost:8000/health](http://localhost:8000/health)

## API Endpoints

| Resource           | Base Path            | Methods                          |
|--------------------|----------------------|----------------------------------|
| Users              | `/users`             | POST, GET, GET/{id}, PUT, DELETE |
| Chats              | `/chats`             | POST, GET, GET/{id}, PUT, DELETE |
| Chat Participants  | `/chats/participants`| POST, GET, GET/{id}, PUT, DELETE |
| Messages           | `/messages`          | POST, GET, GET/{id}, PUT, DELETE |
| Media Files        | `/media-files`       | POST, GET, GET/{id}, PUT, DELETE |
| Message Status     | `/message-status`    | POST, GET, GET/{id}, PUT, DELETE |

## Database Schema

Entities and relationships follow the ERD:

- **users** — account profiles with online status
- **chats** — private or group conversations
- **chat_participants** — many-to-many user ↔ chat membership
- **messages** — chat messages with reply threading
- **media_files** — attachments linked to messages
- **message_status** — per-recipient delivery/read tracking

## Logging

Logs are written to:

- **Terminal** — INFO level and above
- **logs/app.log** — ERROR level and above (rotating file handler)

Format: `timestamp | level | module | message`

## Example Workflow

```bash
# 1. Create users
curl -X POST http://localhost:8000/users \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+1234567890", "name": "Alice"}'

# 2. Create a private chat
curl -X POST http://localhost:8000/chats \
  -H "Content-Type: application/json" \
  -d '{"type": "private"}'

# 3. Add participants
curl -X POST http://localhost:8000/chats/participants \
  -H "Content-Type: application/json" \
  -d '{"chat_id": 1, "user_id": 1, "role": "member"}'

# 4. Send a message
curl -X POST http://localhost:8000/messages \
  -H "Content-Type: application/json" \
  -d '{"chat_id": 1, "user_id": 1, "content": "Hello!", "message_type": "text"}'
```

## License

MIT
