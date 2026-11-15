function createConnectionCache(ttlMs) {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new RangeError('ttlMs must be a positive finite number')
  }

  let available = null
  let checkedAt = 0

  return {
    read(now = Date.now()) {
      const isFresh = available !== null && now >= checkedAt && now - checkedAt < ttlMs
      return {
        fromCache: isFresh,
        available: isFresh ? available : false,
      }
    },
    markAvailable(now = Date.now()) {
      available = true
      checkedAt = now
    },
    markUnavailable(now = Date.now()) {
      available = false
      checkedAt = now
    },
  }
}

module.exports = { createConnectionCache }