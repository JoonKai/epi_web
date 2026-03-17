from __future__ import annotations

from sqlalchemy import Boolean, DateTime, Float, Integer, String, inspect, text

from database import Base, engine
import models  # noqa: F401


def _quote_default(value) -> str:
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def _column_definition(column) -> str:
    compiled_type = column.type.compile(dialect=engine.dialect)
    nullable = "" if column.nullable else " NOT NULL"
    default_clause = ""

    scalar_default = None
    if column.default is not None and getattr(column.default, "is_scalar", False):
        scalar_default = column.default.arg

    if scalar_default is not None:
        default_clause = f" DEFAULT {_quote_default(scalar_default)}"
    elif not column.nullable and not column.primary_key:
        if isinstance(column.type, Boolean):
            default_clause = " DEFAULT 0"
        elif isinstance(column.type, (Integer, Float)):
            default_clause = " DEFAULT 0"
        elif isinstance(column.type, String):
            default_clause = " DEFAULT ''"
        elif isinstance(column.type, DateTime):
            default_clause = " DEFAULT CURRENT_TIMESTAMP"

    return f"{column.name} {compiled_type}{nullable}{default_clause}"


def _ensure_table_columns(table_name: str, table, actions: list[str]) -> None:
    inspector = inspect(engine)
    existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
    alter_statements: list[str] = []

    if table_name == "source_change_log" and "work_date" in existing_columns and "install_date" not in existing_columns:
        alter_statements.append(
            "ALTER TABLE source_change_log CHANGE COLUMN work_date install_date VARCHAR(20) NOT NULL"
        )
        existing_columns.add("install_date")

    for column in table.columns:
        if column.name in existing_columns or column.primary_key:
            continue
        alter_statements.append(
            f"ALTER TABLE {table_name} ADD COLUMN {_column_definition(column)}"
        )

    if not alter_statements:
        return

    with engine.begin() as connection:
        for statement in alter_statements:
            connection.execute(text(statement))
            actions.append(statement)


def sync_schema() -> list[str]:
    actions: list[str] = []
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    for table in Base.metadata.sorted_tables:
        if table.name not in existing_tables:
            actions.append(f"CREATE TABLE {table.name}")
            continue
        _ensure_table_columns(table.name, table, actions)

    return actions


def print_sync_summary(actions: list[str]) -> None:
    if not actions:
        print("[schema] already up to date")
        return

    print(f"[schema] synchronized {len(actions)} change(s)")
    for action in actions:
        print(f"[schema] {action}")

