import noble from '@stoprocent/noble'

const SWITCHBOT_UUIDS = new Set(['fd3d', '0000fd3d00001000800000805f9b34fb'])
const discovered = new Map()

function normalizeUuid(uuid = '') {
  return String(uuid).toLowerCase().replace(/-/g, '')
}

function toHex(buf) {
  if (!buf) return undefined
  return Buffer.from(buf).toString('hex')
}

const timeoutMs = 12000
let finished = false

function done(reason = 'completed') {
  if (finished) return
  finished = true

  try {
    noble.stopScanning()
  } catch {}

  const devices = [...discovered.values()]
  const output = {
    reason,
    count: devices.length,
    devices,
  }

  console.log('\n=== SwitchBot BLE Scan Result ===')
  console.log(JSON.stringify(output, null, 2))
  process.exit(0)
}

noble.on('stateChange', (state) => {
  console.log(`[scan] stateChange: ${state}`)
  if (state === 'poweredOn') {
    try {
      noble.startScanning([], true)
      console.log('[scan] scanning started')
      setTimeout(() => done('scan-timeout'), timeoutMs)
    } catch (error) {
      console.error('[scan] failed to start scan', error)
      done('scan-start-failed')
    }
  }
})

noble.on('discover', (peripheral) => {
  const ad = peripheral?.advertisement || {}
  const serviceData = Array.isArray(ad.serviceData) ? ad.serviceData : []
  const switchbotServiceData = serviceData.filter(item => SWITCHBOT_UUIDS.has(normalizeUuid(item?.uuid)))
  if (!switchbotServiceData.length) {
    return
  }

  const key = peripheral?.id || peripheral?.address || `unknown-${discovered.size + 1}`
  discovered.set(key, {
    id: peripheral?.id,
    address: peripheral?.address,
    connectable: peripheral?.connectable,
    rssi: peripheral?.rssi,
    localName: ad.localName,
    serviceUuids: ad.serviceUuids,
    serviceData: switchbotServiceData.map(item => ({
      uuid: item?.uuid,
      dataHex: toHex(item?.data),
    })),
    manufacturerDataHex: toHex(ad.manufacturerData),
  })
})

setTimeout(() => {
  console.log(`[scan] timeout waiting for poweredOn state`)
  done('poweredOn-timeout')
}, timeoutMs + 5000)
