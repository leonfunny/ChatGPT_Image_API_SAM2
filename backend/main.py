import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request

from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware

from core.config import settings
from core.database import Database

from api.v1.api import router

from helpers.execption import setup_exception_handlers
from helpers.middleware import RequestIDMiddleware

app = FastAPI()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Database.initialize()
    yield


def init_application():
    app = FastAPI(
        title="AI Image",
        docs_url="/docs",
        openapi_url=f"/{settings.API_PREFIX}/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router, prefix=f"/{settings.API_PREFIX}")
    app.add_middleware(GZipMiddleware)
    setup_exception_handlers(app)

    return app


app = init_application()
app.add_middleware(RequestIDMiddleware)


@app.middleware("http")
async def db_session_middleware(request: Request, call_next):
    try:
        request.state.db = Database.get_session()
        response = await call_next(request)
    except Exception as e:
        await request.state.db.rollback()
        raise e
    finally:
        await request.state.db.close()
    return response


if __name__ == "__main__":
    uvicorn.run(app, host=settings.APP_HOST, port=settings.APP_PORT)
