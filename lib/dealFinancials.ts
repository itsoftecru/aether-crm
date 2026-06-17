import type { DealCostCategory, DealCostItem, DealFinancials } from '@/types/crm';

export const DEAL_COST_CATEGORIES: DealCostCategory[] = [
  'rawMaterial',
  'factoryLoading',
  'workshopDelivery',
  'employeeLabor',
  'paintShopLogistics',
  'painting',
  'other',
];

export const DEAL_COST_CATEGORY_TITLES: Record<DealCostCategory, string> = {
  rawMaterial: 'Покупка сырья',
  factoryLoading: 'Паллеты и заводская отгрузка',
  workshopDelivery: 'Доставка до цеха',
  employeeLabor: 'Работа сотрудников',
  paintShopLogistics: 'Логистика до цеха покраски',
  painting: 'Стоимость покраски',
  other: 'Прочие расходы',
};

export function createEmptyDealFinancials(): DealFinancials {
  return DEAL_COST_CATEGORIES.reduce((financials, category) => ({
    ...financials,
    [category]: [],
  }), {} as DealFinancials);
}

export function calculateDealCostItemTotal(item: DealCostItem): number {
  if (item.category === 'employeeLabor') {
    return Math.max(0, Number(item.hours) || 0) * Math.max(0, Number(item.hourlyRate) || 0);
  }

  return Math.max(0, Number(item.amount) || 0);
}

export function calculateDealExpenses(financials: DealFinancials): number {
  return DEAL_COST_CATEGORIES.reduce((total, category) => {
    const items = financials[category] ?? [];
    return total + items.reduce((categoryTotal, item) => categoryTotal + calculateDealCostItemTotal(item), 0);
  }, 0);
}

export function calculateDealNetProfit(revenue: number, financials: DealFinancials): number {
  return Math.max(0, Number(revenue) || 0) - calculateDealExpenses(financials);
}

export function calculateDealMarginPercent(revenue: number, netProfit: number): number {
  const normalizedRevenue = Number(revenue) || 0;

  if (normalizedRevenue <= 0) {
    return 0;
  }

  return (netProfit / normalizedRevenue) * 100;
}
