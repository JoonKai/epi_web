import { Empty } from 'antd'
import { BookOutlined } from '@ant-design/icons'

function WorkLog() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{
        padding: 24, borderRadius: 22,
        border: '1px solid var(--nowa-border)',
        background: 'var(--nowa-hero-bg)',
        boxShadow: 'var(--nowa-shadow-card)',
      }}>
        <div style={{ color: 'var(--nowa-text)', fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
          업무 일지
        </div>
        <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14 }}>
          MOCVD 설비 관련 업무 일지를 기록하고 조회합니다.
        </div>
      </div>
      <Empty
        image={<BookOutlined style={{ fontSize: 64, color: 'var(--nowa-text-muted)' }} />}
        imageStyle={{ height: 80 }}
        description={<span style={{ color: 'var(--nowa-text-muted)' }}>준비 중입니다.</span>}
        style={{ padding: '60px 0' }}
      />
    </div>
  )
}

export default WorkLog
