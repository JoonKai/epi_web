import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useCostStore } from '../store/useCostStore';
import { calcFullCost, formatKRW } from '../utils/calculations';

export default function LotSimulation() {
  const { bom, mocvd, bake, measurements, shipment, overhead, lotSize, setLotSize } = useCostStore();
  const [inputValue, setInputValue] = useState<string>(String(lotSize));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputCommit = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(14, Math.min(10000, parsed));
      setLotSize(clamped);
      setInputValue(String(clamped));
    } else {
      setInputValue(String(lotSize));
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleInputCommit();
  };

  const currentCost = useMemo(
    () => calcFullCost(bom, mocvd, bake, measurements, shipment, overhead, lotSize),
    [bom, mocvd, bake, measurements, shipment, overhead, lotSize]
  );

  const runCount = useMemo(() => {
    const totalYield = (1 - mocvd.defectRate / 100) * (1 - shipment.shipmentDefectRate / 100);
    const required = totalYield > 0 ? lotSize / totalYield : lotSize;
    return mocvd.wafersPerRun > 0 ? Math.ceil(required / mocvd.wafersPerRun) : 0;
  }, [lotSize, mocvd, shipment]);

  const chartData = useMemo(() => {
    const steps = [14, 28, 56, 100, 200, 500, 1000, 2000, 3000, 5000, 7000, 10000];
    return steps.map((qty) => {
      const cost = calcFullCost(bom, mocvd, bake, measurements, shipment, overhead, qty);
      return { lot: qty, unitCost: Math.round(cost.unitCost), totalCost: Math.round(cost.totalCost) };
    });
  }, [bom, mocvd, bake, measurements, shipment, overhead]);

  const optimalLot = useMemo(() => {
    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1].unitCost;
      const curr = chartData[i].unitCost;
      if ((prev - curr) / prev < 0.01) return chartData[i - 1].lot;
    }
    return chartData[chartData.length - 1].lot;
  }, [chartData]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">웨이퍼 생산량 시뮬레이션</h2>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <label className="text-sm font-medium text-gray-600">
              목표 양품 웨이퍼 수
              <span className="text-gray-400 ml-2">(필요 런 수: {runCount}런)</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={14}
                max={10000}
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputCommit}
                onKeyDown={handleInputKeyDown}
                className="w-24 px-2 py-1 text-sm font-bold text-blue-700 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-right"
              />
              <span className="text-sm font-medium text-gray-600">매</span>
            </div>
          </div>
          <input
            type="range"
            min={14}
            max={10000}
            step={mocvd.wafersPerRun}
            value={lotSize}
            onChange={(e) => { setLotSize(Number(e.target.value)); setInputValue(e.target.value); }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{mocvd.wafersPerRun}매 (1런)</span>
            <span>2,500</span>
            <span>5,000</span>
            <span>7,500</span>
            <span>10,000</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-500">총 원가</div>
            <div className="text-lg font-bold text-gray-800 font-mono">{formatKRW(currentCost.totalCost)}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-500">웨이퍼당 원가</div>
            <div className="text-lg font-bold text-blue-700 font-mono">{formatKRW(currentCost.unitCost)} 원</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-500">런당 원가</div>
            <div className="text-lg font-bold text-green-700 font-mono">{formatKRW(currentCost.costPerRun)} 원</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-500">추천 생산량</div>
            <div className="text-lg font-bold text-amber-700 font-mono">{optimalLot.toLocaleString()}매</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-md font-semibold text-gray-700 mb-4">생산량별 웨이퍼당 원가 변화</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="lot"
              tickFormatter={(v) => v >= 1000 ? `${v / 1000}K` : v}
              label={{ value: '웨이퍼 수 (매)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
              label={{ value: '웨이퍼당 원가 (원)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value: number) => [`${formatKRW(value)} 원`, '웨이퍼당 원가']}
              labelFormatter={(label) => `생산량: ${Number(label).toLocaleString()}매`}
            />
            <Legend />
            <Line type="monotone" dataKey="unitCost" stroke="#2563eb" strokeWidth={2} name="웨이퍼당 원가" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
