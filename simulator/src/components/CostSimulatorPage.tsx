import { useRef, useState } from 'react';
import { useCostStore, SimulatorConfig } from '../store/useCostStore';
import CostSummary from './CostSummary';
import BOMTable from './BOMTable';
import ProcessCost from './ProcessCost';
import OverheadCost from './OverheadCost';
import LotSimulation from './LotSimulation';
import BreakEvenAnalysis from './BreakEvenAnalysis';

const CURRENT_VERSION = '1.0';

const tabs = [
  { id: 'summary', label: '원가 요약' },
  { id: 'bom', label: 'EPI 원자재' },
  { id: 'process', label: 'MOCVD / 베이크 / 측정 / 출하' },
  { id: 'overhead', label: '경비/판관비' },
  { id: 'lot', label: '생산량 시뮬레이션' },
  { id: 'bep', label: '손익분기점' },
];

type Toast = { type: 'success' | 'error'; message: string };

export default function CostSimulatorPage() {
  const { activeTab, setActiveTab, bom, mocvd, bake, measurements, shipment, overhead, lotSize, sellingPrice, loadConfig } =
    useCostStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (type: Toast['type'], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // ── JSON 저장 (다운로드) ─────────────────────────────────────────
  const handleExport = () => {
    const config: SimulatorConfig = {
      version: CURRENT_VERSION,
      exportedAt: new Date().toISOString(),
      bom,
      mocvd,
      bake,
      measurements,
      shipment,
      overhead,
      lotSize,
      sellingPrice,
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `epi-cost-config_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'JSON 파일로 저장되었습니다.');
  };

  // ── JSON 불러오기 ────────────────────────────────────────────────
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result;
        if (typeof raw !== 'string') throw new Error('파일을 읽을 수 없습니다.');

        const parsed = JSON.parse(raw) as Partial<SimulatorConfig>;

        // 최소 필드 검증
        const required: (keyof SimulatorConfig)[] = [
          'version', 'bom', 'mocvd', 'bake', 'measurements', 'shipment', 'overhead', 'lotSize', 'sellingPrice',
        ];
        for (const key of required) {
          if (!(key in parsed)) throw new Error(`필수 필드 누락: ${key}`);
        }

        loadConfig(parsed as SimulatorConfig);
        showToast('success', `"${file.name}" 파일을 불러왔습니다.`);
      } catch (err) {
        showToast('error', `파일 형식 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
      } finally {
        // 같은 파일을 다시 불러올 수 있도록 초기화
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'summary':   return <CostSummary />;
      case 'bom':       return <BOMTable />;
      case 'process':   return <ProcessCost />;
      case 'overhead':  return <OverheadCost />;
      case 'lot':       return <LotSimulation />;
      case 'bep':       return <BreakEvenAnalysis />;
      default:          return <CostSummary />;
    }
  };

  return (
    <div>
      {/* 헤더 툴바 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-800">EPI 원가 시뮬레이터</h1>
        <div className="flex items-center gap-2">
          {/* 저장 버튼 */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            저장 (JSON)
          </button>

          {/* 불러오기 버튼 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
            </svg>
            불러오기
          </button>

          {/* 숨겨진 파일 input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>

      {/* 토스트 알림 */}
      {toast && (
        <div
          className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.message}
        </div>
      )}

      {/* 탭 네비게이션 */}
      <nav className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex space-x-1 overflow-x-auto px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {renderTab()}
    </div>
  );
}
