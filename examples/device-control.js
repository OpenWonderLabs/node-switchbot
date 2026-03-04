/**
 * Device Control Examples - SwitchBot v4.0.0
 *
 * This example demonstrates controlling various SwitchBot devices
 */

import process from 'node:process'

import { LogLevel, SwitchBot } from 'node-switchbot'

async function main() {
  const switchbot = new SwitchBot({
    token: process.env.SWITCHBOT_TOKEN || '',
    secret: process.env.SWITCHBOT_SECRET || '',
    enableBLE: true,
    enableFallback: true,
    logLevel: LogLevel.INFO,
  })

  try {
    // Discover all devices
    await switchbot.discover({
      scanBLE: true,
      fetchAPI: true,
      timeout: 10000,
    })

    // Bot (WoHand) - Press/Switch mode control
    const bot = switchbot.devices.get('YOUR_BOT_ID')
    if (bot) {
      await bot.turnOn() // Switch mode: turn on
      await bot.turnOff() // Switch mode: turn off
      await bot.press() // Press mode: trigger press
    }

    // Curtain - Position control
    const curtain = switchbot.devices.get('YOUR_CURTAIN_ID')
    if (curtain) {
      await curtain.open() // Fully open
      await curtain.close() // Fully close
      await curtain.pause() // Stop movement
      await curtain.setPosition(50) // Set to 50% open

      const status = await curtain.getStatus()
      console.log('Curtain position:', status.position)
    }

    // Lock - Lock/Unlock control
    const lock = switchbot.devices.get('YOUR_LOCK_ID')
    if (lock) {
      await lock.lock() // Lock the door
      await lock.unlock() // Unlock the door

      const status = await lock.getStatus()
      console.log('Lock state:', status.lockState)
    }

    // Bulb - Color and brightness control
    const bulb = switchbot.devices.get('YOUR_BULB_ID')
    if (bulb) {
      await bulb.turnOn()
      await bulb.setBrightness(80) // 80% brightness
      await bulb.setColorTemperature(4000) // 4000K
      await bulb.setColor(255, 0, 0) // Red color
      await bulb.turnOff()
    }

    // Plug - On/Off/Toggle
    const plug = switchbot.devices.get('YOUR_PLUG_ID')
    if (plug) {
      await plug.turnOn()
      await plug.turnOff()
      await plug.toggle() // Toggle current state
    }

    // Meter - Read temperature/humidity
    const meter = switchbot.devices.get('YOUR_METER_ID')
    if (meter) {
      const status = await meter.getStatus()
      console.log(`Temperature: ${status.temperature}°C`)
      console.log(`Humidity: ${status.humidity}%`)
    }

    // Humidifier - Mode and efficiency control
    const humidifier = switchbot.devices.get('YOUR_HUMIDIFIER_ID')
    if (humidifier) {
      await humidifier.turnOn()
      await humidifier.setMode('auto') // auto, manual
      await humidifier.setEfficiency(75) // target humidity level / efficiency
      await humidifier.turnOff()
    }

    // Air Purifier - Fan speed and mode
    const purifier = switchbot.devices.get('YOUR_PURIFIER_ID')
    if (purifier) {
      await purifier.turnOn()
      await purifier.setMode('auto') // auto, manual, sleep
      await purifier.setFanSpeed(3) // 1-4
      await purifier.turnOff()
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
  } finally {
    await switchbot.cleanup()
  }
}

main()
