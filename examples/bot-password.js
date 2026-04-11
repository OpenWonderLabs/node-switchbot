// Bot Password Protection Example
// This example shows how to control password-protected SwitchBot Bots

import process from 'node:process'

import { SwitchBot } from 'node-switchbot'

async function main() {
  const switchbot = new SwitchBot({
    enableBLE: true,
  })

  console.log('Discovering password-protected Bots...')

  // Discover Bots over BLE only
  const devices = await switchbot.discover({
    scanBLE: true,
    fetchAPI: false,
    timeout: 5000,
    deviceType: 'WoHand',
  })

  if (devices.length === 0) {
    console.log('No Bots found')
    await switchbot.cleanup()
    return
  }

  const bot = devices[0]
  console.log(`Found Bot: ${bot.getId()}`)

  // Set password (4 alphanumeric characters, case-sensitive)
  bot.setPassword(process.env.SWITCHBOT_BOT_PASSWORD || 'A1b2')
  console.log('Password set: A1b2')

  // Check if password is configured
  if (bot.hasPassword()) {
    console.log('✓ Bot is password protected')
  }

  // All commands now use encrypted BLE transmission
  console.log('Pressing Bot (encrypted command)...')
  await bot.press()

  console.log('Turning Bot ON (encrypted command)...')
  await bot.turnOn()

  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000))

  console.log('Turning Bot OFF (encrypted command)...')
  await bot.turnOff()

  // Clear password if needed
  console.log('\nClearing password...')
  bot.clearPassword()
  console.log('✓ Password cleared - Bot now uses plain commands')

  // Commands now use unencrypted transmission
  await bot.press()

  // Cleanup
  await switchbot.cleanup()
  console.log('Done!')
}

// Handle errors
main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
