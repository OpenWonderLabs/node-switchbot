/**
 * BLE-Only Example - SwitchBot v4.0.0
 *
 * This example shows how to use BLE without OpenAPI credentials.
 * Works on macOS and Linux.
 */

import { LogLevel, SwitchBot } from 'node-switchbot'

async function main() {
  // Create SwitchBot instance in BLE-only mode
  const switchbot = new SwitchBot({
    enableBLE: true,
    enableFallback: false,
    logLevel: LogLevel.INFO,
    // No token/secret needed for BLE-only mode
  })

  if (!switchbot.isBLEAvailable()) {
    console.error('BLE not available on this platform')
    return
  }

  try {
    console.log('Scanning for BLE devices...')

    // Discover devices via BLE only
    const devices = await switchbot.discover({
      scanBLE: true,
      fetchAPI: false,
      timeout: 10000,
    })

    console.log(`Found ${devices.length} BLE devices`)

    for (const device of devices) {
      const info = device.getInfo()
      console.log(`
Device: ${info.name}
  Type: ${info.deviceType}
  MAC: ${info.mac}
  Battery: ${info.battery}%
  RSSI: ${info.rssi} dBm
      `)

      // Example: Control a Bot
      if (info.deviceType === 'WoHand') {
        console.log('Pressing bot...')
        await device.press()
      }
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
  } finally {
    await switchbot.cleanup()
  }
}

main()
