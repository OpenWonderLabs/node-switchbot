import type { SwitchBotBLEModel } from '../device'
import type { BLEDeviceServiceData } from './ble.js'

/**
 * Generic type guard for BLE device service data by model.
 * @param data The BLE service data object.
 * @param model The SwitchBotBLEModel enum to check against.
 * @returns True if data.model matches, and narrows to the specific service data type.
 */
export function isServiceDataOfModel<M extends SwitchBotBLEModel>(
  data: BLEDeviceServiceData,
  model: M,
): data is Extract<BLEDeviceServiceData, { model: M }> {
  return data.model === model
}
