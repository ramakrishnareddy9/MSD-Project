const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const startOfWeekMonday = (date) => {
  const value = startOfDay(date);
  const day = value.getDay();
  const daysSinceMonday = (day + 6) % 7;
  value.setDate(value.getDate() - daysSinceMonday);
  return value;
};

const startOfMonth = (date) => {
  const value = startOfDay(date);
  value.setDate(1);
  return value;
};

export const isPayoutCycleDue = (cycle, date = new Date()) => {
  const day = new Date(date).getDay();
  const dayOfMonth = new Date(date).getDate();

  if (cycle === 'weekly') {
    return day === 1;
  }

  if (cycle === 'monthly') {
    return dayOfMonth === 1;
  }

  return false;
};

export const getPayoutPeriodWindow = (cycle, date = new Date()) => {
  const now = new Date(date);

  if (cycle === 'weekly') {
    if (!isPayoutCycleDue(cycle, now)) {
      return null;
    }

    const periodEnd = startOfWeekMonday(now);
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 7);

    return { periodStart, periodEnd };
  }

  if (cycle === 'monthly') {
    if (!isPayoutCycleDue(cycle, now)) {
      return null;
    }

    const periodEnd = startOfMonth(now);
    const periodStart = new Date(periodEnd);
    periodStart.setMonth(periodStart.getMonth() - 1);

    return { periodStart, periodEnd };
  }

  return null;
};

export const getCycleLabel = (cycle) => {
  if (cycle === 'weekly') return 'Weekly';
  if (cycle === 'monthly') return 'Monthly';
  return 'Unknown';
};

export const formatPeriodKey = (periodStart, periodEnd) => {
  const start = new Date(periodStart).toISOString();
  const end = new Date(periodEnd).toISOString();
  return `${start}_${end}`;
};
