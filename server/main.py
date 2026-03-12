from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import Base, engine, get_db
import models  # noqa: F401
from routers import admin, auth, mocvd

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Epi Web API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(mocvd.router)


@app.get("/api/")
def root():
    return {"message": "FastAPI server is running."}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/db-check")
def db_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"db": "connected"}
    except Exception as e:
        return {"db": "error", "detail": str(e)}


@app.get("/api/dashboard/stats")
def dashboard_stats(db: Session = Depends(get_db)):
    from models import MocvdMachine, MocvdSource, SourceType, User

    return {
        "active_machines": db.query(MocvdMachine).filter(MocvdMachine.is_active == True).count(),
        "total_machines": db.query(MocvdMachine).count(),
        "active_users": db.query(User).filter(User.is_active == True).count(),
        "source_types": db.query(SourceType).filter(SourceType.is_active == True).count(),
        "source_entries": db.query(MocvdSource).count(),
    }
