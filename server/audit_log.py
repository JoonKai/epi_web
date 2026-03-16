from sqlalchemy.orm import Session

from models import AuditLog


def write_audit_log(
    db: Session,
    *,
    log_type: str,
    actor: str = "",
    category: str = "",
    action: str = "",
    target: str = "",
    detail: str = "",
) -> None:
    db.add(
        AuditLog(
            log_type=log_type,
            actor=actor,
            category=category,
            action=action,
            target=target,
            detail=detail,
        )
    )
    db.commit()
