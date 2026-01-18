from fastapi import APIRouter, HTTPException, Depends
from app.schemas.auth import ChangePasswordRequest, LoginRequest, TokenResponse, UserPublic
from app.core.security import create_access_token, get_current_user
from app.core.password import hash_password, verify_password
from app.core.supabase_client import supabase
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Auth"])

def _public_user(user: dict) -> UserPublic:
    return UserPublic(
        id=user["id"],
        username=user["username"],
        email=user.get("email"),
        full_name=user.get("full_name"),
        role=user.get("role"),
        created_at=user.get("created_at"),
    )

# --- 1. LOGIN API ---
@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    # 1. Fetch user from Supabase 'users' table
    res = (
        supabase.table("users")
        .select("id, username, password_hash, email, full_name, role, created_at")
        .eq("username", payload.username)
        .limit(1)
        .execute()
    )
    
    # 2. Check if user exists
    if not res.data:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    user = res.data[0]

    # 3. Verify password
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # 4. Generate Token
    token = create_access_token(
        {"sub": user["username"], "user_id": user["id"], "role": user.get("role", "worker")}
    )
    return {"access_token": token, "token_type": "bearer", "user": _public_user(user)}


# --- 2. REGISTER API ---
class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str = None
    full_name: str = None
    role: str = "worker"

@router.post("/register")
def register(payload: RegisterRequest):
    # Check if user exists
    existing = supabase.table("users").select("*").eq("username", payload.username).execute()
    if existing.data:
         raise HTTPException(status_code=400, detail="Username already registered")

    # Insert user (Hashed Password)
    user_data = {
        "username": payload.username,
        "password_hash": hash_password(payload.password),
        "email": payload.email,
        "full_name": payload.full_name,
        "role": payload.role
    }
    
    res = supabase.table("users").insert(user_data).execute()
    
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to register user")

    return {"message": "User registered successfully", "user": _public_user(res.data[0])}


@router.get("/me", response_model=UserPublic)
def me(current_user=Depends(get_current_user)):
    user_id = current_user.get("user_id")
    username = current_user.get("username")

    if user_id is not None:
        res = (
            supabase.table("users")
            .select("id, username, email, full_name, role, created_at")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
    else:
        res = (
            supabase.table("users")
            .select("id, username, email, full_name, role, created_at")
            .eq("username", username)
            .limit(1)
            .execute()
        )

    if not res.data:
        raise HTTPException(status_code=401, detail="User not found")

    return _public_user(res.data[0])


@router.post("/change-password")
def change_password(payload: ChangePasswordRequest, current_user=Depends(get_current_user)):
    user_id = current_user.get("user_id")
    username = current_user.get("username")

    if user_id is not None:
        res = (
            supabase.table("users")
            .select("id, username, password_hash")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
    else:
        res = (
            supabase.table("users")
            .select("id, username, password_hash")
            .eq("username", username)
            .limit(1)
            .execute()
        )

    if not res.data:
        raise HTTPException(status_code=401, detail="User not found")

    user = res.data[0]
    if not verify_password(payload.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Invalid current password")

    res = (
        supabase.table("users")
        .update({"password_hash": hash_password(payload.new_password)})
        .eq("id", user["id"])
        .execute()
    )

    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to update password")

    return {"ok": True, "message": "Password updated"}
