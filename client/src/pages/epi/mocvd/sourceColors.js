// 그룹 배지 색상 - 그룹명 해시 기반으로 일관된 색상 배정
const GROUP_PALETTE = [
  { text: '#c4b5fd', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.3)',  row: 'rgba(139,92,246,0.05)'  }, // violet
  { text: '#67e8f9', bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.3)',   row: 'rgba(6,182,212,0.05)'   }, // cyan
  { text: '#6ee7b7', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  row: 'rgba(16,185,129,0.05)'  }, // emerald
  { text: '#fda4af', bg: 'rgba(244,63,94,0.12)',   border: 'rgba(244,63,94,0.3)',   row: 'rgba(244,63,94,0.05)'   }, // rose
  { text: '#7dd3fc', bg: 'rgba(14,165,233,0.12)',  border: 'rgba(14,165,233,0.3)',  row: 'rgba(14,165,233,0.05)'  }, // sky
  { text: '#f0abfc', bg: 'rgba(217,70,239,0.12)',  border: 'rgba(217,70,239,0.3)',  row: 'rgba(217,70,239,0.05)'  }, // fuchsia
  { text: '#bef264', bg: 'rgba(132,204,22,0.12)',  border: 'rgba(132,204,22,0.3)',  row: 'rgba(132,204,22,0.05)'  }, // lime
  { text: '#fed7aa', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.3)',  row: 'rgba(249,115,22,0.05)'  }, // orange
]

// 같은 색상을 공유할 그룹명 별칭 (value → key와 같은 색으로)
const GROUP_COLOR_ALIASES = {
  'C4': 'EPI700',
}

function hashGroupName(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h % GROUP_PALETTE.length
}

export function getGroupColor(groupName) {
  if (!groupName) return null
  const key = GROUP_COLOR_ALIASES[groupName] ?? groupName
  return GROUP_PALETTE[hashGroupName(key)]
}

export const SOURCE_PALETTE = [
  { main: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  glow: 'rgba(251,191,36,0.35)'  }, // amber
  { main: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  glow: 'rgba(96,165,250,0.32)'  }, // blue
  { main: '#fb7185', bg: 'rgba(251,113,133,0.12)', glow: 'rgba(251,113,133,0.32)' }, // rose
  { main: '#f472b6', bg: 'rgba(244,114,182,0.12)', glow: 'rgba(244,114,182,0.32)' }, // pink
  { main: '#a78bfa', bg: 'rgba(167,139,250,0.12)', glow: 'rgba(167,139,250,0.32)' }, // violet
  { main: '#fb923c', bg: 'rgba(251,146,60,0.12)',  glow: 'rgba(251,146,60,0.32)'  }, // orange
  { main: '#e879f9', bg: 'rgba(232,121,249,0.12)', glow: 'rgba(232,121,249,0.32)' }, // fuchsia
  { main: '#67e8f9', bg: 'rgba(103,232,249,0.12)', glow: 'rgba(103,232,249,0.32)' }, // cyan
]

export function getSourceColor(index) {
  return SOURCE_PALETTE[index % SOURCE_PALETTE.length]
}
