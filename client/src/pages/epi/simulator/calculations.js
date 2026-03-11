export function calcMaterialPerRun(bom) {
  return bom.reduce((sum, item) => sum + item.usagePerRun * item.unitPrice, 0)
}

export function calcMOCVDCostPerRun(mocvd) {
  const totalTimeSec = mocvd.runTimeSec + mocvd.setupTimeSec
  const h = totalTimeSec / 3600
  return {
    labor: h * mocvd.hourlyWage * mocvd.workers,
    equipment: h * mocvd.equipmentCostPerHour,
    maintenance: mocvd.maintenanceCostPerRun,
    cleaning: mocvd.cleaningIntervalRuns > 0 ? mocvd.cleaningCostPerSession / mocvd.cleaningIntervalRuns : 0,
    power: h * mocvd.powerConsumptionKW * mocvd.electricityRate,
  }
}

export function calcBakeCostPerRun(bake, wafersPerRun) {
  const totalTimeSec = bake.loadingTimePerRunSec + bake.bakeTimePerWaferSec * wafersPerRun + bake.cooldownTimeSec
  const h = totalTimeSec / 3600
  return {
    labor: h * bake.hourlyWage * bake.workers,
    equipment: h * bake.equipmentCostPerHour,
    maintenance: bake.maintenanceCostPerRun,
  }
}

export function calcMeasurementCostPerRun(measurements, wafersPerRun) {
  let labor = 0, equipment = 0
  for (const m of measurements) {
    const sampled = wafersPerRun * (m.samplingRate / 100)
    const h = (m.timePerWaferSec * sampled + m.loadingTimeSec) / 3600
    labor += h * m.hourlyWage * m.workers
    equipment += h * m.equipmentCostPerHour + m.maintenanceCostPerRun
  }
  return { labor, equipment }
}

export function calcSingleMeasurementCostPerRun(m, wafersPerRun) {
  const sampled = wafersPerRun * (m.samplingRate / 100)
  const h = (m.timePerWaferSec * sampled + m.loadingTimeSec) / 3600
  return {
    labor: h * m.hourlyWage * m.workers,
    equipment: h * m.equipmentCostPerHour + m.maintenanceCostPerRun,
  }
}

export function calcShipmentCostPerRun(shipment, wafersPerRun) {
  const totalTimeSec = (shipment.packingTimePerWaferSec + shipment.inspectionTimePerWaferSec) * wafersPerRun + shipment.documentationTimeSec
  const h = totalTimeSec / 3600
  return {
    labor: h * shipment.hourlyWage * shipment.workers,
    material: (shipment.packagingMaterialCost + shipment.shippingCostPerWafer + shipment.insuranceCostPerWafer) * wafersPerRun,
    equipment: h * shipment.inspectionEquipmentCostPerHour,
  }
}

export function calcFixedOverhead(overhead) {
  return overhead.electricity + overhead.coolingWater + overhead.cleanroomMaint + overhead.nitrogen + overhead.depreciation + overhead.consumables
}

export function calcSellingAdminCost(overhead) {
  return overhead.salesExpense + overhead.logisticsCost + overhead.adminCost
}

export function calcFullCost(bom, mocvd, bake, measurements, shipment, overhead, lotSize) {
  const wafersPerRun = mocvd.wafersPerRun
  const totalYield = (1 - mocvd.defectRate / 100) * (1 - shipment.shipmentDefectRate / 100)
  const requiredWafers = totalYield > 0 ? lotSize / totalYield : lotSize
  const runCount = wafersPerRun > 0 ? Math.ceil(requiredWafers / wafersPerRun) : 0

  const directMaterial = calcMaterialPerRun(bom) * runCount
  const mocvdCost = calcMOCVDCostPerRun(mocvd)
  const bakeCost = calcBakeCostPerRun(bake, wafersPerRun)
  const measCost = calcMeasurementCostPerRun(measurements, wafersPerRun)
  const shipCost = calcShipmentCostPerRun(shipment, wafersPerRun)
  const directLabor = (mocvdCost.labor + bakeCost.labor + measCost.labor + shipCost.labor) * runCount
  const equipmentTotal = (mocvdCost.equipment + mocvdCost.maintenance + mocvdCost.cleaning + mocvdCost.power + bakeCost.equipment + bakeCost.maintenance + measCost.equipment + shipCost.equipment) * runCount
  const packagingMaterial = shipCost.material * runCount
  const fixedOverhead = calcFixedOverhead(overhead)
  const manufacturingOverhead = equipmentTotal + packagingMaterial + fixedOverhead
  const manufacturingCost = directMaterial + directLabor + manufacturingOverhead
  const sellingAdminCost = calcSellingAdminCost(overhead)
  const totalCost = manufacturingCost + sellingAdminCost
  const unitCost = lotSize > 0 ? totalCost / lotSize : 0
  const costPerRun = runCount > 0 ? totalCost / runCount : 0

  return { directMaterial, directLabor, manufacturingOverhead, manufacturingCost, sellingAdminCost, totalCost, unitCost, costPerRun, runCount, totalYield }
}

export function calcBreakEven(bom, mocvd, bake, measurements, shipment, overhead, sellingPrice) {
  const wafersPerRun = mocvd.wafersPerRun
  const totalYield = (1 - mocvd.defectRate / 100) * (1 - shipment.shipmentDefectRate / 100)
  const mocvdCost = calcMOCVDCostPerRun(mocvd)
  const bakeCost = calcBakeCostPerRun(bake, wafersPerRun)
  const measCost = calcMeasurementCostPerRun(measurements, wafersPerRun)
  const shipCost = calcShipmentCostPerRun(shipment, wafersPerRun)
  const costPerRun = calcMaterialPerRun(bom) + mocvdCost.labor + mocvdCost.equipment + mocvdCost.maintenance + mocvdCost.cleaning + mocvdCost.power + bakeCost.labor + bakeCost.equipment + bakeCost.maintenance + measCost.labor + measCost.equipment + shipCost.labor + shipCost.material + shipCost.equipment
  const goodWafersPerRun = wafersPerRun * totalYield
  const variableCostPerWafer = goodWafersPerRun > 0 ? costPerRun / goodWafersPerRun : Infinity
  const fixedCost = calcFixedOverhead(overhead) + calcSellingAdminCost(overhead)
  const margin = sellingPrice - variableCostPerWafer
  if (margin <= 0) return null
  const bepQuantity = Math.ceil(fixedCost / margin)
  return { bepQuantity, bepRevenue: bepQuantity * sellingPrice, variableCostPerWafer, fixedCost, margin }
}

export function krw(value) {
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
}
