from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from database import Base, engine, get_db
import models  # noqa: F401
from routers import admin, auth, mocvd

Base.metadata.create_all(bind=engine)


def ensure_mocvd_source_columns():
    inspector = inspect(engine)
    if "mocvd_source" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("mocvd_source")}
    alter_statements = []

    if "initial_amount" not in columns:
        alter_statements.append("ALTER TABLE mocvd_source ADD COLUMN initial_amount DOUBLE DEFAULT 0")
    if "threshold_ratio" not in columns:
        alter_statements.append("ALTER TABLE mocvd_source ADD COLUMN threshold_ratio DOUBLE DEFAULT 15")

    if not alter_statements:
        return

    with engine.begin() as connection:
        for statement in alter_statements:
            connection.execute(text(statement))


def ensure_source_change_log_columns():
    inspector = inspect(engine)
    if "source_change_log" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("source_change_log")}
    alter_statements = []
    column_defs = {
        "install_date": "VARCHAR(20) DEFAULT ''",
        "removal_date": "VARCHAR(20) DEFAULT ''",
        "zone": "VARCHAR(50) DEFAULT ''",
        "line_name": "VARCHAR(50) DEFAULT ''",
        "production_group": "VARCHAR(50) DEFAULT ''",
        "source_slot": "VARCHAR(20) DEFAULT ''",
        "source_number": "VARCHAR(20) DEFAULT ''",
        "vendor_name": "VARCHAR(100) DEFAULT ''",
        "cylinder_no": "VARCHAR(100) DEFAULT ''",
        "lot_no": "VARCHAR(100) DEFAULT ''",
        "net_weight": "DOUBLE DEFAULT 0",
        "reset_weight": "DOUBLE DEFAULT 0",
        "before_value": "DOUBLE DEFAULT 0",
        "after_value": "DOUBLE DEFAULT 0",
        "used_amount": "DOUBLE DEFAULT 0",
        "used_percent": "DOUBLE DEFAULT 0",
        "runtime_hours": "DOUBLE DEFAULT 0",
        "sql_value": "DOUBLE DEFAULT 0",
        "ctc_value": "DOUBLE DEFAULT 0",
    }

    if "work_date" in columns and "install_date" not in columns:
        alter_statements.append("ALTER TABLE source_change_log CHANGE COLUMN work_date install_date VARCHAR(20) NOT NULL")
        columns.add("install_date")

    for column_name, column_def in column_defs.items():
        if column_name not in columns:
            alter_statements.append(f"ALTER TABLE source_change_log ADD COLUMN {column_name} {column_def}")

    if not alter_statements:
        return

    with engine.begin() as connection:
        for statement in alter_statements:
            connection.execute(text(statement))


ensure_mocvd_source_columns()
ensure_source_change_log_columns()

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
