// Bot Password Protection Example
// This example shows how to control password-protected SwitchBot Bots

import { SwitchBot, WoHand } from 'node-switchbot'

async function main() {
  const switchbot = new SwitchBot({
    enableBLE: true,
  })

  console.log('Discovering password-protected Bots...')

  // Method 1: Set password during device discovery
  const devices = await switchbot.discover({
    model: 'H', // Bot only
    duration: 5000,
  })

  if (devices.length === 0) {
    console.log('No Bots found')
    await switchbot.cleanup()
    return
  }

  const bot = devices[0] as WoHand
  console.log(`Found Bot: ${bot.id}`)

  // Set password (4 alphanumeric characters, case-sensitive)
  await bot.setPassword('A1b2')
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

  // Method 2: Create Bot with password directly
  const protectedBot = new WoHand({
    id: 'c1:2e:45:3e:20:08',
    password: 'MyP4', // Set password during construction
  })

  console.log('\nUsing directly-instantiated password-protected Bot...')
  await protectedBot.press()

  // Clear password if needed
  console.log('\nClearing password...')
  await bot.clearPassword()
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
