'use client';

import { useCallback, useMemo, useState } from 'react';
import { crmRepository } from '@/lib/crmRepository';
import type { Deal, Reminder, ReminderPriority } from '@/types/crm';

export type ReminderFilter = 'today' | 'overdue' | 'future';
export type ReminderFormValues = Pick<Reminder, 'title' | 'description' | 'dueAt' | 'type' | 'priority'>;

export const EMPTY_REMINDER_FORM: ReminderFormValues = { title: '', description: '', dueAt: '', type: 'task', priority: 'medium' };
export const REMINDER_TYPE_TITLES: Record<Reminder['type'], string> = { call: 'Звонок', meeting: 'Встреча', payment: 'Оплата', task: 'Задача' };
export const REMINDER_PRIORITY_TITLES: Record<ReminderPriority, string> = { low: 'Низкий', medium: 'Средний', high: 'Высокий' };

export function toDateKey(date: Date): string { return date.toISOString().slice(0, 10); }
export function getTomorrow(date: Date): Date { const tomorrow = new Date(date); tomorrow.setDate(tomorrow.getDate() + 1); return tomorrow; }
export function toLocalDateTimeInputValue(date: Date): string { return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
export function isReminderOverdue(reminder: Reminder): boolean { return !reminder.isDone && new Date(reminder.dueAt).getTime() < Date.now(); }
export function normalizeReminderFormValues(values: ReminderFormValues): ReminderFormValues { return { title: values.title.trim(), description: values.description.trim(), dueAt: values.dueAt.trim(), type: values.type, priority: values.priority }; }
export function validateReminderForm(values: ReminderFormValues): string | null { const normalized = normalizeReminderFormValues(values); if (!normalized.title) return 'Укажите название напоминания.'; if (!normalized.dueAt) return 'Укажите дату и время напоминания.'; if (Number.isNaN(new Date(normalized.dueAt).getTime())) return 'Укажите корректную дату напоминания.'; return null; }

export function useReminders(reminders: Reminder[], setReminders: React.Dispatch<React.SetStateAction<Reminder[]>>, deals: Deal[]) {
  const [reminderFilter, setReminderFilter] = useState<ReminderFilter>('today');
  const [reminderFormContext, setReminderFormContext] = useState<{ clientId: string; dealId: string } | null>(null);
  const [reminderFormValues, setReminderFormValues] = useState<ReminderFormValues>(EMPTY_REMINDER_FORM);
  const [reminderFormError, setReminderFormError] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const tomorrowKey = toDateKey(getTomorrow(today));
  const upcomingReminders = useMemo(() => reminders.filter((reminder) => { const dueKey = toDateKey(new Date(reminder.dueAt)); return !reminder.isDone && (dueKey === todayKey || dueKey === tomorrowKey); }), [reminders, todayKey, tomorrowKey]);
  const filteredReminders = useMemo(() => reminders.filter((reminder) => { const dueKey = toDateKey(new Date(reminder.dueAt)); if (reminderFilter === 'today') return !reminder.isDone && dueKey === todayKey; if (reminderFilter === 'overdue') return isReminderOverdue(reminder); return !reminder.isDone && dueKey > todayKey; }), [reminderFilter, reminders, todayKey]);
  const openReminderForm = useCallback((clientId: string, dealId: string) => { setReminderFormContext({ clientId, dealId }); setReminderFormValues({ ...EMPTY_REMINDER_FORM, dueAt: toLocalDateTimeInputValue(new Date(Date.now() + 60 * 60 * 1000)) }); setReminderFormError(null); }, []);
  const closeReminderForm = useCallback(() => { setReminderFormContext(null); setReminderFormValues(EMPTY_REMINDER_FORM); setReminderFormError(null); }, []);
  const updateReminderFormField = useCallback((field: keyof ReminderFormValues, value: string) => { setReminderFormValues((current) => ({ ...current, [field]: value })); setReminderFormError(null); }, []);
  const handleReminderFormSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!reminderFormContext) return; const validationError = validateReminderForm(reminderFormValues); if (validationError) { setReminderFormError(validationError); return; } const deal = deals.find((currentDeal) => currentDeal.id === reminderFormContext.dealId); if (!deal) { setReminderFormError('Сделка не найдена. Обновите страницу и повторите операцию.'); return; } const normalized = normalizeReminderFormValues(reminderFormValues); const createdReminder = await crmRepository.addReminder({ id: `reminder-${Date.now()}`, clientId: reminderFormContext.clientId, dealId: reminderFormContext.dealId, managerId: deal.owner, title: normalized.title, description: normalized.description, dueAt: new Date(normalized.dueAt).toISOString(), isDone: false, completedAt: null, isOverdue: false, priority: normalized.priority, type: normalized.type }); setReminders((current) => [createdReminder, ...current]); closeReminderForm(); }, [closeReminderForm, deals, reminderFormContext, reminderFormValues, setReminders]);
  const handleCompleteReminder = useCallback(async (reminderId: string) => { const completedReminder = await crmRepository.completeReminder(reminderId); if (!completedReminder) { window.alert('Напоминание не найдено. Обновите страницу и повторите операцию.'); return; } setReminders((current) => current.map((reminder) => reminder.id === completedReminder.id ? completedReminder : reminder)); }, [setReminders]);
  return { reminderFilter, setReminderFilter, reminderFormContext, reminderFormValues, reminderFormError, upcomingReminders, filteredReminders, todayKey, openReminderForm, closeReminderForm, updateReminderFormField, handleReminderFormSubmit, handleCompleteReminder };
}
