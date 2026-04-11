/**
 * TypeScript Usage Example - SwitchBot v4.0.0
 *
 * This example demonstrates type-safe usage with TypeScript
 */

import type { BotStatus, CurtainStatus, LockStatus, MeterStatus, SwitchBotConfig, SwitchBotDevice } from 'node-switchbot'

import process from 'node:process'

import { LogLevel, SwitchBot } from 'node-switchbot'

async function main(): Promise<void> {
  // Type-safe configuration
  const config: SwitchBotConfig = {
    token: process.env.SWITCHBOT_TOKEN || '',
    secret: process.env.SWITCHBOT_SECRET || '',
    enableBLE: true,
    enableFallback: true,
    logLevel: LogLevel.INFO,
  }

  const switchbot = new SwitchBot(config)

  try {
    // Discover with type-safe options
    const devices = await switchbot.discover({ scanBLE: true, fetchAPI: true, timeout: 10000 })

    console.log(`Found ${devices.length} devices`)

    // Type-safe device access
    for (const device of devices) {
      const deviceType = device.getDeviceType()
      const deviceName = device.getName()

      console.log(`\nDevice: ${deviceName} (${deviceType})`)

      // Type-specific status handling
      switch (deviceType) {
        case 'WoHand': {
          const status = await device.getStatus() as BotStatus
          console.log(`  Power: ${status.power}`)
          console.log(`  Battery: ${status.battery}%`)
          break
        }

        case 'WoCurtain': {
          const status = await device.getStatus() as CurtainStatus
          console.log(`  Position: ${status.position}%`)
          console.log(`  Moving: ${status.moving ? 'yes' : 'no'}`)
          console.log(`  Battery: ${status.battery}%`)
          break
        }

        case 'WoSmartLock': {
          const status = await device.getStatus() as LockStatus
          console.log(`  Lock State: ${status.lockState}`)
          console.log(`  Door State: ${status.doorState || 'unknown'}`)
          console.log(`  Battery: ${status.battery}%`)
          break
        }

        case 'WoSensorTH': {
          const status = await device.getStatus() as MeterStatus
          console.log(`  Temperature: ${status.temperature}°C`)
          console.log(`  Humidity: ${status.humidity}%`)
          console.log(`  Battery: ${status.battery}%`)
          break
        }

        default:
          console.log('  (Status not handled in this example)')
      }
    }

    // Type-safe device filtering
    const allDevices = switchbot.devices.list()
    const bots = allDevices.filter((d: SwitchBotDevice) => d.getDeviceType() === 'WoHand')
    const curtains = allDevices.filter((d: SwitchBotDevice) => d.getDeviceType() === 'WoCurtain')

    console.log(`\nSummary:`)
    console.log(`  Bots: ${bots.length}`)
    console.log(`  Curtains: ${curtains.length}`)
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message)
    } else {
      console.error('Unknown error:', error)
    }
  } finally {
    await switchbot.cleanup()
  }
}

main().catch(console.error)
