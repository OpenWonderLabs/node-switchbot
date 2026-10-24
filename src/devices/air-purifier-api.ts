/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/air-purifier-api.ts: OpenAPI parameters for air purifiers
 */

/**
 * OpenAPI `setMode` parameter for air purifiers: `{"mode": mode_int, "fanGear": fan_level_int}`,
 * where mode is 1 (normal/fan), 2 (auto), 3 (sleep) or 4 (pet), and fanGear (1-3) applies only
 * to mode 1. OpenAPI has no separate fan speed or preset command; both are `setMode`.
 */
export interface AirPurifierAPIMode {
  mode: 1 | 2 | 3 | 4
  fanGear?: number
}

/** `setMode('auto' | 'manual' | 'sleep')` */
export function airPurifierModeParameter(mode: 'auto' | 'manual' | 'sleep'): AirPurifierAPIMode {
  return { auto: { mode: 2 }, manual: { mode: 1 }, sleep: { mode: 3 } }[mode] as AirPurifierAPIMode
}

/** `setFanSpeed(1-4)`; OpenAPI fan gears go up to 3 */
export function airPurifierFanParameter(speed: number): AirPurifierAPIMode {
  return { mode: 1, fanGear: Math.min(3, Math.max(1, Math.round(speed))) }
}

/** `setPresetMode(level_1 | level_2 | level_3 | auto | sleep | pet)` */
export function airPurifierPresetParameter(preset: 'level_1' | 'level_2' | 'level_3' | 'auto' | 'sleep' | 'pet'): AirPurifierAPIMode {
  return {
    level_1: { mode: 1, fanGear: 1 },
    level_2: { mode: 1, fanGear: 2 },
    level_3: { mode: 1, fanGear: 3 },
    auto: { mode: 2 },
    sleep: { mode: 3 },
    pet: { mode: 4 },
  }[preset] as AirPurifierAPIMode
}
