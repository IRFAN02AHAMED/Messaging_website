"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.chats import router as chats_router
from app.api.media_files import router as media_files_router
from app.api.message_status import router as message_status_router
from app.api.messages import router as messages_router
from app.api.users import router as users_router
from app.api.websocket import router as websocket_router
from app.core.config import get_settings
from app.core.logger import get_logger, setup_logging
import logging

settings = get_settings()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app : FastAPI):
    """Application startup and shutdown lifecycle."""
    setup_logging()
    logger.info("Starting %s v%s", settings.app_name, settings.app_version)
    yield
    logger.info("Shutting down %s", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(chats_router)
app.include_router(messages_router)
app.include_router(media_files_router)
app.include_router(message_status_router)
app.include_router(websocket_router)


@app.get("/health", tags=["Health"])
def health_check():

    print("hi")
    """Health check endpoint."""

    print(logging.getLogger().handlers)

    logger.info("API: GET /health")
    return {"status": "healthy", "service": settings.app_name}
