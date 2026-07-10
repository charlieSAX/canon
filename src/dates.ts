// All dates are device-local YYYY-MM-DD strings. toISOString is UTC and is
// banned here; it silently shifts the date every evening.

let override: string | null = null

export function initTestHooks(onChange: () => void): void {
  if (new URLSearchParams(window.location.search).get('test') === '1') {
    ;(window as unknown as Record<string, unknown>).__canonSetDate = (d: string) => {
      override = d
      onChange()
    }
  }
}

export function fromDate(n: Date): string {
  const y = n.getFullYear()
  const m = String(n.getMonth() + 1).padStart(2, '0')
  const d = String(n.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayStr(): string {
  if (override) return override
  return fromDate(new Date())
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return fromDate(new Date(y, m - 1, d + n))
}
