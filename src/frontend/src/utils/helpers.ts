// Date formatting helpers
export function formatDate(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

export function parseDate(ddmmyyyy: string): string {
  if (!ddmmyyyy) return "";
  const parts = ddmmyyyy.split("/");
  if (parts.length !== 3) return ddmmyyyy;
  const [d, m, y] = parts;
  return `${y}-${m}-${d}`;
}

export function addYears(isoDate: string, years: number): string {
  const date = new Date(isoDate);
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().split("T")[0];
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatINRShort(amount: number): string {
  if (Math.abs(amount) >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  }
  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  }
  if (Math.abs(amount) >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return formatINR(amount);
}

export function getInterestRate(tenure: number): number {
  if (tenure === 1) return 5;
  if (tenure === 2) return 7;
  return 10;
}

export function calcInterestAmount(
  fdAmount: number,
  rate: number,
  tenure: number,
): number {
  return fdAmount * (rate / 100) * tenure;
}

export function getWeekRange(weeksAgo = 0): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() - weeksAgo * 7);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

export function getMonthRange(monthsAgo = 0): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() - monthsAgo;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

export function getLast7DaysRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  return {
    start: start.toISOString().split("T")[0],
    end: now.toISOString().split("T")[0],
  };
}
