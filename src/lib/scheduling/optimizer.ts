import type { Service } from '@/types/database'

interface TimeSlot {
  start: string // HH:MM
  end: string   // HH:MM
}

interface Gap {
  start: string
  end: string
  minutes: number
  suggestedServices: string[]
}

/**
 * Find gaps between appointments and suggest services that fit
 */
export function findGaps(
  appointments: { start_time: string; end_time: string }[],
  services: Service[],
  businessStart: string = '09:00',
  businessEnd: string = '20:00'
): Gap[] {
  if (appointments.length === 0) return []

  // Sort appointments by start time
  const sorted = [...appointments].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )

  const gaps: Gap[] = []

  // Check gap before first appointment
  const firstStart = toMinutes(formatTime(sorted[0].start_time))
  const dayStart = toMinutes(businessStart)
  if (firstStart - dayStart >= 15) {
    const gapMinutes = firstStart - dayStart
    gaps.push({
      start: businessStart,
      end: formatTime(sorted[0].start_time),
      minutes: gapMinutes,
      suggestedServices: findFittingServices(services, gapMinutes),
    })
  }

  // Check gaps between appointments
  for (let i = 0; i < sorted.length - 1; i++) {
    const currentEnd = toMinutes(formatTime(sorted[i].end_time))
    const nextStart = toMinutes(formatTime(sorted[i + 1].start_time))
    const gapMinutes = nextStart - currentEnd

    if (gapMinutes >= 15) {
      gaps.push({
        start: formatTime(sorted[i].end_time),
        end: formatTime(sorted[i + 1].start_time),
        minutes: gapMinutes,
        suggestedServices: findFittingServices(services, gapMinutes),
      })
    }
  }

  // Check gap after last appointment
  const lastEnd = toMinutes(formatTime(sorted[sorted.length - 1].end_time))
  const dayEnd = toMinutes(businessEnd)
  if (dayEnd - lastEnd >= 15) {
    const gapMinutes = dayEnd - lastEnd
    gaps.push({
      start: formatTime(sorted[sorted.length - 1].end_time),
      end: businessEnd,
      minutes: gapMinutes,
      suggestedServices: findFittingServices(services, gapMinutes),
    })
  }

  return gaps
}

/**
 * Score a proposed time slot — lower is better (fewer dead minutes created)
 */
export function scoreSlot(
  proposedStart: string,
  proposedEnd: string,
  existingAppointments: { start_time: string; end_time: string }[],
  businessStart: string = '09:00',
  businessEnd: string = '20:00'
): number {
  // Add the proposed slot and recalculate gaps
  const withProposed = [
    ...existingAppointments,
    { start_time: proposedStart, end_time: proposedEnd },
  ]
  const dummyServices: Service[] = []
  const gaps = findGaps(withProposed, dummyServices, businessStart, businessEnd)

  // Penalize small unusable gaps (< 15 min)
  let penalty = 0
  for (const gap of gaps) {
    if (gap.minutes < 15) {
      penalty += 15 - gap.minutes // smaller gaps = bigger penalty
    }
  }

  return penalty
}

function findFittingServices(services: Service[], gapMinutes: number): string[] {
  return services
    .filter((s) => s.duration_minutes <= gapMinutes && s.is_active)
    .sort((a, b) => b.duration_minutes - a.duration_minutes) // prefer longer services (fills more of the gap)
    .slice(0, 3)
    .map((s) => `${s.name} (${s.duration_minutes}min)`)
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
