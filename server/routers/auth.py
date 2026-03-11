from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from models import User, SystemSetting
from auth import verify_password, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES_DEFAULT

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username, User.is_active == True).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 올바르지 않습니다.",
        )
    setting = db.query(SystemSetting).filter(SystemSetting.key == "session_expire_minutes").first()
    expire_minutes = int(setting.value) if setting else ACCESS_TOKEN_EXPIRE_MINUTES_DEFAULT
    token = create_access_token({"sub": user.username, "role": user.role}, expire_minutes=expire_minutes)
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
        "expire_minutes": expire_minutes,
    }


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username, "role": current_user.role}
