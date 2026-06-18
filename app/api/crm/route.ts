import { NextRequest, NextResponse } from 'next/server';
import { getSqliteCrmStore } from '@/lib/server/sqliteCrmStore';
import type { StoredFileContent } from '@/lib/storage/fileStorage';
import type { ActivityEvent, Client, CrmSettings, Deal, DealCostCategory, DealFile, DealStatus, Reminder } from '@/types/crm';

export const runtime = 'nodejs';

type CrmActionRequest = {
  action: string;
  payload?: unknown;
};


function jsonResponse<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}


class CrmValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrmValidationError';
  }
}

const DEAL_STATUSES = ['lead', 'specApproval', 'inProgress', 'done'] as const satisfies readonly DealStatus[];
const COST_CATEGORIES = [
  'rawMaterial',
  'factoryLoading',
  'workshopDelivery',
  'employeeLabor',
  'paintShopLogistics',
  'painting',
  'other',
] as const satisfies readonly DealCostCategory[];
const REMINDER_PRIORITIES = ['low', 'medium', 'high'] as const;
const REMINDER_TYPES = ['call', 'meeting', 'payment', 'task'] as const;
const DOCUMENT_KINDS = ['proposal', 'contract', 'invoice', 'completionAct'] as const;
const DRAWING_TOOLS = ['line', 'hem', 'rectangle', 'circle', 'dimension', 'angleDimension', 'text', 'profile'] as const;
const BEND_TYPES = ['straight', 'bend', 'hem', 'lock', 'dripEdge'] as const;

function validationError(message: string): never {
  throw new CrmValidationError(message);
}

function requireString(record: Record<string, unknown>, field: string, context: string): string {
  const value = record[field];
  if (typeof value !== 'string') validationError(`${context}: поле «${field}» должно быть строкой.`);
  if (!value.trim()) validationError(`${context}: поле «${field}» обязательно для заполнения.`);
  return value;
}

function optionalString(record: Record<string, unknown>, field: string, context: string): string | undefined {
  const value = record[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') validationError(`${context}: поле «${field}» должно быть строкой.`);
  return value;
}

function requireBoolean(record: Record<string, unknown>, field: string, context: string): boolean {
  const value = record[field];
  if (typeof value !== 'boolean') validationError(`${context}: поле «${field}» должно быть булевым значением.`);
  return value;
}

function requireNonNegativeNumber(record: Record<string, unknown>, field: string, context: string): number {
  const value = record[field];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    validationError(`${context}: поле «${field}» должно быть конечным числом.`);
  }
  if (value < 0) validationError(`${context}: поле «${field}» не может быть отрицательным.`);
  return value;
}

function optionalNonNegativeNumber(record: Record<string, unknown>, field: string, context: string): number | undefined {
  const value = record[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    validationError(`${context}: поле «${field}» должно быть конечным числом.`);
  }
  if (value < 0) validationError(`${context}: поле «${field}» не может быть отрицательным.`);
  return value;
}

function requireIsoDate(record: Record<string, unknown>, field: string, context: string): string {
  const value = requireString(record, field, context);
  if (Number.isNaN(Date.parse(value))) validationError(`${context}: поле «${field}» должно содержать корректную дату.`);
  return value;
}

function optionalIsoDate(record: Record<string, unknown>, field: string, context: string): string | null | undefined {
  const value = record[field];
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string' || !value.trim() || Number.isNaN(Date.parse(value))) {
    validationError(`${context}: поле «${field}» должно содержать корректную дату или null.`);
  }
  return value;
}

function requireArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) validationError(`${context}: ожидается массив.`);
  return value;
}

function requireEnum<T extends readonly string[]>(value: unknown, allowed: T, field: string, context: string): T[number] {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    validationError(`${context}: поле «${field}» содержит недопустимое значение.`);
  }
  return value;
}

export function validateDealStatus(value: unknown): DealStatus {
  return requireEnum(value, DEAL_STATUSES, 'status', 'Статус сделки');
}

function validateCostItem(value: unknown, expectedCategory: DealCostCategory): Deal['financials'][DealCostCategory][number] {
  const record = requireRecord(value);
  const category = requireEnum(record.category, COST_CATEGORIES, 'category', 'Строка финансов сделки');
  if (category !== expectedCategory) validationError('Строка финансов сделки: категория не совпадает с разделом financials.');
  return {
    id: requireString(record, 'id', 'Строка финансов сделки'),
    category,
    title: requireString(record, 'title', 'Строка финансов сделки'),
    amount: requireNonNegativeNumber(record, 'amount', 'Строка финансов сделки'),
    hours: optionalNonNegativeNumber(record, 'hours', 'Строка финансов сделки'),
    hourlyRate: optionalNonNegativeNumber(record, 'hourlyRate', 'Строка финансов сделки'),
    comment: optionalString(record, 'comment', 'Строка финансов сделки'),
  };
}

function validateFinancials(value: unknown): Deal['financials'] {
  const record = requireRecord(value);
  const financials: Deal['financials'] = {
    rawMaterial: [],
    factoryLoading: [],
    workshopDelivery: [],
    employeeLabor: [],
    paintShopLogistics: [],
    painting: [],
    other: [],
  };
  COST_CATEGORIES.forEach((category) => {
    financials[category] = requireArray(record[category], `Финансы сделки: категория «${category}»`)
      .map((item) => validateCostItem(item, category));
  });
  return financials;
}

export function validateDealPayload(value: unknown): Deal {
  const record = requireRecord(value);
  return {
    id: requireString(record, 'id', 'Сделка'),
    title: requireString(record, 'title', 'Сделка'),
    clientId: requireString(record, 'clientId', 'Сделка'),
    client: requireString(record, 'client', 'Сделка'),
    createdAt: requireIsoDate(record, 'createdAt', 'Сделка'),
    status: validateDealStatus(record.status),
    owner: requireString(record, 'owner', 'Сделка'),
    dueDate: requireIsoDate(record, 'dueDate', 'Сделка'),
    revenueAmount: requireNonNegativeNumber(record, 'revenueAmount', 'Сделка'),
    currency: requireEnum(record.currency, ['RUB'] as const, 'currency', 'Сделка'),
    financials: validateFinancials(record.financials),
    notes: requireString(record, 'notes', 'Сделка'),
  };
}

function validateCommunication(value: unknown): Client['communications'][number] {
  const record = requireRecord(value);
  return {
    id: requireString(record, 'id', 'Коммуникация клиента'),
    date: requireIsoDate(record, 'date', 'Коммуникация клиента'),
    channel: requireString(record, 'channel', 'Коммуникация клиента'),
    summary: requireString(record, 'summary', 'Коммуникация клиента'),
    manager: requireString(record, 'manager', 'Коммуникация клиента'),
  };
}

export function validateClientPayload(value: unknown): Client {
  const record = requireRecord(value);
  return {
    id: requireString(record, 'id', 'Клиент'),
    name: requireString(record, 'name', 'Клиент'),
    company: requireString(record, 'company', 'Клиент'),
    phone: requireString(record, 'phone', 'Клиент'),
    email: requireString(record, 'email', 'Клиент'),
    messengers: requireArray(record.messengers, 'Клиент: поле «messengers»').map((item) => {
      if (typeof item !== 'string') validationError('Клиент: каждый мессенджер должен быть строкой.');
      return item;
    }),
    address: requireString(record, 'address', 'Клиент'),
    comments: requireString(record, 'comments', 'Клиент'),
    communications: requireArray(record.communications, 'Клиент: поле «communications»').map(validateCommunication),
  };
}

export function validateReminderPayload(value: unknown): Reminder {
  const record = requireRecord(value);
  return {
    id: requireString(record, 'id', 'Напоминание'),
    dealId: requireString(record, 'dealId', 'Напоминание'),
    clientId: requireString(record, 'clientId', 'Напоминание'),
    managerId: requireString(record, 'managerId', 'Напоминание'),
    title: requireString(record, 'title', 'Напоминание'),
    description: requireString(record, 'description', 'Напоминание'),
    dueAt: requireIsoDate(record, 'dueAt', 'Напоминание'),
    isDone: requireBoolean(record, 'isDone', 'Напоминание'),
    completedAt: optionalIsoDate(record, 'completedAt', 'Напоминание'),
    isOverdue: requireBoolean(record, 'isOverdue', 'Напоминание'),
    priority: requireEnum(record.priority, REMINDER_PRIORITIES, 'priority', 'Напоминание'),
    type: requireEnum(record.type, REMINDER_TYPES, 'type', 'Напоминание'),
  };
}

function validateDrawingPoint(value: unknown, context: string) {
  const record = requireRecord(value);
  return { x: requireNonNegativeNumber(record, 'x', context), y: requireNonNegativeNumber(record, 'y', context) };
}

function validateProfileSegment(value: unknown) {
  const record = requireRecord(value);
  return {
    id: requireString(record, 'id', 'Сегмент профиля'),
    lengthMm: requireNonNegativeNumber(record, 'lengthMm', 'Сегмент профиля'),
    angleDeg: typeof record.angleDeg === 'number' && Number.isFinite(record.angleDeg) ? record.angleDeg : 0,
    bendType: requireEnum(record.bendType, BEND_TYPES, 'bendType', 'Сегмент профиля'),
    label: optionalString(record, 'label', 'Сегмент профиля'),
    hemSizeMm: optionalNonNegativeNumber(record, 'hemSizeMm', 'Сегмент профиля'),
    hemDirection: record.hemDirection === undefined ? undefined : requireEnum(record.hemDirection, ['inside', 'outside'] as const, 'hemDirection', 'Сегмент профиля'),
    bendRadiusMm: optionalNonNegativeNumber(record, 'bendRadiusMm', 'Сегмент профиля'),
  };
}

function validateProductProfile(value: unknown) {
  const record = requireRecord(value);
  return {
    name: requireString(record, 'name', 'Профиль изделия'),
    segments: requireArray(record.segments, 'Профиль изделия: поле «segments»').map(validateProfileSegment),
    lengthMm: requireNonNegativeNumber(record, 'lengthMm', 'Профиль изделия'),
    quantity: requireNonNegativeNumber(record, 'quantity', 'Профиль изделия'),
    material: requireString(record, 'material', 'Профиль изделия'),
    thicknessMm: requireNonNegativeNumber(record, 'thicknessMm', 'Профиль изделия'),
    color: requireString(record, 'color', 'Профиль изделия'),
    notes: optionalString(record, 'notes', 'Профиль изделия'),
  };
}

function validateDrawingProduct(value: unknown) {
  const record = requireRecord(value);
  return {
    id: requireString(record, 'id', 'Изделие чертежа'),
    profileElementId: requireString(record, 'profileElementId', 'Изделие чертежа'),
    profileFormula: requireString(record, 'profileFormula', 'Изделие чертежа'),
    ...validateProductProfile(record),
    unfoldingMm: optionalNonNegativeNumber(record, 'unfoldingMm', 'Изделие чертежа'),
    areaM2: optionalNonNegativeNumber(record, 'areaM2', 'Изделие чертежа'),
  };
}

function validateDrawingData(value: unknown): DealFile['drawingData'] {
  if (value === undefined) return undefined;
  const record = requireRecord(value);
  return {
    format: requireEnum(record.format, ['svg'] as const, 'format', 'Чертёж файла сделки'),
    elements: requireArray(record.elements, 'Чертёж файла сделки: поле «elements»').map((element) => {
      const elementRecord = requireRecord(element);
      return {
        id: requireString(elementRecord, 'id', 'Элемент чертежа'),
        tool: requireEnum(elementRecord.tool, DRAWING_TOOLS, 'tool', 'Элемент чертежа'),
        start: validateDrawingPoint(elementRecord.start, 'Начальная точка элемента чертежа'),
        end: validateDrawingPoint(elementRecord.end, 'Конечная точка элемента чертежа'),
        vertex: elementRecord.vertex === undefined ? undefined : validateDrawingPoint(elementRecord.vertex, 'Вершина угла элемента чертежа'),
        text: optionalString(elementRecord, 'text', 'Элемент чертежа'),
        profile: elementRecord.profile === undefined ? undefined : validateProductProfile(elementRecord.profile),
        lengthMm: optionalNonNegativeNumber(elementRecord, 'lengthMm', 'Элемент чертежа'),
        hemSizeMm: optionalNonNegativeNumber(elementRecord, 'hemSizeMm', 'Элемент чертежа'),
        angleDeg: optionalNonNegativeNumber(elementRecord, 'angleDeg', 'Элемент чертежа'),
      };
    }),
    svg: requireString(record, 'svg', 'Чертёж файла сделки'),
    products: record.products === undefined ? undefined : requireArray(record.products, 'Чертёж файла сделки: поле «products»').map(validateDrawingProduct),
    title: optionalString(record, 'title', 'Чертёж файла сделки'),
    createdAt: optionalString(record, 'createdAt', 'Чертёж файла сделки'),
    version: optionalNonNegativeNumber(record, 'version', 'Чертёж файла сделки'),
    author: optionalString(record, 'author', 'Чертёж файла сделки'),
  };
}

export function validateDealFilePayload(value: unknown): DealFile {
  const record = requireRecord(value);
  return {
    id: requireString(record, 'id', 'Файл сделки'),
    dealId: requireString(record, 'dealId', 'Файл сделки'),
    name: requireString(record, 'name', 'Файл сделки'),
    type: requireString(record, 'type', 'Файл сделки'),
    size: requireNonNegativeNumber(record, 'size', 'Файл сделки'),
    version: requireNonNegativeNumber(record, 'version', 'Файл сделки'),
    uploadedAt: requireIsoDate(record, 'uploadedAt', 'Файл сделки'),
    previewUrl: requireString(record, 'previewUrl', 'Файл сделки'),
    drawingData: validateDrawingData(record.drawingData),
  };
}

export function validateSettingsPayload(value: unknown): CrmSettings {
  const record = requireRecord(value);
  const company = requireRecord(record.company);
  const money = requireRecord(record.money);
  return {
    teamMembers: requireArray(record.teamMembers, 'Настройки CRM: поле «teamMembers»').map((member) => {
      const item = requireRecord(member);
      return {
        id: requireString(item, 'id', 'Участник команды'),
        name: requireString(item, 'name', 'Участник команды'),
        role: requireString(item, 'role', 'Участник команды'),
        email: requireString(item, 'email', 'Участник команды'),
        phone: requireString(item, 'phone', 'Участник команды'),
        isActive: requireBoolean(item, 'isActive', 'Участник команды'),
      };
    }),
    dealStatuses: requireArray(record.dealStatuses, 'Настройки CRM: поле «dealStatuses»').map((status) => {
      const item = requireRecord(status);
      return {
        id: validateDealStatus(item.id),
        title: requireString(item, 'title', 'Статус сделки в настройках'),
        colorClassName: requireString(item, 'colorClassName', 'Статус сделки в настройках'),
        sortOrder: requireNonNegativeNumber(item, 'sortOrder', 'Статус сделки в настройках'),
        isActive: requireBoolean(item, 'isActive', 'Статус сделки в настройках'),
      };
    }),
    costCategories: requireArray(record.costCategories, 'Настройки CRM: поле «costCategories»').map((category) => {
      const item = requireRecord(category);
      return {
        id: requireEnum(item.id, COST_CATEGORIES, 'id', 'Категория затрат'),
        title: requireString(item, 'title', 'Категория затрат'),
        description: requireString(item, 'description', 'Категория затрат'),
        sortOrder: requireNonNegativeNumber(item, 'sortOrder', 'Категория затрат'),
        isActive: requireBoolean(item, 'isActive', 'Категория затрат'),
      };
    }),
    money: {
      currency: requireEnum(money.currency, ['RUB'] as const, 'currency', 'Денежные настройки'),
      locale: requireEnum(money.locale, ['ru-RU'] as const, 'locale', 'Денежные настройки'),
      minimumFractionDigits: requireNonNegativeNumber(money, 'minimumFractionDigits', 'Денежные настройки'),
      maximumFractionDigits: requireNonNegativeNumber(money, 'maximumFractionDigits', 'Денежные настройки'),
      roundingIncrement: requireNonNegativeNumber(money, 'roundingIncrement', 'Денежные настройки'),
      applyRoundingToDocuments: requireBoolean(money, 'applyRoundingToDocuments', 'Денежные настройки'),
    },
    company: {
      name: requireString(company, 'name', 'Компания'),
      legalName: requireString(company, 'legalName', 'Компания'),
      inn: requireString(company, 'inn', 'Компания'),
      kpp: requireString(company, 'kpp', 'Компания'),
      ogrn: requireString(company, 'ogrn', 'Компания'),
      address: requireString(company, 'address', 'Компания'),
      bankName: requireString(company, 'bankName', 'Компания'),
      bik: requireString(company, 'bik', 'Компания'),
      checkingAccount: requireString(company, 'checkingAccount', 'Компания'),
      correspondentAccount: requireString(company, 'correspondentAccount', 'Компания'),
      phone: requireString(company, 'phone', 'Компания'),
      email: requireString(company, 'email', 'Компания'),
    },
    documentTemplates: requireArray(record.documentTemplates, 'Настройки CRM: поле «documentTemplates»').map((template) => {
      const item = requireRecord(template);
      return {
        id: requireEnum(item.id, DOCUMENT_KINDS, 'id', 'Шаблон документа'),
        title: requireString(item, 'title', 'Шаблон документа'),
        filePrefix: requireString(item, 'filePrefix', 'Шаблон документа'),
        body: requireString(item, 'body', 'Шаблон документа'),
        isActive: requireBoolean(item, 'isActive', 'Шаблон документа'),
      };
    }),
  };
}

function ensureRelatedIdExists(items: { id: string }[], id: string, message: string): void {
  if (!items.some((item) => item.id === id)) validationError(message);
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    validationError('Некорректное тело запроса CRM API: ожидается JSON-объект.');
  }
  return value as Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  try {
    const fileId = request.nextUrl.searchParams.get('id');
    if (fileId) {
      const disposition = request.nextUrl.searchParams.get('disposition') === 'download' ? 'attachment' : 'inline';
      const store = getSqliteCrmStore();
      const file = store.getFileRecord(fileId);
      if (!file?.storageKey) return jsonResponse({ error: 'Файл не найден в файловом хранилище.' }, 404);
      const storage = store.getFileStorage();
      const externalUrl = disposition === 'attachment'
        ? await storage.getDownloadUrl(file.storageKey, file.id)
        : await storage.getPreviewUrl(file.storageKey, file.id);
      if (externalUrl && !externalUrl.startsWith('/api/crm/files')) return NextResponse.redirect(externalUrl);
      if (!storage.read) return jsonResponse({ error: 'Адаптер файлового хранилища не поддерживает прямое чтение.' }, 501);
      const object = await storage.read(file.storageKey);
      return new NextResponse(new Uint8Array(object.body), {
        headers: {
          'content-type': file.type || object.contentType,
          'content-length': String(object.body.byteLength),
          'content-disposition': `${disposition}; filename="${encodeURIComponent(file.name)}"`,
          'cache-control': 'private, max-age=300',
        },
      });
    }
    return jsonResponse(getSqliteCrmStore().getSnapshot());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка чтения CRM.';
    return jsonResponse({ error: message }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CrmActionRequest;
    if (!body || typeof body !== 'object' || typeof body.action !== 'string' || !body.action.trim()) {
      validationError('Некорректный запрос CRM API: поле «action» обязательно и должно быть строкой.');
    }
    const payload = requireRecord(body.payload ?? {});
    const store = getSqliteCrmStore();

    switch (body.action) {
      case 'importSnapshot':
        return jsonResponse(store.importSnapshot(payload));
      case 'updateSettings':
        return jsonResponse(store.setSettings(validateSettingsPayload(payload.settings)));
      case 'addDeal':
        {
          const deal = validateDealPayload(payload.deal);
          ensureRelatedIdExists(store.getSnapshot().clients, deal.clientId, 'Сделка: указанный клиент не найден.');
          return jsonResponse(store.upsertDeal(deal));
        }
      case 'updateDeal':
        {
          const dealId = requireString(payload, 'dealId', 'Обновление сделки');
          const snapshot = store.getSnapshot();
          const currentDeal = snapshot.deals.find((deal) => deal.id === dealId);
          if (!currentDeal) return jsonResponse(null);
          const patch = requireRecord(payload.patch);
          const updatedDeal = validateDealPayload({ ...currentDeal, ...patch, id: currentDeal.id, createdAt: currentDeal.createdAt });
          ensureRelatedIdExists(snapshot.clients, updatedDeal.clientId, 'Сделка: указанный клиент не найден.');
          return jsonResponse(store.updateDeal(dealId, updatedDeal));
        }
      case 'deleteDeal':
        return jsonResponse(store.deleteDeal(requireString(payload, 'dealId', 'Удаление сделки')));
      case 'addClient':
        return jsonResponse(store.upsertClient(validateClientPayload(payload.client)));
      case 'updateClient':
        {
          const clientId = requireString(payload, 'clientId', 'Обновление клиента');
          const currentClient = store.getSnapshot().clients.find((client) => client.id === clientId);
          if (!currentClient) return jsonResponse(null);
          const updatedClient = validateClientPayload({ ...currentClient, ...requireRecord(payload.patch), id: currentClient.id });
          return jsonResponse(store.updateClient(clientId, updatedClient));
        }
      case 'deleteClient':
        return jsonResponse(store.deleteClient(requireString(payload, 'clientId', 'Удаление клиента')));
      case 'addFile':
        {
          const fileRecord = requireRecord(payload.file);
          const file = validateDealFilePayload(fileRecord);
          ensureRelatedIdExists(store.getSnapshot().deals, file.dealId, 'Файл сделки: указанная сделка не найдена.');
          const storageResult = await store.getFileStorage().save({
            fileId: file.id,
            dealId: file.dealId,
            fileName: file.name,
            mimeType: file.type,
            content: (fileRecord.content ?? file.previewUrl) as StoredFileContent,
          });
          return jsonResponse(store.upsertDealFile({
            ...file,
            storageKey: storageResult.storageKey,
            previewUrl: storageResult.previewUrl ?? file.previewUrl ?? '/file.svg',
          }));
        }
      case 'addActivityEvent':
        return jsonResponse(store.upsertActivityEvent(payload.event as ActivityEvent));
      case 'addReminder':
        {
          const reminder = validateReminderPayload(payload.reminder);
          const snapshot = store.getSnapshot();
          ensureRelatedIdExists(snapshot.deals, reminder.dealId, 'Напоминание: указанная сделка не найдена.');
          ensureRelatedIdExists(snapshot.clients, reminder.clientId, 'Напоминание: указанный клиент не найден.');
          return jsonResponse(store.upsertReminder(reminder));
        }
      case 'updateReminder':
        {
          const reminderId = requireString(payload, 'reminderId', 'Обновление напоминания');
          const snapshot = store.getSnapshot();
          const currentReminder = snapshot.reminders.find((reminder) => reminder.id === reminderId);
          if (!currentReminder) return jsonResponse(null);
          const updatedReminder = validateReminderPayload({ ...currentReminder, ...requireRecord(payload.patch), id: currentReminder.id });
          ensureRelatedIdExists(snapshot.deals, updatedReminder.dealId, 'Напоминание: указанная сделка не найдена.');
          ensureRelatedIdExists(snapshot.clients, updatedReminder.clientId, 'Напоминание: указанный клиент не найден.');
          return jsonResponse(store.updateReminder(reminderId, updatedReminder));
        }
      case 'deleteReminder':
        return jsonResponse(store.deleteReminder(requireString(payload, 'reminderId', 'Удаление напоминания')));
      case 'completeReminder':
        return jsonResponse(store.updateReminder(requireString(payload, 'reminderId', 'Завершение напоминания'), {
          isDone: true,
          completedAt: new Date().toISOString(),
          isOverdue: false,
        }));
      case 'updateDealStatus':
        return jsonResponse(store.updateDeal(requireString(payload, 'dealId', 'Обновление статуса сделки'), { status: validateDealStatus(payload.status) }));
      case 'replaceDeals':
        {
          const deals = requireArray(payload.deals, 'Замена сделок: поле «deals»').map(validateDealPayload);
          const clients = store.getSnapshot().clients;
          deals.forEach((deal) => ensureRelatedIdExists(clients, deal.clientId, `Сделка «${deal.id}»: указанный клиент не найден.`));
          return jsonResponse(store.replaceDeals(deals));
        }
      default:
        return jsonResponse({ error: `Неизвестное действие CRM API: ${body.action}` }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка изменения CRM.';
    return jsonResponse({ error: message }, error instanceof CrmValidationError ? 400 : 500);
  }
}
