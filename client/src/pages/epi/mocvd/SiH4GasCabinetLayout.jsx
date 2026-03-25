const LEFT_CABS  = [
  { no: '1', sub: '(Ar)' },
  { no: '2', sub: '' },
  { no: '3', sub: '' },
  { no: '4', sub: '' },
]
const RIGHT_CABS = [
  { no: '5', sub: '' },
]

const WALL      = 3
const CAB_W     = 130
const CAB_H     = 68
const CAB_TOP   = 40
const CAB_LEFT  = 32          // 좌우 여백
const CAB_GAP   = 18
const GROUP_GAP = 72
const CYL_R     = 17
const ENTRY_W   = 30
const ENTRY_H   = 64
const FONT      = "'Malgun Gothic','Apple SD Gothic Neo',sans-serif"

const C = {
  bg:       '#151820',
  roomFill: '#1e2333',
  roomLine: '#6272a4',
  wall:     '#4a5a8a',
  cabFill:  '#252c42',
  cabLine:  '#7080b8',
  cylFill:  '#2c3450',
  cylLine:  '#8090c8',
  text:     '#b8c4e0',
  textDim:  '#7080a8',
  entry:    '#2c3a60',
  entryTxt: '#a0b0d8',
  dash:     '#3a4870',
}

function buildCabs() {
  const result = []
  let x = WALL + CAB_LEFT
  LEFT_CABS.forEach((c) => {
    result.push({ ...c, x, group: 'left' })
    x += CAB_W + CAB_GAP
  })
  x += GROUP_GAP - CAB_GAP
  RIGHT_CABS.forEach((c) => {
    result.push({ ...c, x, group: 'right' })
    x += CAB_W + CAB_GAP
  })
  return result
}

export default function SiH4GasCabinetLayout() {
  const cabs = buildCabs()

  // 방 너비 = 마지막 캐비닛 오른쪽 끝 + 좌우 동일 여백
  const lastCab = cabs.at(-1)
  const ROOM_W  = lastCab.x + CAB_W + CAB_LEFT
  const ROOM_H  = CAB_TOP + CAB_H + 36   // 상단 번호 + 캐비닛 + 하단 여백
  const SVG_H   = ROOM_H + WALL * 2
  const SVG_W   = ROOM_W + ENTRY_W

  const cabY    = WALL + CAB_TOP
  const entryY  = SVG_H - WALL - ENTRY_H   // 아래 끝 정렬

  const leftLast   = cabs.filter((c) => c.group === 'left').at(-1)
  const rightFirst = cabs.find((c) => c.group === 'right')
  const dashX = leftLast && rightFirst
    ? leftLast.x + CAB_W + (rightFirst.x - leftLast.x - CAB_W) / 2
    : null

  // 출입구 글자 세로 배치
  const entryChars  = ['출', '입', '구']
  const charSpacing = ENTRY_H / (entryChars.length + 1)
  const entryTextX  = ROOM_W + ENTRY_W / 2

  return (
    <div style={{
      background: C.bg,
      border: `1px solid ${C.wall}`,
      borderRadius: 10,
      padding: '14px 18px 10px',
      display: 'inline-block',   // 내용 크기만큼만
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10, minWidth: SVG_W,
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: FONT, letterSpacing: 1 }}>
          SiH4 GAS CABINET — FLOOR PLAN
        </span>
        <span style={{ fontSize: 12, color: C.textDim, fontFamily: FONT }}>
          평면도
        </span>
      </div>

      <svg width={SVG_W} height={SVG_H} style={{ display: 'block' }}>

        {/* 외벽 */}
        <rect x={0} y={0} width={ROOM_W} height={SVG_H}
          rx={6} fill={C.roomFill} stroke={C.roomLine} strokeWidth={WALL} />

        {/* 출입구 벽 끊기 */}
        <rect x={ROOM_W - WALL - 1} y={entryY}
          width={WALL + 2} height={ENTRY_H} fill={C.roomFill} />

        {/* 출입구 블록 */}
        <rect x={ROOM_W} y={entryY}
          width={ENTRY_W} height={ENTRY_H} rx={3}
          fill={C.entry} stroke={C.cabLine} strokeWidth={1.5} />

        {/* 출입구 세로 글자 */}
        {entryChars.map((ch, i) => (
          <text
            key={i}
            x={entryTextX}
            y={entryY + charSpacing * (i + 1)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={15}
            fontWeight={700}
            fill={C.entryTxt}
            fontFamily={FONT}
          >{ch}</text>
        ))}

        {/* 그룹 구분 점선 */}
        {dashX && (
          <line x1={dashX} y1={WALL + 6} x2={dashX} y2={SVG_H - WALL - 6}
            stroke={C.dash} strokeWidth={1} strokeDasharray="5 4" />
        )}

        {/* 캐비닛들 */}
        {cabs.map((cab) => {
          const cx1 = cab.x + CAB_W / 2 - CYL_R - 7
          const cx2 = cab.x + CAB_W / 2 + CYL_R + 7
          const cy  = cabY + CAB_H / 2

          return (
            <g key={cab.no}>
              <text x={cab.x + CAB_W / 2} y={cabY - 8}
                textAnchor="middle" fontSize={14} fontWeight={700}
                fill={C.text} fontFamily={FONT}>
                {cab.no}
                <tspan fontSize={12} fill={C.textDim}>{cab.sub}</tspan>
              </text>

              <rect x={cab.x} y={cabY} width={CAB_W} height={CAB_H} rx={6}
                fill={C.cabFill} stroke={C.cabLine} strokeWidth={1.5} />

              <circle cx={cx1} cy={cy} r={CYL_R}
                fill={C.cylFill} stroke={C.cylLine} strokeWidth={1.5} />
              <text x={cx1} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
                fontSize={14} fontWeight={800} fill={C.text} fontFamily={FONT}>A</text>

              <circle cx={cx2} cy={cy} r={CYL_R}
                fill={C.cylFill} stroke={C.cylLine} strokeWidth={1.5} />
              <text x={cx2} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
                fontSize={14} fontWeight={800} fill={C.text} fontFamily={FONT}>B</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
