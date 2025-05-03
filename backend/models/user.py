from core.database import Base

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from helpers.enums import UserRole


class User(Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(255), nullable=False, default=UserRole.USER
    )
