// Spreads unfinished steps across the days before a target date.
// Pure function so it can be tested without a browser.

const DAY = 86400000;

function toDate(iso) { return new Date(`${iso}T00:00:00.000Z`); }
function toIso(date) { return date.toISOString().slice(0, 10); }

export function daysBetween(fromIso, toIso_) {
  return Math.round((toDate(toIso_) - toDate(fromIso)) / DAY);
}

/**
 * @param {Array<{id,title,minutes,done}>} steps
 * @param {{today:string, deadline:string, dailyMinutes:number, bufferDays?:number}} opts
 */
export function buildSchedule(steps, opts) {
  const dailyMinutes = Math.max(15, Math.min(480, Number(opts.dailyMinutes) || 60));
  const todo = (steps || []).filter(s => s && !s.done);
  const needed = todo.reduce((sum, s) => sum + s.minutes, 0);
  if (!todo.length) return { days: [], fits: true, needed: 0, capacity: 0, message: 'Every step is done.' };
  if (!opts.deadline || !opts.today) {
    return { days: [], fits: true, needed, capacity: 0, message: 'Add a target date to get a day-by-day schedule.' };
  }
  const span = daysBetween(opts.today, opts.deadline);
  if (span < 0) return { days: [], fits: false, needed, capacity: 0, message: 'The target date has already passed.' };
  // Leave the last day as a buffer when there is room for it.
  const buffer = span >= 2 ? (opts.bufferDays ?? 1) : 0;
  const workDays = Math.max(1, span + 1 - buffer);
  const capacity = workDays * dailyMinutes;

  const days = [];
  let dayIndex = 0;
  let used = 0;
  for (const step of todo) {
    let remaining = step.minutes;
    while (remaining > 0) {
      if (dayIndex >= workDays) break;
      if (!days[dayIndex]) days[dayIndex] = { date: toIso(new Date(toDate(opts.today).getTime() + dayIndex * DAY)), minutes: 0, items: [] };
      const room = dailyMinutes - used;
      const chunk = Math.min(room, remaining);
      if (chunk > 0) {
        days[dayIndex].items.push({ id: step.id, title: step.title, minutes: chunk, partial: chunk < step.minutes });
        days[dayIndex].minutes += chunk;
        remaining -= chunk; used += chunk;
      }
      if (used >= dailyMinutes) { dayIndex += 1; used = 0; }
    }
    if (remaining > 0) break;
  }
  const scheduled = days.reduce((s, d) => s + d.minutes, 0);
  const fits = scheduled >= needed;
  const message = fits
    ? `About ${Math.ceil(needed / 60 * 10) / 10} hours of work over ${days.length} day${days.length === 1 ? '' : 's'}${buffer ? ', with the last day kept free as a buffer' : ''}.`
    : `This plan needs ${needed} minutes but only ${capacity} fit before the target date at ${dailyMinutes} min/day. Raise your daily time, trim steps, or move the date.`;
  return { days, fits, needed, capacity, message };
}
