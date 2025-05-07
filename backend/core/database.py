import re
from datetime import datetime
import uuid
from typing import Annotated, Optional

from fastapi import Depends
from sqlalchemy import MetaData, TypeDecorator, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import (
    sessionmaker,
    DeclarativeBase,
    declared_attr,
    Mapped,
    mapped_column,
)
from sqlalchemy.dialects.mysql import DATETIME, BINARY
from sqlalchemy.ext.asyncio import AsyncAttrs

from core.config import settings

# Database connection URL
DATABASE_URL: str = f"mysql+aiomysql://{settings.DB_USERNAME}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_DATABASE}"

# Async engine for SQLAlchemy
engine = create_async_engine(DATABASE_URL, echo=True)
metadata = MetaData()


def resolve_table_name(name: str) -> str:
    """Resolves table names to their mapped names."""
    names = re.split(r"(?=[A-Z])", name)
    return "_".join([x.lower() for x in names if x])


class Database:
    engine = None
    session = None

    @classmethod
    def initialize(cls):
        if cls.engine is None:
            cls.engine = create_async_engine(
                DATABASE_URL,
                pool_size=10,
                max_overflow=20,
                pool_timeout=30,
                pool_recycle=1800,
            )
            cls.session = sessionmaker(
                bind=cls.engine, expire_on_commit=False, class_=AsyncSession
            )

    @classmethod
    def get_session(cls):
        if cls.session is None:
            cls.initialize()
        return cls.session()

    @classmethod
    async def close(cls):
        if cls.engine is not None:
            await cls.engine.dispose()
            cls.engine = None
            cls.session = None


async def get_db():
    db = Database.get_session()
    try:
        yield db
    finally:
        await db.close()


DbSession = Annotated[AsyncSession, Depends(get_db)]


class Base(DeclarativeBase, AsyncAttrs):
    """Base class for all ORM models."""

    metadata = metadata

    created_at: Mapped[datetime] = mapped_column(
        DATETIME(timezone=True), server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DATETIME(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=text("CURRENT_TIMESTAMP"),
    )

    @classmethod
    @declared_attr
    def __tablename__(cls) -> str:
        return resolve_table_name(cls.__name__)
