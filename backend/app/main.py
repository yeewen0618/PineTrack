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
from app.routers.authentication import router as auth_router
from app.routers.analytics import router as analytics_router
from app.core.supabase_client import supabase
from app.routers.test import router as test_router
from app.routers.workers import router as workers_router
from app.routers import schedule
from app.routers import plots
from app.routers import tasks
from app.routers import suggestions


app = FastAPI(title="PineTrack Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(analytics_router)

@app.get("/api/health")
def health():
    return {"ok": True, "message": "Backend is running ✅"}

@app.get("/api/db-test")
def db_test():
    # Change "plots" to any table you definitely have
    res = supabase.table("plots").select("*").limit(1).execute()
    return {
        "ok": True,
        "count": len(res.data or []),
        "sample": res.data
    }

app.include_router(test_router)
app.include_router(workers_router)
app.include_router(schedule.router)
app.include_router(plots.router)
app.include_router(tasks.router)
app.include_router(suggestions.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)