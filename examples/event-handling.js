/**
 * Event Handling Example - SwitchBot v4.0.0
 *
 * This example shows how to listen to events during discovery and operation
 */

import process from 'node:process'

import { LogLevel, SwitchBot } from 'node-switchbot'

async function main() {
  const switchbot = new SwitchBot({
    token: process.env.SWITCHBOT_TOKEN || '',
    secret: process.env.SWITCHBOT_SECRET || '',
    enableBLE: true,
    logLevel: LogLevel.WARN,
  })

  // Listen for device discovery events
  switchbot.on('device-discovered', (device) => {
    const info = device.getInfo()
    console.log(`✓ Discovered: ${info.name} (${info.deviceType})`)

    // Listen for command events on each device
    device.on('command', (event) => {
      console.log(`  → Command via ${event.type}: ${event.success ? 'success' : 'failed'}`)
    })

    // Listen for errors on each device
    device.on('error', (event) => {
      console.error(`  ✗ Error via ${event.type}:`, event.error.message)
    })
  })

  // Listen for errors during discovery
  switchbot.on('error', (error) => {
    console.error('SwitchBot error:', error.message)
  })

  try {
    console.log('Starting discovery...')

    // Start discovery
    const devices = await switchbot.discover({
      scanBLE: true,
      fetchAPI: true,
      timeout: 15000,
    })

    console.log(`\nDiscovery complete: ${devices.length} devices found\n`)

    // Test commands and observe events
    for (const device of devices) {
      const type = device.getDeviceType()

      console.log(`Testing ${device.getName()}...`)

      try {
        if (type === 'WoHand') {
          await device.press()
        } else if (type === 'WoCurtain') {
          const status = await device.getStatus()
          console.log(`  Current position: ${status.position}%`)
        }
      } catch {
        // Already logged via event listener
      }
    }
  } catch (error) {
    console.error('Discovery error:', error instanceof Error ? error.message : error)
  } finally {
    await switchbot.cleanup()
  }
}

main()
