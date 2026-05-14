const MONTH_COUNT = 12;

const normalizeMonth = (value) => {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= MONTH_COUNT ? month : null;
};

export const normalizeMonthList = (values = []) => {
  return [...new Set((Array.isArray(values) ? values : []).map(normalizeMonth).filter(Boolean))].sort((a, b) => a - b);
};

export const expandHarvestWindowMonths = (harvestWindow) => {
  if (!harvestWindow) return [];

  const startMonth = normalizeMonth(harvestWindow.startMonth);
  const endMonth = normalizeMonth(harvestWindow.endMonth);
  if (!startMonth || !endMonth) return [];

  const months = [];
  let month = startMonth;
  while (true) {
    months.push(month);
    if (month === endMonth) break;
    month = month === MONTH_COUNT ? 1 : month + 1;
    if (months.length > MONTH_COUNT) break;
  }

  return months;
};

const getMonthName = (month) => {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  return monthNames[(Number(month) - 1 + MONTH_COUNT) % MONTH_COUNT] || '';
};

const matchesHarvestWindow = (harvestWindow, currentMonth) => {
  if (!harvestWindow) return false;

  const startMonth = normalizeMonth(harvestWindow.startMonth);
  const endMonth = normalizeMonth(harvestWindow.endMonth);
  if (!startMonth || !endMonth) return false;

  if (startMonth <= endMonth) {
    return currentMonth >= startMonth && currentMonth <= endMonth;
  }

  return currentMonth >= startMonth || currentMonth <= endMonth;
};

export const getSeasonalAvailability = (product, referenceDate = new Date()) => {
  const currentMonth = new Date(referenceDate).getMonth() + 1;
  const availableMonths = normalizeMonthList(product?.availableMonths);

  const harvestWindow = product?.harvestWindow;
  const inAvailableMonths = availableMonths.includes(currentMonth);
  const inHarvestWindow = matchesHarvestWindow(harvestWindow, currentMonth);

  if (inAvailableMonths || inHarvestWindow) {
    return {
      status: 'in_season',
      badgeLabel: 'In Season',
      currentMonth,
      nextAvailableMonth: null
    };
  }

  const nextAvailableMonth = availableMonths.find((month) => month > currentMonth)
    || (harvestWindow?.startMonth ? normalizeMonth(harvestWindow.startMonth) : null)
    || null;

  if (nextAvailableMonth) {
    return {
      status: 'coming_soon',
      badgeLabel: `Coming ${getMonthName(nextAvailableMonth)}`,
      currentMonth,
      nextAvailableMonth
    };
  }

  return {
    status: 'future',
    badgeLabel: 'Coming Next Year',
    currentMonth,
    nextAvailableMonth: null
  };
};

export const isSeasonalProductVisible = (product, referenceDate = new Date()) => {
  return getSeasonalAvailability(product, referenceDate).status === 'in_season';
};
