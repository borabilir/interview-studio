import type { ISODateString } from "../types";

export type DateInput = Date | ISODateString | string | number;

function asDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
  locale = "en-US",
): string {
  return new Intl.DateTimeFormat(locale, options).format(asDate(value));
}

export function formatDateTime(value: DateInput, locale = "en-US"): string {
  return formatDate(
    value,
    { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
    locale,
  );
}

export function formatRelativeDate(value: DateInput, now: DateInput = new Date(), locale = "en-US"): string {
  const differenceSeconds = Math.round((asDate(value).getTime() - asDate(now).getTime()) / 1_000);
  const absoluteSeconds = Math.abs(differenceSeconds);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absoluteSeconds < 60) return formatter.format(differenceSeconds, "second");
  const minutes = Math.round(differenceSeconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return formatter.format(days, "day");
  const months = Math.round(days / 30.4375);
  if (Math.abs(months) < 12) return formatter.format(months, "month");
  return formatter.format(Math.round(months / 12), "year");
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function isSameDay(left: DateInput, right: DateInput): boolean {
  const a = asDate(left);
  const b = asDate(right);
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

export function isToday(value: DateInput): boolean {
  return isSameDay(value, new Date());
}

export function toDateKey(value: DateInput): string {
  const date = asDate(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function sortByNewest<T>(items: readonly T[], selectDate: (item: T) => DateInput): T[] {
  return [...items].sort((a, b) => asDate(selectDate(b)).getTime() - asDate(selectDate(a)).getTime());
}

