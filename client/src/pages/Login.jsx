import { useState } from 'react'
import { Form, Input, Button, message } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)

  const onFinish = async ({ username, password }) => {
    setLoading(true)
    try {
      await login(username, password)
    } catch (error) {
      message.error(error.message)
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
        background: 'radial-gradient(circle at top left, rgba(245,158,11,0.12) 0%, transparent 28%), radial-gradient(circle at right center, rgba(249,115,22,0.10) 0%, transparent 24%), linear-gradient(135deg, #121520 0%, #171b26 45%, #151821 100%)',
        position: 'relative',
        overflow: 'hidden',
        padding: 24,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(245,158,11,0.03) 0%, transparent 24%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: 440,
          background: 'linear-gradient(180deg, rgba(22,25,33,0.96) 0%, rgba(15,17,23,0.98) 100%)',
          backdropFilter: 'blur(18px)',
          borderRadius: 24,
          border: '1px solid rgba(245,158,11,0.14)',
          boxShadow: '0 28px 70px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.03)',
          padding: '42px 40px 36px',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, #f59e0b 0%, #f97316 100%)',
            opacity: 0.95,
          }}
        />

        <div style={{ textAlign: 'center', marginBottom: 34 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 22,
              background: 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(249,115,22,0.14) 100%)',
              border: '1px solid rgba(245,158,11,0.26)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24',
              fontSize: 42,
              fontWeight: 900,
              margin: '0 auto 18px',
              boxShadow: '0 14px 34px rgba(245,158,11,0.16)',
            }}
          >
            E
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#f8fafc', letterSpacing: -0.6 }}>
            EPI
          </div>
          <div style={{ fontSize: 13, color: 'rgba(196,210,226,0.78)', marginTop: 8, lineHeight: 1.6 }}>
            EPI 운영 관리 페이지
          </div>
        </div>

        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '아이디를 입력하세요.' }]}
            style={{ marginBottom: 16 }}
          >
            <Input
              className="epi-login-input"
              prefix={<UserOutlined style={{ color: 'rgba(245,158,11,0.72)' }} />}
              placeholder="아이디"
              autoComplete="username"
              style={{
                height: 48,
                borderRadius: 12,
                background: 'rgba(15,23,42,0.52)',
                borderColor: 'rgba(245,158,11,0.16)',
                color: '#e5e7eb',
                boxShadow: 'none',
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '비밀번호를 입력하세요.' }]}
            style={{ marginBottom: 24 }}
          >
            <Input.Password
              className="epi-login-input"
              prefix={<LockOutlined style={{ color: 'rgba(245,158,11,0.72)' }} />}
              placeholder="비밀번호"
              autoComplete="current-password"
              style={{
                height: 48,
                borderRadius: 12,
                background: 'rgba(15,23,42,0.52)',
                borderColor: 'rgba(245,158,11,0.16)',
                color: '#e5e7eb',
                boxShadow: 'none',
              }}
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
              fontWeight: 800,
              background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
              border: 'none',
              boxShadow: '0 10px 24px rgba(245,158,11,0.28)',
              letterSpacing: 0.3,
            }}
          >
            로그인
          </Button>
        </Form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(245,158,11,0.12)' }} />
          <span style={{ fontSize: 11, color: 'rgba(196,210,226,0.42)', letterSpacing: 1.2 }}>MOCVD CONSOLE</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(245,158,11,0.12)' }} />
        </div>

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: 'rgba(196,210,226,0.36)' }}>
          2026 EPI Process Management System
        </div>
      </div>

      <style>{`
        .epi-login-input.ant-input,
        .epi-login-input.ant-input-affix-wrapper,
        .epi-login-input.ant-input-affix-wrapper-focused,
        .epi-login-input.ant-input-affix-wrapper:hover,
        .epi-login-input.ant-input-affix-wrapper:focus,
        .epi-login-input.ant-input-affix-wrapper:focus-within,
        .epi-login-input.ant-input:focus,
        .epi-login-input.ant-input:hover {
          background: rgba(15,23,42,0.52) !important;
          box-shadow: none !important;
        }
        .epi-login-input input {
          background: transparent !important;
          color: #e5e7eb !important;
        }
        .epi-login-input input:-webkit-autofill,
        .epi-login-input input:-webkit-autofill:hover,
        .epi-login-input input:-webkit-autofill:focus,
        .epi-login-input input:-webkit-autofill:active {
          -webkit-text-fill-color: #e5e7eb !important;
          -webkit-box-shadow: 0 0 0 1000px rgba(15,23,42,0.52) inset !important;
          box-shadow: 0 0 0 1000px rgba(15,23,42,0.52) inset !important;
          transition: background-color 9999s ease-out 0s !important;
          caret-color: #e5e7eb !important;
        }
      `}</style>
    </div>
  )
}
