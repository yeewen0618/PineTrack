"""
Main entry point for PineTrack backend application.

- Creates FastAPI app instance
- Registers all API routers
- Configures middleware (CORS, etc.)
- Starts the backend server

Frontend communicates with this file via HTTP requests.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.auth import router as auth_router

app = FastAPI(title="PineTrack Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

@app.get("/")
def root():
    return {"message": "PineTrack backend is running 🚜"}
