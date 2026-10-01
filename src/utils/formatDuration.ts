export const formatDuration = (totalSeconds: number | null | undefined): string => {
  if (totalSeconds == null || isNaN(totalSeconds)) return '';
  const total = Math.max(0, Math.round(Number(totalSeconds)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

export const splitDuration = (
  totalSeconds: number | null | undefined
): { minutes: string; seconds: string } => {
  if (totalSeconds == null || isNaN(totalSeconds)) return { minutes: '', seconds: '' };
  const total = Math.max(0, Math.round(Number(totalSeconds)));
  return { minutes: String(Math.floor(total / 60)), seconds: String(total % 60) };
};

export const toTotalSeconds = (
  minutes: string | number | null | undefined,
  seconds: string | number | null | undefined
): number | undefined => {
  const m = parseInt(String(minutes ?? ''), 10);
  const s = parseInt(String(seconds ?? ''), 10);
  const total = (isNaN(m) ? 0 : m) * 60 + (isNaN(s) ? 0 : s);
  return total > 0 ? total : undefined;
};
