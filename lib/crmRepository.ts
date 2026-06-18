import { createEmptyDealFinancials } from '@/lib/dealFinancials';
import type { FileStorage, StoredDealFile, StoredFileContent } from '@/lib/storage/fileStorage';
import type { ActivityEvent, Client, CrmSettings, Deal, DealFile, DealStatus, Reminder } from '@/types/crm';


export const INITIAL_SETTINGS: CrmSettings = {
  teamMembers: [
    { id: 'team-001', name: 'Мария Орлова', role: 'Ведущий менеджер', email: 'maria.orlova@example.com', phone: '+7 (921) 100-10-01', isActive: true },
    { id: 'team-002', name: 'Олег Романов', role: 'Менеджер проектов', email: 'oleg.romanov@example.com', phone: '+7 (916) 100-10-02', isActive: true },
    { id: 'team-003', name: 'Екатерина Волкова', role: 'Аккаунт-менеджер', email: 'ekaterina.volkova@example.com', phone: '+7 (812) 100-10-03', isActive: true },
  ],
  dealStatuses: [
    { id: 'lead', title: 'Обращение', colorClassName: 'border-slate-200 bg-slate-100 text-slate-700', sortOrder: 10, isActive: true },
    { id: 'specApproval', title: 'Согласование ТЗ', colorClassName: 'border-orange-200 bg-orange-50 text-orange-700', sortOrder: 20, isActive: true },
    { id: 'inProgress', title: 'В работе', colorClassName: 'border-blue-200 bg-blue-50 text-blue-700', sortOrder: 30, isActive: true },
    { id: 'done', title: 'Выполнено', colorClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700', sortOrder: 40, isActive: true },
  ],
  costCategories: [
    { id: 'rawMaterial', title: 'Покупка сырья', description: 'Материалы и комплектующие', sortOrder: 10, isActive: true },
    { id: 'factoryLoading', title: 'Паллеты и заводская отгрузка', description: 'Подготовка и отгрузка с производства', sortOrder: 20, isActive: true },
    { id: 'workshopDelivery', title: 'Доставка до цеха', description: 'Логистика материалов до мастерской', sortOrder: 30, isActive: true },
    { id: 'employeeLabor', title: 'Работа сотрудников', description: 'Почасовая оплата команды', sortOrder: 40, isActive: true },
    { id: 'paintShopLogistics', title: 'Логистика до цеха покраски', description: 'Перевозка деталей на покраску', sortOrder: 50, isActive: true },
    { id: 'painting', title: 'Стоимость покраски', description: 'Работы и материалы покрасочного цеха', sortOrder: 60, isActive: true },
    { id: 'other', title: 'Прочие расходы', description: 'Дополнительные затраты сделки', sortOrder: 70, isActive: true },
  ],
  money: { currency: 'RUB', locale: 'ru-RU', minimumFractionDigits: 0, maximumFractionDigits: 2, roundingIncrement: 1, applyRoundingToDocuments: true },
  company: { name: 'AetherCRM Furniture', legalName: 'ООО «Аэтер Мебель»', inn: '7800000000', kpp: '780001001', ogrn: '1267800000000', address: 'Санкт-Петербург, Невский проспект, 1', bankName: 'АО «Демонстрационный банк»', bik: '044030000', checkingAccount: '40702810000000000001', correspondentAccount: '30101810000000000000', phone: '+7 (812) 000-00-00', email: 'office@aether-crm.example' },
  documentTemplates: [
    { id: 'proposal', title: 'Коммерческое предложение', filePrefix: 'КП', body: 'Коммерческое предложение по сделке {{dealTitle}} для {{clientName}} на сумму {{revenue}}.', isActive: true },
    { id: 'contract', title: 'Договор', filePrefix: 'Договор', body: 'Договор с {{clientName}} по проекту {{dealTitle}}. Исполнитель: {{companyLegalName}}.', isActive: true },
    { id: 'invoice', title: 'Счёт', filePrefix: 'Счёт', body: 'Счёт на оплату {{revenue}} по сделке {{dealId}}.', isActive: true },
    { id: 'completionAct', title: 'Акт выполненных работ', filePrefix: 'Акт', body: 'Акт подтверждает выполнение работ по проекту {{dealTitle}}.', isActive: true },
  ],
};

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'client-001',
    name: 'Анна Смирнова',
    company: 'Частный заказчик',
    phone: '+7 (921) 447-18-02',
    email: 'anna.smirnova@example.com',
    messengers: ['Telegram @asmirnova', 'WhatsApp'],
    address: 'Санкт-Петербург, ул. Парадная, 8',
    comments: 'Предпочитает вечерние звонки после 18:00, просит отправлять визуализации в Telegram.',
    communications: [
      {
        id: 'comm-001',
        date: '2026-06-02 11:20',
        channel: 'Телефон',
        summary: 'Первичный запрос на кухню из массива, зафиксированы размеры помещения.',
        manager: 'Мария Орлова',
      },
      {
        id: 'comm-002',
        date: '2026-06-06 19:05',
        channel: 'Telegram',
        summary: 'Клиент прислал референсы скрытых ручек и теплой подсветки рабочей зоны.',
        manager: 'Мария Орлова',
      },
    ],
  },
  {
    id: 'client-002',
    name: 'Илья Кузнецов',
    company: 'Частный заказчик',
    phone: '+7 (916) 302-44-81',
    email: 'ilya.kuznetsov@example.com',
    messengers: ['WhatsApp', 'Viber'],
    address: 'Москва, Ленинградский пр-т, 54',
    comments: 'Нужна детализация стоимости по материалам и отдельная смета на монтаж.',
    communications: [
      {
        id: 'comm-003',
        date: '2026-06-04 14:10',
        channel: 'Email',
        summary: 'Получены планы прихожей и пожелания по зеркальным дверям шкафа.',
        manager: 'Олег Романов',
      },
      {
        id: 'comm-004',
        date: '2026-06-11 10:35',
        channel: 'Телефон',
        summary: 'Согласован повторный замер для уточнения глубины секций.',
        manager: 'Олег Романов',
      },
    ],
  },
  {
    id: 'client-003',
    name: 'ООО «Северный Вектор»',
    company: 'ООО «Северный Вектор»',
    phone: '+7 (812) 555-20-41',
    email: 'office@north-vector.example',
    messengers: ['Telegram @north_vector_office'],
    address: 'Санкт-Петербург, БЦ «Атлас», наб. Обводного канала, 118',
    comments: 'Корпоративный клиент, требуется закрывающая документация и согласование через отдел закупок.',
    communications: [
      {
        id: 'comm-005',
        date: '2026-05-25 09:40',
        channel: 'Email',
        summary: 'Передано ТЗ на переговорную и брендбук для подбора отделки.',
        manager: 'Екатерина Волкова',
      },
      {
        id: 'comm-006',
        date: '2026-06-09 16:00',
        channel: 'Встреча',
        summary: 'Подписан протокол согласования чертежей и спецификации материалов.',
        manager: 'Екатерина Волкова',
      },
    ],
  },
  {
    id: 'client-004',
    name: 'Павел Морозов',
    company: 'Частный заказчик',
    phone: '+7 (925) 603-77-16',
    email: 'pavel.morozov@example.com',
    messengers: ['Telegram @pmorozov'],
    address: 'Москва, ул. Мосфильмовская, 33',
    comments: 'Особое внимание безопасности детской фурнитуры, все острые углы должны быть скруглены.',
    communications: [
      {
        id: 'comm-007',
        date: '2026-05-18 12:30',
        channel: 'Телефон',
        summary: 'Обсуждена концепция детской комнаты под ключ и сроки монтажа.',
        manager: 'Мария Орлова',
      },
      {
        id: 'comm-008',
        date: '2026-06-13 18:15',
        channel: 'Telegram',
        summary: 'Отправлены варианты палитры фасадов для финального выбора.',
        manager: 'Мария Орлова',
      },
    ],
  },
  {
    id: 'client-005',
    name: 'Медцентр «Альта»',
    company: 'ООО «Альта Мед»',
    phone: '+7 (495) 120-48-90',
    email: 'admin@alta-med.example',
    messengers: ['WhatsApp Business'],
    address: 'Москва, ул. Большая Полянка, 21',
    comments: 'После монтажа ресепшена планируется заявка на мебель для кабинетов врачей.',
    communications: [
      {
        id: 'comm-009',
        date: '2026-05-10 15:00',
        channel: 'Встреча',
        summary: 'Зафиксированы требования к износостойкому покрытию и санитарной обработке.',
        manager: 'Олег Романов',
      },
      {
        id: 'comm-010',
        date: '2026-06-14 13:45',
        channel: 'Email',
        summary: 'Переданы подписанные акты, ожидается финальная оплата по счету.',
        manager: 'Олег Романов',
      },
    ],
  },
];

export const INITIAL_DEALS: Deal[] = [
  {
    id: 'deal-001',
    clientId: 'client-001',
    title: 'Кухонный гарнитур из массива',
    client: 'Анна Смирнова',
    createdAt: '2026-06-02',
    status: 'lead',
    owner: 'Мария Орлова',
    dueDate: '2026-07-12',
    revenueAmount: 420000,
    currency: 'RUB',
    financials: createEmptyDealFinancials(),
    notes: 'Клиент просит предусмотреть встроенную подсветку и скрытые ручки.',
  },
  {
    id: 'deal-002',
    clientId: 'client-002',
    title: 'Шкаф-купе в прихожую',
    client: 'Илья Кузнецов',
    createdAt: '2026-06-04',
    status: 'specApproval',
    owner: 'Олег Романов',
    dueDate: '2026-06-15',
    revenueAmount: 185000,
    currency: 'RUB',
    financials: createEmptyDealFinancials(),
    notes: 'Нужно уточнить глубину секций после повторного замера помещения.',
  },
  {
    id: 'deal-003',
    clientId: 'client-003',
    title: 'Комплект мебели для переговорной',
    client: 'ООО «Северный Вектор»',
    createdAt: '2026-05-25',
    status: 'inProgress',
    owner: 'Екатерина Волкова',
    dueDate: '2026-07-05',
    revenueAmount: 760000,
    currency: 'RUB',
    financials: createEmptyDealFinancials(),
    notes: 'Чертежи утверждены, материалы зарезервированы на складе.',
  },
  {
    id: 'deal-004',
    clientId: 'client-004',
    title: 'Детская комната под ключ',
    client: 'Павел Морозов',
    createdAt: '2026-05-18',
    status: 'inProgress',
    owner: 'Мария Орлова',
    dueDate: '2026-06-30',
    revenueAmount: 315000,
    currency: 'RUB',
    financials: createEmptyDealFinancials(),
    notes: 'Проверить безопасность фурнитуры и согласовать палитру фасадов.',
  },
  {
    id: 'deal-005',
    clientId: 'client-005',
    title: 'Ресепшен для клиники',
    client: 'Медцентр «Альта»',
    createdAt: '2026-05-10',
    status: 'done',
    owner: 'Олег Романов',
    dueDate: '2026-06-14',
    revenueAmount: 540000,
    currency: 'RUB',
    financials: createEmptyDealFinancials(),
    notes: 'Заказ смонтирован, акты подписаны, ожидается финальная оплата.',
  },
];


export const INITIAL_REMINDERS: Reminder[] = [
  {
    id: 'reminder-001',
    dealId: 'deal-001',
    clientId: 'client-001',
    managerId: 'Мария Орлова',
    title: 'Позвонить Анне и подтвердить материалы',
    description: 'Уточнить наличие массива, зафиксировать выбранную фурнитуру и следующий шаг по визуализации.',
    dueAt: '2026-06-17T15:00:00.000Z',
    isDone: false,
    completedAt: null,
    isOverdue: true,
    priority: 'high',
    type: 'call',
  },
  {
    id: 'reminder-002',
    dealId: 'deal-003',
    clientId: 'client-003',
    managerId: 'Екатерина Волкова',
    title: 'Отправить спецификацию по переговорной',
    description: 'Передать финальную спецификацию закупкам и запросить подтверждение сроков поставки.',
    dueAt: '2026-06-18T10:30:00.000Z',
    isDone: false,
    completedAt: null,
    isOverdue: false,
    priority: 'medium',
    type: 'task',
  },
  {
    id: 'reminder-003',
    dealId: 'deal-005',
    clientId: 'client-005',
    managerId: 'Олег Романов',
    title: 'Проверить финальную оплату',
    description: 'Сверить поступление по финальному счету и закрыть финансовый контроль сделки.',
    dueAt: '2026-06-16T12:00:00.000Z',
    isDone: true,
    completedAt: '2026-06-16T12:20:00.000Z',
    isOverdue: false,
    priority: 'low',
    type: 'payment',
  },
];

export const INITIAL_DEAL_FILES: DealFile[] = [
  {
    id: 'file-001',
    dealId: 'deal-001',
    name: 'Техническое-задание.pdf',
    type: 'application/pdf',
    size: 248000,
    version: 1,
    uploadedAt: '2026-06-06T10:20:00.000Z',
    previewUrl: '/file.svg',
  },
  {
    id: 'file-002',
    dealId: 'deal-003',
    name: 'План-переговорной.dwg',
    type: 'application/acad',
    size: 1824000,
    version: 1,
    uploadedAt: '2026-06-10T13:45:00.000Z',
    previewUrl: '/file.svg',
  },
];

export const INITIAL_ACTIVITY_EVENTS: ActivityEvent[] = [
  ...INITIAL_DEALS.map((deal) => ({
    id: `activity-${deal.id}-created`,
    dealId: deal.id,
    timestamp: `${deal.createdAt}T09:00:00.000Z`,
    type: 'dealCreated' as const,
    message: `Создана сделка «${deal.title}» для клиента ${deal.client}.`,
  })),
  ...INITIAL_DEAL_FILES.map((file) => ({
    id: `activity-${file.id}-uploaded`,
    dealId: file.dealId,
    timestamp: file.uploadedAt,
    type: 'fileUploaded' as const,
    message: `Загружен файл «${file.name}» версии ${file.version}.`,
  })),
  {
    id: 'activity-deal-003-drawing-approved',
    dealId: 'deal-003',
    timestamp: '2026-06-10T13:45:00.000Z',
    type: 'drawingCreated',
    message: 'Создан и приложен чертёж переговорной, согласование с клиентом зафиксировано.',
  },
];





export type AddDealFileInput = Omit<DealFile, 'previewUrl'> & {
  previewUrl?: string;
  content?: StoredFileContent;
};

export interface CrmRepository {
  getClients(): Promise<Client[]>;
  getDeals(): Promise<Deal[]>;
  getDealFiles(dealId?: string): Promise<DealFile[]>;
  getActivityEvents(): Promise<ActivityEvent[]>;
  getReminders(): Promise<Reminder[]>;
  getSettings(): Promise<CrmSettings>;
  updateSettings(settings: CrmSettings): Promise<CrmSettings>;
  addDeal(deal: Deal): Promise<Deal>;
  updateDeal(dealId: string, patch: Partial<Deal>): Promise<Deal | null>;
  deleteDeal(dealId: string): Promise<boolean>;
  addClient(client: Client): Promise<Client>;
  updateClient(clientId: string, patch: Partial<Client>): Promise<Client | null>;
  deleteClient(clientId: string): Promise<boolean>;
  addFile(file: AddDealFileInput): Promise<DealFile>;
  addActivityEvent(event: ActivityEvent): Promise<ActivityEvent>;
  addReminder(reminder: Reminder): Promise<Reminder>;
  updateReminder(reminderId: string, patch: Partial<Reminder>): Promise<Reminder | null>;
  deleteReminder(reminderId: string): Promise<boolean>;
  completeReminder(reminderId: string): Promise<Reminder | null>;
  updateDealStatus(dealId: string, status: DealStatus): Promise<Deal | null>;
  replaceDeals(deals: Deal[]): Promise<Deal[]>;
}


type CrmState = {
  clients: Client[];
  deals: Deal[];
  dealFiles: StoredDealFile[];
  activityEvents: ActivityEvent[];
  reminders: Reminder[];
  settings: CrmSettings;
};

const CRM_STATE_KEY = 'aether-crm:repository-state:v1';
const FILE_CONTENT_KEY_PREFIX = 'aether-crm:file-content:';

function isBrowserStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}


function parseMoneyAmount(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== 'string') {
    return 0;
  }

  return Number(value.replace(/[^\d.-]/g, '')) || 0;
}

function normalizeDealFinancials(deal: Partial<Deal>): Deal['financials'] {
  return {
    ...createEmptyDealFinancials(),
    ...(deal.financials ?? {}),
  };
}

function normalizeDealFinancialFields(deal: Partial<Deal> & { price?: unknown; revenue?: unknown }): Deal {
  const revenueAmount = Number(deal.revenueAmount) || parseMoneyAmount(deal.revenue) || parseMoneyAmount(deal.price);

  return {
    ...(deal as Deal),
    revenueAmount,
    currency: deal.currency ?? 'RUB',
    financials: normalizeDealFinancials(deal),
  };
}


function normalizeReminder(reminder: Partial<Reminder>): Reminder {
  const dueAt = reminder.dueAt ?? new Date().toISOString();
  const isDone = Boolean(reminder.isDone);

  return {
    id: reminder.id ?? `reminder-${Date.now()}`,
    dealId: reminder.dealId ?? '',
    clientId: reminder.clientId ?? '',
    managerId: reminder.managerId?.trim() || 'Без ответственного',
    title: reminder.title?.trim() || 'Напоминание без названия',
    description: reminder.description?.trim() || '',
    dueAt,
    isDone,
    completedAt: reminder.completedAt ?? null,
    isOverdue: !isDone && new Date(dueAt).getTime() < Date.now(),
    priority: reminder.priority ?? 'medium',
    type: reminder.type ?? 'task',
  };
}


function normalizeSettings(settings?: Partial<CrmSettings>): CrmSettings {
  return {
    ...INITIAL_SETTINGS,
    ...settings,
    teamMembers: Array.isArray(settings?.teamMembers) ? settings.teamMembers : INITIAL_SETTINGS.teamMembers,
    dealStatuses: Array.isArray(settings?.dealStatuses) ? settings.dealStatuses : INITIAL_SETTINGS.dealStatuses,
    costCategories: Array.isArray(settings?.costCategories) ? settings.costCategories : INITIAL_SETTINGS.costCategories,
    money: { ...INITIAL_SETTINGS.money, ...(settings?.money ?? {}) },
    company: { ...INITIAL_SETTINGS.company, ...(settings?.company ?? {}) },
    documentTemplates: Array.isArray(settings?.documentTemplates) ? settings.documentTemplates : INITIAL_SETTINGS.documentTemplates,
  };
}

function createInitialState(): CrmState {
  return {
    clients: INITIAL_CLIENTS,
    deals: INITIAL_DEALS.map(normalizeDealFinancialFields),
    dealFiles: INITIAL_DEAL_FILES.map((file) => ({ ...file, storageKey: null })),
    activityEvents: INITIAL_ACTIVITY_EVENTS,
    reminders: INITIAL_REMINDERS.map(normalizeReminder),
    settings: INITIAL_SETTINGS,
  };
}

function safeParseState(value: string | null): CrmState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<CrmState>;
    if (!Array.isArray(parsed.clients) || !Array.isArray(parsed.deals) || !Array.isArray(parsed.dealFiles) || !Array.isArray(parsed.activityEvents)) {
      return null;
    }
    return {
      clients: parsed.clients,
      deals: parsed.deals.map((deal) => normalizeDealFinancialFields(deal as Partial<Deal> & { price?: unknown; revenue?: unknown })),
      dealFiles: parsed.dealFiles,
      activityEvents: parsed.activityEvents,
      reminders: Array.isArray(parsed.reminders) ? parsed.reminders.map((reminder) => normalizeReminder(reminder as Partial<Reminder>)) : INITIAL_REMINDERS.map(normalizeReminder),
      settings: normalizeSettings(parsed.settings),
    };
  } catch {
    return null;
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

class LocalStorageFileStorage implements FileStorage {
  async save(input: { fileId: string; content: StoredFileContent }): Promise<{ storageKey: string | null; previewUrl: string | null }> {
    if (!input.content || !isBrowserStorageAvailable()) return { storageKey: null, previewUrl: null };
    const dataUrl = typeof input.content === 'string' ? input.content : await blobToDataUrl(input.content as Blob);
    const storageKey = `${FILE_CONTENT_KEY_PREFIX}${input.fileId}`;
    window.localStorage.setItem(storageKey, dataUrl);
    return { storageKey, previewUrl: dataUrl };
  }

  async getPreviewUrl(storageKey: string | null | undefined): Promise<string | null> {
    if (!storageKey || !isBrowserStorageAvailable()) return null;
    return window.localStorage.getItem(storageKey);
  }

  async getDownloadUrl(storageKey: string | null | undefined): Promise<string | null> {
    return this.getPreviewUrl(storageKey);
  }
}

export class LocalStorageCrmRepository implements CrmRepository {
  constructor(private readonly fileStorage: FileStorage = new LocalStorageFileStorage()) {}

  private readState(): CrmState {
    if (!isBrowserStorageAvailable()) return createInitialState();
    const state = safeParseState(window.localStorage.getItem(CRM_STATE_KEY)) ?? createInitialState();
    window.localStorage.setItem(CRM_STATE_KEY, JSON.stringify(state));
    return state;
  }

  private writeState(state: CrmState): void {
    if (!isBrowserStorageAvailable()) return;
    window.localStorage.setItem(CRM_STATE_KEY, JSON.stringify(state));
  }

  async getClients(): Promise<Client[]> {
    return this.readState().clients;
  }

  async getDeals(): Promise<Deal[]> {
    return this.readState().deals;
  }

  async getDealFiles(dealId?: string): Promise<DealFile[]> {
    const files = this.readState().dealFiles.filter((file) => !dealId || file.dealId === dealId);
    return Promise.all(files.map(async (file) => {
      const { storageKey, ...metadata } = file;
      return {
        ...metadata,
        previewUrl: (await this.fileStorage.getPreviewUrl(storageKey, file.id)) ?? file.previewUrl,
      };
    }));
  }

  async getActivityEvents(): Promise<ActivityEvent[]> {
    return this.readState().activityEvents;
  }

  async getReminders(): Promise<Reminder[]> {
    const state = this.readState();
    const reminders = state.reminders.map(normalizeReminder);
    if (JSON.stringify(reminders) !== JSON.stringify(state.reminders)) {
      state.reminders = reminders;
      this.writeState(state);
    }
    return reminders;
  }


  async getSettings(): Promise<CrmSettings> {
    const state = this.readState();
    const settings = normalizeSettings(state.settings);
    if (JSON.stringify(settings) !== JSON.stringify(state.settings)) {
      state.settings = settings;
      this.writeState(state);
    }
    return settings;
  }

  async updateSettings(settings: CrmSettings): Promise<CrmSettings> {
    const state = this.readState();
    const normalizedSettings = normalizeSettings(settings);
    state.settings = normalizedSettings;
    this.writeState(state);
    return normalizedSettings;
  }

  async addDeal(deal: Deal): Promise<Deal> {
    const state = this.readState();
    const client = state.clients.find((currentClient) => currentClient.id === deal.clientId);
    const normalizedDeal: Deal = {
      ...deal,
      title: deal.title.trim(),
      clientId: deal.clientId,
      client: client?.name ?? deal.client.trim(),
      owner: deal.owner.trim(),
      revenueAmount: Number(deal.revenueAmount) || 0,
      currency: deal.currency ?? 'RUB',
      financials: normalizeDealFinancials(deal),
      notes: deal.notes.trim(),
    };

    state.deals = [normalizedDeal, ...state.deals.filter((currentDeal) => currentDeal.id !== deal.id)];
    this.writeState(state);
    return normalizedDeal;
  }

  async updateDeal(dealId: string, patch: Partial<Deal>): Promise<Deal | null> {
    const state = this.readState();
    let updatedDeal: Deal | null = null;

    state.deals = state.deals.map((deal) => {
      if (deal.id !== dealId) return deal;
      const nextClientId = patch.clientId ?? deal.clientId;
      const nextClient = state.clients.find((client) => client.id === nextClientId);
      updatedDeal = {
        ...deal,
        ...patch,
        id: deal.id,
        createdAt: deal.createdAt,
        clientId: nextClientId,
        client: nextClient?.name ?? patch.client ?? deal.client,
      };
      updatedDeal = normalizeDealFinancialFields(updatedDeal);
      return updatedDeal;
    });

    if (!updatedDeal) {
      return null;
    }

    this.writeState(state);
    return updatedDeal;
  }

  async deleteDeal(dealId: string): Promise<boolean> {
    const state = this.readState();
    const hasDeal = state.deals.some((deal) => deal.id === dealId);

    if (!hasDeal) {
      return false;
    }

    state.deals = state.deals.filter((deal) => deal.id !== dealId);
    state.dealFiles = state.dealFiles.filter((file) => file.dealId !== dealId);
    state.reminders = state.reminders.filter((reminder) => reminder.dealId !== dealId);
    state.activityEvents = state.activityEvents.filter((event) => event.dealId !== dealId);
    this.writeState(state);
    return true;
  }

  async addClient(client: Client): Promise<Client> {
    const state = this.readState();
    const normalizedClient = {
      ...client,
      messengers: Array.isArray(client.messengers) ? client.messengers : [],
      communications: Array.isArray(client.communications) ? client.communications : [],
    };

    state.clients = [normalizedClient, ...state.clients.filter((currentClient) => currentClient.id !== client.id)];
    this.writeState(state);
    return normalizedClient;
  }

  async updateClient(clientId: string, patch: Partial<Client>): Promise<Client | null> {
    const state = this.readState();
    let updatedClient: Client | null = null;

    state.clients = state.clients.map((client) => {
      if (client.id !== clientId) return client;
      updatedClient = {
        ...client,
        ...patch,
        id: client.id,
        messengers: patch.messengers ?? client.messengers,
        communications: patch.communications ?? client.communications,
      };
      return updatedClient;
    });

    if (!updatedClient) {
      return null;
    }

    state.deals = state.deals.map((deal) => (
      deal.clientId === clientId ? { ...deal, client: updatedClient?.name ?? deal.client } : deal
    ));
    this.writeState(state);
    return updatedClient;
  }

  async deleteClient(clientId: string): Promise<boolean> {
    const state = this.readState();
    const hasRelatedDeals = state.deals.some((deal) => deal.clientId === clientId);

    if (hasRelatedDeals || !state.clients.some((client) => client.id === clientId)) {
      return false;
    }

    state.clients = state.clients.filter((client) => client.id !== clientId);
    state.reminders = state.reminders.filter((reminder) => reminder.clientId !== clientId);
    this.writeState(state);
    return true;
  }

  async addFile(file: AddDealFileInput): Promise<DealFile> {
    const state = this.readState();
    const storageResult = await this.fileStorage.save({ fileId: file.id, dealId: file.dealId, fileName: file.name, mimeType: file.type, content: file.content });
    const storageKey = storageResult.storageKey;
    const { content: _content, ...metadata } = file;
    const persistedFile = {
      ...metadata,
      previewUrl: metadata.previewUrl ?? '/file.svg',
    };
    const savedFile = {
      ...persistedFile,
      previewUrl: storageKey ? (await this.fileStorage.getPreviewUrl(storageKey, file.id)) ?? persistedFile.previewUrl : persistedFile.previewUrl,
    };

    state.dealFiles = [{ ...persistedFile, storageKey }, ...state.dealFiles];
    this.writeState(state);
    return savedFile;
  }

  async addActivityEvent(event: ActivityEvent): Promise<ActivityEvent> {
    const state = this.readState();
    state.activityEvents = [event, ...state.activityEvents];
    this.writeState(state);
    return event;
  }



  async addReminder(reminder: Reminder): Promise<Reminder> {
    const state = this.readState();
    const normalizedReminder = normalizeReminder(reminder);
    state.reminders = [normalizedReminder, ...state.reminders.filter((currentReminder) => currentReminder.id !== reminder.id)];
    this.writeState(state);
    return normalizedReminder;
  }

  async updateReminder(reminderId: string, patch: Partial<Reminder>): Promise<Reminder | null> {
    const state = this.readState();
    let updatedReminder: Reminder | null = null;

    state.reminders = state.reminders.map((reminder) => {
      if (reminder.id !== reminderId) return reminder;
      updatedReminder = normalizeReminder({ ...reminder, ...patch, id: reminder.id });
      return updatedReminder;
    });

    if (!updatedReminder) return null;
    this.writeState(state);
    return updatedReminder;
  }

  async deleteReminder(reminderId: string): Promise<boolean> {
    const state = this.readState();
    const hasReminder = state.reminders.some((reminder) => reminder.id === reminderId);
    if (!hasReminder) return false;
    state.reminders = state.reminders.filter((reminder) => reminder.id !== reminderId);
    this.writeState(state);
    return true;
  }

  async completeReminder(reminderId: string): Promise<Reminder | null> {
    return this.updateReminder(reminderId, {
      isDone: true,
      completedAt: new Date().toISOString(),
      isOverdue: false,
    });
  }

  async updateDealStatus(dealId: string, status: DealStatus): Promise<Deal | null> {
    const state = this.readState();
    let updatedDeal: Deal | null = null;
    state.deals = state.deals.map((deal) => {
      if (deal.id !== dealId) return deal;
      updatedDeal = { ...deal, status };
      return updatedDeal;
    });
    this.writeState(state);
    return updatedDeal;
  }

  async replaceDeals(deals: Deal[]): Promise<Deal[]> {
    const state = this.readState();
    state.deals = deals;
    this.writeState(state);
    return deals;
  }
}


type ApiSnapshot = CrmState;

class ApiCrmRepository implements CrmRepository {
  private migrationPromise: Promise<void> | null = null;

  private async request<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch('/api/crm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(errorPayload?.error ?? `CRM API вернул статус ${response.status}.`);
    }

    return response.json() as Promise<T>;
  }

  private async getSnapshot(): Promise<ApiSnapshot> {
    await this.ensureLocalStorageMigrated();
    const response = await fetch('/api/crm', { method: 'GET' });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(errorPayload?.error ?? `CRM API вернул статус ${response.status}.`);
    }

    return response.json() as Promise<ApiSnapshot>;
  }

  private async ensureLocalStorageMigrated(): Promise<void> {
    if (!isBrowserStorageAvailable()) return;
    if (window.localStorage.getItem(`${CRM_STATE_KEY}:server-migrated`) === 'true') return;
    this.migrationPromise ??= this.migrateLocalStorageState();
    await this.migrationPromise;
  }

  private async migrateLocalStorageState(): Promise<void> {
    const state = safeParseState(window.localStorage.getItem(CRM_STATE_KEY));
    if (state) {
      await this.request<ApiSnapshot>('importSnapshot', state as unknown as Record<string, unknown>);
    }
    window.localStorage.setItem(`${CRM_STATE_KEY}:server-migrated`, 'true');
  }

  async getClients(): Promise<Client[]> {
    return (await this.getSnapshot()).clients;
  }

  async getDeals(): Promise<Deal[]> {
    return (await this.getSnapshot()).deals;
  }

  async getDealFiles(dealId?: string): Promise<DealFile[]> {
    const files = (await this.getSnapshot()).dealFiles;
    return files.filter((file) => !dealId || file.dealId === dealId);
  }

  async getActivityEvents(): Promise<ActivityEvent[]> {
    return (await this.getSnapshot()).activityEvents;
  }

  async getReminders(): Promise<Reminder[]> {
    return (await this.getSnapshot()).reminders.map(normalizeReminder);
  }

  async getSettings(): Promise<CrmSettings> {
    return normalizeSettings((await this.getSnapshot()).settings);
  }

  async updateSettings(settings: CrmSettings): Promise<CrmSettings> {
    return this.request<CrmSettings>('updateSettings', { settings });
  }

  async addDeal(deal: Deal): Promise<Deal> {
    return this.request<Deal>('addDeal', { deal: normalizeDealFinancialFields(deal) });
  }

  async updateDeal(dealId: string, patch: Partial<Deal>): Promise<Deal | null> {
    return this.request<Deal | null>('updateDeal', { dealId, patch });
  }

  async deleteDeal(dealId: string): Promise<boolean> {
    return this.request<boolean>('deleteDeal', { dealId });
  }

  async addClient(client: Client): Promise<Client> {
    return this.request<Client>('addClient', { client });
  }

  async updateClient(clientId: string, patch: Partial<Client>): Promise<Client | null> {
    return this.request<Client | null>('updateClient', { clientId, patch });
  }

  async deleteClient(clientId: string): Promise<boolean> {
    return this.request<boolean>('deleteClient', { clientId });
  }

  async addFile(file: AddDealFileInput): Promise<DealFile> {
    const { content, ...metadata } = file;
    const previewUrl = typeof content === 'string' ? content : (content instanceof Blob ? await blobToDataUrl(content) : metadata.previewUrl);
    return this.request<DealFile>('addFile', { file: { ...metadata, previewUrl: previewUrl ?? '/file.svg' } });
  }

  async addActivityEvent(event: ActivityEvent): Promise<ActivityEvent> {
    return this.request<ActivityEvent>('addActivityEvent', { event });
  }

  async addReminder(reminder: Reminder): Promise<Reminder> {
    return this.request<Reminder>('addReminder', { reminder: normalizeReminder(reminder) });
  }

  async updateReminder(reminderId: string, patch: Partial<Reminder>): Promise<Reminder | null> {
    return this.request<Reminder | null>('updateReminder', { reminderId, patch });
  }

  async deleteReminder(reminderId: string): Promise<boolean> {
    return this.request<boolean>('deleteReminder', { reminderId });
  }

  async completeReminder(reminderId: string): Promise<Reminder | null> {
    return this.request<Reminder | null>('completeReminder', { reminderId });
  }

  async updateDealStatus(dealId: string, status: DealStatus): Promise<Deal | null> {
    return this.request<Deal | null>('updateDealStatus', { dealId, status });
  }

  async replaceDeals(deals: Deal[]): Promise<Deal[]> {
    return this.request<Deal[]>('replaceDeals', { deals });
  }
}

export const crmRepository: CrmRepository = new ApiCrmRepository();
