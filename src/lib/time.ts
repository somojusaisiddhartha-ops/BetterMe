import { IST_TIME_ZONE } from "@/lib/constants";

const DAY_CODE_BY_WEEKDAY: Record<string, string> = {
  Mon: "M",
  Tue: "Tu",
  Wed: "W",
  Thu: "Th",
  Fri: "F",
  Sat: "Sa",
  Sun: "Su",
};

export function getIstDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getIstWeekdayCode(date = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIME_ZONE,
    weekday: "short",
  }).format(date);

  return DAY_CODE_BY_WEEKDAY[weekday] ?? "M";
}

export function getIstHour(date = new Date()) {
  const hourPart = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    hour12: false,
    timeZone: IST_TIME_ZONE,
  })
    .formatToParts(date)
    .find((part) => part.type === "hour")?.value;

  return Number(hourPart ?? "0");
}

export function getIstGreeting(date = new Date()) {
  const hour = getIstHour(date);

  if (hour >= 5 && hour < 12) {
    return "Good morning";
  }

  if (hour >= 12 && hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

function parseDate(dateString: string) {
  return new Date(`${dateString}T00:00:00.000Z`);
}

function getWeekStart(dateString: string) {
  const date = parseDate(dateString);
  const dayOfWeek = date.getUTCDay();
  const diffToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(date);

  monday.setUTCDate(date.getUTCDate() - diffToMonday);

  return monday;
}

export function isSameIsoWeek(leftDate: string, rightDate: string) {
  const leftWeekStart = getWeekStart(leftDate).toISOString().slice(0, 10);
  const rightWeekStart = getWeekStart(rightDate).toISOString().slice(0, 10);

  return leftWeekStart === rightWeekStart;
}

export function getIstWeekDates(date = new Date()) {
  const today = getIstDateString(date);
  const weekStart = getWeekStart(today);
  const result: string[] = [];

  for (let index = 0; index < 7; index += 1) {
    const day = new Date(weekStart);
    day.setUTCDate(weekStart.getUTCDate() + index);
    result.push(day.toISOString().slice(0, 10));
  }

  return result;
}

export function getLastNDatesInIst(n: number, endDate = new Date()) {
  const result: string[] = [];
  const today = getIstDateString(endDate);
  const end = parseDate(today);

  for (let index = n - 1; index >= 0; index -= 1) {
    const copy = new Date(end);
    copy.setUTCDate(end.getUTCDate() - index);
    result.push(copy.toISOString().slice(0, 10));
  }

  return result;
}
