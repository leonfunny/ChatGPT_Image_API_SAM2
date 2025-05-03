import enum


class UserRole(enum.Enum):
    ADMIN = "admin"
    USER = "user"


class LogLevels(enum.Enum):
    info = "INFO"
    warn = "WARN"
    error = "ERROR"
    debug = "DEBUG"
