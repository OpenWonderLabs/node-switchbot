/**
 * BLE-Only Example - SwitchBot v4.0.0
 *
 * This example shows how to use BLE without OpenAPI credentials.
 * Works on Linux-based systems only (Raspbian, Ubuntu, etc.)
 */

import { SwitchBot } from 'node-switchbot'

async function main() {
  // Create SwitchBot instance in BLE-only mode
  const switchbot = new SwitchBot({
    enableBLE: true,
    logLevel: 3,
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
      duration: 10000,
      quick: false, // false = wait for full scan duration
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
    console.error('Error:', error.message)
  } finally {
    await switchbot.cleanup()
  }
}

main()
