import { create } from 'zustand'

const defaultBom = [
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
]

const defaultMocvd = {
  wafersPerRun: 14, runTimeSec: 14400, setupTimeSec: 3600,
  reactorCount: 2, equipmentCostPerHour: 80000, maintenanceCostPerRun: 50000,
  workers: 2, hourlyWage: 20000, defectRate: 5, utilizationRate: 80,
  cleaningIntervalRuns: 20, cleaningTimeSec: 14400, cleaningCostPerSession: 200000,
  powerConsumptionKW: 150, electricityRate: 120,
}

const defaultBake = {
  bakeTimePerWaferSec: 180, loadingTimePerRunSec: 600, equipmentCostPerHour: 35000,
  workers: 1, hourlyWage: 18000, bakeTemperatureDegC: 850, furnaceCount: 1,
  maintenanceCostPerRun: 10000, cooldownTimeSec: 1800,
}

const defaultMeasurements = [
  { id: '1', name: 'PL 측정', equipmentName: 'PL Mapper', timePerWaferSec: 120, samplingRate: 100, equipmentCostPerHour: 30000, workers: 1, hourlyWage: 18000, loadingTimeSec: 300, maintenanceCostPerRun: 5000 },
  { id: '2', name: 'XRD 측정', equipmentName: 'XRD', timePerWaferSec: 300, samplingRate: 30, equipmentCostPerHour: 50000, workers: 1, hourlyWage: 20000, loadingTimeSec: 600, maintenanceCostPerRun: 8000 },
  { id: '3', name: 'LEI 측정', equipmentName: 'Reflectometer', timePerWaferSec: 60, samplingRate: 100, equipmentCostPerHour: 15000, workers: 1, hourlyWage: 18000, loadingTimeSec: 180, maintenanceCostPerRun: 3000 },
  { id: '4', name: '표면 검사', equipmentName: 'Microscope', timePerWaferSec: 90, samplingRate: 50, equipmentCostPerHour: 10000, workers: 1, hourlyWage: 18000, loadingTimeSec: 120, maintenanceCostPerRun: 2000 },
]

const defaultShipment = {
  packingTimePerWaferSec: 60, inspectionTimePerWaferSec: 30, packagingMaterialCost: 500,
  workers: 1, hourlyWage: 15000, shipmentDefectRate: 1, documentationTimeSec: 1800,
  inspectionEquipmentCostPerHour: 10000, shippingCostPerWafer: 300, insuranceCostPerWafer: 100,
}

const defaultOverhead = {
  electricity: 3000000, coolingWater: 500000, cleanroomMaint: 1500000,
  nitrogen: 200000, depreciation: 5000000, consumables: 800000,
  salesExpense: 500000, logisticsCost: 300000, adminCost: 400000,
}

export const useCostStore = create((set) => ({
  bom: defaultBom,
  mocvd: defaultMocvd,
  bake: defaultBake,
  measurements: defaultMeasurements,
  shipment: defaultShipment,
  overhead: defaultOverhead,
  lotSize: 1000,
  sellingPrice: 50000,

  setBom: (bom) => set({ bom }),
  addBomItem: (item) => set((s) => ({ bom: [...s.bom, item] })),
  updateBomItem: (id, updates) => set((s) => ({ bom: s.bom.map((b) => b.id === id ? { ...b, ...updates } : b) })),
  removeBomItem: (id) => set((s) => ({ bom: s.bom.filter((b) => b.id !== id) })),
  setMocvd: (updates) => set((s) => ({ mocvd: { ...s.mocvd, ...updates } })),
  setBake: (updates) => set((s) => ({ bake: { ...s.bake, ...updates } })),
  setMeasurements: (measurements) => set({ measurements }),
  addMeasurement: (item) => set((s) => ({ measurements: [...s.measurements, item] })),
  updateMeasurement: (id, updates) => set((s) => ({ measurements: s.measurements.map((m) => m.id === id ? { ...m, ...updates } : m) })),
  removeMeasurement: (id) => set((s) => ({ measurements: s.measurements.filter((m) => m.id !== id) })),
  setShipment: (updates) => set((s) => ({ shipment: { ...s.shipment, ...updates } })),
  setOverhead: (updates) => set((s) => ({ overhead: { ...s.overhead, ...updates } })),
  setLotSize: (lotSize) => set({ lotSize }),
  setSellingPrice: (sellingPrice) => set({ sellingPrice }),
  loadConfig: (config) => set({ bom: config.bom, mocvd: config.mocvd, bake: config.bake, measurements: config.measurements, shipment: config.shipment, overhead: config.overhead, lotSize: config.lotSize, sellingPrice: config.sellingPrice }),
}))
