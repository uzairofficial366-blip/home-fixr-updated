export function formatCurrency(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null) return "PKR 0";
  const numeric = typeof amount === "number" ? amount : parseFloat(amount);
  if (isNaN(numeric)) return "PKR 0";
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
    }).format(date);
  } catch {
    return "";
  }
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "";
  }
}
