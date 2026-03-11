import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/')
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage('서버에 연결할 수 없습니다.'))
  }, [])

  return (
    <div className="app">
      <h1>Epi Web</h1>
      <p className="server-message">
        서버 응답: <strong>{message || '로딩 중...'}</strong>
      </p>
    </div>
  )
}

export default App
