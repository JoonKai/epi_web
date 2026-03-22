"""Network Excel → DB sync via Excel COM automation (pywin32)."""
from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path
from typing import Any

import pythoncom
import win32com.client
from sqlalchemy.orm import Session

DEFAULT_PATHS = [
    r"\\192.168.205.30\epi_data\01_EPI생산팀\01_EPI 제조파트\01_업무관리\01_업무인수인계일지\01_업무인수인계일지OP용\EPI생산팀_업무 일지(D동1층)_150401.xlsm",
    r"\\192.168.205.30\epi_data\01_EPI생산팀\01_EPI 제조파트\01_업무관리\01_업무인수인계일지\01_업무인수인계일지OP용\EPI생산팀_업무 일지(D동2층A)_150401.xlsm",
    r"\\192.168.205.30\epi_data\01_EPI생산팀\01_EPI 제조파트\01_업무관리\01_업무인수인계일지\01_업무인수인계일지OP용\EPI생산팀_업무 일지(D동2층B)_150401.xlsm",
]

SYNC_PATH_KEYS = ["excel_sync_path_1", "excel_sync_path_2", "excel_sync_path_3"]

LOCAL_DIR = Path.home() / "Documents" / "epi_sync"
HEADER_ROW = 9


def _clean_path(val: str) -> str:
    """경로에 섞인 보이지 않는 유니코드 제어문자(LRE, BOM 등)를 제거."""
    import unicodedata
    return "".join(c for c in val if not unicodedata.category(c).startswith("C")).strip()


def _get_paths(db: Session) -> list[Path]:
    from models import SystemSetting
    rows = {r.key: r.value for r in db.query(SystemSetting).filter(SystemSetting.key.in_(SYNC_PATH_KEYS)).all()}
    paths = []
    for i, key in enumerate(SYNC_PATH_KEYS):
        val = _clean_path(rows.get(key, ""))
        paths.append(Path(val) if val else Path(DEFAULT_PATHS[i]))
    return paths


def _is_date_value(val: Any) -> bool:
    if val is None:
        return False
    if isinstance(val, datetime):
        return True
    s = str(val).strip()
    return bool(s) and ("월" in s or ("/" in s) or ("-" in s and len(s) >= 8))


XL_UP = -4162  # xlUp 방향 상수


def _read_file(excel: Any, file_path: Path) -> tuple[list[dict], list[str]]:
    """단일 파일에서 호기별 C, F 값을 최소 COM 호출로 추출.

    전략:
      1) 헤더 행(10행)만 읽어 작업일자·C·F 컬럼 인덱스 탐색
      2) End(xlUp)으로 날짜 컬럼의 마지막 데이터 행 위치만 조회
      3) 해당 행의 C, F 셀만 읽기  → 전체 시트를 메모리에 올리지 않음
    """
    results: list[dict] = []
    errors: list[str] = []

    wb = excel.Workbooks.Open(
        str(file_path.resolve()),
        UpdateLinks=0,
        ReadOnly=True,
        IgnoreReadOnlyRecommended=True,
    )

    try:
        all_sheets = [wb.Worksheets(i).Name for i in range(1, wb.Worksheets.Count + 1)]

        hogi_sheets = [s for s in all_sheets if "호기" in s]
        if not hogi_sheets:
            errors.append(f"[{file_path.name}] '호기' 포함 시트 없음 (전체 시트: {all_sheets})")

        for i in range(1, wb.Worksheets.Count + 1):
            ws = wb.Worksheets(i)
            sheet_name = ws.Name

            if "호기" not in sheet_name:
                continue

            digits = "".join(c for c in sheet_name if c.isdigit())
            if not digits:
                continue
            machine_no = int(digits)

            # ── 1) 헤더 행만 읽어 컬럼 인덱스 확인 ──────────────────
            header_data = ws.Rows(HEADER_ROW).Value  # ((val, val, ...),)
            if not header_data:
                errors.append(f"[{sheet_name}] 헤더 행 읽기 실패")
                continue
            header = header_data[0]

            date_col = c_col = f_col = None
            for col_off, val in enumerate(header):
                if val and "작업일자" in str(val):
                    date_col = col_off + 1   # 1-based
                elif val == "C":
                    c_col = col_off + 1
                elif val == "F":
                    f_col = col_off + 1

            if not all(x is not None for x in [date_col, c_col, f_col]):
                errors.append(
                    f"[{sheet_name}] 헤더 탐지 실패 "
                    f"(작업일자={date_col}, C={c_col}, F={f_col})"
                )
                continue

            # ── 2) 날짜 컬럼에서 마지막 데이터 행 찾기 (End↑) ───────
            last_cell = ws.Cells(ws.Rows.Count, date_col).End(XL_UP)
            last_row = last_cell.Row

            if last_row <= HEADER_ROW + 1:
                errors.append(f"[{sheet_name}] 날짜 데이터 없음")
                continue

            # ── 3) C, F 값이 모두 있는 마지막 행 역방향 탐색 ────────
            # (마지막 날짜 행에 C/F가 없을 수 있으므로 위로 올라가며 탐색)
            c_val = f_val = None
            search_row = last_row
            while search_row > HEADER_ROW + 1:
                if _is_date_value(ws.Cells(search_row, date_col).Value):
                    cv = ws.Cells(search_row, c_col).Value
                    fv = ws.Cells(search_row, f_col).Value
                    if cv is not None and fv is not None:
                        c_val, f_val = cv, fv
                        break
                search_row -= 1

            if c_val is None or f_val is None:
                errors.append(f"[{sheet_name}] C/F 값 있는 날짜 행 없음")
                continue

            try:
                results.append({
                    "machine_no": machine_no,
                    "chamber_count": float(c_val),
                    "filter_count": float(f_val),
                })
            except (TypeError, ValueError) as e:
                errors.append(f"[{sheet_name}] 숫자 변환 실패: {e}")

    finally:
        wb.Close(SaveChanges=False)

    return results, errors


def sync_pm_counter(db: Session) -> dict:
    """네트워크 엑셀 파일에서 PM 카운터를 읽어 mocvd_pm_counter 업데이트."""
    from models import MocvdPmCounter

    print("[sync] 시작")
    pythoncom.CoInitialize()
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)

    file_paths = _get_paths(db)
    print(f"[sync] 대상 파일: {[str(p) for p in file_paths]}")

    updated: list[dict] = []
    errors: list[str] = []

    print("[sync] Excel 앱 실행 중...")
    excel = win32com.client.DispatchEx("Excel.Application")
    excel.Visible = False
    excel.DisplayAlerts = False
    excel.AutomationSecurity = 3    # 매크로 보안 경고 비활성화
    excel.AskToUpdateLinks = False  # 외부 링크 업데이트 묻지 않음
    excel.EnableEvents = False      # 이벤트 핸들러 비활성화
    excel.ScreenUpdating = False
    print("[sync] Excel 앱 준비 완료")

    try:
        for src in file_paths:
            dst = LOCAL_DIR / src.name

            print(f"[sync] 복사 중: {src.name}")
            try:
                shutil.copy2(str(src), str(dst))
                print(f"[sync] 복사 완료: {dst}")
            except Exception as e:
                errors.append(f"[{src.name}] 복사 실패: {e}")
                print(f"[sync] 복사 실패: {e}")
                continue

            print(f"[sync] 파일 열기 중: {dst.name}")
            try:
                file_results, file_errors = _read_file(excel, dst)
                print(f"[sync] 읽기 완료: {len(file_results)}개 시트 처리")
            except Exception as e:
                errors.append(f"[{src.name}] 읽기 실패: {e}")
                print(f"[sync] 읽기 실패: {e}")
                continue

            errors.extend(file_errors)

            for item in file_results:
                record = (
                    db.query(MocvdPmCounter)
                    .filter(MocvdPmCounter.machine_no == item["machine_no"])
                    .first()
                )
                if record:
                    record.chamber_count = item["chamber_count"]
                    record.filter_count = item["filter_count"]
                else:
                    db.add(MocvdPmCounter(
                        machine_no=item["machine_no"],
                        chamber_count=item["chamber_count"],
                        filter_count=item["filter_count"],
                    ))
                updated.append(item)
    finally:
        print("[sync] Excel 종료 중...")
        excel.Quit()
        pythoncom.CoUninitialize()
        print("[sync] 완료")

    db.commit()

    result = {
        "synced_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "updated_count": len(updated),
        "updated": updated,
        "error_count": len(errors),
        "errors": errors,
    }
    return result


def save_sync_log(db: Session, result: dict, triggered_by: str = "auto") -> None:
    import json
    from models import PmSyncLog
    import logging
    try:
        log = PmSyncLog(
            triggered_by=triggered_by,
            updated_count=result["updated_count"],
            error_count=result["error_count"],
            errors_json=json.dumps(result.get("errors", []), ensure_ascii=False),
        )
        db.add(log)
        db.commit()
        # 최근 100건만 유지
        old_ids = (
            db.query(PmSyncLog.id)
            .order_by(PmSyncLog.id.desc())
            .offset(100)
            .all()
        )
        if old_ids:
            db.query(PmSyncLog).filter(PmSyncLog.id.in_([r[0] for r in old_ids])).delete(synchronize_session=False)
            db.commit()
    except Exception as e:
        logging.getLogger(__name__).error(f"[save_sync_log] {e}")
