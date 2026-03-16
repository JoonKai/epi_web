import { useState } from 'react'
import { Form, Input, Button, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'

function Login() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)

  const onFinish = async ({ username, password }) => {
    setLoading(true)
    try {
      await login(username, password)
    } catch (e) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0b0f1a 0%, #111827 50%, #0d1340 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 배경 장식 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)',
          top: -250, left: -200,
        }} />
        <div style={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 65%)',
          bottom: -150, right: -100,
        }} />
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 65%)',
          top: '40%', right: '15%',
        }} />
      </div>

      <div
        style={{
          width: 420,
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: 24,
          border: '1px solid rgba(99,102,241,0.15)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset',
          padding: '48px 40px 40px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div
            style={{
              width: 68, height: 68, borderRadius: 20,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, fontWeight: 900, color: '#fff',
              margin: '0 auto 20px',
              boxShadow: '0 10px 36px rgba(99,102,241,0.45)',
            }}
          >
            E
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#e2e8f0', letterSpacing: -0.5 }}>EPI</div>
          <div style={{ fontSize: 13, color: 'rgba(148,163,184,0.7)', marginTop: 6, letterSpacing: 0.3 }}>
            사내 EPI 공정 관리 시스템
          </div>
        </div>

        <Form layout="vertical" onFinish={onFinish} size="large" className="login-dark-input">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '아이디를 입력하세요.' }]}
            style={{ marginBottom: 16 }}
          >
            <Input
              prefix={<UserOutlined style={{ color: 'rgba(99,102,241,0.7)' }} />}
              placeholder="아이디"
              autoComplete="username"
              style={{ height: 48, borderRadius: 12 }}
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '비밀번호를 입력하세요.' }]}
            style={{ marginBottom: 28 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(99,102,241,0.7)' }} />}
              placeholder="비밀번호"
              autoComplete="current-password"
              style={{ height: 48, borderRadius: 12 }}
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            style={{
              height: 50,
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              boxShadow: '0 6px 24px rgba(99,102,241,0.45)',
              letterSpacing: 0.5,
            }}
          >
            로그인
          </Button>
        </Form>

        {/* 구분선 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(99,102,241,0.12)' }} />
          <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.4)', letterSpacing: 1 }}>EPI SYSTEM</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(99,102,241,0.12)' }} />
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(148,163,184,0.3)' }}>
          © 2025 EPI Process Management System
        </div>
      </div>
    </div>
  )
}

export default Login
