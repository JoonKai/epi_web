import { BOMItem, MOCVDConfig, BakeConfig, MeasurementItem, ShipmentConfig, OverheadCosts, CostBreakdown } from '../types';

// 1런당 직접재료비
export function calcMaterialPerRun(bom: BOMItem[]): number {
  return bom.reduce((sum, item) => sum + item.usagePerRun * item.unitPrice, 0);
}

// 웨이퍼당 직접재료비
export function calcMaterialPerWafer(bom: BOMItem[], wafersPerRun: number): number {
  return wafersPerRun > 0 ? calcMaterialPerRun(bom) / wafersPerRun : 0;
}

// MOCVD 공정 원가 (런 기준)
export function calcMOCVDCostPerRun(mocvd: MOCVDConfig): {
  labor: number;
  equipment: number;
  maintenance: number;
  cleaning: number;
  power: number;
} {
  const totalTimeSec = mocvd.runTimeSec + mocvd.setupTimeSec;
  const totalTimeHours = totalTimeSec / 3600;
  const labor = totalTimeHours * mocvd.hourlyWage * mocvd.workers;
  const equipment = totalTimeHours * mocvd.equipmentCostPerHour;
  const maintenance = mocvd.maintenanceCostPerRun;
  const cleaning = mocvd.cleaningIntervalRuns > 0
    ? mocvd.cleaningCostPerSession / mocvd.cleaningIntervalRuns
    : 0;
  const power = totalTimeHours * mocvd.powerConsumptionKW * mocvd.electricityRate;
  return { labor, equipment, maintenance, cleaning, power };
}

export function calcBakeCostPerRun(
  bake: BakeConfig,
  wafersPerRun: number
): { labor: number; equipment: number; maintenance: number } {
  const totalTimeSec =
    bake.loadingTimePerRunSec +
    bake.bakeTimePerWaferSec * wafersPerRun +
    bake.cooldownTimeSec;
  const hours = totalTimeSec / 3600;
  const labor = hours * bake.hourlyWage * bake.workers;
  const equipment = hours * bake.equipmentCostPerHour;
  const maintenance = bake.maintenanceCostPerRun;
  return { labor, equipment, maintenance };
}

// 측정 공정 원가 (런 기준 = 웨이퍼수 기준)
export function calcMeasurementCostPerRun(
  measurements: MeasurementItem[],
  wafersPerRun: number
): { labor: number; equipment: number } {
  let labor = 0;
  let equipment = 0;
  for (const m of measurements) {
    const sampledWafers = wafersPerRun * (m.samplingRate / 100);
    const hours = (m.timePerWaferSec * sampledWafers + m.loadingTimeSec) / 3600;
    labor += hours * m.hourlyWage * m.workers;
    equipment += hours * m.equipmentCostPerHour + m.maintenanceCostPerRun;
  }
  return { labor, equipment };
}

// 측정 항목 1개의 런당 원가 계산 (UI 표시용)
export function calcSingleMeasurementCostPerRun(
  m: MeasurementItem,
  wafersPerRun: number
): { labor: number; equipment: number } {
  const sampledWafers = wafersPerRun * (m.samplingRate / 100);
  const hours = (m.timePerWaferSec * sampledWafers + m.loadingTimeSec) / 3600;
  const labor = hours * m.hourlyWage * m.workers;
  const equipment = hours * m.equipmentCostPerHour + m.maintenanceCostPerRun;
  return { labor, equipment };
}

// 출하 공정 원가 (런 기준)
export function calcShipmentCostPerRun(
  shipment: ShipmentConfig,
  wafersPerRun: number
): { labor: number; material: number; equipment: number } {
  const totalTimeSec =
    (shipment.packingTimePerWaferSec + shipment.inspectionTimePerWaferSec) * wafersPerRun +
    shipment.documentationTimeSec;
  const hours = totalTimeSec / 3600;
  const labor = hours * shipment.hourlyWage * shipment.workers;
  const material =
    (shipment.packagingMaterialCost + shipment.shippingCostPerWafer + shipment.insuranceCostPerWafer) *
    wafersPerRun;
  const equipment = hours * shipment.inspectionEquipmentCostPerHour;
  return { labor, material, equipment };
}

// 고정 제조경비
export function calcFixedOverhead(overhead: OverheadCosts): number {
  return (
    overhead.electricity +
    overhead.coolingWater +
    overhead.cleanroomMaint +
    overhead.nitrogen +
    overhead.depreciation +
    overhead.consumables
  );
}

export function calcSellingAdminCost(overhead: OverheadCosts): number {
  return overhead.salesExpense + overhead.logisticsCost + overhead.adminCost;
}

// 전체 원가 계산 (lotSize = 총 웨이퍼 수)
export function calcFullCost(
  bom: BOMItem[],
  mocvd: MOCVDConfig,
  bake: BakeConfig,
  measurements: MeasurementItem[],
  shipment: ShipmentConfig,
  overhead: OverheadCosts,
  lotSize: number
): CostBreakdown {
  const wafersPerRun = mocvd.wafersPerRun;
  const effectiveYield = 1 - mocvd.defectRate / 100;
  const shipYield = 1 - shipment.shipmentDefectRate / 100;
  const totalYield = effectiveYield * shipYield;

  // 필요한 런 수 (불량 고려)
  const requiredWafers = totalYield > 0 ? lotSize / totalYield : lotSize;
  const runCount = wafersPerRun > 0 ? Math.ceil(requiredWafers / wafersPerRun) : 0;

  // 직접재료비
  const directMaterial = calcMaterialPerRun(bom) * runCount;

  // 직접노무비
  const mocvdCost = calcMOCVDCostPerRun(mocvd);
  const bakeCost = calcBakeCostPerRun(bake, wafersPerRun);
  const measCost = calcMeasurementCostPerRun(measurements, wafersPerRun);
  const shipCost = calcShipmentCostPerRun(shipment, wafersPerRun);
  const directLabor = (mocvdCost.labor + bakeCost.labor + measCost.labor + shipCost.labor) * runCount;

  // 제조경비 (설비비 + 유지보수 + 전력비 + 청소비 + 고정경비)
  const equipmentTotal =
    (mocvdCost.equipment +
      mocvdCost.maintenance +
      mocvdCost.cleaning +
      mocvdCost.power +
      bakeCost.equipment +
      bakeCost.maintenance +
      measCost.equipment +
      shipCost.equipment) *
    runCount;
  const packagingMaterial = shipCost.material * runCount;
  const fixedOverhead = calcFixedOverhead(overhead);
  const manufacturingOverhead = equipmentTotal + packagingMaterial + fixedOverhead;

  const manufacturingCost = directMaterial + directLabor + manufacturingOverhead;
  const sellingAdminCost = calcSellingAdminCost(overhead);
  const totalCost = manufacturingCost + sellingAdminCost;
  const unitCost = lotSize > 0 ? totalCost / lotSize : 0;
  const costPerRun = runCount > 0 ? totalCost / runCount : 0;

  return {
    directMaterial,
    directLabor,
    manufacturingOverhead,
    manufacturingCost,
    sellingAdminCost,
    totalCost,
    unitCost,
    costPerRun,
  };
}

// 손익분기점 (웨이퍼 수 기준)
export function calcBreakEven(
  bom: BOMItem[],
  mocvd: MOCVDConfig,
  bake: BakeConfig,
  measurements: MeasurementItem[],
  shipment: ShipmentConfig,
  overhead: OverheadCosts,
  sellingPrice: number
): { bepQuantity: number; bepRevenue: number } | null {
  const wafersPerRun = mocvd.wafersPerRun;
  const totalYield = (1 - mocvd.defectRate / 100) * (1 - shipment.shipmentDefectRate / 100);

  // 변동비: 1런당 비용 / 런당 양품 수
  const materialPerRun = calcMaterialPerRun(bom);
  const mocvdCost = calcMOCVDCostPerRun(mocvd);
  const bakeCost = calcBakeCostPerRun(bake, wafersPerRun);
  const measCost = calcMeasurementCostPerRun(measurements, wafersPerRun);
  const shipCost = calcShipmentCostPerRun(shipment, wafersPerRun);

  const costPerRun =
    materialPerRun +
    mocvdCost.labor +
    mocvdCost.equipment +
    mocvdCost.maintenance +
    mocvdCost.cleaning +
    mocvdCost.power +
    bakeCost.labor +
    bakeCost.equipment +
    bakeCost.maintenance +
    measCost.labor +
    measCost.equipment +
    shipCost.labor +
    shipCost.material +
    shipCost.equipment;

  const goodWafersPerRun = wafersPerRun * totalYield;
  const variableCostPerWafer = goodWafersPerRun > 0 ? costPerRun / goodWafersPerRun : Infinity;

  // 고정비
  const fixedCost = calcFixedOverhead(overhead) + calcSellingAdminCost(overhead);

  const margin = sellingPrice - variableCostPerWafer;
  if (margin <= 0) return null;

  const bepQuantity = Math.ceil(fixedCost / margin);
  const bepRevenue = bepQuantity * sellingPrice;
  return { bepQuantity, bepRevenue };
}

export function formatKRW(value: number): string {
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
}
