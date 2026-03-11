import { useRef } from 'react'
import { Tabs, Card, Button, Space, Upload, message, Typography } from 'antd'
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { useCostStore } from './store'
import SimDashboard from './SimDashboard'
import BOMTable from './BOMTable'
import ProcessCost from './ProcessCost'
import OverheadCost from './OverheadCost'
import CostSummary from './CostSummary'
import LotSimulation from './LotSimulation'
import BreakEvenAnalysis from './BreakEvenAnalysis'

const { Title } = Typography

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
    const a = document.createElement('a')
    a.href = url
    a.download = `cost_config_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success('설정이 내보내기 되었습니다.')
  }

  const importConfig = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result)
        store.loadConfig(config)
        message.success('설정을 불러왔습니다.')
      } catch {
        message.error('올바른 JSON 파일이 아닙니다.')
      }
    }
    reader.readAsText(file)
    return false
  }

  const items = [
    {
      key: 'dashboard',
      label: '대시보드',
      children: (
        <Card size="small" style={{ borderRadius: 8 }}>
          <SimDashboard />
        </Card>
      ),
    },
    {
      key: 'bom',
      label: 'BOM (자재)',
      children: (
        <Card size="small" title="원자재 명세서 (BOM)" style={{ borderRadius: 8 }}>
          <BOMTable />
        </Card>
      ),
    },
    {
      key: 'process',
      label: '공정비용',
      children: (
        <Card size="small" title="공정별 비용 입력" style={{ borderRadius: 8 }}>
          <ProcessCost />
        </Card>
      ),
    },
    {
      key: 'overhead',
      label: '고정경비',
      children: (
        <Card size="small" title="월 고정경비 / 판매관리비" style={{ borderRadius: 8 }}>
          <OverheadCost />
        </Card>
      ),
    },
    {
      key: 'summary',
      label: '원가 요약',
      children: (
        <Card size="small" title="원가 구성 요약" style={{ borderRadius: 8 }}>
          <CostSummary />
        </Card>
      ),
    },
    {
      key: 'lot',
      label: '로트 시뮬레이션',
      children: (
        <Card size="small" title="생산량별 원가·이익 분석" style={{ borderRadius: 8 }}>
          <LotSimulation />
        </Card>
      ),
    },
    {
      key: 'bep',
      label: '손익분기 분석',
      children: (
        <Card size="small" title="손익분기점 (BEP) 분석" style={{ borderRadius: 8 }}>
          <BreakEvenAnalysis />
        </Card>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>GaN EPI 원가 시뮬레이터</Title>
        <Space>
          <Upload showUploadList={false} beforeUpload={importConfig} accept=".json">
            <Button icon={<UploadOutlined />} size="small">설정 불러오기</Button>
          </Upload>
          <Button icon={<DownloadOutlined />} size="small" onClick={exportConfig}>설정 내보내기</Button>
        </Space>
      </div>
      <Tabs items={items} size="small" style={{ flex: 1 }} />
    </div>
  )
}
