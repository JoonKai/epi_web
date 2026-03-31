import json
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db, SessionLocal
import models  # noqa: F401
from models import SystemSetting
from routers import admin, auth, mocvd, shift
from schema_sync import print_sync_summary, sync_schema
from scheduler import start_scheduler, stop_scheduler

DIST_DIR = Path(__file__).parent / "dist"

print_sync_summary(sync_schema())


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="Epi Web API", version="0.1.0", lifespan=lifespan)


BYPASS_PATHS = {"/api/auth/login", "/api/auth/refresh", "/api/health", "/api/"}

@app.middleware("http")
async def ip_filter_middleware(request: Request, call_next):
    # 로그인·헬스체크는 항상 통과
    if request.url.path in BYPASS_PATHS:
        return await call_next(request)

    db = SessionLocal()
    try:
        row = db.query(SystemSetting).filter(SystemSetting.key == "ip_filter").first()
        cfg = json.loads(row.value) if row else {"mode": "off", "ips": []}
    finally:
        db.close()

    mode = cfg.get("mode", "off")
    if mode == "off":
        return await call_next(request)

    client_ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()
    ips = [ip.strip() for ip in cfg.get("ips", []) if ip.strip()]

    if mode == "allow" and ips and client_ip not in ips:
        return JSONResponse(status_code=403, content={"detail": f"접근이 차단된 IP입니다: {client_ip}"})
    if mode == "block" and client_ip in ips:
        return JSONResponse(status_code=403, content={"detail": f"접근이 차단된 IP입니다: {client_ip}"})

    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(mocvd.router)
app.include_router(shift.router)


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


# SPA fallback: /api/* 이외의 모든 경로는 index.html 반환 (BrowserRouter 새로고침 지원)
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # dist 폴더 내 실제 파일이 있으면 해당 파일 반환 (JS, CSS, 이미지 등)
    file_path = DIST_DIR / full_path
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    # 없으면 index.html 반환 (React Router가 처리)
    return FileResponse(DIST_DIR / "index.html")
