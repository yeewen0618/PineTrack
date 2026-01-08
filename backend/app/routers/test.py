from fastapi import APIRouter
from app.core.supabase_client import supabase

router = APIRouter(prefix="/api", tags=["test"])

@router.get("/db-test")
def db_test():
    res = supabase.table("workers").select("*").limit(1).execute()
    return {
        "status": "ok",
        "rows": res.data
    }
