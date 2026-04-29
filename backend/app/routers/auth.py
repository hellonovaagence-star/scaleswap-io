"""Auth endpoints — minimal JWT auth for MVP."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    # MVP: accept any credentials, return dummy token
    # Replace with real auth in production
    if not req.email or not req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(access_token="mvp-token-" + req.email.split("@")[0])


@router.get("/me")
async def me():
    return {
        "id": "user_1",
        "email": "demo@scaleswap.io",
        "name": "Demo User",
        "plan": "Pro",
    }
