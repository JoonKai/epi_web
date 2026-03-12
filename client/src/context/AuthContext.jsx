import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { Modal } from 'antd'

const AuthContext = createContext(null)

// JWT payload 디코드 (서명 검증 없이 클라이언트용)
function parseJwtExp(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp ? payload.exp * 1000 : null // ms
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const warningTimerRef = useRef(null)
  const expireTimerRef  = useRef(null)
  const refreshTimerRef = useRef(null)   // 갱신 예약 타이머
  const lastActivityRef = useRef(Date.now()) // 마지막 사용자 활동 시각

  const clearTimers = () => {
    clearTimeout(warningTimerRef.current)
    clearTimeout(expireTimerRef.current)
    clearTimeout(refreshTimerRef.current)
  }

  const logout = useCallback((reason) => {
    clearTimers()
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    if (reason === 'expired') {
      Modal.warning({
        title: '세션 만료',
        content: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
        okText: '확인',
      })
    }
  }, [])

  // ── 토큰 갱신 ──────────────────────────────────────────────────────────────
  // 만료 시각까지 남은 시간의 절반 시점에, 사용자가 최근 활동했으면 갱신 요청
  const scheduleRefresh = useCallback((expMs, expireMinutes) => {
    clearTimeout(refreshTimerRef.current)
    const now       = Date.now()
    const remaining = expMs - now
    // 절반 시점에 갱신 시도 (최소 10초 뒤, 남은 시간이 있을 때만)
    const refreshIn = Math.max(10_000, remaining / 2)

    refreshTimerRef.current = setTimeout(async () => {
      // 마지막 활동으로부터 expireMinutes * 0.8 분 이내면 "활성" 간주
      const idleThresholdMs = expireMinutes * 60 * 1000 * 0.8
      const idle = (Date.now() - lastActivityRef.current) > idleThresholdMs

      if (idle) return  // 오래 비활성이면 갱신 안 함 (자연스럽게 만료 대기)

      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const data = await res.json()
        localStorage.setItem('token', data.access_token)
        const newExpMs = parseJwtExp(data.access_token)
        if (newExpMs) {
          scheduleExpiry(newExpMs, data.expire_minutes)
        }
      } catch {
        // 네트워크 오류 시 무시 — 기존 타이머가 만료 처리
      }
    }, refreshIn)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 만료 타이머 ────────────────────────────────────────────────────────────
  const scheduleExpiry = useCallback((expMs, expireMinutes = 60) => {
    clearTimeout(warningTimerRef.current)
    clearTimeout(expireTimerRef.current)
    const now       = Date.now()
    const remaining = expMs - now

    if (remaining <= 0) {
      logout('expired')
      return
    }

    // 갱신 예약 (활동 시 자동 연장)
    scheduleRefresh(expMs, expireMinutes)

    // 만료 5분 전 경고
    const warnAt = remaining - 5 * 60 * 1000
    if (warnAt > 0) {
      warningTimerRef.current = setTimeout(() => {
        // 경고 시점에도 최근 활동이 있으면 이미 갱신됐을 것이므로 토큰 잔여 재확인
        const cur    = localStorage.getItem('token')
        const curExp = cur ? parseJwtExp(cur) : 0
        if (curExp && curExp - Date.now() > 5 * 60 * 1000) return  // 이미 갱신됨
        Modal.warning({
          title: '세션 만료 임박',
          content: '5분 후 자동 로그아웃됩니다.',
          okText: '확인',
        })
      }, warnAt)
    }

    // 만료 시 자동 로그아웃
    expireTimerRef.current = setTimeout(() => {
      logout('expired')
    }, remaining)
  }, [logout, scheduleRefresh])

  // ── 사용자 활동 추적 ────────────────────────────────────────────────────────
  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    const onActivity = () => { lastActivityRef.current = Date.now() }
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }))
    return () => events.forEach(e => window.removeEventListener(e, onActivity))
  }, [])

  // ── 초기화 ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token     = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      const expMs = parseJwtExp(token)
      if (expMs && Date.now() < expMs) {
        setUser(JSON.parse(savedUser))
        scheduleExpiry(expMs)
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
    return clearTimers
  }, [scheduleExpiry])

  // ── 로그인 ─────────────────────────────────────────────────────────────────
  const login = async (username, password) => {
    const form = new URLSearchParams()
    form.append('username', username)
    form.append('password', password)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || '로그인 실패')
    }

    const data = await res.json()
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify({ username: data.username, role: data.role }))
    setUser({ username: data.username, role: data.role })
    lastActivityRef.current = Date.now()

    const expMs = parseJwtExp(data.access_token)
    if (expMs) scheduleExpiry(expMs, data.expire_minutes)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function authFetch(url, options = {}) {
  const token = localStorage.getItem('token')
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  }).then(res => {
    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.dispatchEvent(new Event('auth:logout'))
    }
    return res
  })
}
