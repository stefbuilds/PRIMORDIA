"""Global Pulse API - Minimal Bootstrap"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Global Pulse API starting...")
    yield
    # Shutdown
    print("👋 Global Pulse API shutting down...")


app = FastAPI(
    title="Global Pulse API",
    version="0.1.0",
    description="Satellite vs News signal divergence analysis",
    lifespan=lifespan,
)

# CORS
origins = os.getenv("CORS_ORIGINS", '["http://localhost:3000"]')
app.add_middleware(
    CORSMiddleware,
    allow_origins=eval(origins),  # noqa: S307
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"ok": True, "service": "global-pulse-api", "version": "0.1.0"}


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Global Pulse API",
        "docs": "/docs",
        "health": "/health",
    }
