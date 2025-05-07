from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.schemas.auth import RegisterRequest
from core.database import get_db
from core.security import (
    get_password_hash,
    verify_password,
    security_auth,
    verify_token,
)
from models.user import User


async def get_user(db: AsyncSession, email: str):
    user = await db.scalar(select(User).where(User.email == email))
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str):
    user = await get_user(db, email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False

    return user


async def create_user(db: AsyncSession, payload: RegisterRequest):
    db_user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
    )

    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    return db_user


async def get_current_user(
    db: AsyncSession = Depends(get_db), token: str = Depends(security_auth)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        email = verify_token(token)
        if email is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    user = await get_user(db, email)
    if user is None:
        raise credentials_exception

    return user
