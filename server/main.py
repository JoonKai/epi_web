import json
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db, SessionLocal
import models  # noqa: F401
from models import SystemSetting
from routers import admin, auth, cost, mocvd, shift
from schema_sync import print_sync_summary, sync_schema

print_sync_summary(sync_schema())

app = FastAPI(title="Epi Web API", version="0.1.0")


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
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(mocvd.router)
app.include_router(cost.router)
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
