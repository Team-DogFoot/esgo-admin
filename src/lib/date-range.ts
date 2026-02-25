interface DateRangeFilter {
  gte: Date;
  lt?: Date;
}

export function getDateRangeFilter(
  dateRange: string | undefined,
): DateRangeFilter | undefined {
  if (!dateRange || dateRange === "all") return undefined;

  const now = new Date();
  switch (dateRange) {
    case "this_month":
      return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    case "last_month":
      return {
        gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        lt: new Date(now.getFullYear(), now.getMonth(), 1),
      };
    case "3_months":
      return { gte: new Date(now.getFullYear(), now.getMonth() - 3, 1) };
    default:
      return undefined;
  }
}
