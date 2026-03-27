const LEFT_CABS = [
  { no: '1번', sub: '(Ar)' },
  { no: '2번', sub: '' },
  { no: '3번', sub: '' },
  { no: '4번', sub: '' },
]

const RIGHT_CABS = [
  { no: '5번', sub: '' },
]

const WALL = 3
const CAB_W = 130
const CAB_H = 68
const CAB_TOP = 40
const CAB_LEFT = 32
const CAB_GAP = 18
const GROUP_GAP = 72
const CYL_R = 17
const ENTRY_W = 30
const ENTRY_H = 64
const FONT = "'Malgun Gothic','Apple SD Gothic Neo',sans-serif"

const C = {
  bg: '#151820',
  roomFill: '#1e2333',
  roomLine: '#6272a4',
  wall: '#4a5a8a',
  cabFill: '#252c42',
  cabLine: '#7080b8',
  cylFill: '#2c3450',
  cylLine: '#8090c8',
  text: '#b8c4e0',
  textDim: '#9fb4e8',
  entry: '#2c3a60',
  entryTxt: '#a0b0d8',
  dash: '#3a4870',
}

function buildCabs() {
  const result = []
  let x = WALL + CAB_LEFT

  LEFT_CABS.forEach((cab) => {
    result.push({ ...cab, x, group: 'left' })
    x += CAB_W + CAB_GAP
  })

  x += GROUP_GAP - CAB_GAP

  RIGHT_CABS.forEach((cab) => {
    result.push({ ...cab, x, group: 'right' })
    x += CAB_W + CAB_GAP
  })

  return result
}

export default function SiH4GasCabinetLayout() {
  const cabs = buildCabs()
  const lastCab = cabs.at(-1)
  const roomW = lastCab.x + CAB_W + CAB_LEFT
  const roomH = CAB_TOP + CAB_H + 36
  const svgH = roomH + WALL * 2
  const svgW = roomW + ENTRY_W
  const cabY = WALL + CAB_TOP
  const entryY = svgH - WALL - ENTRY_H

  const leftLast = cabs.filter((cab) => cab.group === 'left').at(-1)
  const rightFirst = cabs.find((cab) => cab.group === 'right')
  const dashX = leftLast && rightFirst
    ? leftLast.x + CAB_W + (rightFirst.x - leftLast.x - CAB_W) / 2
    : null

  const entryChars = ['출', '입', '구']
  const charSpacing = ENTRY_H / (entryChars.length + 1)
  const entryTextX = roomW + ENTRY_W / 2

  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.wall}`,
        borderRadius: 10,
        padding: '14px 18px 10px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: FONT, letterSpacing: 1 }}>
          GAS CABINET — FLOOR PLAN
        </span>
        <span style={{ fontSize: 14, color: C.textDim, fontFamily: FONT }}>
          평면도
        </span>
      </div>

      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width="100%"
        style={{ display: 'block', width: '100%', height: 'auto' }}
      >
        <g transform={`translate(0,${svgH * 0.1}) scale(0.8)`}>
          <rect
            x={0}
            y={0}
            width={roomW}
            height={svgH}
            rx={6}
            fill={C.roomFill}
            stroke={C.roomLine}
            strokeWidth={WALL}
          />

          <rect x={roomW - WALL - 1} y={entryY} width={WALL + 2} height={ENTRY_H} fill={C.roomFill} />

          <rect
            x={roomW}
            y={entryY}
            width={ENTRY_W}
            height={ENTRY_H}
            rx={3}
            fill={C.entry}
            stroke={C.cabLine}
            strokeWidth={1.5}
          />

          {entryChars.map((ch, index) => (
            <text
              key={ch}
              x={entryTextX}
              y={entryY + charSpacing * (index + 1)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={15}
              fontWeight={700}
              fill={C.entryTxt}
              fontFamily={FONT}
            >
              {ch}
            </text>
          ))}

          {dashX && (
            <line
              x1={dashX}
              y1={WALL + 6}
              x2={dashX}
              y2={svgH - WALL - 6}
              stroke={C.dash}
              strokeWidth={1}
              strokeDasharray="5 4"
            />
          )}

          {cabs.map((cab) => {
            const cx1 = cab.x + CAB_W / 2 - CYL_R - 7
            const cx2 = cab.x + CAB_W / 2 + CYL_R + 7
            const cy = cabY + CAB_H / 2

            return (
              <g key={cab.no}>
                <text
                  x={cab.x + CAB_W / 2}
                  y={cabY - 8}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight={700}
                  fill={C.text}
                  fontFamily={FONT}
                >
                  {cab.no}
                  <tspan fontSize={12} fill={C.textDim}>{cab.sub}</tspan>
                </text>

                <rect
                  x={cab.x}
                  y={cabY}
                  width={CAB_W}
                  height={CAB_H}
                  rx={6}
                  fill={C.cabFill}
                  stroke={C.cabLine}
                  strokeWidth={1.5}
                />

                <circle cx={cx1} cy={cy} r={CYL_R} fill={C.cylFill} stroke={C.cylLine} strokeWidth={1.5} />
                <text
                  x={cx1}
                  y={cy + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={14}
                  fontWeight={800}
                  fill={C.text}
                  fontFamily={FONT}
                >
                  A
                </text>

                <circle cx={cx2} cy={cy} r={CYL_R} fill={C.cylFill} stroke={C.cylLine} strokeWidth={1.5} />
                <text
                  x={cx2}
                  y={cy + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={14}
                  fontWeight={800}
                  fill={C.text}
                  fontFamily={FONT}
                >
                  B
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
