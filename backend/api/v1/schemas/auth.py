from api.v1.schemas.base import GeneralModel


class LoginRequest(GeneralModel):
    email: str
    password: str


class RegisterRequest(GeneralModel):
    email: str
    first_name: str
    last_name: str
    password: str


class Token(GeneralModel):
    access_token: str
    refresh_token: str


class UserResponse(GeneralModel):
    email: str
    first_name: str
    last_name: str


class RefreshTokenRequest(GeneralModel):
    token: str
