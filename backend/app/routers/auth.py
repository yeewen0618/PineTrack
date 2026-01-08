from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.auth import LoginRequest, TokenResponse
from app.core.security import create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])

# TEMP: hardcoded user (later we replace with DB)
DEMO_USER = {"username": "admin", "password": "123456"}

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    if payload.username != DEMO_USER["username"] or payload.password != DEMO_USER["password"]:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token({"sub": payload.username})
    return {"access_token": token, "token_type": "bearer"}


# ✅ New form login (Swagger Authorize uses this)
@router.post("/token", response_model=TokenResponse)
def token(form: OAuth2PasswordRequestForm = Depends()):
    if form.username != DEMO_USER["username"] or form.password != DEMO_USER["password"]:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": form.username})
    return {"access_token": token, "token_type": "bearer"}