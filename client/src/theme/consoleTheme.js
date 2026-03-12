import { createElement } from 'react'
import ReactECharts from 'echarts-for-react'

export const consoleColors = {
  bg: '#050b16',
  bgRaised: '#0a1222',
  panel: '#0f1828',
  panelAlt: '#111d31',
  panelSoft: 'rgba(18, 28, 44, 0.78)',
  border: 'rgba(120, 145, 180, 0.18)',
  borderStrong: 'rgba(255, 119, 61, 0.38)',
  text: '#edf3ff',
  textSoft: 'rgba(220, 232, 255, 0.72)',
  textMuted: 'rgba(163, 184, 217, 0.48)',
  accent: '#ff6a3d',
  accentSoft: 'rgba(255, 106, 61, 0.16)',
  accentAlt: '#ffd166',
  success: '#35d07f',
  danger: '#ff5b6e',
  warning: '#ffb648',
  info: '#4aa3ff',
}

export const panelStyle = {
  background:
    'radial-gradient(circle at top, rgba(255,106,61,0.08), transparent 28%), linear-gradient(180deg, rgba(18,27,42,0.96), rgba(11,18,30,0.96))',
  border: `1px solid ${consoleColors.border}`,
  borderRadius: 16,
  boxShadow: '0 18px 40px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.03)',
}

export const sectionTitleStyle = {
  color: consoleColors.textMuted,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.6,
  textTransform: 'uppercase',
}

export function getMetricTone(value) {
  if (value > 0) return consoleColors.success
  if (value < 0) return consoleColors.danger
  return consoleColors.text
}

export function makeChartBase(title) {
  return {
    backgroundColor: 'transparent',
    textStyle: {
      color: consoleColors.textSoft,
      fontFamily: 'Pretendard, Segoe UI, sans-serif',
    },
    title: title
      ? {
          text: title,
          left: 12,
          top: 8,
          textStyle: {
            color: consoleColors.textSoft,
            fontSize: 12,
            fontWeight: 600,
          },
        }
      : undefined,
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#07111e',
      borderColor: consoleColors.borderStrong,
      textStyle: { color: consoleColors.text },
      extraCssText: 'box-shadow: 0 12px 30px rgba(0,0,0,0.45); border-radius: 10px;',
    },
    legend: {
      textStyle: { color: consoleColors.textMuted, fontSize: 11 },
      icon: 'roundRect',
      itemWidth: 12,
      itemHeight: 8,
    },
    grid: {
      left: 56,
      right: 20,
      top: 42,
      bottom: 38,
      containLabel: true,
    },
    xAxis: {
      axisLine: { lineStyle: { color: 'rgba(138, 161, 193, 0.18)' } },
      axisLabel: { color: consoleColors.textMuted, fontSize: 11 },
      splitLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      axisLine: { show: false },
      axisLabel: { color: consoleColors.textMuted, fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(138, 161, 193, 0.12)' } },
      axisTick: { show: false },
    },
  }
}

export function ConsoleChart({ option, style }) {
  return createElement(ReactECharts, { option, style, opts: { renderer: 'canvas' } })
}
