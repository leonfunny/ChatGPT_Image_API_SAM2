from datetime import timedelta
from fastapi import APIRouter, Depends, status, HTTPException

from api.v1.services.auth import (
    authenticate_user,
    create_user,
    get_current_user,
    get_user,
)
from core.config import settings
from core.database import DbSession
from core.security import create_token, verify_token_str
from models.user import User
from api.v1.schemas.auth import (
    RegisterRequest,
    Token,
    LoginRequest,
    UserResponse,
    RefreshTokenRequest,
)


router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return current_user


@router.post("/token", response_model=Token)
async def login_for_access_token(db: DbSession, payload: LoginRequest) -> Token:
    user = await authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_token(
        subject=user.email,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_token(
        subject=user.email,
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    return {"access_token": access_token, "refresh_token": refresh_token}


@router.post("/refresh-token", response_model=Token)
async def refresh_token(db: DbSession, payload: RefreshTokenRequest) -> Token:
    email = verify_token_str(payload.token)
    user = await get_user(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_token(
        subject=user.email,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_token(
        subject=user.email,
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )

    return {"access_token": access_token, "refresh_token": refresh_token}


@router.post("/register", response_model=Token)
async def register_user(db: DbSession, payload: RegisterRequest) -> Token:
    existing_user = await get_user(db, payload.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists"
        )

    user = await create_user(db, payload)

    access_token = create_token(
        subject=user.email,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_token(
        subject=user.email,
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )

    return {"access_token": access_token, "refresh_token": refresh_token}
