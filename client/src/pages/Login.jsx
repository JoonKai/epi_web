import { useState } from 'react'
import { Form, Input, Button, Card, message, theme } from 'antd'
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
      background: 'linear-gradient(135deg, #1e3a5f 0%, #16213e 100%)',
    }}>
      <Card style={{ width: 380, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #4f7fff, #7b5ea7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 'bold',
            color: '#fff',
            margin: '0 auto 16px',
          }}>E</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: token.colorText }}>EPI Web</div>
          <div style={{ fontSize: 13, color: token.colorTextSecondary, marginTop: 4 }}>
            사내 EPI 공정 관리 시스템
          </div>
        </div>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="username" rules={[{ required: true, message: '아이디를 입력하세요.' }]}>
            <Input prefix={<UserOutlined />} placeholder="아이디" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '비밀번호를 입력하세요.' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            로그인
          </Button>
        </Form>
      </Card>
    </div>
  )
}

export default Login
