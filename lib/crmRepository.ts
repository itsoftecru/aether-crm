import { createEmptyDealFinancials } from '@/lib/dealFinancials';
import type { ActivityEvent, Client, Deal, DealFile, DealStatus, Reminder } from '@/types/crm';

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
    price: '420 000 ₽',
    revenue: 420000,
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
    price: '185 000 ₽',
    revenue: 185000,
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
    price: '760 000 ₽',
    revenue: 760000,
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
    price: '315 000 ₽',
    revenue: 315000,
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
    price: '540 000 ₽',
    revenue: 540000,
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
    title: 'Позвонить Анне и подтвердить материалы',
    dueAt: '2026-06-17T15:00:00.000Z',
    isDone: false,
    type: 'call',
  },
  {
    id: 'reminder-002',
    dealId: 'deal-003',
    clientId: 'client-003',
    title: 'Отправить спецификацию по переговорной',
    dueAt: '2026-06-18T10:30:00.000Z',
    isDone: false,
    type: 'task',
  },
  {
    id: 'reminder-003',
    dealId: 'deal-005',
    clientId: 'client-005',
    title: 'Проверить финальную оплату',
    dueAt: '2026-06-16T12:00:00.000Z',
    isDone: true,
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



export type StoredFileContent = Blob | string | null | undefined;

export type AddDealFileInput = Omit<DealFile, 'previewUrl'> & {
  previewUrl?: string;
  content?: StoredFileContent;
};

export interface CrmRepository {
  getClients(): Promise<Client[]>;
  getDeals(): Promise<Deal[]>;
  getDealFiles(dealId?: string): Promise<DealFile[]>;
  getActivityEvents(): Promise<ActivityEvent[]>;
  addDeal(deal: Deal): Promise<Deal>;
  updateDeal(dealId: string, patch: Partial<Deal>): Promise<Deal | null>;
  deleteDeal(dealId: string): Promise<boolean>;
  addClient(client: Client): Promise<Client>;
  updateClient(clientId: string, patch: Partial<Client>): Promise<Client | null>;
  deleteClient(clientId: string): Promise<boolean>;
  addFile(file: AddDealFileInput): Promise<DealFile>;
  addActivityEvent(event: ActivityEvent): Promise<ActivityEvent>;
  updateDealStatus(dealId: string, status: DealStatus): Promise<Deal | null>;
  replaceDeals(deals: Deal[]): Promise<Deal[]>;
}

export interface FileStorage {
  save(fileId: string, content: StoredFileContent): Promise<string | null>;
  getPreviewUrl(fileId: string): Promise<string | null>;
}

type CrmState = {
  clients: Client[];
  deals: Deal[];
  dealFiles: Array<DealFile & { storageKey?: string | null }>;
  activityEvents: ActivityEvent[];
};

const CRM_STATE_KEY = 'aether-crm:repository-state:v1';
const FILE_CONTENT_KEY_PREFIX = 'aether-crm:file-content:';

function isBrowserStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}


function parseDealRevenue(price: string): number {
  return Number(price.replace(/[^\d.-]/g, '')) || 0;
}

function normalizeDealFinancials(deal: Partial<Deal>): Deal['financials'] {
  return {
    ...createEmptyDealFinancials(),
    ...(deal.financials ?? {}),
  };
}

function normalizeDealFinancialFields(deal: Deal): Deal {
  const revenue = Number(deal.revenue) || parseDealRevenue(deal.price ?? '');

  return {
    ...deal,
    price: deal.price || `${revenue.toLocaleString('ru-RU')} ₽`,
    revenue,
    currency: deal.currency ?? 'RUB',
    financials: normalizeDealFinancials(deal),
  };
}

function createInitialState(): CrmState {
  return {
    clients: INITIAL_CLIENTS,
    deals: INITIAL_DEALS.map(normalizeDealFinancialFields),
    dealFiles: INITIAL_DEAL_FILES.map((file) => ({ ...file, storageKey: null })),
    activityEvents: INITIAL_ACTIVITY_EVENTS,
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
      deals: parsed.deals.map((deal) => normalizeDealFinancialFields(deal as Deal)),
      dealFiles: parsed.dealFiles,
      activityEvents: parsed.activityEvents,
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
  async save(fileId: string, content: StoredFileContent): Promise<string | null> {
    if (!content || !isBrowserStorageAvailable()) return null;
    const dataUrl = typeof content === 'string' ? content : await blobToDataUrl(content);
    const storageKey = `${FILE_CONTENT_KEY_PREFIX}${fileId}`;
    window.localStorage.setItem(storageKey, dataUrl);
    return storageKey;
  }

  async getPreviewUrl(fileId: string): Promise<string | null> {
    if (!isBrowserStorageAvailable()) return null;
    return window.localStorage.getItem(`${FILE_CONTENT_KEY_PREFIX}${fileId}`);
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
    return Promise.all(files.map(async ({ storageKey: _storageKey, ...file }) => ({
      ...file,
      previewUrl: (await this.fileStorage.getPreviewUrl(file.id)) ?? file.previewUrl,
    })));
  }

  async getActivityEvents(): Promise<ActivityEvent[]> {
    return this.readState().activityEvents;
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
      price: deal.price.trim(),
      revenue: Number(deal.revenue) || parseDealRevenue(deal.price),
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
    this.writeState(state);
    return true;
  }

  async addFile(file: AddDealFileInput): Promise<DealFile> {
    const state = this.readState();
    const storageKey = await this.fileStorage.save(file.id, file.content);
    const { content: _content, ...metadata } = file;
    const persistedFile = {
      ...metadata,
      previewUrl: metadata.previewUrl ?? '/file.svg',
    };
    const savedFile = {
      ...persistedFile,
      previewUrl: storageKey ? (await this.fileStorage.getPreviewUrl(file.id)) ?? persistedFile.previewUrl : persistedFile.previewUrl,
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

export const crmRepository: CrmRepository = new LocalStorageCrmRepository();
