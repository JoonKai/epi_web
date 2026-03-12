import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useCostStore } from '../store/useCostStore';
import { calcFullCost, calcBreakEven, calcMaterialPerRun, formatKRW } from '../utils/calculations';

const PIE_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444'];

export default function DashboardHome() {
  const { bom, mocvd, bake, measurements, shipment, overhead, lotSize, sellingPrice, setCurrentPage } = useCostStore();

  const cost = useMemo(
    () => calcFullCost(bom, mocvd, bake, measurements, shipment, overhead, lotSize),
    [bom, mocvd, bake, measurements, shipment, overhead, lotSize]
  );

  const bep = useMemo(
    () => calcBreakEven(bom, mocvd, bake, measurements, shipment, overhead, sellingPrice),
    [bom, mocvd, bake, measurements, shipment, overhead, sellingPrice]
  );

  const profit = sellingPrice - cost.unitCost;
  const profitRate = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
  const totalRevenue = sellingPrice * lotSize;
  const totalProfit = totalRevenue - cost.totalCost;

  const pieData = [
    { name: '직접재료비', value: cost.directMaterial },
    { name: '직접노무비', value: cost.directLabor },
    { name: '제조경비', value: cost.manufacturingOverhead },
    { name: '판관비', value: cost.sellingAdminCost },
  ].filter((d) => d.value > 0);

  const materialByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of bom) {
      const prev = map.get(item.category) || 0;
      map.set(item.category, prev + item.usagePerRun * item.unitPrice);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [bom]);

  const totalYield = (1 - mocvd.defectRate / 100) * (1 - shipment.shipmentDefectRate / 100);
  const materialPerRun = calcMaterialPerRun(bom);

  return (
    <div className="space-y-6">
      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">웨이퍼당 원가</span>
            <span className="text-lg">💰</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 font-mono">{formatKRW(cost.unitCost)}</div>
          <div className="text-xs text-gray-400 mt-1">원/매</div>
        </div>

        <div className={`rounded-xl shadow-sm border p-5 ${profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">매당 이익률</span>
            <span className="text-lg">{profit >= 0 ? '📈' : '📉'}</span>
          </div>
          <div className={`text-2xl font-bold font-mono ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {profitRate.toFixed(1)}%
          </div>
          <div className={`text-xs mt-1 ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            매당 {formatKRW(profit)} 원
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">BEP 수량</span>
            <span className="text-lg">🎯</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 font-mono">
            {bep ? bep.bepQuantity.toLocaleString() : '-'}
          </div>
          <div className="text-xs text-gray-400 mt-1">{bep ? '매 (손익분기)' : '달성 불가'}</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">종합 수율</span>
            <span className="text-lg">✨</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 font-mono">{(totalYield * 100).toFixed(1)}%</div>
          <div className="text-xs text-gray-400 mt-1">MOCVD {(100 - mocvd.defectRate).toFixed(1)}% x 출하 {(100 - shipment.shipmentDefectRate).toFixed(1)}%</div>
        </div>
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">목표 생산량</div>
          <div className="text-xl font-bold text-gray-900">{lotSize.toLocaleString()} <span className="text-sm font-normal text-gray-500">매</span></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">총 원가</div>
          <div className="text-xl font-bold text-gray-900 font-mono">{formatKRW(cost.totalCost)} <span className="text-sm font-normal text-gray-500">원</span></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">예상 매출</div>
          <div className="text-xl font-bold text-gray-900 font-mono">{formatKRW(totalRevenue)} <span className="text-sm font-normal text-gray-500">원</span></div>
        </div>
        <div className={`rounded-xl shadow-sm border p-5 ${totalProfit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">예상 이익</div>
          <div className={`text-xl font-bold font-mono ${totalProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
            {formatKRW(totalProfit)} <span className="text-sm font-normal text-gray-500">원</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Breakdown Pie */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">원가 구성비</h3>
            <button
              onClick={() => setCurrentPage('cost-simulator')}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              상세 보기 →
            </button>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
              >
                {pieData.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${formatKRW(value)} 원`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Material Cost by Category Bar */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">카테고리별 재료비 (1런당)</h3>
            <span className="text-xs text-gray-400">합계: {formatKRW(materialPerRun)} 원</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={materialByCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => `${formatKRW(value)} 원`} />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">MOCVD 공정 요약</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">리액터</span><span className="font-medium">{mocvd.reactorCount}대</span></div>
            <div className="flex justify-between"><span className="text-gray-500">웨이퍼/런</span><span className="font-medium">{mocvd.wafersPerRun}매</span></div>
            <div className="flex justify-between"><span className="text-gray-500">런 시간</span><span className="font-medium">{(mocvd.runTimeSec / 3600).toFixed(1)}시간</span></div>
            <div className="flex justify-between"><span className="text-gray-500">불량률</span><span className="font-medium text-red-600">{mocvd.defectRate}%</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">원자재 현황</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">등록 원자재</span><span className="font-medium">{bom.length}종</span></div>
            <div className="flex justify-between"><span className="text-gray-500">런당 재료비</span><span className="font-medium font-mono">{formatKRW(materialPerRun)} 원</span></div>
            <div className="flex justify-between"><span className="text-gray-500">웨이퍼당 재료비</span><span className="font-medium font-mono">{formatKRW(mocvd.wafersPerRun > 0 ? materialPerRun / mocvd.wafersPerRun : 0)} 원</span></div>
            <div className="flex justify-between"><span className="text-gray-500">공급업체</span><span className="font-medium">{new Set(bom.map(b => b.supplier)).size}개사</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">빠른 이동</h3>
          <div className="space-y-2">
            <button
              onClick={() => setCurrentPage('cost-simulator')}
              className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm text-gray-700 transition-colors"
            >
              🧮 원가 시뮬레이터 열기
            </button>
            <button
              onClick={() => setCurrentPage('production')}
              className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm text-gray-700 transition-colors"
            >
              🏭 생산 관리
            </button>
            <button
              onClick={() => setCurrentPage('quality')}
              className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm text-gray-700 transition-colors"
            >
              ✅ 품질 관리
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
