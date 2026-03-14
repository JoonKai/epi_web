export function formatMachineLabel(machineNo) {
  if (machineNo == null || machineNo === '') return '-'
  return `MO#${machineNo}호기`
}
