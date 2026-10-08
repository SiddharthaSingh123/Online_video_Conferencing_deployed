import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from database import Base, engine
from seed import run_seed
from routers.meetings import router as meetings_router
from routers.users import router as users_router

app = FastAPI(title="Zoom Clone API")

# Browsers send the Origin header without a trailing slash, so normalise each entry.
cors_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    run_seed()


app.include_router(meetings_router)
app.include_router(users_router)


@app.get("/health")
def health():
    return {"status": "ok"}
