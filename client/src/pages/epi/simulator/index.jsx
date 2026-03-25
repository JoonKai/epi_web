import { Button, Card, Space, Tabs, Typography, Upload, message } from 'antd'
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { useCostStore } from './store'
import BOMTable from './BOMTable'
import BreakEvenAnalysis from './BreakEvenAnalysis'
import CostSummary from './CostSummary'
import LotSimulation from './LotSimulation'
import OverheadCost from './OverheadCost'
import ProcessCost from './ProcessCost'
import SimDashboard from './SimDashboard'
import { panelStyle, sectionTitleStyle } from '../../../theme/consoleTheme'

const { Title, Text } = Typography

export default function CostSimulator() {
  const store = useCostStore()

  const exportConfig = () => {
    const config = {
      bom: store.bom,
      mocvd: store.mocvd,
      bake: store.bake,
      measurements: store.measurements,
      shipment: store.shipment,
      overhead: store.overhead,
      lotSize: store.lotSize,
      sellingPrice: store.sellingPrice,
    }
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `epi_cost_config_${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    message.success('시뮬레이터 설정을 내보냈습니다.')
  }

  const importConfig = (file) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        store.loadConfig(JSON.parse(event.target.result))
        message.success('설정을 불러왔습니다.')
      } catch {
        message.error('유효한 JSON 설정 파일이 아닙니다.')
      }
    }
    reader.readAsText(file)
    return false
  }

  const wrap = (title, children) => (
    <Card className="console-panel" style={panelStyle} styles={{ body: { padding: 18 } }} title={title}>
      {children}
    </Card>
  )

  const items = [
    { key: 'overview', label: '운영 개요', children: wrap('원가 운영 개요', <SimDashboard />) },
    { key: 'bom', label: 'BOM', children: wrap('원자재 입력', <BOMTable />) },
    { key: 'process', label: '공정비', children: wrap('공정 비용 입력', <ProcessCost />) },
    { key: 'overhead', label: '고정비', children: wrap('고정비 및 판관비', <OverheadCost />) },
    { key: 'summary', label: '원가 요약', children: wrap('원가 구성 요약', <CostSummary />) },
    { key: 'lot', label: '로트 분석', children: wrap('생산량 및 수익 분석', <LotSimulation />) },
    { key: 'bep', label: '손익분기', children: wrap('손익분기점 분석', <BreakEvenAnalysis />) },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="nowa-page-banner">
        <div className="nowa-page-banner-left">
          <span className="nowa-page-banner-kicker">시뮬레이터</span>
          <div className="nowa-page-banner-title">GaN EPI 원가 시뮬레이터</div>
          <div className="nowa-page-banner-desc">공정 원가, 생산량, 손익분기점을 한 흐름으로 분석하는 계산 화면</div>
        </div>
        <Space wrap>
          <Upload showUploadList={false} beforeUpload={importConfig} accept=".json">
            <Button className="console-button" icon={<UploadOutlined />}>설정 불러오기</Button>
          </Upload>
          <Button className="console-button" type="primary" icon={<DownloadOutlined />} onClick={exportConfig}>설정 내보내기</Button>
        </Space>
      </div>
      <Tabs className="console-tabs" items={items} />
    </div>
  )
}
