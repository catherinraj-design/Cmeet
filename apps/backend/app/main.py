from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.meetings import router as meetings_router
from app.api.v1.auth import router as auth_router
from app.api.v1.webhooks import router as webhooks_router
import app.models  # Ensure all SQLAlchemy models are registered


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables for SQLite development and testing
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="LiveKit-integrated video conferencing module for School ERP",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev; restrictive in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under /api/v1
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(meetings_router, prefix=settings.API_V1_STR)
app.include_router(webhooks_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["system"])
async def health_check():
    return {
        "status": "healthy",
        "service": "Cmeet Video Conferencing Module",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/", tags=["system"])
async def root():
    return {
        "message": "Welcome to School ERP Video Conferencing Module (Cmeet) API",
        "docs_url": "/docs",
        "openapi_url": "/openapi.json",
    }
