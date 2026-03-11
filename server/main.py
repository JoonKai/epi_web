from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import engine, get_db, Base
import models  # noqa: F401
from routers import mocvd, auth, admin
import os

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

# 시뮬레이터 정적 파일 서빙
simulator_dist = os.path.join(os.path.dirname(__file__), "..", "simulator", "dist")
if os.path.exists(simulator_dist):
    app.mount("/simulator", StaticFiles(directory=simulator_dist, html=True), name="simulator")


@app.get("/api/")
def root():
    return {"message": "FastAPI 서버가 정상 작동 중입니다."}


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
