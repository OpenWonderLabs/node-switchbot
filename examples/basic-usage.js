/**
 * Basic Usage Example - SwitchBot v4.0.0
 *
 * This example shows how to use the unified SwitchBot class
 * with automatic BLE/API discovery and fallback.
 */

import process from 'node:process'

import { LogLevel, SwitchBot } from 'node-switchbot'

async function main() {
  // Create SwitchBot instance with OpenAPI credentials
  // BLE will be used when available, with automatic API fallback
  const switchbot = new SwitchBot({
    token: process.env.SWITCHBOT_TOKEN || '',
    secret: process.env.SWITCHBOT_SECRET || '',
    enableBLE: true,
    enableFallback: true,
    logLevel: LogLevel.INFO,
  })

  try {
    // Discover all devices (BLE + API)
    console.log('Discovering devices...')
    const devices = await switchbot.discover({
      scanBLE: true,
      fetchAPI: true,
      timeout: 10000,
    })

    console.log(`Found ${devices.length} devices`)

    // Access devices via device manager
    const bot = switchbot.devices.get('YOUR_DEVICE_ID')
    if (bot) {
      console.log(`Device: ${bot.getName()}`)

      // Control the device (automatically uses BLE or API)
      await bot.press()
      console.log('Bot pressed!')

      // Get device status
      const status = await bot.getStatus()
      console.log('Status:', status)
    }

    // List all discovered devices
    const allDevices = switchbot.devices.list()
    for (const device of allDevices) {
      console.log(`- ${device.getName()} (${device.getDeviceType()})`)
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
  } finally {
    // Cleanup
    await switchbot.cleanup()
  }
}

main()
