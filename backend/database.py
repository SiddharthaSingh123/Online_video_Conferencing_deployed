import os
import re

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Locally: a SQLite file. In production: set DATABASE_URL to a Postgres URL (e.g. from Neon),
# so data survives restarts on hosts whose disk is wiped on every deploy.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./zoom.db")

if DATABASE_URL.startswith("sqlite"):
    # check_same_thread=False: SQLite normally only allows one thread to use a
    # connection; FastAPI handles requests on different threads, so we disable it.
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Hosts give "postgres://" or "postgresql://" URLs; tell SQLAlchemy to use the psycopg 3 driver.
    # pool_pre_ping: hosted Postgres closes idle connections, so test each one before using it.
    engine = create_engine(re.sub(r"^postgres(ql)?://", "postgresql+psycopg://", DATABASE_URL), pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
