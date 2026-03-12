import { useCostStore } from './store/useCostStore';
import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './components/DashboardHome';
import CostSimulatorPage from './components/CostSimulatorPage';
import PlaceholderPage from './components/PlaceholderPage';

function App() {
  const currentPage = useCostStore((s) => s.currentPage);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <DashboardHome />;
      case 'cost-simulator':
        return <CostSimulatorPage />;
      case 'production':
        return (
          <PlaceholderPage
            icon="🏭"
            title="설비 관리"
            description="MOCVD 런 스케줄링, 생산 실적 추적, 장비 가동률 모니터링 기능이 추가될 예정입니다."
          />
        );
      case 'quality':
        return (
          <PlaceholderPage
            icon="✅"
            title="품질 관리"
            description="PL/XRD 측정 데이터 관리, 불량 분석, SPC 관리도 기능이 추가될 예정입니다."
          />
        );
      case 'settings':
        return (
          <PlaceholderPage
            icon="⚙️"
            title="설정"
            description="사용자 설정, 기본값 관리, 데이터 내보내기/가져오기 기능이 추가될 예정입니다."
          />
        );
      default:
        return <DashboardHome />;
    }
  };

  return (
    <DashboardLayout>
      {renderPage()}
    </DashboardLayout>
  );
}

export default App;
