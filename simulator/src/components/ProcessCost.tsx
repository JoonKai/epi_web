import { useState } from 'react';
import { useCostStore } from '../store/useCostStore';
import { MOCVDConfig, BakeConfig, ShipmentConfig } from '../types';
import {
  formatKRW,
  calcMOCVDCostPerRun,
  calcBakeCostPerRun,
  calcMeasurementCostPerRun,
  calcShipmentCostPerRun,
  calcSingleMeasurementCostPerRun,
} from '../utils/calculations';

type Tab = 'mocvd' | 'bake' | 'measurement' | 'shipment';

// 공통 숫자 입력 필드
function NumField({
  label,
  value,
  unit,
  step = '1',
  min = 0,
  max,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  step?: string;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-2 w-full text-right pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
          min={min}
          max={max}
          step={step}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{unit}</span>
      </div>
    </div>
  );
}

// 섹션 그룹 헤더
function GroupHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-4 bg-gray-300 rounded-full" />
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
    </div>
  );
}

// 결과 카드 아이템
function ResultItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`text-center p-3 rounded-lg ${highlight ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'}`}>
      <div className={`text-xs mb-1 ${highlight ? 'text-blue-100' : 'text-gray-500'}`}>{label}</div>
      <div className={`font-bold font-mono text-sm ${highlight ? 'text-white' : 'text-gray-800'}`}>{value}</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// 1. MOCVD 탭
// ────────────────────────────────────────────────────────────────
function MOCVDTab() {
  const { mocvd, setMocvd } = useCostStore();
  const cost = calcMOCVDCostPerRun(mocvd);
  const totalPerRun = cost.labor + cost.equipment + cost.maintenance + cost.cleaning + cost.power;
  const totalPerWafer = mocvd.wafersPerRun > 0 ? totalPerRun / mocvd.wafersPerRun : 0;

  const set = (key: keyof MOCVDConfig) => (v: number) => setMocvd({ [key]: v });

  return (
    <div className="space-y-6">
      {/* 기본 공정 파라미터 */}
      <div className="bg-gray-50 rounded-xl p-5">
        <GroupHeader title="기본 공정 파라미터" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <NumField label="1런당 웨이퍼 수" value={mocvd.wafersPerRun} unit="매" onChange={set('wafersPerRun')} />
          <NumField label="성장 시간" value={mocvd.runTimeSec} unit="초" onChange={set('runTimeSec')} />
          <NumField label="셋업 시간 (로딩/언로딩)" value={mocvd.setupTimeSec} unit="초" onChange={set('setupTimeSec')} />
          <NumField label="리액터 수" value={mocvd.reactorCount} unit="대" onChange={set('reactorCount')} />
          <NumField label="불량률" value={mocvd.defectRate} unit="%" step="0.1" max={100} onChange={set('defectRate')} />
          <NumField label="장비 가동률" value={mocvd.utilizationRate} unit="%" step="1" max={100} onChange={set('utilizationRate')} />
        </div>
      </div>

      {/* 인건비 */}
      <div className="bg-gray-50 rounded-xl p-5">
        <GroupHeader title="인건비" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <NumField label="작업자 수" value={mocvd.workers} unit="명" onChange={set('workers')} />
          <NumField label="시급" value={mocvd.hourlyWage} unit="원" onChange={set('hourlyWage')} />
        </div>
      </div>

      {/* 장비비 및 유지보수 */}
      <div className="bg-gray-50 rounded-xl p-5">
        <GroupHeader title="장비비 및 유지보수" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <NumField label="장비 시간당 비용" value={mocvd.equipmentCostPerHour} unit="원/h" onChange={set('equipmentCostPerHour')} />
          <NumField label="런당 유지보수비" value={mocvd.maintenanceCostPerRun} unit="원" onChange={set('maintenanceCostPerRun')} />
          <NumField label="전력 소비" value={mocvd.powerConsumptionKW} unit="kW" onChange={set('powerConsumptionKW')} />
          <NumField label="전기 요금" value={mocvd.electricityRate} unit="원/kWh" onChange={set('electricityRate')} />
        </div>
      </div>

      {/* 청소 관리 */}
      <div className="bg-gray-50 rounded-xl p-5">
        <GroupHeader title="리액터 청소 관리" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <NumField label="청소 주기" value={mocvd.cleaningIntervalRuns} unit="런마다" onChange={set('cleaningIntervalRuns')} />
          <NumField label="청소 소요 시간" value={mocvd.cleaningTimeSec} unit="초" onChange={set('cleaningTimeSec')} />
          <NumField label="청소 1회 비용" value={mocvd.cleaningCostPerSession} unit="원" onChange={set('cleaningCostPerSession')} />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          런당 청소비용: {formatKRW(mocvd.cleaningIntervalRuns > 0 ? mocvd.cleaningCostPerSession / mocvd.cleaningIntervalRuns : 0)} 원
        </p>
      </div>

      {/* 결과 요약 */}
      <div className="bg-slate-800 rounded-xl p-5">
        <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wider">런당 원가 분석</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <ResultItem label="노무비" value={`${formatKRW(cost.labor)}원`} />
          <ResultItem label="장비비" value={`${formatKRW(cost.equipment)}원`} />
          <ResultItem label="유지보수" value={`${formatKRW(cost.maintenance)}원`} />
          <ResultItem label="전력비" value={`${formatKRW(cost.power)}원`} />
          <ResultItem label="청소비" value={`${formatKRW(cost.cleaning)}원`} />
          <div className="text-center p-3 rounded-lg bg-blue-500 text-white col-span-2 md:col-span-1">
            <div className="text-xs text-blue-100 mb-1">웨이퍼당 원가</div>
            <div className="font-bold font-mono text-lg">{formatKRW(totalPerWafer)}원</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between text-sm">
          <span className="text-slate-400">런당 합계</span>
          <span className="text-white font-bold font-mono">{formatKRW(totalPerRun)} 원</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// 2. 베이크 탭
// ────────────────────────────────────────────────────────────────
function BakeTab() {
  const { bake, mocvd, setBake } = useCostStore();
  const cost = calcBakeCostPerRun(bake, mocvd.wafersPerRun);
  const totalPerRun = cost.labor + cost.equipment + cost.maintenance;
  const totalPerWafer = mocvd.wafersPerRun > 0 ? totalPerRun / mocvd.wafersPerRun : 0;

  const set = (key: keyof BakeConfig) => (v: number) => setBake({ [key]: v });

  const totalTimeSec =
    bake.loadingTimePerRunSec + bake.bakeTimePerWaferSec * mocvd.wafersPerRun + bake.cooldownTimeSec;

  return (
    <div className="space-y-6">
      {/* 공정 파라미터 */}
      <div className="bg-gray-50 rounded-xl p-5">
        <GroupHeader title="공정 파라미터" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <NumField label="베이크 시간/매" value={bake.bakeTimePerWaferSec} unit="초" onChange={set('bakeTimePerWaferSec')} />
          <NumField label="로딩 시간/런" value={bake.loadingTimePerRunSec} unit="초" onChange={set('loadingTimePerRunSec')} />
          <NumField label="냉각 시간/런" value={bake.cooldownTimeSec} unit="초" onChange={set('cooldownTimeSec')} />
          <NumField label="베이크 온도" value={bake.bakeTemperatureDegC} unit="°C" onChange={set('bakeTemperatureDegC')} />
          <NumField label="로 수" value={bake.furnaceCount} unit="대" onChange={set('furnaceCount')} />
        </div>
        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 text-xs text-gray-500">
          <span className="font-medium text-gray-700">런당 총 처리 시간: </span>
          {Math.floor(totalTimeSec / 3600)}시간 {Math.floor((totalTimeSec % 3600) / 60)}분
          <span className="ml-4 text-gray-400">({formatKRW(totalTimeSec)} 초)</span>
        </div>
      </div>

      {/* 인건비 */}
      <div className="bg-gray-50 rounded-xl p-5">
        <GroupHeader title="인건비" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <NumField label="작업자 수" value={bake.workers} unit="명" onChange={set('workers')} />
          <NumField label="시급" value={bake.hourlyWage} unit="원" onChange={set('hourlyWage')} />
        </div>
      </div>

      {/* 장비비 */}
      <div className="bg-gray-50 rounded-xl p-5">
        <GroupHeader title="장비비 및 유지보수" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <NumField label="장비 시간당 비용" value={bake.equipmentCostPerHour} unit="원/h" onChange={set('equipmentCostPerHour')} />
          <NumField label="런당 유지보수비" value={bake.maintenanceCostPerRun} unit="원" onChange={set('maintenanceCostPerRun')} />
        </div>
      </div>

      {/* 결과 요약 */}
      <div className="bg-slate-800 rounded-xl p-5">
        <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wider">런당 원가 분석</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <ResultItem label="노무비" value={`${formatKRW(cost.labor)}원`} />
          <ResultItem label="장비비" value={`${formatKRW(cost.equipment)}원`} />
          <ResultItem label="유지보수" value={`${formatKRW(cost.maintenance)}원`} />
          <div className="text-center p-3 rounded-lg bg-orange-500 text-white">
            <div className="text-xs text-orange-100 mb-1">웨이퍼당 원가</div>
            <div className="font-bold font-mono text-lg">{formatKRW(totalPerWafer)}원</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between text-sm">
          <span className="text-slate-400">런당 합계</span>
          <span className="text-white font-bold font-mono">{formatKRW(totalPerRun)} 원</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// 3. 측정 탭
// ────────────────────────────────────────────────────────────────
function MeasurementTab() {
  const { measurements, mocvd, addMeasurement, updateMeasurement, removeMeasurement } = useCostStore();
  const cost = calcMeasurementCostPerRun(measurements, mocvd.wafersPerRun);
  const totalPerRun = cost.labor + cost.equipment;
  const totalPerWafer = mocvd.wafersPerRun > 0 ? totalPerRun / mocvd.wafersPerRun : 0;

  const handleAdd = () => {
    addMeasurement({
      id: Date.now().toString(),
      name: '',
      equipmentName: '',
      timePerWaferSec: 60,
      samplingRate: 100,
      equipmentCostPerHour: 10000,
      workers: 1,
      hourlyWage: 18000,
      loadingTimeSec: 300,
      maintenanceCostPerRun: 3000,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">PL, XRD, 두께, 표면 검사 등 측정 항목을 관리합니다.</p>
        <button
          onClick={handleAdd}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 font-medium"
        >
          + 측정 항목 추가
        </button>
      </div>

      {/* 측정 항목 카드 목록 */}
      <div className="space-y-4">
        {measurements.map((m, idx) => {
          const itemCost = calcSingleMeasurementCostPerRun(m, mocvd.wafersPerRun);
          const itemTotal = itemCost.labor + itemCost.equipment;
          const itemPerWafer = mocvd.wafersPerRun > 0 ? itemTotal / mocvd.wafersPerRun : 0;

          return (
            <div key={m.id} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              {/* 항목 헤더 */}
              <div className="flex items-center gap-3 mb-4">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <input
                  value={m.name}
                  onChange={(e) => updateMeasurement(m.id, { name: e.target.value })}
                  placeholder="측정 항목명"
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium w-36 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
                <input
                  value={m.equipmentName}
                  onChange={(e) => updateMeasurement(m.id, { equipmentName: e.target.value })}
                  placeholder="장비명"
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
                <div className="ml-auto flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-gray-400">웨이퍼당</div>
                    <div className="text-sm font-bold text-emerald-700 font-mono">{formatKRW(itemPerWafer)}원</div>
                  </div>
                  <button
                    onClick={() => removeMeasurement(m.id)}
                    className="text-red-400 hover:text-red-600 text-sm border border-red-200 hover:border-red-400 rounded-lg px-2 py-1"
                  >
                    삭제
                  </button>
                </div>
              </div>

              {/* 파라미터 그리드 */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">시간/매 (초)</label>
                  <input
                    type="number"
                    value={m.timePerWaferSec}
                    onChange={(e) => updateMeasurement(m.id, { timePerWaferSec: Number(e.target.value) })}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 w-full text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">샘플링률 (%)</label>
                  <input
                    type="number"
                    value={m.samplingRate}
                    onChange={(e) => updateMeasurement(m.id, { samplingRate: Number(e.target.value) })}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 w-full text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">로딩 시간/런 (초)</label>
                  <input
                    type="number"
                    value={m.loadingTimeSec}
                    onChange={(e) => updateMeasurement(m.id, { loadingTimeSec: Number(e.target.value) })}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 w-full text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">작업자</label>
                  <input
                    type="number"
                    value={m.workers}
                    onChange={(e) => updateMeasurement(m.id, { workers: Number(e.target.value) })}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 w-full text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">시급 (원)</label>
                  <input
                    type="number"
                    value={m.hourlyWage}
                    onChange={(e) => updateMeasurement(m.id, { hourlyWage: Number(e.target.value) })}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 w-full text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">장비비/시간 (원)</label>
                  <input
                    type="number"
                    value={m.equipmentCostPerHour}
                    onChange={(e) => updateMeasurement(m.id, { equipmentCostPerHour: Number(e.target.value) })}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 w-full text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">유지보수비/런 (원)</label>
                  <input
                    type="number"
                    value={m.maintenanceCostPerRun}
                    onChange={(e) => updateMeasurement(m.id, { maintenanceCostPerRun: Number(e.target.value) })}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 w-full text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    min={0}
                  />
                </div>
              </div>

              {/* 항목별 소계 */}
              <div className="mt-3 pt-3 border-t border-gray-200 flex gap-4 text-xs text-gray-500">
                <span>런당 노무비: <strong className="text-gray-700">{formatKRW(itemCost.labor)}원</strong></span>
                <span>런당 장비비: <strong className="text-gray-700">{formatKRW(itemCost.equipment)}원</strong></span>
                <span>런당 합계: <strong className="text-emerald-700">{formatKRW(itemTotal)}원</strong></span>
              </div>
            </div>
          );
        })}

        {measurements.length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            측정 항목이 없습니다. 위 버튼을 눌러 추가하세요.
          </div>
        )}
      </div>

      {/* 결과 요약 */}
      <div className="bg-slate-800 rounded-xl p-5">
        <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wider">런당 원가 분석</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <ResultItem label="노무비 합계" value={`${formatKRW(cost.labor)}원`} />
          <ResultItem label="장비비 합계" value={`${formatKRW(cost.equipment)}원`} />
          <div className="text-center p-3 rounded-lg bg-emerald-600 text-white">
            <div className="text-xs text-emerald-100 mb-1">웨이퍼당 원가</div>
            <div className="font-bold font-mono text-lg">{formatKRW(totalPerWafer)}원</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between text-sm">
          <span className="text-slate-400">런당 합계 ({measurements.length}개 항목)</span>
          <span className="text-white font-bold font-mono">{formatKRW(totalPerRun)} 원</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// 4. 출하 탭
// ────────────────────────────────────────────────────────────────
function ShipmentTab() {
  const { shipment, mocvd, setShipment } = useCostStore();
  const cost = calcShipmentCostPerRun(shipment, mocvd.wafersPerRun);
  const totalPerRun = cost.labor + cost.material + cost.equipment;
  const totalPerWafer = mocvd.wafersPerRun > 0 ? totalPerRun / mocvd.wafersPerRun : 0;

  const set = (key: keyof ShipmentConfig) => (v: number) => setShipment({ [key]: v });

  const totalTimeSec =
    (shipment.packingTimePerWaferSec + shipment.inspectionTimePerWaferSec) * mocvd.wafersPerRun +
    shipment.documentationTimeSec;

  return (
    <div className="space-y-6">
      {/* 공정 시간 */}
      <div className="bg-gray-50 rounded-xl p-5">
        <GroupHeader title="공정 시간" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <NumField label="포장 시간/매" value={shipment.packingTimePerWaferSec} unit="초" onChange={set('packingTimePerWaferSec')} />
          <NumField label="출하검사 시간/매" value={shipment.inspectionTimePerWaferSec} unit="초" onChange={set('inspectionTimePerWaferSec')} />
          <NumField label="서류 작성 시간/런" value={shipment.documentationTimeSec} unit="초" onChange={set('documentationTimeSec')} />
        </div>
        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 text-xs text-gray-500">
          <span className="font-medium text-gray-700">런당 총 처리 시간: </span>
          {Math.floor(totalTimeSec / 3600)}시간 {Math.floor((totalTimeSec % 3600) / 60)}분
        </div>
      </div>

      {/* 인건비 */}
      <div className="bg-gray-50 rounded-xl p-5">
        <GroupHeader title="인건비" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <NumField label="작업자 수" value={shipment.workers} unit="명" onChange={set('workers')} />
          <NumField label="시급" value={shipment.hourlyWage} unit="원" onChange={set('hourlyWage')} />
        </div>
      </div>

      {/* 비용 항목 */}
      <div className="bg-gray-50 rounded-xl p-5">
        <GroupHeader title="비용 항목" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <NumField label="포장재비/매" value={shipment.packagingMaterialCost} unit="원" onChange={set('packagingMaterialCost')} />
          <NumField label="운송비/매" value={shipment.shippingCostPerWafer} unit="원" onChange={set('shippingCostPerWafer')} />
          <NumField label="보험비/매" value={shipment.insuranceCostPerWafer} unit="원" onChange={set('insuranceCostPerWafer')} />
          <NumField label="검사장비비/시간" value={shipment.inspectionEquipmentCostPerHour} unit="원/h" onChange={set('inspectionEquipmentCostPerHour')} />
        </div>
        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 text-xs text-gray-500">
          매당 재료비 합계:{' '}
          <strong className="text-gray-700">
            {formatKRW(shipment.packagingMaterialCost + shipment.shippingCostPerWafer + shipment.insuranceCostPerWafer)} 원
          </strong>
          <span className="ml-3">런당 재료비: <strong className="text-violet-700">{formatKRW(cost.material)} 원</strong></span>
        </div>
      </div>

      {/* 품질 관리 */}
      <div className="bg-gray-50 rounded-xl p-5">
        <GroupHeader title="품질 관리" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <NumField label="출하 불량률" value={shipment.shipmentDefectRate} unit="%" step="0.1" max={100} onChange={set('shipmentDefectRate')} />
        </div>
      </div>

      {/* 결과 요약 */}
      <div className="bg-slate-800 rounded-xl p-5">
        <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wider">런당 원가 분석</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <ResultItem label="노무비" value={`${formatKRW(cost.labor)}원`} />
          <ResultItem label="재료비 (포장+운송+보험)" value={`${formatKRW(cost.material)}원`} />
          <ResultItem label="검사장비비" value={`${formatKRW(cost.equipment)}원`} />
          <div className="text-center p-3 rounded-lg bg-violet-600 text-white">
            <div className="text-xs text-violet-100 mb-1">웨이퍼당 원가</div>
            <div className="font-bold font-mono text-lg">{formatKRW(totalPerWafer)}원</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between text-sm">
          <span className="text-slate-400">런당 합계</span>
          <span className="text-white font-bold font-mono">{formatKRW(totalPerRun)} 원</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────────
const tabList: { id: Tab; label: string; number: string }[] = [
  { id: 'mocvd', label: 'MOCVD 공정', number: '1' },
  { id: 'bake', label: '베이크 공정', number: '2' },
  { id: 'measurement', label: '측정 공정', number: '3' },
  { id: 'shipment', label: '출하 공정', number: '4' },
];

const tabActiveClass: Record<Tab, string> = {
  mocvd: 'border-blue-600 text-blue-700 bg-blue-50',
  bake: 'border-orange-500 text-orange-700 bg-orange-50',
  measurement: 'border-emerald-600 text-emerald-700 bg-emerald-50',
  shipment: 'border-violet-600 text-violet-700 bg-violet-50',
};

const tabBadgeClass: Record<Tab, string> = {
  mocvd: 'bg-blue-600 text-white',
  bake: 'bg-orange-500 text-white',
  measurement: 'bg-emerald-600 text-white',
  shipment: 'bg-violet-600 text-white',
};

export default function ProcessCost() {
  const [activeTab, setActiveTab] = useState<Tab>('mocvd');

  return (
    <div>
      {/* 탭 네비게이션 */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl shadow-sm p-1.5 border border-gray-100">
        {tabList.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                isActive
                  ? `${tabActiveClass[tab.id]} border-current`
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                  isActive ? tabBadgeClass[tab.id] : 'bg-gray-200 text-gray-600'
                }`}
              >
                {tab.number}
              </span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {activeTab === 'mocvd' && <MOCVDTab />}
        {activeTab === 'bake' && <BakeTab />}
        {activeTab === 'measurement' && <MeasurementTab />}
        {activeTab === 'shipment' && <ShipmentTab />}
      </div>
    </div>
  );
}
