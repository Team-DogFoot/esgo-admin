const CURRENCY_FORMAT = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
});

const NUMBER_FORMAT = new Intl.NumberFormat("ko-KR");

export function formatCurrency(value: number): string {
  return CURRENCY_FORMAT.format(value);
}

export function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(value);
}

export function formatFileSize(bytes: number | bigint): string {
  const num = typeof bytes === "bigint" ? Number(bytes) : bytes;
  if (num === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(num) / Math.log(1024));
  const size = num / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.floor(seconds / 60);
  const remainSec = seconds % 60;
  if (minutes < 60) return `${minutes}분 ${remainSec}초`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  return `${hours}시간 ${remainMin}분`;
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - target.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}주 전`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}개월 전`;
  return `${Math.floor(diffDay / 365)}년 전`;
}
