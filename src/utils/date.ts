/**
 * Gets current ISO 8601 timestamp string in local time format.
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Gets start and end ISO strings for "today" in local device time.
 */
export function getTodayDateRange(): { startISO: string; endISO: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  };
}

/**
 * Gets start and end ISO strings for "this week" (starting Sunday/Saturday).
 */
export function getThisWeekDateRange(): { startISO: string; endISO: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  };
}

/**
 * Gets start and end ISO strings for "this month".
 */
export function getThisMonthDateRange(): { startISO: string; endISO: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  };
}

/**
 * Formats ISO string into localized Arabic date and time string.
 * Example: "8 أكتوبر 2026، 05:30 م"
 */
export function formatDateArabic(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch (e) {
    return isoString;
  }
}

/**
 * Formats ISO string into short date string.
 * Example: "08/10/2026"
 */
export function formatDateShort(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch (e) {
    return isoString;
  }
}
