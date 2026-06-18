'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { crmRepository, INITIAL_ACTIVITY_EVENTS, INITIAL_CLIENTS, INITIAL_DEAL_FILES, INITIAL_DEALS, INITIAL_SETTINGS } from '@/lib/crmRepository';
import type { ActivityEvent, Client, CostCategoryConfig, CrmSettings, Deal, DealCostCategory, DealFile, DealStatus, DealStatusConfig, DocumentKind, DocumentTemplateConfig, Reminder, TeamMember } from '@/types/crm';

export function useCrmData() {
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS);
  const [dealFiles, setDealFiles] = useState<DealFile[]>(INITIAL_DEAL_FILES);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>(INITIAL_ACTIVITY_EVENTS);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [settings, setSettings] = useState<CrmSettings>(INITIAL_SETTINGS);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState(INITIAL_CLIENTS[0]?.id ?? '');

  useEffect(() => {
    let isMounted = true;
    async function loadCrmData() {
      const [loadedClients, loadedDeals, loadedFiles, loadedEvents, loadedReminders, loadedSettings] = await Promise.all([
        crmRepository.getClients(), crmRepository.getDeals(), crmRepository.getDealFiles(), crmRepository.getActivityEvents(), crmRepository.getReminders(), crmRepository.getSettings(),
      ]);
      if (!isMounted) return;
      setClients(loadedClients); setDeals(loadedDeals); setDealFiles(loadedFiles); setActivityEvents(loadedEvents); setReminders(loadedReminders); setSettings(loadedSettings);
      setSelectedClientId((current) => loadedClients.some((client) => client.id === current) ? current : loadedClients[0]?.id ?? current);
    }
    void loadCrmData();
    return () => { isMounted = false; };
  }, []);

  const enabledDealStatuses = useMemo(() => settings.dealStatuses.filter((status) => status.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map((status) => status.id), [settings.dealStatuses]);
  const statusTitles = useMemo(() => settings.dealStatuses.reduce((result, status) => ({ ...result, [status.id]: status.title }), {} as Record<DealStatus, string>), [settings.dealStatuses]);
  const statusStyles = useMemo(() => settings.dealStatuses.reduce((result, status) => ({ ...result, [status.id]: status.colorClassName }), {} as Record<DealStatus, string>), [settings.dealStatuses]);
  const enabledCostCategories = useMemo(() => settings.costCategories.filter((category) => category.isActive).sort((a, b) => a.sortOrder - b.sortOrder), [settings.costCategories]);
  const activeDocumentTemplates = useMemo(() => settings.documentTemplates.filter((template) => template.isActive), [settings.documentTemplates]);

  const saveSettings = useCallback(async (nextSettings: CrmSettings) => {
    const savedSettings = await crmRepository.updateSettings(nextSettings);
    setSettings(savedSettings);
    setSettingsMessage('Настройки сохранены. Новые значения применены в сделках, документах и финансовых формах.');
  }, []);
  const updateTeamMember = useCallback((memberId: string, patch: Partial<TeamMember>) => void saveSettings({ ...settings, teamMembers: settings.teamMembers.map((member) => member.id === memberId ? { ...member, ...patch } : member) }), [saveSettings, settings]);
  const addTeamMember = useCallback(() => void saveSettings({ ...settings, teamMembers: [...settings.teamMembers, { id: `team-${Date.now()}`, name: 'Новый сотрудник', role: 'Менеджер', email: '', phone: '', isActive: true }] }), [saveSettings, settings]);
  const updateDealStatusConfig = useCallback((statusId: DealStatus, patch: Partial<DealStatusConfig>) => void saveSettings({ ...settings, dealStatuses: settings.dealStatuses.map((status) => status.id === statusId ? { ...status, ...patch } : status) }), [saveSettings, settings]);
  const updateCostCategoryConfig = useCallback((categoryId: DealCostCategory, patch: Partial<CostCategoryConfig>) => void saveSettings({ ...settings, costCategories: settings.costCategories.map((category) => category.id === categoryId ? { ...category, ...patch } : category) }), [saveSettings, settings]);
  const updateDocumentTemplateConfig = useCallback((templateId: DocumentKind, patch: Partial<DocumentTemplateConfig>) => void saveSettings({ ...settings, documentTemplates: settings.documentTemplates.map((template) => template.id === templateId ? { ...template, ...patch } : template) }), [saveSettings, settings]);
  const updateCompanyField = useCallback((field: keyof CrmSettings['company'], value: string) => void saveSettings({ ...settings, company: { ...settings.company, [field]: value } }), [saveSettings, settings]);
  const updateMoneyField = useCallback((field: keyof CrmSettings['money'], value: string | boolean) => void saveSettings({ ...settings, money: { ...settings.money, [field]: typeof value === 'boolean' ? value : Math.max(0, Number(value) || 0) } }), [saveSettings, settings]);

  return { clients, setClients, deals, setDeals, dealFiles, setDealFiles, activityEvents, setActivityEvents, reminders, setReminders, settings, setSettings, settingsMessage, selectedClientId, setSelectedClientId, enabledDealStatuses, statusTitles, statusStyles, enabledCostCategories, activeDocumentTemplates, updateTeamMember, addTeamMember, updateDealStatusConfig, updateCostCategoryConfig, updateDocumentTemplateConfig, updateCompanyField, updateMoneyField };
}
