from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.supabase_client import supabase  # or import supabase if you exported it
from app.core.security import get_current_user     # if you already protect endpoints

router = APIRouter(prefix="/api/workers", tags=["Workers"])

class UpdateWorkerRequest(BaseModel):
    name: str | None = None
    role: str | None = None
    contact: str | None = None
    is_active: bool | None = None

@router.get("")
def list_workers(user=Depends(get_current_user)):
    res = supabase.table("workers").select("*").order("name").execute()
    return {"ok": True, "data": res.data}

@router.put("/{worker_id}")
def update_worker(worker_id: str, payload: UpdateWorkerRequest, user=Depends(get_current_user)):
    update_fields = payload.dict(exclude_unset=True)
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    res = (
        supabase.table("workers")
        .update(update_fields)
        .eq("id", worker_id)
        .select("*")
        .execute()
    )

    if not res.data:
        raise HTTPException(status_code=404, detail="Worker not found")

    return {"ok": True, "data": res.data[0]}


@router.delete("/{worker_id}")
def delete_worker(worker_id: str, user=Depends(get_current_user)):
    res = supabase.table("workers").delete().eq("id", worker_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Worker not found")
    return {"ok": True, "deleted_worker_id": worker_id}
