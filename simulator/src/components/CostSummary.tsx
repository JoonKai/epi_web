import { useMemo } from 'react';
import { useCostStore } from '../store/useCostStore';
import { calcFullCost, formatKRW } from '../utils/calculations';
import CostChart from './CostChart';

export default function CostSummary() {
  const { bom, mocvd, bake, measurements, shipment, overhead, lotSize, sellingPrice } = useCostStore();

  const cost = useMemo(
    () => calcFullCost(bom, mocvd, bake, measurements, shipment, overhead, lotSize),
    [bom, mocvd, bake, measurements, shipment, overhead, lotSize]
  );

  const runCount = useMemo(() => {
    const totalYield = (1 - mocvd.defectRate / 100) * (1 - shipment.shipmentDefectRate / 100);
    const required = totalYield > 0 ? lotSize / totalYield : lotSize;
    return mocvd.wafersPerRun > 0 ? Math.ceil(required / mocvd.wafersPerRun) : 0;
  }, [lotSize, mocvd, shipment]);

  const profit = sellingPrice - cost.unitCost;
  const profitRate = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

  const items = [
    { label: '직접재료비 (MO소스/가스/기판)', value: cost.directMaterial, color: 'text-blue-700' },
    { label: '직접노무비 (MOCVD/베이크/측정/출하)', value: cost.directLabor, color: 'text-green-700' },
    { label: '제조경비 (설비/유지보수/간접)', value: cost.manufacturingOverhead, color: 'text-amber-700' },
    { label: '제조원가', value: cost.manufacturingCost, color: 'text-gray-800', bold: true },
    { label: '판관비', value: cost.sellingAdminCost, color: 'text-red-600' },
    { label: '총원가', value: cost.totalCost, color: 'text-gray-900', bold: true, border: true },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-5 text-center">
          <div className="text-sm text-gray-500 mb-1">목표 웨이퍼</div>
          <div className="text-2xl font-bold text-gray-800">{lotSize.toLocaleString()}<span className="text-sm font-normal">매</span></div>
          <div className="text-xs text-gray-400">{runCount}런 필요</div>
        </div>
        <div className="bg-white rounded-lg shadow p-5 text-center">
          <div className="text-sm text-gray-500 mb-1">웨이퍼당 원가</div>
          <div className="text-2xl font-bold text-blue-700 font-mono">{formatKRW(cost.unitCost)}<span className="text-sm font-normal"> 원</span></div>
        </div>
        <div className="bg-white rounded-lg shadow p-5 text-center">
          <div className="text-sm text-gray-500 mb-1">런당 원가</div>
          <div className="text-2xl font-bold text-indigo-700 font-mono">{formatKRW(cost.costPerRun)}<span className="text-sm font-normal"> 원</span></div>
        </div>
        <div className="bg-white rounded-lg shadow p-5 text-center">
          <div className="text-sm text-gray-500 mb-1">판매 단가</div>
          <div className="text-2xl font-bold text-gray-800 font-mono">{formatKRW(sellingPrice)}<span className="text-sm font-normal"> 원</span></div>
        </div>
        <div className={`rounded-lg shadow p-5 text-center ${profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="text-sm text-gray-500 mb-1">매당 이익 (이익률)</div>
          <div className={`text-2xl font-bold font-mono ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatKRW(profit)}<span className="text-sm font-normal"> 원 ({profitRate.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-md font-semibold text-gray-700 mb-4">원가 명세 ({lotSize.toLocaleString()}매 기준)</h3>
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.label}
                className={`flex justify-between items-center py-2 ${item.border ? 'border-t-2 pt-3' : ''}`}
              >
                <span className={`text-sm ${item.bold ? 'font-semibold' : ''} text-gray-600`}>
                  {item.label}
                </span>
                <div className="text-right">
                  <span className={`font-mono ${item.bold ? 'font-bold text-lg' : ''} ${item.color}`}>
                    {formatKRW(item.value)} 원
                  </span>
                  <span className="text-xs text-gray-400 block">
                    (매당 {formatKRW(lotSize > 0 ? item.value / lotSize : 0)} 원)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <CostChart cost={cost} />
      </div>
    </div>
  );
}
