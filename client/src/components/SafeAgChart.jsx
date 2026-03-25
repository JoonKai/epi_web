import { Component } from 'react'
import { AgCharts } from 'ag-charts-react'
import { AllCommunityModule, ModuleRegistry } from 'ag-charts-community'

ModuleRegistry.registerModules([AllCommunityModule])

class ChartErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Ag chart render error:', error)
    this.setState({ errorMessage })
  }

  componentDidUpdate(prevProps) {
    if (prevProps.options !== this.props.options && this.state.hasError) {
      this.setState({ hasError: false, errorMessage: '' })
    }
  }

  render() {
    const { hasError, errorMessage } = this.state
    const { options, style, fallbackHeight } = this.props

    if (hasError) {
      return (
        <div
          style={{
            height: fallbackHeight ?? style?.height ?? 220,
            minHeight: 120,
            borderRadius: 12,
            border: '1px solid rgba(245,158,11,0.18)',
            background: 'rgba(245,158,11,0.06)',
            color: 'var(--nowa-text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            textAlign: 'center',
            padding: 16,
          }}
        >
          <div>
            <div style={{ marginBottom: errorMessage ? 6 : 0 }}>차트 렌더링 오류</div>
            {errorMessage ? <div style={{ fontSize: 12, opacity: 0.82 }}>{errorMessage}</div> : null}
          </div>
        </div>
      )
    }

    return <AgCharts options={options ?? {}} style={style} />
  }
}

export default function SafeAgChart(props) {
  return <ChartErrorBoundary {...props} />
}
