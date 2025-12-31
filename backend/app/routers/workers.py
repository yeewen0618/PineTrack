from fastapi import APIRouter, Depends
from app.core.supabase_client import supabase  # or import supabase if you exported it
from app.core.security import get_current_user     # if you already protect endpoints

router = APIRouter(prefix="/api/workers", tags=["Workers"])

@router.get("")
def list_workers(user=Depends(get_current_user)):
    res = supabase.table("workers").select("*").order("name").execute()
    return {"ok": True, "data": res.data}
