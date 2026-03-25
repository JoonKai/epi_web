import PageBanner from '../../components/PageBanner'

function Measurement() {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <PageBanner
        kicker="측정 설비"
        title="측정설비"
        desc="측정 장비 관련 화면은 현재 준비 중이며 동일한 페이지 스타일로 확장할 수 있습니다."
      />
      <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14 }}>준비 중입니다.</div>
    </div>
  )
}

export default Measurement
