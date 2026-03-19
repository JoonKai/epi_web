import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Modal } from 'antd'

const AuthContext = createContext(null)

function parseJwtExp(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const lastActivityRef = useRef(Date.now())
  const warnedRef = useRef(false)

  const logout = useCallback((reason) => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('session_minutes')
    setUser(null)
    warnedRef.current = false

    if (reason === 'expired') {
      Modal.warning({
        title: '세션 만료',
        content: '활동이 없어 세션이 만료되었습니다. 다시 로그인해 주세요.',
        okText: '확인',
      })
    }
  }, [])

  // 사용자 활동 추적
  useEffect(() => {
    const onActivity = () => {
      lastActivityRef.current = Date.now()
    }
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    return () => events.forEach((e) => window.removeEventListener(e, onActivity))
  }, [])

  // 외부 401 이벤트 처리
  useEffect(() => {
    const handler = () => logout()
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [logout])

  // 30초마다 토큰 상태 확인 및 갱신
  useEffect(() => {
    if (!user) return

    const doRefresh = async () => {
      const token = localStorage.getItem('token')
      if (!token) return false
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return false
        const data = await res.json()
        localStorage.setItem('token', data.access_token)
        if (data.expire_minutes) {
          localStorage.setItem('session_minutes', String(data.expire_minutes))
        }
        warnedRef.current = false
        return true
      } catch {
        return false
      }
    }

    const tick = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      const expMs = parseJwtExp(token)
      if (!expMs) return

      const now = Date.now()
      const remaining = expMs - now
      const sessionMinutes = parseInt(localStorage.getItem('session_minutes') || '60', 10)
      const idleMs = now - lastActivityRef.current
      const idleLimitMs = sessionMinutes * 60 * 1000 * 0.8

      // 토큰 만료됨
      if (remaining <= 0) {
        if (idleMs <= idleLimitMs) {
          // 활성 사용자 - 갱신 시도
          const ok = await doRefresh()
          if (!ok) logout('expired')
        } else {
          logout('expired')
        }
        return
      }

      // 만료 5분 전 + 비활성 → 경고
      if (remaining < 5 * 60 * 1000 && idleMs > idleLimitMs && !warnedRef.current) {
        warnedRef.current = true
        Modal.warning({
          title: '세션 만료 임박',
          content: `${Math.ceil(remaining / 60000)}분 후 자동 로그아웃됩니다.`,
          okText: '확인',
        })
      }

      // 갱신 임계값 내 + 활성 사용자 → 갱신
      const refreshThresholdMs = Math.min(10 * 60 * 1000, Math.max(60 * 1000, sessionMinutes * 60 * 1000 * 0.25))
      if (remaining < refreshThresholdMs && idleMs <= idleLimitMs) {
        await doRefresh()
      }
    }

    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [user, logout])

  // 마운트 시 저장된 세션 복원
  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (token && savedUser) {
      const expMs = parseJwtExp(token)
      if (expMs && Date.now() < expMs) {
        setUser(JSON.parse(savedUser))
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('session_minutes')
      }
    }

    setLoading(false)
  }, [])

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
    localStorage.setItem('session_minutes', String(data.expire_minutes ?? 60))

    setUser({ username: data.username, role: data.role })
    lastActivityRef.current = Date.now()
    warnedRef.current = false
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
  }).then((res) => {
    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.dispatchEvent(new Event('auth:logout'))
    }
    return res
  })
}
