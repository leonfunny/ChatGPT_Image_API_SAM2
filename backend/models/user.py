from typing import List, Optional
from core.database import Base

from sqlalchemy import (
    ForeignKey,
    Integer,
    String,
    Table,
    Column,
    Boolean,
    Float,
    DateTime,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

image_sources = Table(
    "image_sources",
    Base.metadata,
    Column("source_image_id", Integer, ForeignKey("images.id"), primary_key=True),
    Column("generated_image_id", Integer, ForeignKey("images.id"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    images: Mapped[List["Image"]] = relationship(back_populates="user")


class Image(Base):
    __tablename__ = "images"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    gcs_bucket: Mapped[str] = mapped_column(String(255), nullable=False)
    gcs_filename: Mapped[str] = mapped_column(String(500), nullable=False, unique=True)
    gcs_public_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    original_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    format: Mapped[str] = mapped_column(String(10), nullable=False)
    prompt: Mapped[Optional[str]] = mapped_column(String(10000), nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_source: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship(back_populates="images")

    source_images: Mapped[List["Image"]] = relationship(
        secondary=image_sources,
        primaryjoin=(id == image_sources.c.generated_image_id),
        secondaryjoin=(id == image_sources.c.source_image_id),
        backref="generated_images",
    )

    def __repr__(self) -> str:
        return f"<Image(id={self.id}, filename={self.gcs_filename})>"


class VideoRequest(Base):
    __tablename__ = "video_requests"

    id = Column(String(36), primary_key=True, index=True)
    status = Column(String(20), index=True)
    prompt = Column(String(10000))
    image_url = Column(String(500))
    original_filename = Column(String(255), nullable=True)
    duration = Column(String(5))
    aspect_ratio = Column(String(10))
    negative_prompt = Column(Text, nullable=True)
    cfg_scale = Column(Float)
    video_url = Column(String(500), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    processing_time = Column(Float, nullable=True)
    kling_request_id = Column(String(100), nullable=True)
