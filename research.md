# EPI Web Server 코드 점검 보고서

> 점검일: 2026-03-23
> 대상: `c:\epi_web\server\`
> 분석 파일 수: 20개

---

## 1. 전체 구조

```
server/
├── main.py              FastAPI 앱 진입점, 미들웨어, 라우터 등록
├── database.py          SQLAlchemy DB 연결
├── models.py            ORM 모델 20개
├── auth.py              JWT 인증 유틸
├── audit_log.py         활동 로그 기록
├── schema_sync.py       DB 스키마 자동 동기화
├── source_status.py     소스 상태 계산 로직
├── scheduler.py         APScheduler (자동 PM 동기화)
├── excel_sync.py        Excel COM 자동화 (Windows 전용)
├── init_data.py         초기 데이터 삽입 스크립트
├── .env                 환경변수 (DB/JWT 설정)
├── requirements.txt     패키지 목록
└── routers/
    ├── auth.py          인증 API
    ├── admin.py         관리자 API
    ├── mocvd.py         MOCVD 장비 API
    ├── shift.py         근무 스케줄 API
    └── cost.py          비용 관리 API
```

---

## 2. DB 모델 목록 (models.py)

| 모델 | 테이블명 | 주요 컬럼 |
|------|----------|-----------|
| User | users | username, hashed_password, role, is_active, session_expire_minutes |
| MocvdMachine | mocvd_machine | machine_no (101~236), description, is_active |
| SourceType | source_type | name (TMGa/TMIn 등), order_idx, is_active |
| SystemSetting | system_setting | key, value (JSON 문자열) |
| CostItem | cost_item | code, name, category, unit, is_active |
| CostVendor | cost_vendor | vendor_code, vendor_name, business_type, manager |
| PurchaseRequest | purchase_request | request_date, item_name, quantity, approval_status |
| RepairStatus | repair_status | receipt_type, repair_status, outbound_date, equipment_name |
| MocvdSource | mocvd_source | machine_no, source_name, initial_amount, remaining, daily_usage |
| MocvdPmCounter | mocvd_pm_counter | machine_no, chamber_count, pm_base_count, filter_count, filter_base_count |
| SourceChangeLog | source_change_log | install_date, removal_date, machine_no, source_name, work_type |
| PersonnelVendor | personnel_vendor | name, contact_name, contact_phone, is_active |
| PersonnelMember | personnel_member | vendor_id, name, position, shift, training_due_date |
| MocvdHandoverNote | mocvd_handover_note | handover_date, shift_type, content, author |
| MocvdNotice | mocvd_notice | title, content, color, is_active |
| ShiftType | shift_type | name(코드), label, color, bg_color, border_color, order_idx |
| PmPersonnelAssign | pm_personnel_assign | member_id (unique), role |
| ShiftMember | shift_member | name, team, vendor_name, personnel_member_id, order_idx |
| ShiftScheduleEntry | shift_schedule | member_id, work_date (VARCHAR), shift_type |
| AuditLog | audit_log | log_type, actor, category, action, target, detail |
| KoreanHoliday | korean_holiday | date (YYYY-MM-DD), name, is_substitute |
| PmSyncLog | pm_sync_log | synced_at, triggered_by, updated_count, error_count, errors_json |
| EquipmentHistory | equipment_history | machine_no, event_type, severity, title, detail, occurred_at |

---

## 3. API 엔드포인트 전체 목록

### 인증 (routers/auth.py)

| Method | 경로 | 인증 | 설명 |
|--------|------|------|------|
| POST | /api/auth/login | 없음 | 로그인 (username/password → JWT) |
| GET | /api/auth/me | user | 현재 사용자 정보 |
| POST | /api/auth/refresh | user | 토큰 갱신 |

### 관리자 (routers/admin.py)

| Method | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | /api/admin/users | admin | 사용자 목록 |
| POST | /api/admin/users | admin | 사용자 생성 |
| PUT | /api/admin/users/{id} | admin | 사용자 수정 |
| DELETE | /api/admin/users/{id} | admin | 사용자 삭제 |
| PUT | /api/admin/users/{id}/password | admin | 비밀번호 초기화 |
| GET | /api/admin/machines | user | 호기 목록 |
| POST | /api/admin/machines | admin | 호기 추가 |
| PUT | /api/admin/machines/{id} | admin | 호기 수정 |
| DELETE | /api/admin/machines/{id} | admin | 호기 삭제 |
| GET | /api/admin/sources | user | 소스 종류 목록 |
| POST | /api/admin/sources | admin | 소스 종류 추가 |
| PUT | /api/admin/sources/{id} | admin | 소스 종류 수정 |
| DELETE | /api/admin/sources/{id} | admin | 소스 종류 삭제 |
| GET | /api/admin/personnel/vendors | admin | 업체 목록 |
| POST | /api/admin/personnel/vendors | admin | 업체 추가 |
| PUT | /api/admin/personnel/vendors/{id} | admin | 업체 수정 |
| DELETE | /api/admin/personnel/vendors/{id} | admin | 업체 삭제 (하위 인원 포함) |
| GET | /api/admin/personnel/members | admin | 인원 목록 |
| POST | /api/admin/personnel/members | admin | 인원 추가 |
| PUT | /api/admin/personnel/members/{id} | admin | 인원 수정 |
| DELETE | /api/admin/personnel/members/{id} | admin | 인원 삭제 |
| GET | /api/admin/personnel/pm-assign | 없음 | PM 배정 조회 |
| POST | /api/admin/personnel/pm-assign | admin | PM 배정 저장 (전체 교체) |
| GET | /api/admin/settings | admin | 시스템 설정 조회 |
| PUT | /api/admin/settings | admin | 시스템 설정 수정 |
| GET | /api/admin/settings/ip-filter | admin | IP 필터 설정 |
| PUT | /api/admin/settings/ip-filter | admin | IP 필터 설정 수정 |
| GET | /api/admin/logs | admin | 감사 로그 목록 |
| GET | /api/admin/holidays | admin | 공휴일 조회 |
| POST | /api/admin/holidays/bulk | admin | 공휴일 일괄 등록 |
| DELETE | /api/admin/holidays/year/{year} | admin | 연도별 공휴일 삭제 |

### MOCVD 장비 (routers/mocvd.py)

| Method | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | /api/mocvd/machines | user | 활성 호기 목록 |
| GET | /api/mocvd/forced-down | user | 강제 다운 호기 목록 |
| PUT | /api/mocvd/forced-down | user | 강제 다운 호기 수정 |
| GET | /api/mocvd/pm-counters | user | PM 카운터 전체 조회 |
| PUT | /api/mocvd/pm-counters | user | PM 카운터 일괄 수정 |
| GET | /api/mocvd/source-types | user | 소스 종류 (활성) |
| GET | /api/mocvd/source-status-settings | user | 교체 임박/부족 기준일 조회 |
| PUT | /api/mocvd/source-status-settings | user | 교체 임박/부족 기준일 수정 |
| GET | /api/mocvd/source/{machine_no} | user | 호기별 소스 조회 |
| PUT | /api/mocvd/source/{machine_no} | user | 호기별 소스 수정 |
| GET | /api/mocvd/sources/all | user | 전체 소스 조회 |
| PUT | /api/mocvd/sources/all | user | 전체 소스 일괄 수정 |
| GET | /api/mocvd/source-status | user | 소스 상태 (부족/임박/정상) |
| GET | /api/mocvd/notices | user | 공지사항 목록 |
| POST | /api/mocvd/notices | admin | 공지사항 작성 |
| PUT | /api/mocvd/notices/{id} | admin | 공지사항 수정 |
| DELETE | /api/mocvd/notices/{id} | admin | 공지사항 삭제 |
| GET | /api/mocvd/handover-notes | user | 인수인계일지 목록 |
| POST | /api/mocvd/handover-notes | user | 인수인계일지 작성 |
| PUT | /api/mocvd/handover-notes/{id} | user | 인수인계일지 수정 (본인/관리자) |
| DELETE | /api/mocvd/handover-notes/{id} | user | 인수인계일지 삭제 (본인/관리자) |
| GET | /api/mocvd/source-change-logs | user | 소스 교체 이력 |
| POST | /api/mocvd/source-change-logs | user | 소스 교체 이력 등록 |
| PUT | /api/mocvd/source-change-logs/{id} | user | 소스 교체 이력 수정 |
| DELETE | /api/mocvd/source-change-logs/{id} | user | 소스 교체 이력 삭제 |
| GET | /api/mocvd/equipment-history | user | 장비 이력 목록 |
| POST | /api/mocvd/equipment-history | user | 장비 이력 등록 |
| PUT | /api/mocvd/equipment-history/{id} | user | 장비 이력 수정 |
| DELETE | /api/mocvd/equipment-history/{id} | user | 장비 이력 삭제 |

### 근무 스케줄 (routers/shift.py)

| Method | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | /api/shift/shift-types | 없음 | 근무 유형 목록 |
| POST | /api/shift/shift-types | 없음 | 근무 유형 추가 |
| PUT | /api/shift/shift-types/{id} | 없음 | 근무 유형 수정 |
| DELETE | /api/shift/shift-types/{id} | 없음 | 근무 유형 삭제 |
| GET | /api/shift/members | 없음 | 스케줄 인원 목록 |
| POST | /api/shift/members | 없음 | 스케줄 인원 추가 |
| PUT | /api/shift/members/{id} | 없음 | 스케줄 인원 수정 |
| DELETE | /api/shift/members/{id} | 없음 | 스케줄 인원 비활성화 |
| GET | /api/shift/schedules | 없음 | 월별 스케줄 조회 |
| PUT | /api/shift/schedules | 없음 | 스케줄 단건 저장 |
| POST | /api/shift/schedules/bulk | 없음 | 스케줄 일괄 저장 |
| GET | /api/shift/settings/summary-rows | 없음 | 요약 설정 조회 |
| PUT | /api/shift/settings/summary-rows | 없음 | 요약 설정 저장 |
| GET | /api/shift/personnel-groups | 없음 | 인원 그룹 조회 |
| POST | /api/shift/import-from-personnel | 없음 | 인원관리에서 가져오기 |
| GET | /api/shift/holidays | user | 공휴일 조회 |

### 비용 관리 (routers/cost.py)

| Method | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | /api/cost/items | user | 비용 항목 목록 |
| POST | /api/cost/items | user | 비용 항목 추가 |
| GET | /api/cost/vendors | user | 구매 업체 목록 |
| POST | /api/cost/vendors | user | 구매 업체 추가 |
| GET | /api/cost/purchase-requests | user | 구매 요청 목록 |
| POST | /api/cost/purchase-requests | user | 구매 요청 등록 |
| GET | /api/cost/repair-status | user | 수리 현황 목록 |

---

## 4. 핵심 비즈니스 로직

### 소스 상태 계산 (source_status.py)

```
threshold_amount = initial_amount × threshold_ratio / 100

days_left = ⌈(remaining - threshold_amount) / daily_usage⌉

상태 판단:
  overdue : remaining ≤ threshold_amount  OR  days_left ≤ overdue_days (기본 0)
  urgent  : days_left ≤ urgent_days (기본 7)
  normal  : 그 외
```

### PM 카운터 자동 동기화 (excel_sync.py + scheduler.py)

```
스케줄: 매일 07:00, 19:00 (Asia/Seoul)
경로: \\192.168.205.30\epi_data\01_EPI생산팀\... (3개 파일)

동작:
  1. 네트워크 Excel 파일 → 로컬 복사 (Documents/epi_sync/)
  2. COM 자동화로 Excel 열기 (비표시, 경고 없음)
  3. 시트명에서 machine_no 추출
  4. 헤더행(9번째 줄)에서 C, F 열 위치 확인
  5. 마지막 데이터 행 값 읽기 (chamber_count, filter_count)
  6. MocvdPmCounter 테이블 업데이트
  7. PmSyncLog에 결과 기록
```

### JWT 인증 흐름

```
로그인 → username/password 검증 → JWT 발급 (기본 60분)
  → 각 요청 Authorization: Bearer {token}
  → get_current_user() 의존성으로 검증
  → require_admin() 의존성으로 관리자 권한 확인
```

---

## 5. 발견된 문제점

### 🔴 심각 (즉시 수정 필요)

| # | 위치 | 문제 | 영향 |
|---|------|------|------|
| 1 | main.py | `allow_origins=["*"]` CORS 전체 허용 | 외부 사이트에서 API 호출 가능 |
| 2 | .env | DB 비밀번호 "5769" 취약 + root 계정 사용 | DB 무단 접근 위험 |
| 3 | .env | JWT 시크릿 "epi-change-this-secret-key" 기본값 | 토큰 위조 가능 |
| 4 | shift.py | 거의 모든 엔드포인트 인증 없음 | 비로그인 사용자가 스케줄 수정 가능 |
| 5 | auth.py | 로그아웃/토큰 무효화 없음 | 탈취된 토큰이 만료까지 유효 |
| 6 | main.py | IP 필터가 X-Forwarded-For 사용 | 헤더 스푸핑으로 IP 우회 가능 |

### 🟠 높음 (가까운 시일 내 수정)

| # | 위치 | 문제 | 영향 |
|---|------|------|------|
| 7 | admin.py L120 | update_user에서 "사용자 생성" 로그 기록 버그 | 감사 로그 오염 |
| 8 | admin.py | 업체 삭제 시 하위 인원 자동 삭제 (경고 없음) | 데이터 손실 위험 |
| 9 | admin.py | PM 배정 GET 엔드포인트 인증 없음 | PM 인원 정보 노출 |
| 10 | cost.py | 비용항목/업체 수정/삭제 엔드포인트 없음 | 기능 불완전 |
| 11 | excel_sync.py | Windows 전용 (pywin32 COM) | Linux 배포 불가 |
| 12 | excel_sync.py | 동기화 중 오류 시 부분 커밋됨 | 데이터 불일치 가능 |

### 🟡 보통 (개선 권장)

| # | 위치 | 문제 | 영향 |
|---|------|------|------|
| 13 | models.py | 외래 키 제약 없음 (Integer만 사용) | 고아 레코드 발생 가능 |
| 14 | models.py | 날짜를 VARCHAR(20)으로 저장 | 날짜 연산/비교 불편 |
| 15 | models.py | SystemSetting에 JSON 문자열 저장 | 스키마 없는 설정 관리 |
| 16 | source_status.py | daily_usage = 0 일 때 ZeroDivisionError 위험 | 특정 조건에서 서버 오류 |
| 17 | 모든 라우터 | 목록 API 페이지네이션 없음 | 데이터 증가 시 응답 지연 |
| 18 | admin.py | 감사 로그 목록 페이지네이션 없음 | 로그 누적 시 메모리 문제 |
| 19 | excel_sync.py | 네트워크 경로 코드에 하드코딩 | 경로 변경 시 배포 필요 |
| 20 | scheduler.py | 동기화 실패 시 재시도 없음 | 일시적 오류로 데이터 누락 |

---

## 6. CRUD 구현 현황

| 기능 | 목록 | 생성 | 수정 | 삭제 |
|------|:----:|:----:|:----:|:----:|
| 사용자 | ✅ | ✅ | ✅ | ✅ |
| 호기 | ✅ | ✅ | ✅ | ✅ |
| 소스 종류 | ✅ | ✅ | ✅ | ✅ |
| 업체(인원관리) | ✅ | ✅ | ✅ | ✅ |
| 인원(인원관리) | ✅ | ✅ | ✅ | ✅ |
| 근무 유형 | ✅ | ✅ | ✅ | ✅ |
| 근무 인원 | ✅ | ✅ | ✅ | ✅ (soft) |
| 근무 스케줄 | ✅ | ✅ | ✅ | ❌ |
| 공지사항 | ✅ | ✅ | ✅ | ✅ |
| 인수인계일지 | ✅ | ✅ | ✅ | ✅ |
| 소스 교체 이력 | ✅ | ✅ | ✅ | ✅ |
| 장비 이력 | ✅ | ✅ | ✅ | ✅ |
| PM 카운터 | ✅ | - | ✅ (bulk) | - |
| 비용 항목 | ✅ | ✅ | ❌ | ❌ |
| 비용 업체 | ✅ | ✅ | ❌ | ❌ |
| 구매 요청 | ✅ | ✅ | ❌ | ❌ |
| 수리 현황 | ✅ | ❌ | ❌ | ❌ |
| 공휴일 | ✅ | ✅ (bulk) | - | ✅ (연도별) |

---

## 7. 패키지 의존성 (requirements.txt)

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy==2.0.36
pymysql==1.1.1
python-dotenv==1.0.1
python-jose[cryptography]==3.3.0
passlib==1.7.4
bcrypt==3.2.2
python-multipart==0.0.12
openpyxl==3.1.5
apscheduler==3.10.4
pywin32==311
```

- openpyxl과 pywin32 모두 설치되어 있으나, 실제 동기화는 pywin32(COM)만 사용
- 개발 도구(pytest, black 등) 미포함

---

## 8. 환경 설정 (.env)

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root          ← root 계정 사용 (문제)
DB_PASSWORD=5769      ← 취약한 비밀번호 (문제)
DB_NAME=epi
SECRET_KEY=epi-change-this-secret-key  ← 기본값 그대로 (문제)
INIT_ADMIN_USERNAME=admin
INIT_ADMIN_PASSWORD=admin1234          ← 기본값 변경 필요
APP_HOST=0.0.0.0
APP_HTTP_PORT=8000
APP_HTTPS_PORT=8443
```

---

## 9. 스키마 자동 동기화 (schema_sync.py)

시작 시 `sync_schema()` 호출:
1. `Base.metadata.create_all()` → 누락 테이블 생성
2. 각 테이블 기존 컬럼 검사
3. 누락 컬럼 `ALTER TABLE ADD COLUMN`으로 추가
4. 특수 처리: `source_change_log.work_date` → `install_date` 컬럼명 변경

→ 마이그레이션 도구 없이 간단한 자동 동기화 가능 (단, 롤백 없음)

---

## 10. 성능 고려사항

| 항목 | 현황 | 권장 |
|------|------|------|
| 소스 상태 계산 | 매 요청마다 재계산 | 캐싱 (30초~1분) |
| 목록 API | 전체 반환 | 페이지네이션 추가 |
| 감사 로그 | 무한 증가 | 보존 기간 설정 |
| Excel 동기화 | 3개 파일 순차 처리 | 병렬화 가능 |
| 인덱스 | 외래 키 일부 미인덱스 | (machine_no, source_name) 복합 인덱스 추가 |

---

## 11. 개선 우선순위 요약

1. **[보안]** shift.py 라우터에 인증 추가
2. **[보안]** .env의 DB 비밀번호/JWT 시크릿 변경
3. **[버그]** admin.py update_user 감사 로그 버그 수정
4. **[버그]** source_status.py daily_usage=0 예외 처리
5. **[기능]** cost.py 수정/삭제 엔드포인트 추가
6. **[기능]** 구매요청/수리현황 수정/삭제 추가
7. **[안정성]** excel_sync.py 트랜잭션 롤백 처리
8. **[성능]** 목록 API 페이지네이션
9. **[유지보수]** 네트워크 경로를 SystemSetting으로 이동
