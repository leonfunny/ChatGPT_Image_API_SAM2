from abc import ABC, abstractmethod
from typing import Union
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError, ResponseValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.exc import SQLAlchemyError
from aiomysql import MySQLError


class ErrorResponse(BaseModel):
    request_id: str
    status_code: int
    detail: str


class ExceptionHandlerStrategy(ABC):
    @abstractmethod
    async def handle_exception(self, request: Request, exc: Exception) -> JSONResponse:
        pass


class DatabaseExceptionHandler(ExceptionHandlerStrategy):
    async def handle_exception(
        self, request: Request, exc: Union[SQLAlchemyError, MySQLError]
    ) -> JSONResponse:
        error = ErrorResponse(
            request_id=request.state.request_id,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=error.dict()
        )


class ValidationExceptionHandler(ExceptionHandlerStrategy):
    async def handle_exception(
        self,
        request: Request,
        exc: Union[RequestValidationError, ResponseValidationError],
    ) -> JSONResponse:
        error = ErrorResponse(
            request_id=request.state.request_id,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=error.dict()
        )


class HTTPExceptionHandler(ExceptionHandlerStrategy):
    async def handle_exception(
        self, request: Request, exc: HTTPException
    ) -> JSONResponse:
        error = ErrorResponse(
            request_id=request.state.request_id,
            status_code=exc.status_code,
            detail=exc.detail,
        )
        return JSONResponse(status_code=exc.status_code, content=error.dict())


class GeneralExceptionHandler(ExceptionHandlerStrategy):
    async def handle_exception(self, request: Request, exc: Exception) -> JSONResponse:
        error = ErrorResponse(
            request_id=request.state.request_id,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=error.dict()
        )


def get_exception_handler(exc: Exception) -> ExceptionHandlerStrategy:
    if isinstance(exc, (RequestValidationError, ResponseValidationError)):
        return ValidationExceptionHandler()

    if isinstance(exc, HTTPException):
        return HTTPExceptionHandler()

    if isinstance(exc, (MySQLError, SQLAlchemyError)):
        return DatabaseExceptionHandler()

    return GeneralExceptionHandler()


# FastAPI Exception Handler Setup
def setup_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(SQLAlchemyError)
    @app.exception_handler(RequestValidationError)
    @app.exception_handler(ResponseValidationError)
    @app.exception_handler(HTTPException)
    @app.exception_handler(Exception)
    async def global_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        handler = get_exception_handler(exc)
        return await handler.handle_exception(request, exc)
