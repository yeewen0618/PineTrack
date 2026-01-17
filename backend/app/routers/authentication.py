from fastapi import APIRouter, HTTPException, Depends
from app.schemas.auth import LoginRequest, TokenResponse
from app.core.security import create_access_token
from app.core.supabase_client import supabase
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Auth"])

# --- 1. LOGIN API (Simple, Plain Text Password Check) ---
@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    print(f"Login attempt for: {payload.username}")

    # 1. Fetch user from Supabase 'users' table
    res = supabase.table("users").select("*").eq("username", payload.username).execute()
    
    # 2. Check if user exists
    if not res.data:
        print("User not found")
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    user = res.data[0]
    db_password = user["password_hash"] # We are using this column for plain text now

    # 3. Check password (Direct string comparison)
    if payload.password != db_password:
        print(f"Password mismatch for {payload.username}")
        raise HTTPException(status_code=401, detail="Invalid username or password")

    print("Login successful!")

    # 4. Generate Token
    token = create_access_token({"sub": user["username"], "role": user.get("role", "worker")})
    return {"access_token": token, "token_type": "bearer"}


# --- 2. REGISTER API (Simple, Plain Text Storage) ---
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

    # Insert user (Plain Text Password)
    user_data = {
        "username": payload.username,
        "password_hash": payload.password, # Storing plain text password directly
        "email": payload.email,
        "full_name": payload.full_name,
        "role": payload.role
    }
    
    res = supabase.table("users").insert(user_data).execute()
    
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to register user")

    return {"message": "User registered successfully", "user": res.data[0]}
