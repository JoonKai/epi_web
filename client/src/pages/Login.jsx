import { useState } from 'react'
import { Form, Input, Button, message, theme } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'

function Login() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const { token } = theme.useToken()

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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #070f1e 0%, #0d1b2e 50%, #111d38 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 배경 장식 원 */}
      <div style={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79,127,255,0.07) 0%, transparent 70%)',
        top: -200, left: -200, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(123,94,167,0.08) 0%, transparent 70%)',
        bottom: -100, right: -100, pointerEvents: 'none',
      }} />

      <div style={{
        width: 400,
        background: 'rgba(15,32,64,0.85)',
        backdropFilter: 'blur(16px)',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        padding: '48px 40px 40px',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'linear-gradient(135deg, #4f7fff 0%, #7b5ea7 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 900, color: '#fff',
            margin: '0 auto 20px',
            boxShadow: '0 8px 32px rgba(79,127,255,0.35)',
          }}>E</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>EPI Web</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6, letterSpacing: 0.5 }}>
            사내 EPI 공정 관리 시스템
          </div>
        </div>

        <Form layout="vertical" onFinish={onFinish} size="large" className="login-dark-input">
          <Form.Item name="username" rules={[{ required: true, message: '아이디를 입력하세요.' }]} style={{ marginBottom: 16 }}>
            <Input
              prefix={<UserOutlined />}
              placeholder="아이디"
              autoComplete="username"
            />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '비밀번호를 입력하세요.' }]} style={{ marginBottom: 28 }}>
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="비밀번호"
              autoComplete="current-password"
            />
          </Form.Item>
          <Button
            type="primary" htmlType="submit" block loading={loading}
            style={{
              height: 46,
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4f7fff 0%, #7b5ea7 100%)',
              border: 'none',
              boxShadow: '0 4px 20px rgba(79,127,255,0.4)',
              letterSpacing: 1,
            }}
          >
            로그인
          </Button>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
          © 2025 EPI Process Management System
        </div>
      </div>
    </div>
  )
}

export default Login
