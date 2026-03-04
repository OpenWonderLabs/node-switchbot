/**
 * API-Only Example - SwitchBot v4.0.0
 *
 * This example shows how to use OpenAPI without BLE.
 * Works on any platform (Windows, macOS, Linux)
 */

import { SwitchBot } from 'node-switchbot'

async function main() {
  // Create SwitchBot instance with API-only mode
  const switchbot = new SwitchBot({
    token: 'YOUR_TOKEN_HERE',
    secret: 'YOUR_SECRET_HERE',
    enableBLE: false, // Disable BLE
    logLevel: 3,
  })

  try {
    console.log('Fetching devices from SwitchBot API...')

    // Discover devices via API only
    const devices = await switchbot.discover()

    console.log(`Found ${devices.length} devices in your account`)

    for (const device of devices) {
      const info = device.getInfo()
      console.log(`
Device: ${info.name}
  Type: ${info.deviceType}
  ID: ${info.id}
  Cloud Enabled: ${info.cloudServiceEnabled ? 'Yes' : 'No'}
      `)
    }

    // Example: Control a specific device by ID
    const curtain = switchbot.devices.get('YOUR_CURTAIN_ID')
    if (curtain) {
      console.log('Opening curtain...')
      await curtain.open()

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Get status
      const status = await curtain.getStatus()
      console.log('Curtain position:', status.position, '%')
    }

    // Example: Get all devices of a specific type
    const allDevices = switchbot.devices.list()
    const bots = allDevices.filter(d => d.getDeviceType() === 'WoHand')
    console.log(`\nFound ${bots.length} Bot(s)`)
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await switchbot.cleanup()
  }
}

main()
