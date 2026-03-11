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
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const warningTimerRef = useRef(null)
  const expireTimerRef = useRef(null)

  const clearTimers = () => {
    clearTimeout(warningTimerRef.current)
    clearTimeout(expireTimerRef.current)
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

  const scheduleExpiry = useCallback((expMs) => {
    clearTimers()
    const now = Date.now()
    const remaining = expMs - now

    if (remaining <= 0) {
      logout('expired')
      return
    }

    // 만료 5분 전 경고
    const warnAt = remaining - 5 * 60 * 1000
    if (warnAt > 0) {
      warningTimerRef.current = setTimeout(() => {
        Modal.warning({
          title: '세션 만료 임박',
          content: '5분 후 자동 로그아웃됩니다. 계속 사용하려면 다시 로그인해주세요.',
          okText: '확인',
        })
      }, warnAt)
    }

    // 만료 시 자동 로그아웃
    expireTimerRef.current = setTimeout(() => {
      logout('expired')
    }, remaining)
  }, [logout])

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      const expMs = parseJwtExp(token)
      if (expMs && Date.now() < expMs) {
        setUser(JSON.parse(savedUser))
        scheduleExpiry(expMs)
      } else {
        // 이미 만료된 토큰 제거
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
    return clearTimers
  }, [scheduleExpiry])

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

    const expMs = parseJwtExp(data.access_token)
    if (expMs) scheduleExpiry(expMs)
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
      // 토큰 만료 또는 인증 실패 시 강제 로그아웃
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.dispatchEvent(new Event('auth:logout'))
    }
    return res
  })
}
