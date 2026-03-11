"""초기 데이터 삽입 - 최초 1회 실행"""
from database import SessionLocal, engine
from models import Base, User, MocvdMachine, SourceType, SystemSetting
from auth import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# 관리자 계정
if not db.query(User).filter(User.username == "admin").first():
    db.add(User(username="admin", hashed_password=hash_password("admin1234"), role="admin"))
    print("관리자 계정 생성: admin / admin1234")

# MOCVD 호기 (101~236)
if db.query(MocvdMachine).count() == 0:
    for no in range(101, 237):
        db.add(MocvdMachine(machine_no=no))
    print("MOCVD 호기 136개 생성 (101~236)")

# 소스 종류
if db.query(SourceType).count() == 0:
    sources = ["TMGa", "TMIn", "TMAl", "NH3", "CP2Mg", "SiH4"]
    for i, name in enumerate(sources):
        db.add(SourceType(name=name, order_idx=i))
    print(f"소스 종류 {len(sources)}개 생성")

# 시스템 설정 기본값
if not db.query(SystemSetting).filter(SystemSetting.key == "session_expire_minutes").first():
    db.add(SystemSetting(key="session_expire_minutes", value="60"))
    print("시스템 설정 기본값 추가: 세션 만료 60분")

db.commit()
db.close()
print("초기 데이터 설정 완료")
