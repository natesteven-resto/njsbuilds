// ── Sunrise / sunset (NOAA-style sunrise equation) ───────────────────────────
// Good to about a minute, which is plenty for "legal shooting light" planning.

const RAD = Math.PI / 180

function toJulian(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5
}

function fromJulian(j: number): Date {
  return new Date((j - 2440587.5) * 86400000)
}

export interface SunTimes {
  sunrise: Date
  sunset: Date
  legalLight: Date // 30 min before sunrise
}

/**
 * @param dateISO  'YYYY-MM-DD' — the local calendar day in Kansas
 * @param lat      degrees north
 * @param lon      degrees east (Kansas is negative)
 */
export function sunTimes(dateISO: string, lat: number, lon: number): SunTimes | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO)
  if (!m) return null
  // Local noon in Kansas (CST, which is in force on opener; CDT off-by-one hour does not change the day)
  const noon = new Date(`${dateISO}T12:00:00-06:00`)
  if (Number.isNaN(noon.getTime())) return null

  const n = Math.round(toJulian(noon) - 2451545.0 + 0.0008)
  // Mean solar noon: west longitudes (negative) push solar noon later in UTC
  const jStar = n - lon / 360
  const M = ((357.5291 + 0.98560028 * jStar) % 360 + 360) % 360
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD)
  const lambda = ((M + C + 180 + 102.9372) % 360 + 360) % 360
  const jTransit = 2451545.0 + jStar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD)
  const sinDelta = Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD)
  const delta = Math.asin(sinDelta)
  const cosOmega =
    (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * sinDelta) / (Math.cos(lat * RAD) * Math.cos(delta))
  if (cosOmega < -1 || cosOmega > 1) return null
  const omega = Math.acos(cosOmega) / RAD
  const jRise = jTransit - omega / 360
  const jSet = jTransit + omega / 360
  const sunrise = fromJulian(jRise)
  const sunset = fromJulian(jSet)
  return { sunrise, sunset, legalLight: new Date(sunrise.getTime() - 30 * 60000) }
}

export function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' })
}

export function fmtDate(dateISO: string): string {
  const d = new Date(`${dateISO}T12:00:00-06:00`)
  if (Number.isNaN(d.getTime())) return dateISO
  return d.toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
