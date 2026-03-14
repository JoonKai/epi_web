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

  const warningTimerRef = useRef(null)
  const expireTimerRef = useRef(null)
  const refreshTimerRef = useRef(null)
  const lastActivityRef = useRef(Date.now())
  const refreshInFlightRef = useRef(null)
  const sessionMinutesRef = useRef(60)

  const clearTimers = useCallback(() => {
    clearTimeout(warningTimerRef.current)
    clearTimeout(expireTimerRef.current)
    clearTimeout(refreshTimerRef.current)
  }, [])

  const logout = useCallback((reason) => {
    clearTimers()
    refreshInFlightRef.current = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)

    if (reason === 'expired') {
      Modal.warning({
        title: '세션 만료',
        content: '활동이 없어 세션이 만료되었습니다. 다시 로그인해 주세요.',
        okText: '확인',
      })
    }
  }, [clearTimers])

  const scheduleExpiry = useCallback((expMs, expireMinutes = 60) => {
    clearTimeout(warningTimerRef.current)
    clearTimeout(expireTimerRef.current)

    const remaining = expMs - Date.now()
    if (remaining <= 0) {
      logout('expired')
      return
    }

    sessionMinutesRef.current = expireMinutes

    const warnAt = remaining - 5 * 60 * 1000
    if (warnAt > 0) {
      warningTimerRef.current = setTimeout(() => {
        const token = localStorage.getItem('token')
        const currentExp = token ? parseJwtExp(token) : 0
        if (currentExp && currentExp - Date.now() > 5 * 60 * 1000) return

        const idleMs = Date.now() - lastActivityRef.current
        const idleLimit = expireMinutes * 60 * 1000 * 0.8
        if (idleMs < idleLimit) return

        Modal.warning({
          title: '세션 만료 임박',
          content: '5분 후 자동 로그아웃됩니다.',
          okText: '확인',
        })
      }, warnAt)
    }

    expireTimerRef.current = setTimeout(() => {
      const idleMs = Date.now() - lastActivityRef.current
      const activeWindowMs = Math.min(5 * 60 * 1000, expireMinutes * 60 * 1000 * 0.2)

      if (idleMs <= activeWindowMs) {
        window.dispatchEvent(new Event('auth:activity-refresh'))
        return
      }

      logout('expired')
    }, remaining)
  }, [logout])

  const refreshToken = useCallback(async ({ force = false } = {}) => {
    const token = localStorage.getItem('token')
    if (!token) return false

    const expMs = parseJwtExp(token)
    const now = Date.now()
    const expireMinutes = sessionMinutesRef.current || 60
    const refreshThresholdMs = Math.min(10 * 60 * 1000, Math.max(60 * 1000, expireMinutes * 60 * 1000 * 0.25))

    if (!force && expMs && expMs - now > refreshThresholdMs) {
      return false
    }

    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current
    }

    refreshInFlightRef.current = (async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return false

        const data = await res.json()
        localStorage.setItem('token', data.access_token)

        const nextExpMs = parseJwtExp(data.access_token)
        if (nextExpMs) {
          scheduleExpiry(nextExpMs, data.expire_minutes)
          scheduleRefresh(nextExpMs, data.expire_minutes)
        }
        return true
      } catch {
        return false
      } finally {
        refreshInFlightRef.current = null
      }
    })()

    return refreshInFlightRef.current
  }, [scheduleExpiry])

  const scheduleRefresh = useCallback((expMs, expireMinutes = 60) => {
    clearTimeout(refreshTimerRef.current)

    const remaining = expMs - Date.now()
    if (remaining <= 0) return

    const refreshIn = Math.max(30_000, remaining / 2)
    refreshTimerRef.current = setTimeout(async () => {
      const idleMs = Date.now() - lastActivityRef.current
      const idleLimit = expireMinutes * 60 * 1000 * 0.8
      if (idleMs > idleLimit) return

      await refreshToken({ force: true })
    }, refreshIn)
  }, [refreshToken])

  useEffect(() => {
    const onActivity = () => {
      lastActivityRef.current = Date.now()
      refreshToken()
    }

    const onForceRefresh = () => {
      refreshToken({ force: true })
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach((eventName) => window.addEventListener(eventName, onActivity, { passive: true }))
    window.addEventListener('auth:activity-refresh', onForceRefresh)

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, onActivity))
      window.removeEventListener('auth:activity-refresh', onForceRefresh)
    }
  }, [refreshToken])

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (token && savedUser) {
      const expMs = parseJwtExp(token)
      if (expMs && Date.now() < expMs) {
        setUser(JSON.parse(savedUser))
        scheduleExpiry(expMs, sessionMinutesRef.current)
        scheduleRefresh(expMs, sessionMinutesRef.current)
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }

    setLoading(false)
    return clearTimers
  }, [clearTimers, scheduleExpiry, scheduleRefresh])

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
    sessionMinutesRef.current = data.expire_minutes

    const expMs = parseJwtExp(data.access_token)
    if (expMs) {
      scheduleExpiry(expMs, data.expire_minutes)
      scheduleRefresh(expMs, data.expire_minutes)
    }
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
