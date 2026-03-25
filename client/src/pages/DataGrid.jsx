import { useMemo, useRef, useState } from 'react'
import { Alert, Button, Card, Col, Input, Row, Tag, Tree, message } from 'antd'
import { DownloadOutlined, FilePdfOutlined, FilePptOutlined, FolderOpenOutlined } from '@ant-design/icons'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import PptxGenJS from 'pptxgenjs'
import dayjs from 'dayjs'
import { panelStyle } from '../theme/consoleTheme'

const REPORT_TREE = [
  {
    title: 'MOCVD',
    key: 'mocvd',
    children: [
      { title: '종합 현황판', key: 'mocvd-overview' },
      { title: 'MOCVD 관리', key: 'mocvd-management' },
      { title: '업무 일지', key: 'mocvd-work-log' },
      { title: '소스 관리', key: 'mocvd-source' },
      { title: 'PM/BM 관리', key: 'mocvd-pm' },
      { title: '인원 관리', key: 'mocvd-shift' },
      { title: '기준정보 관리', key: 'mocvd-master' },
    ],
  },
  {
    title: '비용',
    key: 'cost',
    children: [
      { title: '구매요청', key: 'cost-purchase' },
      { title: '수리현황', key: 'cost-repair' },
      { title: '기준정보등록', key: 'cost-master' },
    ],
  },
  {
    title: '분석',
    key: 'analysis',
    children: [
      { title: '웨이퍼맵', key: 'analysis-wafer' },
      { title: '런 비교', key: 'analysis-run' },
    ],
  },
  {
    title: '기타',
    key: 'etc',
    children: [
      { title: '측정설비', key: 'etc-measurement' },
      { title: '시뮬레이터', key: 'etc-simulator' },
    ],
  },
]

const REPORT_META = {
  'mocvd-overview': {
    group: 'MOCVD',
    title: '종합 현황판',
    path: '/epi/mocvd/overview',
    summary: 'MOCVD 운영 전반 요약, 인수인계, 공지, 핵심 연결 메뉴를 포함한 메인 콘솔 화면입니다.',
    bullets: ['MOCVD 핵심 상태를 빠르게 공유', '공지/인수인계 포함', '다른 운영 메뉴 진입 허브'],
  },
  'mocvd-management': {
    group: 'MOCVD',
    title: 'MOCVD 관리',
    path: '/epi/mocvd/management',
    summary: '장비 현황판과 강제 다운 관리로 구성되며, 설비 상태와 강제 제어 상태를 함께 관리합니다.',
    bullets: ['장비 상태 카드', '위험 분포 차트', '강제 다운 저장'],
  },
  'mocvd-work-log': {
    group: 'MOCVD',
    title: '업무 일지',
    path: '/epi/mocvd/work-log',
    summary: '설비 이슈와 작업 조치 내역을 시간순으로 기록하는 운영 로그 화면입니다.',
    bullets: ['설비별 작업 이력 관리', '시작/종료 시각 기록', '상황/조치 내용 기록'],
  },
  'mocvd-source': {
    group: 'MOCVD',
    title: '소스 관리',
    path: '/epi/mocvd/source',
    summary: '소스 입력, 교체 예정, 설비별 소스 상태를 스프레드시트형으로 관리하는 핵심 화면입니다.',
    bullets: ['전 설비 소스 입력', '교체 예측 표시', '소스 상태 현황판 연결'],
  },
  'mocvd-pm': {
    group: 'MOCVD',
    title: 'PM/BM 관리',
    path: '/epi/mocvd/pm-plan',
    summary: 'PM 기준 Count와 실제 Count를 설비별로 관리하고, 도달률 차트로 상태를 비교합니다.',
    bullets: ['PM/Filter 기준 Count 입력', '설비별 진행률 비교', 'CSV 일괄 반영 지원'],
  },
  'mocvd-shift': {
    group: 'MOCVD',
    title: '인원 관리',
    path: '/epi/mocvd/shift-schedule',
    summary: '월간 근무표와 근무 인원 구성을 한 화면에서 운영하는 인력 관리 화면입니다.',
    bullets: ['월간 근무표 엑셀형 표시', '근무 인원 관리', '주간/야간/휴무 집계'],
  },
  'mocvd-master': {
    group: 'MOCVD',
    title: '기준정보 관리',
    path: '/epi/mocvd/master-data',
    summary: '호기, 소스 종류 등 MOCVD 운영에 필요한 기준 데이터를 관리합니다.',
    bullets: ['호기 기준정보 관리', '소스 종류 정렬/사용 여부', '운영 화면 기준 데이터 제공'],
  },
  'cost-purchase': {
    group: '비용',
    title: '구매요청',
    path: '/cost/purchase-request',
    summary: '비용 관련 부품/자재 구매 요청을 엑셀형 목록과 등록 폼으로 관리합니다.',
    bullets: ['구매 요청 목록', '상태/업체 필터', '우측 등록 폼'],
  },
  'cost-repair': {
    group: '비용',
    title: '수리현황',
    path: '/cost/repair-status',
    summary: '수리 입고/반출/업체/사유 등을 스프레드시트형으로 추적하는 관리 화면입니다.',
    bullets: ['입고/반출 이력', '업체/사유 관리', '엑셀형 넓은 시트'],
  },
  'cost-master': {
    group: '비용',
    title: '기준정보등록',
    path: '/cost/master-data',
    summary: '비용 기준 품목과 업체 정보를 탭 구조로 관리합니다.',
    bullets: ['품목 기준정보', '업체 등록', '검색/등록 폼'],
  },
  'analysis-wafer': {
    group: '분석',
    title: '웨이퍼맵',
    path: '/wafermap',
    summary: '웨이퍼 시각화와 결과 비교를 위한 분석 화면입니다.',
    bullets: ['맵 시각화', '영역별 확인', '분석 지원'],
  },
  'analysis-run': {
    group: '분석',
    title: '런 비교',
    path: '/run-comparison',
    summary: '런 단위 결과를 비교해 이상 여부를 판단하는 분석 화면입니다.',
    bullets: ['런 간 비교', '조건별 검토', '이상 탐지 보조'],
  },
  'etc-measurement': {
    group: '기타',
    title: '측정설비',
    path: '/epi/measurement',
    summary: '측정 장비 관련 운영 정보를 다루는 화면입니다.',
    bullets: ['측정 장비 관리', '운영 화면 연결', '확장 가능 구조'],
  },
  'etc-simulator': {
    group: '기타',
    title: '시뮬레이터',
    path: '/epi/simulator',
    summary: '비용/수율/런 조건을 가정해 시뮬레이션하는 화면입니다.',
    bullets: ['가정값 기반 계산', '시나리오 검토', '원가/손익 참고'],
  },
}

function collectLeafKeys(nodes) {
  return nodes.flatMap((node) => (node.children ? collectLeafKeys(node.children) : [node.key]))
}

const DEFAULT_KEYS = ['mocvd-overview', 'mocvd-source', 'mocvd-pm']
const ALL_LEAF_KEYS = collectLeafKeys(REPORT_TREE)

function buildPreviewSections(checkedKeys, reportTitle) {
  return checkedKeys
    .filter((key) => REPORT_META[key])
    .map((key, index) => ({
      order: index + 1,
      ...REPORT_META[key],
      reportTitle,
    }))
}

export default function DataGrid() {
  const [checkedKeys, setCheckedKeys] = useState(DEFAULT_KEYS)
  const [expandedKeys, setExpandedKeys] = useState(REPORT_TREE.map((node) => node.key))
  const [reportTitle, setReportTitle] = useState(`EPI 운영 보고서 ${dayjs().format('YYYY-MM-DD')}`)
  const [exporting, setExporting] = useState(false)
  const previewRef = useRef(null)

  const previewSections = useMemo(() => buildPreviewSections(checkedKeys, reportTitle), [checkedKeys, reportTitle])

  const summary = useMemo(() => {
    const groups = {}
    previewSections.forEach((section) => {
      groups[section.group] = (groups[section.group] ?? 0) + 1
    })
    return groups
  }, [previewSections])

  const handleTreeCheck = (nextChecked) => {
    setCheckedKeys(Array.isArray(nextChecked) ? nextChecked : nextChecked.checked)
  }

  const handleSelectAll = () => setCheckedKeys(ALL_LEAF_KEYS)
  const handleClearAll = () => setCheckedKeys([])

  const exportPdf = async () => {
    if (!previewRef.current || previewSections.length === 0) {
      message.warning('보고서에 포함할 메뉴를 먼저 선택하세요.')
      return
    }

    setExporting(true)
    try {
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: '#171b26',
        scale: 2,
        useCORS: true,
      })
      const imageData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth - 16
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 8
      pdf.addImage(imageData, 'PNG', 8, position, imgWidth, imgHeight)
      heightLeft -= pageHeight - 16

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 8
        pdf.addPage()
        pdf.addImage(imageData, 'PNG', 8, position, imgWidth, imgHeight)
        heightLeft -= pageHeight - 16
      }

      pdf.save(`${sanitizeFileName(reportTitle)}.pdf`)
      message.success('PDF 보고서를 생성했습니다.')
    } catch (error) {
      message.error(error.message || 'PDF 생성에 실패했습니다.')
    } finally {
      setExporting(false)
    }
  }

  const exportPptx = async () => {
    if (previewSections.length === 0) {
      message.warning('보고서에 포함할 메뉴를 먼저 선택하세요.')
      return
    }

    setExporting(true)
    try {
      const pptx = new PptxGenJS()
      pptx.layout = 'LAYOUT_WIDE'
      pptx.author = 'EPI Web'
      pptx.company = 'EPI'
      pptx.subject = reportTitle
      pptx.title = reportTitle
      pptx.lang = 'ko-KR'
      pptx.theme = {
        headFontFace: 'Malgun Gothic',
        bodyFontFace: 'Malgun Gothic',
        lang: 'ko-KR',
      }

      const cover = pptx.addSlide()
      cover.background = { color: '0F1117' }
      cover.addText(reportTitle, {
        x: 0.6, y: 0.8, w: 8.6, h: 0.6,
        fontSize: 24, bold: true, color: 'F4D28B',
      })
      cover.addText(`생성일 ${dayjs().format('YYYY-MM-DD HH:mm')}`, {
        x: 0.6, y: 1.6, w: 4.5, h: 0.3,
        fontSize: 14, color: '94A3B8',
      })
      cover.addText(
        Object.entries(summary).map(([group, count]) => `${group}: ${count}개 메뉴`).join('   '),
        {
          x: 0.6, y: 2.0, w: 10.5, h: 0.4,
          fontSize: 14, color: 'CBD5E1',
        },
      )

      previewSections.forEach((section) => {
        const slide = pptx.addSlide()
        slide.background = { color: '111827' }
        slide.addText(section.title, {
          x: 0.6, y: 0.5, w: 5.5, h: 0.5,
          fontSize: 22, bold: true, color: 'F8FAFC',
        })
        slide.addText(section.group, {
          x: 0.6, y: 1.05, w: 2.5, h: 0.3,
          fontSize: 14, bold: true, color: 'F59E0B',
        })
        slide.addText(section.path, {
          x: 0.6, y: 1.35, w: 6.4, h: 0.3,
          fontSize: 14, color: '94A3B8',
        })
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.6, y: 1.9, w: 12.0, h: 1.1,
          rectRadius: 0.08,
          line: { color: '334155', pt: 1 },
          fill: { color: '172033', transparency: 5 },
        })
        slide.addText(section.summary, {
          x: 0.85, y: 2.2, w: 11.5, h: 0.55,
          fontSize: 14, color: 'E2E8F0',
          breakLine: false,
          margin: 0,
        })
        slide.addText(section.bullets.map((bullet) => ({ text: bullet, options: { bullet: { indent: 12 } } })), {
          x: 0.8, y: 3.4, w: 7.2, h: 2.4,
          fontSize: 16, color: 'CBD5E1',
          valign: 'top',
          breakLine: true,
        })
      })

      await pptx.writeFile({ fileName: `${sanitizeFileName(reportTitle)}.pptx` })
      message.success('PPTX 보고서를 생성했습니다.')
    } catch (error) {
      message.error(error.message || 'PPTX 생성에 실패했습니다.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="nowa-page-banner">
        <div className="nowa-page-banner-left">
          <span className="nowa-page-banner-kicker">Report Builder</span>
          <div className="nowa-page-banner-title">메뉴 기반 보고서 만들기</div>
          <div className="nowa-page-banner-desc">메뉴 트리에서 필요한 화면을 체크하고 PDF 또는 PPTX 형태로 정리된 보고서를 생성합니다.</div>
        </div>
        <div className="console-toolbar-group">
          <Button onClick={handleSelectAll}>전체 선택</Button>
          <Button onClick={handleClearAll}>전체 해제</Button>
          <Button type="primary" icon={<FilePdfOutlined />} onClick={exportPdf} loading={exporting}>
            PDF
          </Button>
          <Button type="primary" icon={<FilePptOutlined />} onClick={exportPptx} loading={exporting}>
            PPTX
          </Button>
        </div>
      </div>

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} xl={7}>
          <Card className="console-panel" style={{ ...panelStyle, height: '100%' }} title="메뉴 트리 선택">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Input
                value={reportTitle}
                onChange={(event) => setReportTitle(event.target.value)}
                placeholder="보고서 제목"
              />
              <Alert
                type="info"
                showIcon
                message={`선택된 메뉴 ${previewSections.length}개`}
                description="상위 메뉴를 체크하면 하위 메뉴가 함께 선택됩니다."
              />
              <div
                style={{
                  border: '1px solid rgba(245,158,11,0.12)',
                  borderRadius: 12,
                  background: 'rgba(15,23,42,0.42)',
                  padding: 12,
                  minHeight: 420,
                }}
              >
                <Tree
                  checkable
                  checkedKeys={checkedKeys}
                  expandedKeys={expandedKeys}
                  onExpand={setExpandedKeys}
                  onCheck={handleTreeCheck}
                  treeData={REPORT_TREE}
                  selectable={false}
                  style={{ color: 'var(--nowa-text)' }}
                />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={17}>
          <Card className="console-panel" style={{ ...panelStyle, height: '100%' }} title="보고서 미리보기">
            {previewSections.length === 0 ? (
              <Alert type="warning" showIcon message="선택된 메뉴가 없습니다." description="왼쪽 트리에서 보고서에 포함할 메뉴를 먼저 체크하세요." />
            ) : (
              <div ref={previewRef} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div
                  style={{
                    borderRadius: 16,
                    padding: '18px 20px',
                    border: '1px solid rgba(245,158,11,0.15)',
                    background: 'linear-gradient(180deg, rgba(24,18,12,0.85) 0%, rgba(15,17,23,0.98) 100%)',
                  }}
                >
                  <div style={{ color: '#f4d28b', fontSize: 22, fontWeight: 800 }}>{reportTitle || '보고서 제목 없음'}</div>
                  <div style={{ color: 'rgba(220,232,255,0.68)', marginTop: 6 }}>
                    생성일 {dayjs().format('YYYY-MM-DD HH:mm')} / 포함 메뉴 {previewSections.length}개
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.entries(summary).map(([group, count]) => (
                      <Tag key={group} style={{ margin: 0, borderRadius: 999, padding: '4px 10px', border: '1px solid rgba(245,158,11,0.18)', background: 'rgba(245,158,11,0.08)', color: '#f4d28b' }}>
                        {group} {count}
                      </Tag>
                    ))}
                  </div>
                </div>

                {previewSections.map((section) => (
                  <div
                    key={section.path}
                    style={{
                      borderRadius: 16,
                      padding: '16px 18px',
                      border: '1px solid var(--nowa-border)',
                      background: 'rgba(15,23,42,0.44)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ color: '#f59e0b', fontSize: 14, fontWeight: 700 }}>{section.group}</div>
                        <div style={{ color: 'var(--nowa-text)', fontSize: 18, fontWeight: 800, marginTop: 2 }}>
                          {section.order}. {section.title}
                        </div>
                        <div style={{ color: 'var(--nowa-text-muted)', fontSize: 14, marginTop: 4 }}>{section.path}</div>
                      </div>
                      <Tag style={{ margin: 0, borderRadius: 999, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.22)', color: '#7dd3fc' }}>
                        <FolderOpenOutlined /> 포함
                      </Tag>
                    </div>
                    <div style={{ marginTop: 12, color: 'rgba(220,232,255,0.82)', lineHeight: 1.6 }}>{section.summary}</div>
                    <ul style={{ margin: '12px 0 0', paddingLeft: 18, color: 'var(--nowa-text-muted)', lineHeight: 1.7 }}>
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

function sanitizeFileName(value) {
  return String(value || 'report').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'report'
}
