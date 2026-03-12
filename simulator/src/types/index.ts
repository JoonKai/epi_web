// EPI 원자재 분류
export type BOMCategory = 'MO소스' | '질소' | '도펀트' | '캐리어' | '기판' | '소모품' | '기타';

export interface BOMItem {
  id: string;
  category: BOMCategory;
  name: string;
  spec: string;
  unit: string;
  usagePerRun: number;
  unitPrice: number;
  supplier: string;
}

// MOCVD 공정
export interface MOCVDConfig {
  wafersPerRun: number;
  runTimeSec: number;
  setupTimeSec: number;
  reactorCount: number;
  equipmentCostPerHour: number;
  maintenanceCostPerRun: number;
  workers: number;
  hourlyWage: number;
  defectRate: number;
  utilizationRate: number;        // 장비 가동률 (%)
  cleaningIntervalRuns: number;   // 청소 주기 (런)
  cleaningTimeSec: number;        // 청소 소요 시간 (초)
  cleaningCostPerSession: number; // 청소 1회 비용 (원)
  powerConsumptionKW: number;     // 전력 소비 (kW)
  electricityRate: number;        // 전기 요금 (원/kWh)
}

export interface BakeConfig {
  bakeTimePerWaferSec: number;
  loadingTimePerRunSec: number;
  equipmentCostPerHour: number;
  workers: number;
  hourlyWage: number;
  bakeTemperatureDegC: number;    // 베이크 온도 (°C)
  furnaceCount: number;           // 로 수 (대)
  maintenanceCostPerRun: number;  // 유지보수비/런 (원)
  cooldownTimeSec: number;        // 냉각 시간 (초)
}

// 측정 항목
export interface MeasurementItem {
  id: string;
  name: string;
  equipmentName: string;
  timePerWaferSec: number;
  samplingRate: number;
  equipmentCostPerHour: number;
  workers: number;
  hourlyWage: number;
  loadingTimeSec: number;         // 로딩/셋업 시간 (초/런)
  maintenanceCostPerRun: number;  // 유지보수비/런 (원)
}

// 출하 공정
export interface ShipmentConfig {
  packingTimePerWaferSec: number;
  inspectionTimePerWaferSec: number;
  packagingMaterialCost: number;
  workers: number;
  hourlyWage: number;
  shipmentDefectRate: number;
  documentationTimeSec: number;           // 서류 작성 시간 (초/런)
  inspectionEquipmentCostPerHour: number; // 검사 장비비 (원/시간)
  shippingCostPerWafer: number;           // 운송비 (원/매)
  insuranceCostPerWafer: number;          // 보험비 (원/매)
}

// 제조경비 (EPI 특화)
export interface OverheadCosts {
  electricity: number;
  coolingWater: number;
  cleanroomMaint: number;
  nitrogen: number;
  depreciation: number;
  consumables: number;
  salesExpense: number;
  logisticsCost: number;
  adminCost: number;
}

// 원가 분석 결과
export interface CostBreakdown {
  directMaterial: number;
  directLabor: number;
  manufacturingOverhead: number;
  manufacturingCost: number;
  sellingAdminCost: number;
  totalCost: number;
  unitCost: number;
  costPerRun: number;
}
