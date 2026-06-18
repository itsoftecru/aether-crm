import { INITIAL_SETTINGS } from '@/lib/crmRepository';
import type { Client, CrmSettings, Deal, DealStatus, DocumentKind } from '@/types/crm';

const DOCUMENT_TITLES: Record<DocumentKind, string> = { proposal: 'Коммерческое предложение', contract: 'Договор', invoice: 'Счёт', completionAct: 'Акт выполненных работ' };

export function formatMoney(amount: number, moneySettings = INITIAL_SETTINGS.money): string {
  const roundingIncrement = Math.max(1, Number(moneySettings.roundingIncrement) || 1);
  const roundedAmount = Math.round((Number(amount) || 0) / roundingIncrement) * roundingIncrement;
  return new Intl.NumberFormat(moneySettings.locale, { style: 'currency', currency: moneySettings.currency, minimumFractionDigits: moneySettings.minimumFractionDigits, maximumFractionDigits: moneySettings.maximumFractionDigits }).format(roundedAmount);
}

export function formatDateTime(value: string): string { return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
export function formatDate(value: string): string { return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T00:00:00.000Z`)); }
export function formatPercent(value: number): string { return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value)}%`; }

export function generateDocumentText(deal: Deal, client: Client, kind: DocumentKind, settings: CrmSettings, statusTitles: Record<DealStatus, string>): string {
  const template = settings.documentTemplates.find((documentTemplate) => documentTemplate.id === kind);
  const documentTitle = template?.title ?? DOCUMENT_TITLES[kind];
  const generatedAt = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date());
  return [documentTitle.toUpperCase(), '', `Номер сделки: ${deal.id}`, `Дата формирования: ${generatedAt}`, '', 'Данные клиента', `Клиент: ${client.name}`, `Компания: ${client.company}`, `Телефон: ${client.phone}`, `Email: ${client.email}`, `Адрес: ${client.address}`, '', 'Данные сделки', `Название: ${deal.title}`, `Статус: ${statusTitles[deal.status] ?? deal.status}`, `Ответственный: ${deal.owner}`, `Дата создания: ${deal.createdAt}`, `Плановый срок: ${deal.dueDate}`, `Выручка: ${formatMoney(deal.revenueAmount, settings.money)}`, '', 'Описание и примечания', deal.notes, '', 'Реквизиты компании', `Компания: ${settings.company.legalName}`, `ИНН/КПП: ${settings.company.inn} / ${settings.company.kpp}`, `Банк: ${settings.company.bankName}, БИК ${settings.company.bik}`, `Расчётный счёт: ${settings.company.checkingAccount}`, '', template?.body.replaceAll('{{dealTitle}}', deal.title).replaceAll('{{clientName}}', client.name).replaceAll('{{revenue}}', formatMoney(deal.revenueAmount, settings.money)).replaceAll('{{dealId}}', deal.id).replaceAll('{{companyLegalName}}', settings.company.legalName) ?? '', '', 'Документ сформирован автоматически в AetherCRM.'].join('\n');
}
