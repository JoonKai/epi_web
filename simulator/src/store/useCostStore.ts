import { create } from 'zustand';
import { BOMItem, MOCVDConfig, BakeConfig, MeasurementItem, ShipmentConfig, OverheadCosts } from '../types';

export type DashboardPage = 'home' | 'cost-simulator' | 'production' | 'quality' | 'settings';

// JSON으로 저장/불러오기할 시뮬레이터 설정 형식
export interface SimulatorConfig {
  version: string;
  exportedAt: string;
  name?: string;
  bom: BOMItem[];
  mocvd: MOCVDConfig;
  bake: BakeConfig;
  measurements: MeasurementItem[];
  shipment: ShipmentConfig;
  overhead: OverheadCosts;
  lotSize: number;
  sellingPrice: number;
}

interface CostStore {
  currentPage: DashboardPage;
  sidebarOpen: boolean;
  bom: BOMItem[];
  mocvd: MOCVDConfig;
  bake: BakeConfig;
  measurements: MeasurementItem[];
  shipment: ShipmentConfig;
  overhead: OverheadCosts;
  lotSize: number;
  sellingPrice: number;
  activeTab: string;

  setCurrentPage: (page: DashboardPage) => void;
  setSidebarOpen: (open: boolean) => void;
  setBom: (bom: BOMItem[]) => void;
  addBomItem: (item: BOMItem) => void;
  updateBomItem: (id: string, item: Partial<BOMItem>) => void;
  removeBomItem: (id: string) => void;

  setMocvd: (config: Partial<MOCVDConfig>) => void;
  setBake: (config: Partial<BakeConfig>) => void;

  setMeasurements: (items: MeasurementItem[]) => void;
  addMeasurement: (item: MeasurementItem) => void;
  updateMeasurement: (id: string, item: Partial<MeasurementItem>) => void;
  removeMeasurement: (id: string) => void;

  setShipment: (config: Partial<ShipmentConfig>) => void;
  setOverhead: (overhead: Partial<OverheadCosts>) => void;
  setLotSize: (size: number) => void;
  setSellingPrice: (price: number) => void;
  setActiveTab: (tab: string) => void;
  loadConfig: (config: SimulatorConfig) => void;
}

// GaN EPI 기본 원자재
const defaultBom: BOMItem[] = [
  { id: '1', category: 'MO소스', name: 'TMGa', spec: 'Trimethylgallium', unit: 'g', usagePerRun: 15, unitPrice: 350, supplier: 'Strem' },
  { id: '2', category: 'MO소스', name: 'TEGa', spec: 'Triethylgallium', unit: 'g', usagePerRun: 5, unitPrice: 400, supplier: 'Strem' },
  { id: '3', category: 'MO소스', name: 'TMAl', spec: 'Trimethylaluminium', unit: 'g', usagePerRun: 8, unitPrice: 280, supplier: 'SAFC' },
  { id: '4', category: 'MO소스', name: 'TMIn', spec: 'Trimethylindium', unit: 'g', usagePerRun: 10, unitPrice: 600, supplier: 'SAFC' },
  { id: '5', category: '질소', name: 'NH3', spec: '암모니아 6N', unit: 'L', usagePerRun: 500, unitPrice: 5, supplier: '대성산업가스' },
  { id: '6', category: '도펀트', name: 'SiH4', spec: '실란 (n-type)', unit: 'cc', usagePerRun: 50, unitPrice: 20, supplier: 'SK머티리얼즈' },
  { id: '7', category: '도펀트', name: 'Cp2Mg', spec: 'Bis-Cp Mg (p-type)', unit: 'g', usagePerRun: 3, unitPrice: 800, supplier: 'Strem' },
  { id: '8', category: '캐리어', name: 'H2', spec: '수소 7N', unit: 'L', usagePerRun: 2000, unitPrice: 0.5, supplier: '대성산업가스' },
  { id: '9', category: '캐리어', name: 'N2', spec: '질소 6N', unit: 'L', usagePerRun: 1000, unitPrice: 0.3, supplier: '대성산업가스' },
  { id: '10', category: '기판', name: 'Sapphire Wafer', spec: '4" DSP C-plane', unit: 'EA', usagePerRun: 14, unitPrice: 8000, supplier: 'Crystalwise' },
];

// MOCVD 기본 설정
const defaultMocvd: MOCVDConfig = {
  wafersPerRun: 14,
  runTimeSec: 14400,           // 4시간
  setupTimeSec: 3600,          // 1시간 (로딩/언로딩/퍼지)
  reactorCount: 2,
  equipmentCostPerHour: 80000,
  maintenanceCostPerRun: 50000,
  workers: 2,
  hourlyWage: 20000,
  defectRate: 5,
  utilizationRate: 80,         // 장비 가동률 80%
  cleaningIntervalRuns: 20,    // 20런마다 청소
  cleaningTimeSec: 14400,      // 청소 4시간
  cleaningCostPerSession: 200000, // 청소 1회 비용
  powerConsumptionKW: 150,     // 150kW
  electricityRate: 120,        // 120원/kWh
};

const defaultBake: BakeConfig = {
  bakeTimePerWaferSec: 180,
  loadingTimePerRunSec: 600,
  equipmentCostPerHour: 35000,
  workers: 1,
  hourlyWage: 18000,
  bakeTemperatureDegC: 850,    // 850°C
  furnaceCount: 1,
  maintenanceCostPerRun: 10000,
  cooldownTimeSec: 1800,       // 냉각 30분
};

// 측정 공정 기본값
const defaultMeasurements: MeasurementItem[] = [
  { id: '1', name: 'PL 측정', equipmentName: 'PL Mapper', timePerWaferSec: 120, samplingRate: 100, equipmentCostPerHour: 30000, workers: 1, hourlyWage: 18000, loadingTimeSec: 300, maintenanceCostPerRun: 5000 },
  { id: '2', name: 'XRD 측정', equipmentName: 'XRD', timePerWaferSec: 300, samplingRate: 30, equipmentCostPerHour: 50000, workers: 1, hourlyWage: 20000, loadingTimeSec: 600, maintenanceCostPerRun: 8000 },
  { id: '3', name: 'LEI 측정', equipmentName: 'Reflectometer', timePerWaferSec: 60, samplingRate: 100, equipmentCostPerHour: 15000, workers: 1, hourlyWage: 18000, loadingTimeSec: 180, maintenanceCostPerRun: 3000 },
  { id: '4', name: '표면 검사', equipmentName: 'Microscope', timePerWaferSec: 90, samplingRate: 50, equipmentCostPerHour: 10000, workers: 1, hourlyWage: 18000, loadingTimeSec: 120, maintenanceCostPerRun: 2000 },
];

// 출하 기본값
const defaultShipment: ShipmentConfig = {
  packingTimePerWaferSec: 60,
  inspectionTimePerWaferSec: 30,
  packagingMaterialCost: 500,
  workers: 1,
  hourlyWage: 15000,
  shipmentDefectRate: 1,
  documentationTimeSec: 1800,         // 서류 작성 30분/런
  inspectionEquipmentCostPerHour: 10000,
  shippingCostPerWafer: 300,          // 운송비 300원/매
  insuranceCostPerWafer: 100,         // 보험비 100원/매
};

// 제조경비 기본값 (월 기준)
const defaultOverhead: OverheadCosts = {
  electricity: 3000000,
  coolingWater: 500000,
  cleanroomMaint: 1500000,
  nitrogen: 200000,
  depreciation: 5000000,
  consumables: 800000,
  salesExpense: 500000,
  logisticsCost: 300000,
  adminCost: 400000,
};

export const useCostStore = create<CostStore>((set) => ({
  currentPage: 'home',
  sidebarOpen: true,
  bom: defaultBom,
  mocvd: defaultMocvd,
  bake: defaultBake,
  measurements: defaultMeasurements,
  shipment: defaultShipment,
  overhead: defaultOverhead,
  lotSize: 1000,
  sellingPrice: 50000,
  activeTab: 'summary',

  setCurrentPage: (currentPage) => set({ currentPage }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setBom: (bom) => set({ bom }),
  addBomItem: (item) => set((s) => ({ bom: [...s.bom, item] })),
  updateBomItem: (id, updates) =>
    set((s) => ({ bom: s.bom.map((b) => (b.id === id ? { ...b, ...updates } : b)) })),
  removeBomItem: (id) => set((s) => ({ bom: s.bom.filter((b) => b.id !== id) })),

  setMocvd: (updates) => set((s) => ({ mocvd: { ...s.mocvd, ...updates } })),
  setBake: (updates) => set((s) => ({ bake: { ...s.bake, ...updates } })),

  setMeasurements: (measurements) => set({ measurements }),
  addMeasurement: (item) => set((s) => ({ measurements: [...s.measurements, item] })),
  updateMeasurement: (id, updates) =>
    set((s) => ({ measurements: s.measurements.map((m) => (m.id === id ? { ...m, ...updates } : m)) })),
  removeMeasurement: (id) => set((s) => ({ measurements: s.measurements.filter((m) => m.id !== id) })),

  setShipment: (updates) => set((s) => ({ shipment: { ...s.shipment, ...updates } })),
  setOverhead: (updates) => set((s) => ({ overhead: { ...s.overhead, ...updates } })),
  setLotSize: (lotSize) => set({ lotSize }),
  setSellingPrice: (sellingPrice) => set({ sellingPrice }),
  setActiveTab: (activeTab) => set({ activeTab }),
  loadConfig: (config) =>
    set({
      bom: config.bom,
      mocvd: config.mocvd,
      bake: config.bake,
      measurements: config.measurements,
      shipment: config.shipment,
      overhead: config.overhead,
      lotSize: config.lotSize,
      sellingPrice: config.sellingPrice,
    }),
}));
