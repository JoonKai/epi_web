"""APScheduler: DB에 저장된 시간에 PM 카운터 자동 동기화."""
from __future__ import annotations

import json
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler(timezone="Asia/Seoul")

DEFAULT_SCHEDULE  = ["07:00", "19:00"]
SCHEDULE_KEY      = "sync_schedule_times"


def _run_sync() -> None:
    from database import SessionLocal
    from excel_sync import sync_pm_counter, save_sync_log

    db = SessionLocal()
    try:
        result = sync_pm_counter(db)
        save_sync_log(db, result, triggered_by="auto")
        logger.info(
            f"[Scheduler] PM sync done — "
            f"updated: {result['updated_count']}, errors: {result['error_count']}"
        )
        for err in result["errors"]:
            logger.warning(f"[Scheduler] {err}")
    except Exception as e:
        logger.error(f"[Scheduler] PM sync failed: {e}")
    finally:
        db.close()


def _load_times_from_db() -> list[str]:
    try:
        from database import SessionLocal
        from models import SystemSetting
        db = SessionLocal()
        try:
            row = db.query(SystemSetting).filter(SystemSetting.key == SCHEDULE_KEY).first()
            if row:
                return json.loads(row.value)
        finally:
            db.close()
    except Exception:
        pass
    return DEFAULT_SCHEDULE


def reschedule(times: list[str]) -> None:
    """실행 중인 스케줄러의 PM 동기화 작업을 새 시간 목록으로 교체."""
    # 기존 pm_sync_* 잡 모두 제거
    for job in scheduler.get_jobs():
        if job.id.startswith("pm_sync_"):
            job.remove()
    # 새 시간으로 추가
    for i, t in enumerate(times):
        h, m = map(int, t.split(":"))
        scheduler.add_job(_run_sync, CronTrigger(hour=h, minute=m),
                          id=f"pm_sync_{i}", replace_existing=True)
    logger.info(f"[Scheduler] 스케줄 변경: {times}")


def start_scheduler() -> None:
    times = _load_times_from_db()
    for i, t in enumerate(times):
        h, m = map(int, t.split(":"))
        scheduler.add_job(_run_sync, CronTrigger(hour=h, minute=m),
                          id=f"pm_sync_{i}", replace_existing=True)
    scheduler.start()
    logger.info(f"[Scheduler] PM counter sync scheduled at {times} (KST)")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
