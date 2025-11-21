const MS_IN_SECOND = 1000;
const MS_IN_MINUTE = MS_IN_SECOND * 60;
const MS_IN_HOUR = MS_IN_MINUTE * 60;
const MS_IN_DAY = MS_IN_HOUR * 24;
const MS_IN_WEEK = MS_IN_DAY * 7;
const MS_IN_MONTH = MS_IN_DAY * 30;
const MS_IN_YEAR = MS_IN_DAY * 365;

const UNITS = [
  { unit: 'year' as const, ms: MS_IN_YEAR },
  { unit: 'month' as const, ms: MS_IN_MONTH },
  { unit: 'week' as const, ms: MS_IN_WEEK },
  { unit: 'day' as const, ms: MS_IN_DAY },
  { unit: 'hour' as const, ms: MS_IN_HOUR },
  { unit: 'minute' as const, ms: MS_IN_MINUTE },
  { unit: 'second' as const, ms: MS_IN_SECOND },
];

export type TimeUnit = (typeof UNITS)[number]['unit'];

export interface FormatRelativeTimeOptions {
  locale?: string;
  numeric?: Intl.RelativeTimeFormatNumeric;
  style?: Intl.RelativeTimeFormatStyle;
  now?: Date | number | string;
  minimalUnit?: TimeUnit;
}

const DEFAULT_MINIMAL_UNIT: TimeUnit = 'second';
const SHORT_SUFFIX: Record<TimeUnit, string> = {
  year: 'a',
  month: 'mes',
  week: 'sem',
  day: 'd',
  hour: 'h',
  minute: 'min',
  second: 's',
};

const isValidDate = (value: Date) => !Number.isNaN(value.getTime());

const capitalize = (value: string, locale: string) => {
  if (!value) return value;
  return value.charAt(0).toLocaleUpperCase(locale) + value.slice(1);
};

/**
 * Devuelve un string relativo tipo "hace 2 días" o "dentro de 3 horas".
 * Se usa en bandejas y notificaciones para mantener un estilo coherente.
 */
export function formatRelativeTime(
  input: Date | number | string,
  {
    locale = 'es',
    numeric = 'auto',
    style = 'long',
    now = new Date(),
    minimalUnit = DEFAULT_MINIMAL_UNIT,
  }: FormatRelativeTimeOptions = {},
): string {
  const target = new Date(input);
  const reference = new Date(now);

  if (!isValidDate(target) || !isValidDate(reference)) {
    return '';
  }

  const diff = target.getTime() - reference.getTime();
  const absDiff = Math.abs(diff);

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric, style });
  const formatValue = (value: number, unit: TimeUnit) =>
    capitalize(formatter.format(value, unit), locale);

  for (const { unit, ms } of UNITS) {
    if (
      absDiff >= ms ||
      unit === minimalUnit ||
      UNITS.every((item) => absDiff < item.ms)
    ) {
      const value = Math.round(diff / ms);
      if (value === 0) {
        return formatValue(0, unit);
      }
      return formatValue(value, unit);
    }

    if (unit === minimalUnit) {
      break;
    }
  }

  return formatValue(0, minimalUnit);
}

/**
 * Versión compacta para UI: 5min, 3h, 1d, 2sem, 4mes, 1a
 */
export function formatRelativeTimeShort(
  input: Date | number | string,
  { now = new Date(), minimalUnit = 'second' as TimeUnit }: Pick<FormatRelativeTimeOptions, 'now' | 'minimalUnit'> = {},
): string {
  const target = new Date(input);
  const reference = new Date(now);
  if (!isValidDate(target) || !isValidDate(reference)) {
    return '';
  }

  const diff = reference.getTime() - target.getTime();
  const absDiff = Math.abs(diff);

  for (const { unit, ms } of UNITS) {
    if (
      absDiff >= ms ||
      unit === minimalUnit ||
      UNITS.every((item) => absDiff < item.ms)
    ) {
      const value = Math.max(1, Math.round(absDiff / ms));
      const suffix = SHORT_SUFFIX[unit] ?? unit.charAt(0);
      return `${value}${suffix}`;
    }

    if (unit === minimalUnit) {
      break;
    }
  }

  const fallbackSuffix = SHORT_SUFFIX[minimalUnit] ?? minimalUnit.charAt(0);
  return `0${fallbackSuffix}`;
}

