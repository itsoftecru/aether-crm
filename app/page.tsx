'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from '@hello-pangea/dnd';
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileText,
  FolderOpen,
  Home,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Phone,
  Search,
  Settings,
  UserRound,
  UsersRound,
  Wrench,
} from 'lucide-react';
import { ActivityTimeline } from '@/components/activity/ActivityTimeline';
import { DrawingEditor } from '@/components/drawings/DrawingEditor';
import { FileDropzone } from '@/components/files/FileDropzone';
import { FileList } from '@/components/files/FileList';
import { getNextFileVersion } from '@/components/files/fileUtils';
import type { ActivityEvent, Client, Deal, DealFile, DealStatus, DocumentKind, DrawingElement, Reminder } from '@/types/crm';

type ActiveSection = 'home' | 'clients' | 'deals' | 'drawings' | 'files' | 'settings';

type NavigationItem = {
  id: ActiveSection;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
};

const DEAL_STATUSES: DealStatus[] = ['lead', 'specApproval', 'inProgress', 'done'];

const STATUS_TITLES: Record<DealStatus, string> = {
  lead: 'Обращение',
  specApproval: 'Согласование ТЗ',
  inProgress: 'В работе',
  done: 'Выполнено',
};

const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: 'home', title: 'Главная', icon: Home },
  { id: 'clients', title: 'Клиенты', icon: UsersRound },
  { id: 'deals', title: 'Сделки', icon: ClipboardList },
  { id: 'drawings', title: 'Чертежи', icon: FileText },
  { id: 'files', title: 'Файлы', icon: FolderOpen },
  { id: 'settings', title: 'Настройки', icon: Settings },
];


const DOCUMENT_BUTTONS: { kind: DocumentKind; label: string; filePrefix: string; title: string }[] = [
  { kind: 'proposal', label: 'КП', filePrefix: 'КП', title: 'Коммерческое предложение' },
  { kind: 'contract', label: 'Договор', filePrefix: 'Договор', title: 'Договор' },
  { kind: 'invoice', label: 'Счёт', filePrefix: 'Счёт', title: 'Счёт' },
  { kind: 'completionAct', label: 'Акт', filePrefix: 'Акт', title: 'Акт выполненных работ' },
];

const DOCUMENT_TITLES: Record<DocumentKind, string> = DOCUMENT_BUTTONS.reduce(
  (accumulator, document) => ({
    ...accumulator,
    [document.kind]: document.title,
  }),
  {} as Record<DocumentKind, string>,
);

const INITIAL_CLIENTS: Client[] = [
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

const INITIAL_DEALS: Deal[] = [
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
    notes: 'Заказ смонтирован, акты подписаны, ожидается финальная оплата.',
  },
];


const INITIAL_REMINDERS: Reminder[] = [
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

const INITIAL_DEAL_FILES: DealFile[] = [
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

const INITIAL_ACTIVITY_EVENTS: ActivityEvent[] = [
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

const statusStyles: Record<DealStatus, string> = {
  lead: 'border-slate-200 bg-slate-100 text-slate-700',
  specApproval: 'border-orange-200 bg-orange-50 text-orange-700',
  inProgress: 'border-blue-200 bg-blue-50 text-blue-700',
  done: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};



function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getTomorrow(date: Date): Date {
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00.000Z`));
}


function generateDocumentText(deal: Deal, client: Client, kind: DocumentKind): string {
  const documentTitle = DOCUMENT_TITLES[kind];
  const generatedAt = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  return [
    documentTitle.toUpperCase(),
    '',
    `Номер сделки: ${deal.id}`,
    `Дата формирования: ${generatedAt}`,
    '',
    'Данные клиента',
    `Клиент: ${client.name}`,
    `Компания: ${client.company}`,
    `Телефон: ${client.phone}`,
    `Email: ${client.email}`,
    `Адрес: ${client.address}`,
    '',
    'Данные сделки',
    `Название: ${deal.title}`,
    `Статус: ${STATUS_TITLES[deal.status]}`,
    `Ответственный: ${deal.owner}`,
    `Дата создания: ${deal.createdAt}`,
    `Плановый срок: ${deal.dueDate}`,
    `Стоимость: ${deal.price}`,
    '',
    'Описание и примечания',
    deal.notes,
    '',
    'Документ сформирован автоматически в AetherCRM.',
  ].join('\n');
}

function groupDealsByStatus(deals: Deal[]): Record<DealStatus, Deal[]> {
  return DEAL_STATUSES.reduce(
    (accumulator, status) => ({
      ...accumulator,
      [status]: deals.filter((deal) => deal.status === status),
    }),
    {} as Record<DealStatus, Deal[]>,
  );
}

function flattenColumns(columns: Record<DealStatus, Deal[]>): Deal[] {
  return DEAL_STATUSES.flatMap((status) => columns[status]);
}

function reorderColumn(items: Deal[], startIndex: number, endIndex: number): Deal[] {
  const nextItems = Array.from(items);
  const [removed] = nextItems.splice(startIndex, 1);
  nextItems.splice(endIndex, 0, removed);
  return nextItems;
}

function moveDealBetweenColumns(
  sourceItems: Deal[],
  destinationItems: Deal[],
  sourceIndex: number,
  destinationIndex: number,
  destinationStatus: DealStatus,
): { source: Deal[]; destination: Deal[] } {
  const nextSource = Array.from(sourceItems);
  const nextDestination = Array.from(destinationItems);
  const [movedDeal] = nextSource.splice(sourceIndex, 1);

  nextDestination.splice(destinationIndex, 0, {
    ...movedDeal,
    status: destinationStatus,
  });

  return {
    source: nextSource,
    destination: nextDestination,
  };
}

export default function HomePage() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('home');
  const [selectedClientId, setSelectedClientId] = useState(INITIAL_CLIENTS[0].id);
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS);
  const [dealFiles, setDealFiles] = useState<DealFile[]>(INITIAL_DEAL_FILES);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>(INITIAL_ACTIVITY_EVENTS);
  const [drawingDealId, setDrawingDealId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const objectUrlsRef = useRef<string[]>([]);

  const normalizedSearchQuery = searchQuery.toLowerCase().trim();

  const filteredClients = useMemo(() => {
    if (!normalizedSearchQuery) {
      return INITIAL_CLIENTS;
    }

    return INITIAL_CLIENTS.filter((client) =>
      [client.name, client.company, client.phone, client.email].some((value) =>
        value.toLowerCase().trim().includes(normalizedSearchQuery),
      ),
    );
  }, [normalizedSearchQuery]);

  const filteredDeals = useMemo(() => {
    if (!normalizedSearchQuery) {
      return deals;
    }

    return deals.filter((deal) =>
      [deal.id, deal.title, deal.client, deal.notes].some((value) =>
        value.toLowerCase().trim().includes(normalizedSearchQuery),
      ),
    );
  }, [deals, normalizedSearchQuery]);

  const columns = useMemo(() => groupDealsByStatus(filteredDeals), [filteredDeals]);
  const allDeals = filteredDeals;
  const hasSearchQuery = normalizedSearchQuery.length > 0;
  const hasSearchResults = filteredClients.length > 0 || filteredDeals.length > 0;
  const activeNavigationItem = NAVIGATION_ITEMS.find((item) => item.id === activeSection) ?? NAVIGATION_ITEMS[0];

  const selectedClient = useMemo(() => {
    return filteredClients.find((client) => client.id === selectedClientId) ?? filteredClients[0] ?? null;
  }, [filteredClients, selectedClientId]);

  const selectedClientDeals = useMemo(() => {
    return selectedClient ? allDeals.filter((deal) => deal.clientId === selectedClient.id) : [];
  }, [allDeals, selectedClient]);

  const totalValue = useMemo(() => {
    return allDeals
      .reduce((sum, deal) => sum + Number(deal.price.replace(/[^\d]/g, '')), 0)
      .toLocaleString('ru-RU');
  }, [allDeals]);

  const totalDeals = useMemo(() => allDeals.length, [allDeals]);

  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const tomorrowKey = toDateKey(getTomorrow(today));

  const upcomingReminders = useMemo(() => {
    return INITIAL_REMINDERS.filter((reminder) => {
      const dueKey = toDateKey(new Date(reminder.dueAt));
      return !reminder.isDone && (dueKey === todayKey || dueKey === tomorrowKey);
    });
  }, [todayKey, tomorrowKey]);

  const overdueDeals = useMemo(() => {
    return deals.filter((deal) => deal.status !== 'done' && deal.dueDate < todayKey);
  }, [deals, todayKey]);

  const drawingDeal = useMemo(() => {
    return drawingDealId ? deals.find((deal) => deal.id === drawingDealId) ?? null : null;
  }, [deals, drawingDealId]);

  const drawingFiles = useMemo(() => dealFiles.filter((file) => file.drawingData), [dealFiles]);

  const handleDealFilesSelected = useCallback((dealId: string, files: File[]) => {
    setDealFiles((currentFiles) => {
      const stagedFiles: DealFile[] = [];
      const stagedEvents: ActivityEvent[] = [];
      const batchTimestamp = Date.now();

      files.forEach((file, index) => {
        const previewUrl = URL.createObjectURL(file);
        const uploadedAt = new Date(batchTimestamp + index).toISOString();
        const version = getNextFileVersion([...currentFiles, ...stagedFiles], dealId, file.name);

        objectUrlsRef.current.push(previewUrl);
        stagedFiles.push({
          id: `file-${dealId}-${batchTimestamp}-${index}`,
          dealId,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          version,
          uploadedAt,
          previewUrl,
        });
        stagedEvents.push({
          id: `activity-file-${dealId}-${batchTimestamp}-${index}`,
          dealId,
          timestamp: uploadedAt,
          type: 'fileUploaded',
          message: `Загружен файл «${file.name}» версии ${version}.`,
        });
      });

      if (stagedEvents.length > 0) {
        setActivityEvents((currentEvents) => [...stagedEvents, ...currentEvents]);
      }

      return [...stagedFiles, ...currentFiles];
    });
  }, []);


  const handleGenerateDocument = useCallback((deal: Deal, kind: DocumentKind) => {
    const client = INITIAL_CLIENTS.find((currentClient) => currentClient.id === deal.clientId);

    if (!client) {
      return;
    }

    const documentConfig = DOCUMENT_BUTTONS.find((document) => document.kind === kind);
    const documentTitle = documentConfig?.title ?? DOCUMENT_TITLES[kind];
    const fileName = `${documentConfig?.filePrefix ?? documentTitle}_${deal.id}.txt`;
    const text = generateDocumentText(deal, client, kind);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const previewUrl = URL.createObjectURL(blob);
    const generatedAt = new Date().toISOString();
    const timestamp = Date.now();

    objectUrlsRef.current.push(previewUrl);

    setDealFiles((currentFiles) => [
      {
        id: `document-file-${deal.id}-${kind}-${timestamp}`,
        dealId: deal.id,
        name: fileName,
        type: 'text/plain',
        size: blob.size,
        version: getNextFileVersion(currentFiles, deal.id, fileName),
        uploadedAt: generatedAt,
        previewUrl,
      },
      ...currentFiles,
    ]);

    setActivityEvents((currentEvents) => [
      {
        id: `activity-document-${deal.id}-${kind}-${timestamp}`,
        dealId: deal.id,
        timestamp: generatedAt,
        type: 'documentGenerated',
        message: `Сформирован документ «${documentTitle}» и добавлен файл «${fileName}».`,
      },
      ...currentEvents,
    ]);
  }, []);

  const handleDrawingSave = useCallback(
    (dealId: string, drawing: { name: string; elements: DrawingElement[]; svg: string }) => {
      const blob = new Blob([drawing.svg], { type: 'image/svg+xml;charset=utf-8' });
      const previewUrl = URL.createObjectURL(blob);
      objectUrlsRef.current.push(previewUrl);

      setDealFiles((currentFiles) => [
        {
          id: `drawing-file-${dealId}-${Date.now()}`,
          dealId,
          name: drawing.name,
          type: 'image/svg+xml',
          size: blob.size,
          version: getNextFileVersion(currentFiles, dealId, drawing.name),
          uploadedAt: new Date().toISOString(),
          previewUrl,
          drawingData: {
            format: 'svg',
            elements: drawing.elements,
            svg: drawing.svg,
          },
        },
        ...currentFiles,
      ]);

      setActivityEvents((currentEvents) => [
        {
          id: `activity-drawing-${dealId}-${Date.now()}`,
          dealId,
          timestamp: new Date().toISOString(),
          type: 'drawingCreated',
          message: `Создан чертёж «${drawing.name}» с ${drawing.elements.length} объектами.`,
        },
        ...currentEvents,
      ]);
      setDrawingDealId(null);
    },
    [],
  );

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source } = result;

    if (!destination) {
      return;
    }

    const sourceStatus = source.droppableId as DealStatus;
    const destinationStatus = destination.droppableId as DealStatus;

    if (!DEAL_STATUSES.includes(sourceStatus) || !DEAL_STATUSES.includes(destinationStatus)) {
      return;
    }

    if (sourceStatus === destinationStatus && source.index === destination.index) {
      return;
    }

    if (hasSearchQuery) {
      return;
    }

    setDeals((currentDeals) => {
      const currentColumns = groupDealsByStatus(currentDeals);

      if (sourceStatus === destinationStatus) {
        return flattenColumns({
          ...currentColumns,
          [sourceStatus]: reorderColumn(currentColumns[sourceStatus], source.index, destination.index),
        });
      }

      const movedDeal = currentColumns[sourceStatus][source.index];
      const moved = moveDealBetweenColumns(
        currentColumns[sourceStatus],
        currentColumns[destinationStatus],
        source.index,
        destination.index,
        destinationStatus,
      );

      if (movedDeal) {
        setActivityEvents((currentEvents) => [
          {
            id: `activity-status-${movedDeal.id}-${Date.now()}`,
            dealId: movedDeal.id,
            timestamp: new Date().toISOString(),
            type: 'statusChanged',
            message: `Статус изменён: «${STATUS_TITLES[sourceStatus]}» → «${STATUS_TITLES[destinationStatus]}».`,
          },
          ...currentEvents,
        ]);
      }

      return flattenColumns({
        ...currentColumns,
        [sourceStatus]: moved.source,
        [destinationStatus]: moved.destination,
      });
    });
  };

  useEffect(() => {
    if (selectedClient && selectedClient.id !== selectedClientId) {
      setSelectedClientId(selectedClient.id);
    }
  }, [selectedClient, selectedClientId]);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      {drawingDeal ? (
        <DrawingEditor
          dealId={drawingDeal.id}
          dealTitle={drawingDeal.title}
          onSave={handleDrawingSave}
          onClose={() => setDrawingDealId(null)}
        />
      ) : null}
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white px-5 py-6 shadow-sm lg:block">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold">AetherCRM</p>
              <p className="text-sm text-slate-500">Проектные заказы</p>
            </div>
          </div>

          <nav className="space-y-2" aria-label="Основная навигация">
            {NAVIGATION_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeSection;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    isActive
                      ? 'bg-slate-950 text-white shadow-lg shadow-slate-900/15'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Рабочая область
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  {activeNavigationItem.title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Переключайтесь между разделами CRM: сводкой, клиентами, сделками, чертежами, файлами и настройками.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(2,minmax(120px,auto))_minmax(320px,420px)]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Сделок</p>
                  <p className="text-2xl font-bold text-slate-950">{totalDeals}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Портфель</p>
                  <p className="text-2xl font-bold text-slate-950">{totalValue} ₽</p>
                </div>
                <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:col-span-2 xl:col-span-1" aria-label="Уведомления">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-amber-700" />
                      <h2 className="text-sm font-bold text-slate-950">Уведомления</h2>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-amber-700">
                      {upcomingReminders.length + overdueDeals.length}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <p className="mb-2 font-semibold uppercase tracking-[0.14em] text-amber-700">Сегодня / завтра</p>
                      {upcomingReminders.length > 0 ? (
                        <ul className="space-y-2">
                          {upcomingReminders.map((reminder) => (
                            <li key={reminder.id} className="rounded-xl bg-white p-2 text-slate-700">
                              <p className="font-semibold text-slate-950">{reminder.title}</p>
                              <p className="mt-1 text-slate-500">{formatDateTime(reminder.dueAt)}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="rounded-xl bg-white p-2 text-slate-500">Нет ближайших напоминаний.</p>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 flex items-center gap-1 font-semibold uppercase tracking-[0.14em] text-red-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Просрочено
                      </p>
                      {overdueDeals.length > 0 ? (
                        <ul className="space-y-2">
                          {overdueDeals.map((deal) => (
                            <li key={deal.id} className="rounded-xl border border-red-100 bg-white p-2 text-slate-700">
                              <p className="font-semibold text-slate-950">{deal.title}</p>
                              <p className="mt-1">Клиент: {deal.client}</p>
                              <p className="mt-1">Срок: {formatDate(deal.dueDate)}</p>
                              <p className="mt-1">Статус: {STATUS_TITLES[deal.status]}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="rounded-xl bg-white p-2 text-slate-500">Нет просроченных сделок.</p>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </header>

          <section className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
            <label htmlFor="workspace-search" className="mb-2 block text-sm font-semibold text-slate-700">
              Поиск по клиентам и сделкам
            </label>
            <div className="relative max-w-3xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="workspace-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Введите имя, компанию, телефон, email, номер сделки, название или заметку"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200"
              />
            </div>
            {hasSearchQuery ? (
              <p className="mt-3 text-sm text-slate-500">
                Найдено клиентов: {filteredClients.length}, сделок: {filteredDeals.length}.
              </p>
            ) : null}
          </section>

          {activeSection === 'home' ? (
          <section className="border-b border-slate-200 bg-slate-50 px-5 py-6 sm:px-8">
            <div className="grid gap-5 lg:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Сделки</p>
                <p className="mt-3 text-4xl font-bold text-slate-950">{totalDeals}</p>
                <p className="mt-2 text-sm text-slate-500">Активный пайплайн по текущему поиску.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Клиенты</p>
                <p className="mt-3 text-4xl font-bold text-slate-950">{filteredClients.length}</p>
                <p className="mt-2 text-sm text-slate-500">Карточки клиентов в базе CRM.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Портфель</p>
                <p className="mt-3 text-4xl font-bold text-slate-950">{totalValue} ₽</p>
                <p className="mt-2 text-sm text-slate-500">Суммарная стоимость сделок.</p>
              </div>
              <div className="rounded-3xl border border-red-100 bg-red-50 p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-700">Просрочки</p>
                <p className="mt-3 text-4xl font-bold text-slate-950">{overdueDeals.length}</p>
                <p className="mt-2 text-sm text-slate-600">Сделки не в статусе «Выполнено» с истекшим сроком.</p>
              </div>
            </div>
          </section>
          ) : null}

          {activeSection === 'clients' ? (hasSearchResults ? (
          <section className="border-b border-slate-200 bg-slate-50 px-5 py-6 sm:px-8">
            <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-950">Клиенты</h2>
                    <p className="text-sm text-slate-500">Выберите клиента для просмотра полной карточки</p>
                  </div>
                  <UsersRound className="h-5 w-5 text-slate-400" />
                </div>

                <div className="space-y-2">
                  {filteredClients.length > 0 ? filteredClients.map((client) => {
                    const isSelected = client.id === selectedClient?.id;
                    const clientDealsCount = allDeals.filter((deal) => deal.clientId === client.id).length;

                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => setSelectedClientId(client.id)}
                        className={`w-full rounded-2xl border p-3 text-left transition ${
                          isSelected
                            ? 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-900/15'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block font-bold">{client.name}</span>
                        <span className={`mt-1 block text-sm ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                          {client.company} · {clientDealsCount} сделок
                        </span>
                      </button>
                    );
                  }) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                      Клиенты не найдены. Попробуйте изменить поисковый запрос.
                    </div>
                  )}
                </div>
              </div>

              {selectedClient ? (
              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Карточка клиента</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-950">{selectedClient.name}</h2>
                    <p className="text-sm text-slate-500">{selectedClient.company}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <p className="font-semibold text-slate-950">Комментарий менеджера</p>
                    <p className="mt-1 max-w-xl leading-6">{selectedClient.comments}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm">
                    <p className="mb-1 flex items-center gap-2 font-semibold text-slate-950"><Phone className="h-4 w-4" />Телефон</p>
                    <p className="text-slate-600">{selectedClient.phone}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm">
                    <p className="mb-1 flex items-center gap-2 font-semibold text-slate-950"><Mail className="h-4 w-4" />Email</p>
                    <p className="break-all text-slate-600">{selectedClient.email}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm">
                    <p className="mb-1 flex items-center gap-2 font-semibold text-slate-950"><MessageCircle className="h-4 w-4" />Мессенджеры</p>
                    <p className="text-slate-600">{selectedClient.messengers.join(', ')}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm">
                    <p className="mb-1 flex items-center gap-2 font-semibold text-slate-950"><MapPin className="h-4 w-4" />Адрес</p>
                    <p className="text-slate-600">{selectedClient.address}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <section className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="font-bold text-slate-950">История заказов</h3>
                    <div className="mt-3 space-y-3">
                      {selectedClientDeals.map((deal) => (
                        <div key={deal.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-950">{deal.title}</p>
                              <p className="mt-1 text-slate-500">Создано: {deal.createdAt} · Срок: {deal.dueDate}</p>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2 py-1 text-xs font-bold ${statusStyles[deal.status]}`}>
                              {STATUS_TITLES[deal.status]}
                            </span>
                          </div>
                          <p className="mt-2 font-bold text-slate-950">{deal.price}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="font-bold text-slate-950">История коммуникаций</h3>
                    <ol className="mt-3 space-y-3">
                      {selectedClient.communications.map((communication) => (
                        <li key={communication.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-slate-950">{communication.channel}</p>
                            <time className="text-xs text-slate-500">{communication.date}</time>
                          </div>
                          <p className="mt-2 leading-5 text-slate-600">{communication.summary}</p>
                          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                            {communication.manager}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>
              </article>
              ) : (
              <article className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                <h2 className="text-xl font-bold text-slate-950">Клиент не выбран</h2>
                <p className="mt-2 text-sm text-slate-500">
                  По текущему запросу нет клиентов. Карточка клиента появится после изменения поиска.
                </p>
              </article>
              )}
            </div>
          </section>
          ) : (
          <section className="border-b border-slate-200 bg-slate-50 px-5 py-10 sm:px-8">
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-bold text-slate-950">Ничего не найдено</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                По запросу «{searchQuery.trim()}» нет совпадений среди клиентов и сделок.
                Проверьте написание или попробуйте другой номер телефона, email, название сделки или заметку.
              </p>
            </div>
          </section>
          )) : null}

          {activeSection === 'deals' ? (
          <div className="flex-1 overflow-x-auto px-5 py-6 sm:px-8">
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="grid min-w-[1120px] grid-cols-4 gap-5">
                {DEAL_STATUSES.map((status) => (
                  <section key={status} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="font-bold text-slate-950">{STATUS_TITLES[status]}</h2>
                        <p className="text-sm text-slate-500">{columns[status].length} карточек</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[status]}`}>
                        {STATUS_TITLES[status]}
                      </span>
                    </div>

                    <Droppable droppableId={status}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[620px] rounded-2xl p-2 transition ${
                            snapshot.isDraggingOver ? 'bg-slate-100 ring-2 ring-slate-300' : 'bg-slate-50'
                          }`}
                        >
                          {columns[status].map((deal, index) => (
                            <Draggable key={deal.id} draggableId={deal.id} index={index} isDragDisabled={hasSearchQuery}>
                              {(dragProvided, dragSnapshot) => (
                                <article
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={`card mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
                                    dragSnapshot.isDragging ? 'rotate-1 shadow-2xl ring-2 ring-slate-300' : ''
                                  }`}
                                >
                                  <div className="mb-3 flex items-start justify-between gap-3">
                                    <div>
                                      <h3 className="font-bold leading-6 text-slate-950">{deal.title}</h3>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedClientId(deal.clientId);
                                          setActiveSection('clients');
                                        }}
                                        className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
                                      >
                                        <UserRound className="h-4 w-4" />
                                        {deal.client}
                                      </button>
                                    </div>
                                    <CheckCircle2 className="mt-1 h-5 w-5 text-slate-300" />
                                  </div>

                                  <dl className="space-y-2 text-sm text-slate-600">
                                    <div className="flex items-center justify-between gap-3">
                                      <dt className="flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4" />
                                        Создано
                                      </dt>
                                      <dd className="font-medium text-slate-900">{deal.createdAt}</dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                      <dt className="flex items-center gap-2">
                                        <Wrench className="h-4 w-4" />
                                        Статус
                                      </dt>
                                      <dd className="font-medium text-slate-900">{STATUS_TITLES[deal.status]}</dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                      <dt className="flex items-center gap-2">
                                        <UserRound className="h-4 w-4" />
                                        Ответственный
                                      </dt>
                                      <dd className="font-medium text-slate-900">{deal.owner}</dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                      <dt className="flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4" />
                                        Срок
                                      </dt>
                                      <dd className="font-medium text-slate-900">{deal.dueDate}</dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                      <dt className="flex items-center gap-2">
                                        <CircleDollarSign className="h-4 w-4" />
                                        Стоимость
                                      </dt>
                                      <dd className="font-bold text-slate-950">{deal.price}</dd>
                                    </div>
                                  </dl>

                                  <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm leading-5 text-slate-600">
                                    <p className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                                      <MessageSquareText className="h-4 w-4" />
                                      Заметки
                                    </p>
                                    <p>{deal.notes}</p>
                                  </div>

                                  <section className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <div>
                                        <h4 className="text-sm font-bold text-slate-950">Файлы сделки</h4>
                                        <p className="text-xs text-slate-500">
                                          {dealFiles.filter((file) => file.dealId === deal.id).length} вложений
                                        </p>
                                      </div>
                                      <FolderOpen className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setDrawingDealId(deal.id)}
                                      className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
                                    >
                                      Создать чертеж
                                    </button>

                                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                      <div className="mb-3 flex items-center justify-between gap-2">
                                        <div>
                                          <h5 className="text-sm font-bold text-slate-950">Документы</h5>
                                          <p className="text-xs text-slate-500">Сформировать текстовый файл по сделке</p>
                                        </div>
                                        <FileText className="h-5 w-5 text-slate-400" />
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        {DOCUMENT_BUTTONS.map((document) => (
                                          <button
                                            key={document.kind}
                                            type="button"
                                            onClick={() => handleGenerateDocument(deal, document.kind)}
                                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-950"
                                          >
                                            {document.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <FileDropzone dealId={deal.id} onFilesSelected={handleDealFilesSelected} />
                                    <FileList files={dealFiles.filter((file) => file.dealId === deal.id)} />
                                  </section>

                                  <ActivityTimeline events={activityEvents.filter((event) => event.dealId === deal.id)} />
                                </article>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </section>
                ))}
              </div>
            </DragDropContext>
          </div>
          ) : null}

          {activeSection === 'drawings' ? (
          <section className="flex-1 px-5 py-6 sm:px-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-950">Созданные чертежи</h2>
              <p className="mt-2 text-sm text-slate-500">Файлы сделок, созданные во встроенном редакторе чертежей.</p>
              {drawingFiles.length > 0 ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {drawingFiles.map((file) => {
                    const deal = deals.find((currentDeal) => currentDeal.id === file.dealId);
                    return (
                      <article key={file.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="font-bold text-slate-950">{file.name}</p>
                        <p className="mt-1 text-sm text-slate-500">Сделка: {deal?.title ?? file.dealId}</p>
                        <p className="mt-1 text-sm text-slate-500">Версия {file.version} · {formatDateTime(file.uploadedAt)}</p>
                        <p className="mt-2 text-sm text-slate-600">Объектов на чертеже: {file.drawingData?.elements.length ?? 0}</p>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Чертежи пока не созданы. Откройте раздел «Сделки» и нажмите «Создать чертеж» в карточке сделки.
                </div>
              )}
            </div>
          </section>
          ) : null}

          {activeSection === 'files' ? (
          <section className="flex-1 px-5 py-6 sm:px-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-950">Все файлы сделок</h2>
              <p className="mt-2 text-sm text-slate-500">Единый список загруженных файлов, документов и чертежей.</p>
              <div className="mt-5">
                <FileList files={dealFiles} />
              </div>
            </div>
          </section>
          ) : null}

          {activeSection === 'settings' ? (
          <section className="flex-1 px-5 py-6 sm:px-8">
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <Settings className="mx-auto h-10 w-10 text-slate-400" />
              <h2 className="mt-4 text-2xl font-bold text-slate-950">Настройки появятся позже</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                MVP-раздел для будущих настроек команды, статусов, шаблонов документов и прав доступа.
              </p>
            </div>
          </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}
