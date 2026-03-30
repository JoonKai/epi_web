import { Card, Divider, Space, Typography } from 'antd'

const { Title, Paragraph, Text } = Typography

const nodeStyle = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--nowa-border)',
  fontWeight: 600,
}

export default function PageDescription() {
  return (
    <Card
      style={{
        borderRadius: 16,
        border: '1px solid var(--nowa-border)',
        background: 'var(--nowa-card-bg)',
      }}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Title level={3} style={{ margin: 0 }}>페이지 설명</Title>

        <Paragraph style={{ margin: 0, color: 'var(--nowa-text-muted)' }}>
          이 시스템은 EPI 운영 데이터를 한곳에서 조회, 관리, 분석하기 위해 만든 웹 애플리케이션입니다.
        </Paragraph>

        <Divider style={{ margin: '4px 0' }} />

        <Title level={4} style={{ margin: 0 }}>1) 어떤 언어와 기술로 만들었나요?</Title>
        <Paragraph style={{ margin: 0 }}>
          <Text strong>프론트엔드:</Text> JavaScript, React, Vite, Ant Design
        </Paragraph>
        <Paragraph style={{ margin: 0 }}>
          <Text strong>백엔드:</Text> Python, FastAPI, SQLAlchemy
        </Paragraph>
        <Paragraph style={{ margin: 0 }}>
          <Text strong>주요 라이브러리:</Text> React Router, ECharts, AG Grid, Zustand
        </Paragraph>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ ...nodeStyle, background: 'rgba(59,130,246,0.12)' }}>프론트: React + Ant Design</div>
          <Text type="secondary">-&gt;</Text>
          <div style={{ ...nodeStyle, background: 'rgba(245,158,11,0.12)' }}>백엔드: FastAPI + SQLAlchemy</div>
          <Text type="secondary">-&gt;</Text>
          <div style={{ ...nodeStyle, background: 'rgba(239,68,68,0.12)' }}>DB: MySQL</div>
          <Text type="secondary">|</Text>
          <div style={{ ...nodeStyle, background: 'rgba(34,197,94,0.12)' }}>시각화: ECharts / AG Grid</div>
        </div>

        <Divider style={{ margin: '4px 0' }} />

        <Title level={4} style={{ margin: 0 }}>2) DB는 무엇을 사용하나요?</Title>
        <Paragraph style={{ margin: 0 }}>
          <Text strong>MySQL</Text> 데이터베이스를 사용합니다.
        </Paragraph>
        <Paragraph style={{ margin: 0, color: 'var(--nowa-text-muted)' }}>
          백엔드에서 SQLAlchemy ORM과 `pymysql` 드라이버를 통해 MySQL에 연결하고 있습니다.
        </Paragraph>

        <Divider style={{ margin: '4px 0' }} />

        <Title level={4} style={{ margin: 0 }}>3) 바이브 코딩으로 어떻게 만들었나요?</Title>
        <Paragraph style={{ margin: 0 }}>
          화면 초안 - API 연결 - 데이터 검증 - 운영 피드백 반영 순서로 빠르게 만들고 바로 확인하는 방식으로 개발했습니다.
        </Paragraph>
        <Paragraph style={{ margin: 0 }}>
          <Text strong>핵심 포인트:</Text> 사용자는 코드를 한 줄도 직접 작성하지 않고, 필요한 기능과 수정 방향만 제시해서 시스템을 완성했습니다.
        </Paragraph>
        <Paragraph style={{ margin: 0, color: 'var(--nowa-text-muted)' }}>
          아이디어를 바로 코드로 바꾸고, 실제 사용 흐름에 맞게 반복 수정해 완성도를 높였습니다.
        </Paragraph>
        <Paragraph style={{ margin: 0, color: 'var(--nowa-text-muted)' }}>
          즉, 구현은 자동화된 코딩 흐름으로 처리하고 사용자는 의사결정과 요구사항 정의에 집중한 방식입니다.
        </Paragraph>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ ...nodeStyle, background: 'rgba(59,130,246,0.12)', minWidth: 150, textAlign: 'center' }}>
            1단계
            <br />
            요구사항 입력
          </div>
          <Text type="secondary">-&gt;</Text>
          <div style={{ ...nodeStyle, background: 'rgba(245,158,11,0.12)', minWidth: 150, textAlign: 'center' }}>
            2단계
            <br />
            AI 자동 구현
          </div>
          <Text type="secondary">-&gt;</Text>
          <div style={{ ...nodeStyle, background: 'rgba(34,197,94,0.12)', minWidth: 150, textAlign: 'center' }}>
            3단계
            <br />
            결과 확인/피드백
          </div>
          <Text type="secondary">-&gt;</Text>
          <div style={{ ...nodeStyle, background: 'rgba(239,68,68,0.12)', minWidth: 170, textAlign: 'center' }}>
            4단계
            <br />
            반영 완료(코드 0줄)
          </div>
        </div>

        <Divider style={{ margin: '4px 0' }} />

        <Title level={4} style={{ margin: 0 }}>4) 그림으로 보는 구조</Title>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ ...nodeStyle, background: 'rgba(59,130,246,0.12)' }}>사용자 브라우저</div>
          <Text type="secondary">-&gt;</Text>
          <div style={{ ...nodeStyle, background: 'rgba(34,197,94,0.12)' }}>React + Ant Design</div>
          <Text type="secondary">-&gt;</Text>
          <div style={{ ...nodeStyle, background: 'rgba(245,158,11,0.12)' }}>FastAPI 서버</div>
          <Text type="secondary">-&gt;</Text>
          <div style={{ ...nodeStyle, background: 'rgba(239,68,68,0.12)' }}>MySQL DB</div>
        </div>

        <Paragraph style={{ margin: 0, color: 'var(--nowa-text-muted)' }}>
          데이터는 화면 입력값이 API로 전달되고, 서버 검증 후 DB에 저장되며, 다시 조회되어 대시보드와 관리 화면에 반영됩니다.
        </Paragraph>

        <Divider style={{ margin: '4px 0' }} />

        <Title level={4} style={{ margin: 0 }}>5) 어떤 API를 사용하나요?</Title>
        <Paragraph style={{ margin: 0 }}>
          <Text strong>내부 API(FastAPI REST):</Text> `/api/auth`, `/api/admin`, `/api/mocvd`, `/api/cost`, `/api/shift`
        </Paragraph>
        <Paragraph style={{ margin: 0, color: 'var(--nowa-text-muted)' }}>
          로그인/권한, 기준정보 관리, MOCVD 운영, 비용 관리, 교대 근무 관리를 각 라우터로 분리해 사용합니다.
        </Paragraph>
        <Paragraph style={{ margin: 0 }}>
          <Text strong>외부 API:</Text> 공공데이터포털 공휴일 API(`apis.data.go.kr`)를 통해 연도별 공휴일 데이터를 동기화합니다.
        </Paragraph>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ ...nodeStyle, background: 'rgba(59,130,246,0.12)' }}>React 화면</div>
          <Text type="secondary">-&gt;</Text>
          <div style={{ ...nodeStyle, background: 'rgba(245,158,11,0.12)' }}>FastAPI REST</div>
          <Text type="secondary">-&gt;</Text>
          <div style={{ ...nodeStyle, background: 'rgba(239,68,68,0.12)' }}>MySQL</div>
          <Text type="secondary">|</Text>
          <div style={{ ...nodeStyle, background: 'rgba(34,197,94,0.12)' }}>공공데이터포털 API</div>
        </div>

        <Divider style={{ margin: '4px 0' }} />

        <Title level={4} style={{ margin: 0 }}>6) 공휴일 API는 어떻게 쓰나요?</Title>
        <Paragraph style={{ margin: 0 }}>
          <Text strong>사용 API:</Text> 공공데이터포털 특일 정보 조회 API
          (`https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo`)
        </Paragraph>
        <Paragraph style={{ margin: 0, color: 'var(--nowa-text-muted)' }}>
          관리자 설정에서 발급받은 서비스 키를 등록하면, 연도/월 단위로 공휴일 데이터를 조회해 사내 DB에 저장합니다.
        </Paragraph>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ ...nodeStyle, background: 'rgba(59,130,246,0.12)' }}>관리자 화면</div>
          <Text type="secondary">-&gt;</Text>
          <div style={{ ...nodeStyle, background: 'rgba(34,197,94,0.12)' }}>data.go.kr 공휴일 API</div>
          <Text type="secondary">-&gt;</Text>
          <div style={{ ...nodeStyle, background: 'rgba(239,68,68,0.12)' }}>사내 MySQL 저장</div>
          <Text type="secondary">-&gt;</Text>
          <div style={{ ...nodeStyle, background: 'rgba(245,158,11,0.12)' }}>근무표/일정 화면 반영</div>
        </div>

        <Divider style={{ margin: '4px 0' }} />

        <Title level={4} style={{ margin: 0 }}>7) 자동화는 어떤 게 있나요?</Title>
        <Paragraph style={{ margin: 0 }}>
          <Text strong>PM 카운터 자동 동기화:</Text> APScheduler가 DB에 저장된 시간(기본 07:00, 19:00)에 작업을 실행합니다.
        </Paragraph>
        <Paragraph style={{ margin: 0, color: 'var(--nowa-text-muted)' }}>
          동기화 작업은 Excel COM 자동화(`pywin32`)로 네트워크 Excel 파일을 읽고, PM 카운터를 DB에 업데이트한 뒤 로그를 남깁니다.
        </Paragraph>
        <Paragraph style={{ margin: 0 }}>
          <Text strong>관리자 수동 동기화:</Text> 관리자 화면에서 즉시 실행도 가능하며, 실행 이력은 자동/수동 구분으로 저장됩니다.
        </Paragraph>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ ...nodeStyle, background: 'rgba(148,163,184,0.16)' }}>스케줄 시간(DB)</div>
          <Text type="secondary">-&gt;</Text>
          <div style={{ ...nodeStyle, background: 'rgba(245,158,11,0.12)' }}>APScheduler</div>
          <Text type="secondary">-&gt;</Text>
          <div style={{ ...nodeStyle, background: 'rgba(34,197,94,0.12)' }}>Excel 자동 읽기(pywin32)</div>
          <Text type="secondary">-&gt;</Text>
          <div style={{ ...nodeStyle, background: 'rgba(239,68,68,0.12)' }}>DB 업데이트 + 로그</div>
        </div>
      </Space>
    </Card>
  )
}
