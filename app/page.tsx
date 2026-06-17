'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCorners,
  type DragEndEvent,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  UserRound,
  UsersRound,
  X,
  Wrench,
} from 'lucide-react';
import { ActivityTimeline } from '@/components/activity/ActivityTimeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DrawingEditor } from '@/components/drawings/DrawingEditor';
import { FileDropzone } from '@/components/files/FileDropzone';
import { FileList } from '@/components/files/FileList';
import { getNextFileVersion } from '@/components/files/fileUtils';
import { crmRepository, INITIAL_CLIENTS, INITIAL_DEALS, INITIAL_DEAL_FILES, INITIAL_ACTIVITY_EVENTS, INITIAL_REMINDERS } from '@/lib/crmRepository';
import {
  DEAL_COST_CATEGORIES,
  DEAL_COST_CATEGORY_TITLES,
  calculateDealCostItemTotal,
  calculateDealExpenses,
  calculateDealMarginPercent,
  calculateDealNetProfit,
  createEmptyDealFinancials,
} from '@/lib/dealFinancials';
import type { ActivityEvent, Client, Deal, DealCostCategory, DealCostItem, DealFile, DealFinancials, DealStatus, DocumentKind, DrawingElement } from '@/types/crm';

type ActiveSection = 'home' | 'clients' | 'deals' | 'drawings' | 'files' | 'settings';

type NavigationItem = {
  id: ActiveSection;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
};

type ClientFormValues = Pick<Client, 'name' | 'company' | 'phone' | 'email' | 'messengers' | 'address' | 'comments'>;

type ClientFormMode = 'create' | 'edit' | null;
type DealFormMode = 'create' | 'edit' | null;
type DealFormValues = Pick<Deal, 'title' | 'clientId' | 'status' | 'owner' | 'dueDate' | 'price' | 'revenue' | 'currency' | 'financials' | 'notes'>;

const EMPTY_CLIENT_FORM: ClientFormValues = {
  name: '',
  company: '',
  phone: '',
  email: '',
  messengers: [],
  address: '',
  comments: '',
};

function createClientFormValues(client?: Client | null): ClientFormValues {
  if (!client) {
    return EMPTY_CLIENT_FORM;
  }

  return {
    name: client.name,
    company: client.company,
    phone: client.phone,
    email: client.email,
    messengers: client.messengers,
    address: client.address,
    comments: client.comments,
  };
}

function normalizeClientFormValues(values: ClientFormValues): ClientFormValues {
  return {
    name: values.name.trim(),
    company: values.company.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    messengers: values.messengers.map((messenger) => messenger.trim()).filter(Boolean),
    address: values.address.trim(),
    comments: values.comments.trim(),
  };
}

function validateClientForm(values: ClientFormValues): string | null {
  const normalizedValues = normalizeClientFormValues(values);

  if (!normalizedValues.name) {
    return 'Укажите имя клиента.';
  }

  if (!normalizedValues.company) {
    return 'Укажите компанию клиента.';
  }

  if (!normalizedValues.phone && !normalizedValues.email) {
    return 'Укажите телефон или email клиента.';
  }

  if (normalizedValues.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValues.email)) {
    return 'Укажите корректный email клиента.';
  }

  return null;
}

function formatMessengersForInput(messengers: string[]): string {
  return messengers.join(', ');
}

function parseMessengersInput(value: string): string[] {
  return value.split(',').map((messenger) => messenger.trim()).filter(Boolean);
}


const EMPTY_DEAL_FORM: DealFormValues = {
  title: '',
  clientId: '',
  status: 'lead',
  owner: '',
  dueDate: '',
  price: '',
  revenue: 0,
  currency: 'RUB',
  financials: createEmptyDealFinancials(),
  notes: '',
};

function createDealFormValues(deal?: Deal | null, fallbackClientId = ''): DealFormValues {
  if (!deal) {
    return { ...EMPTY_DEAL_FORM, clientId: fallbackClientId };
  }

  return {
    title: deal.title,
    clientId: deal.clientId,
    status: deal.status,
    owner: deal.owner,
    dueDate: deal.dueDate,
    price: deal.price,
    revenue: deal.revenue,
    currency: deal.currency,
    financials: normalizeDealFinancials(deal.financials),
    notes: deal.notes,
  };
}

function normalizeDealFormValues(values: DealFormValues): DealFormValues {
  return {
    title: values.title.trim(),
    clientId: values.clientId.trim(),
    status: values.status,
    owner: values.owner.trim(),
    dueDate: values.dueDate.trim(),
    price: values.price.trim(),
    revenue: Number(values.revenue) || 0,
    currency: 'RUB',
    financials: normalizeDealFinancials(values.financials),
    notes: values.notes.trim(),
  };
}

function validateDealForm(values: DealFormValues, clients: Client[]): string | null {
  const normalizedValues = normalizeDealFormValues(values);

  if (!normalizedValues.title) return 'Укажите название сделки.';
  if (!normalizedValues.clientId || !clients.some((client) => client.id === normalizedValues.clientId)) return 'Выберите клиента из базы.';
  if (!DEAL_STATUSES.includes(normalizedValues.status)) return 'Выберите корректный статус сделки.';
  if (!normalizedValues.owner) return 'Укажите ответственного менеджера.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValues.dueDate)) return 'Укажите плановый срок в формате даты.';
  if (normalizedValues.revenue <= 0) return 'Укажите положительную выручку сделки.';

  return null;
}

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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value)}%`;
}

function normalizeDealFinancials(financials?: Partial<DealFinancials>): DealFinancials {
  return DEAL_COST_CATEGORIES.reduce((result, category) => ({
    ...result,
    [category]: financials?.[category] ?? [],
  }), {} as DealFinancials);
}

function createDealCostItem(category: DealCostCategory): DealCostItem {
  return {
    id: `cost-${category}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    category,
    title: '',
    amount: 0,
    hours: category === 'employeeLabor' ? 0 : undefined,
    hourlyRate: category === 'employeeLabor' ? 0 : undefined,
    comment: '',
  };
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
    `Выручка: ${formatCurrency(deal.revenue)}`,
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

type KanbanDragLocation = {
  droppableId: DealStatus;
  index: number;
};

type KanbanDragResult = {
  source: KanbanDragLocation;
  destination: KanbanDragLocation | null;
};

type KanbanColumnProps = {
  status: DealStatus;
  children: React.ReactNode;
};

function KanbanColumn({ status, children }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
    data: {
      type: 'column',
      status,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[620px] rounded-2xl p-2 transition ${
        isOver ? 'bg-slate-100 ring-2 ring-slate-300' : 'bg-slate-50'
      }`}
    >
      {children}
    </div>
  );
}

type SortableDealCardProps = {
  deal: Deal;
  index: number;
  status: DealStatus;
  isDragDisabled: boolean;
  children: React.ReactNode;
};

function SortableDealCard({ deal, index, status, isDragDisabled, children }: SortableDealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: deal.id,
    disabled: isDragDisabled,
    data: {
      type: 'deal',
      status,
      index,
    },
  });

  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`mb-3 rounded-2xl p-4 ${
        isDragging ? 'rotate-1 shadow-2xl ring-2 ring-slate-300' : ''
      } ${isDragDisabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {children}
    </Card>
  );
}

export default function HomePage() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('home');
  const [selectedClientId, setSelectedClientId] = useState(INITIAL_CLIENTS[0].id);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS);
  const [dealFiles, setDealFiles] = useState<DealFile[]>(INITIAL_DEAL_FILES);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>(INITIAL_ACTIVITY_EVENTS);
  const [drawingDealId, setDrawingDealId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFormMode, setClientFormMode] = useState<ClientFormMode>(null);
  const [clientFormValues, setClientFormValues] = useState<ClientFormValues>(EMPTY_CLIENT_FORM);
  const [clientFormError, setClientFormError] = useState<string | null>(null);
  const [dealFormMode, setDealFormMode] = useState<DealFormMode>(null);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [dealFormValues, setDealFormValues] = useState<DealFormValues>(() => createDealFormValues(null, INITIAL_CLIENTS[0]?.id ?? ''));
  const [dealFormError, setDealFormError] = useState<string | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const normalizedSearchQuery = searchQuery.toLowerCase().trim();


  useEffect(() => {
    let isMounted = true;

    async function loadCrmData() {
      const [loadedClients, loadedDeals, loadedFiles, loadedEvents] = await Promise.all([
        crmRepository.getClients(),
        crmRepository.getDeals(),
        crmRepository.getDealFiles(),
        crmRepository.getActivityEvents(),
      ]);

      if (!isMounted) {
        return;
      }

      setClients(loadedClients);
      setDeals(loadedDeals);
      setDealFiles(loadedFiles);
      setActivityEvents(loadedEvents);
      setSelectedClientId((currentClientId) => loadedClients.some((client) => client.id === currentClientId) ? currentClientId : loadedClients[0]?.id ?? currentClientId);
    }

    void loadCrmData();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredClients = useMemo(() => {
    if (!normalizedSearchQuery) {
      return clients;
    }

    return clients.filter((client) =>
      [client.name, client.company, client.phone, client.email].some((value) =>
        value.toLowerCase().trim().includes(normalizedSearchQuery),
      ),
    );
  }, [clients, normalizedSearchQuery]);

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
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const selectedClient = useMemo(() => {
    return filteredClients.find((client) => client.id === selectedClientId) ?? filteredClients[0] ?? null;
  }, [filteredClients, selectedClientId]);

  const selectedClientDeals = useMemo(() => {
    return selectedClient ? allDeals.filter((deal) => deal.clientId === selectedClient.id) : [];
  }, [allDeals, selectedClient]);

  const totalValue = useMemo(() => {
    return allDeals
      .reduce((sum, deal) => sum + deal.revenue, 0)
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

  const handleDealFilesSelected = useCallback(async (dealId: string, files: File[]) => {
    const stagedFiles: DealFile[] = [];
    const stagedEvents: ActivityEvent[] = [];
    const batchTimestamp = Date.now();

    for (const [index, file] of Array.from(files.entries())) {
      const uploadedAt = new Date(batchTimestamp + index).toISOString();
      const version = getNextFileVersion([...dealFiles, ...stagedFiles], dealId, file.name);
      const savedFile = await crmRepository.addFile({
        id: `file-${dealId}-${batchTimestamp}-${index}`,
        dealId,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        version,
        uploadedAt,
        content: file,
      });

      stagedFiles.push(savedFile);
      stagedEvents.push({
        id: `activity-file-${dealId}-${batchTimestamp}-${index}`,
        dealId,
        timestamp: uploadedAt,
        type: 'fileUploaded',
        message: `Загружен файл «${file.name}» версии ${version}.`,
      });
    }

    await Promise.all(stagedEvents.map((event) => crmRepository.addActivityEvent(event)));
    setDealFiles((currentFiles) => [...stagedFiles, ...currentFiles]);
    setActivityEvents((currentEvents) => [...stagedEvents, ...currentEvents]);
  }, [dealFiles]);


  const handleGenerateDocument = useCallback(async (deal: Deal, kind: DocumentKind) => {
    const client = clients.find((currentClient) => currentClient.id === deal.clientId);

    if (!client) {
      return;
    }

    const documentConfig = DOCUMENT_BUTTONS.find((document) => document.kind === kind);
    const documentTitle = documentConfig?.title ?? DOCUMENT_TITLES[kind];
    const fileName = `${documentConfig?.filePrefix ?? documentTitle}_${deal.id}.txt`;
    const text = generateDocumentText(deal, client, kind);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const generatedAt = new Date().toISOString();
    const timestamp = Date.now();
    const savedFile = await crmRepository.addFile({
      id: `document-file-${deal.id}-${kind}-${timestamp}`,
      dealId: deal.id,
      name: fileName,
      type: 'text/plain',
      size: blob.size,
      version: getNextFileVersion(dealFiles, deal.id, fileName),
      uploadedAt: generatedAt,
      content: blob,
    });
    const event: ActivityEvent = {
      id: `activity-document-${deal.id}-${kind}-${timestamp}`,
      dealId: deal.id,
      timestamp: generatedAt,
      type: 'documentGenerated',
      message: `Сформирован документ «${documentTitle}» и добавлен файл «${fileName}».`,
    };

    await crmRepository.addActivityEvent(event);
    setDealFiles((currentFiles) => [savedFile, ...currentFiles]);
    setActivityEvents((currentEvents) => [event, ...currentEvents]);
  }, [clients, dealFiles]);

  const handleDrawingSave = useCallback(
    async (dealId: string, drawing: { name: string; elements: DrawingElement[]; svg: string }) => {
      const blob = new Blob([drawing.svg], { type: 'image/svg+xml;charset=utf-8' });
      const timestamp = Date.now();
      const uploadedAt = new Date().toISOString();
      const savedFile = await crmRepository.addFile({
        id: `drawing-file-${dealId}-${timestamp}`,
        dealId,
        name: drawing.name,
        type: 'image/svg+xml',
        size: blob.size,
        version: getNextFileVersion(dealFiles, dealId, drawing.name),
        uploadedAt,
        content: blob,
        drawingData: {
          format: 'svg',
          elements: drawing.elements,
          svg: drawing.svg,
        },
      });
      const event: ActivityEvent = {
        id: `activity-drawing-${dealId}-${timestamp}`,
        dealId,
        timestamp: uploadedAt,
        type: 'drawingCreated',
        message: `Создан чертёж «${drawing.name}» с ${drawing.elements.length} объектами.`,
      };

      await crmRepository.addActivityEvent(event);
      setDealFiles((currentFiles) => [savedFile, ...currentFiles]);
      setActivityEvents((currentEvents) => [event, ...currentEvents]);
      setDrawingDealId(null);
    },
    [dealFiles],
  );

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleDragEnd = (result: KanbanDragResult) => {
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
        const reorderedDeals = flattenColumns({
          ...currentColumns,
          [sourceStatus]: reorderColumn(currentColumns[sourceStatus], source.index, destination.index),
        });
        void crmRepository.replaceDeals(reorderedDeals);
        return reorderedDeals;
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
        const event: ActivityEvent = {
          id: `activity-status-${movedDeal.id}-${Date.now()}`,
          dealId: movedDeal.id,
          timestamp: new Date().toISOString(),
          type: 'statusChanged',
          message: `Статус изменён: «${STATUS_TITLES[sourceStatus]}» → «${STATUS_TITLES[destinationStatus]}».`,
        };
        void crmRepository.addActivityEvent(event);
        void crmRepository.updateDealStatus(movedDeal.id, destinationStatus);
        setActivityEvents((currentEvents) => [event, ...currentEvents]);
      }

      const movedDeals = flattenColumns({
        ...currentColumns,
        [sourceStatus]: moved.source,
        [destinationStatus]: moved.destination,
      });
      void crmRepository.replaceDeals(movedDeals);
      return movedDeals;
    });
  };

  const handleKanbanDragEnd = (event: DragEndEvent) => {
    if (hasSearchQuery) {
      return;
    }

    const activeStatus = event.active.data.current?.status as DealStatus | undefined;
    const activeIndex = event.active.data.current?.index as number | undefined;
    const overStatus = event.over?.data.current?.status as DealStatus | undefined;
    const overIndex = event.over?.data.current?.index as number | undefined;
    const overType = event.over?.data.current?.type as string | undefined;

    if (!activeStatus || activeIndex === undefined || !overStatus) {
      return;
    }

    const destinationIndex = overType === 'column'
      ? columns[overStatus].length
      : overIndex ?? columns[overStatus].length;

    handleDragEnd({
      source: {
        droppableId: activeStatus,
        index: activeIndex,
      },
      destination: {
        droppableId: overStatus,
        index: destinationIndex,
      },
    });
  };


  const closeClientForm = useCallback(() => {
    setClientFormMode(null);
    setClientFormValues(EMPTY_CLIENT_FORM);
    setClientFormError(null);
  }, []);

  const openCreateClientForm = useCallback(() => {
    setClientFormMode('create');
    setClientFormValues(EMPTY_CLIENT_FORM);
    setClientFormError(null);
  }, []);

  const openEditClientForm = useCallback((client: Client) => {
    setClientFormMode('edit');
    setClientFormValues(createClientFormValues(client));
    setClientFormError(null);
  }, []);

  const updateClientFormField = useCallback(
    (field: keyof ClientFormValues, value: string | string[]) => {
      setClientFormValues((currentValues) => ({
        ...currentValues,
        [field]: value,
      }));
      setClientFormError(null);
    },
    [],
  );

  const handleClientFormSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateClientForm(clientFormValues);

    if (validationError) {
      setClientFormError(validationError);
      return;
    }

    const normalizedValues = normalizeClientFormValues(clientFormValues);

    if (clientFormMode === 'create') {
      const createdClient = await crmRepository.addClient({
        id: `client-${Date.now()}`,
        ...normalizedValues,
        communications: [],
      });

      setClients((currentClients) => [createdClient, ...currentClients]);
      setSelectedClientId(createdClient.id);
      closeClientForm();
      return;
    }

    if (clientFormMode === 'edit' && selectedClient) {
      const updatedClient = await crmRepository.updateClient(selectedClient.id, normalizedValues);

      if (!updatedClient) {
        setClientFormError('Клиент не найден. Обновите страницу и повторите операцию.');
        return;
      }

      setClients((currentClients) => currentClients.map((client) => (
        client.id === updatedClient.id ? updatedClient : client
      )));
      setDeals((currentDeals) => currentDeals.map((deal) => (
        deal.clientId === updatedClient.id ? { ...deal, client: updatedClient.name } : deal
      )));
      setSelectedClientId(updatedClient.id);
      closeClientForm();
    }
  }, [clientFormMode, clientFormValues, closeClientForm, selectedClient]);

  const closeDealForm = useCallback(() => {
    setDealFormMode(null);
    setEditingDealId(null);
    setDealFormValues(createDealFormValues(null, clients[0]?.id ?? ''));
    setDealFormError(null);
  }, [clients]);

  const openCreateDealForm = useCallback(() => {
    setDealFormMode('create');
    setEditingDealId(null);
    setDealFormValues(createDealFormValues(null, selectedClient?.id ?? clients[0]?.id ?? ''));
    setDealFormError(null);
  }, [clients, selectedClient]);

  const openEditDealForm = useCallback((deal: Deal) => {
    setDealFormMode('edit');
    setEditingDealId(deal.id);
    setDealFormValues(createDealFormValues(deal));
    setDealFormError(null);
  }, []);

  const updateDealFormField = useCallback((field: keyof DealFormValues, value: string) => {
    setDealFormValues((currentValues) => ({
      ...currentValues,
      [field]: field === 'status' ? value as DealStatus : field === 'revenue' ? Number(value) || 0 : value,
      price: field === 'revenue' ? `${(Number(value) || 0).toLocaleString('ru-RU')} ₽` : currentValues.price,
    }));
    setDealFormError(null);
  }, []);

  const addDealCostItem = useCallback((category: DealCostCategory) => {
    setDealFormValues((currentValues) => ({
      ...currentValues,
      financials: {
        ...currentValues.financials,
        [category]: [...currentValues.financials[category], createDealCostItem(category)],
      },
    }));
    setDealFormError(null);
  }, []);

  const updateDealCostItem = useCallback((category: DealCostCategory, itemId: string, patch: Partial<DealCostItem>) => {
    setDealFormValues((currentValues) => ({
      ...currentValues,
      financials: {
        ...currentValues.financials,
        [category]: currentValues.financials[category].map((item) => {
          if (item.id !== itemId) return item;
          const updatedItem = { ...item, ...patch, category };
          return { ...updatedItem, amount: calculateDealCostItemTotal(updatedItem) };
        }),
      },
    }));
    setDealFormError(null);
  }, []);

  const removeDealCostItem = useCallback((category: DealCostCategory, itemId: string) => {
    setDealFormValues((currentValues) => ({
      ...currentValues,
      financials: {
        ...currentValues.financials,
        [category]: currentValues.financials[category].filter((item) => item.id !== itemId),
      },
    }));
    setDealFormError(null);
  }, []);

  const handleDealFormSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateDealForm(dealFormValues, clients);

    if (validationError) {
      setDealFormError(validationError);
      return;
    }

    const normalizedValues = normalizeDealFormValues(dealFormValues);
    const client = clients.find((currentClient) => currentClient.id === normalizedValues.clientId);

    if (!client) {
      setDealFormError('Клиент не найден. Обновите страницу и повторите операцию.');
      return;
    }

    if (dealFormMode === 'create') {
      const timestamp = Date.now();
      const createdAt = toDateKey(new Date());
      const createdDeal = await crmRepository.addDeal({
        id: `deal-${timestamp}`,
        ...normalizedValues,
        price: formatCurrency(normalizedValues.revenue),
        client: client.name,
        createdAt,
      });
      const activityEvent: ActivityEvent = {
        id: `activity-${createdDeal.id}-created-${timestamp}`,
        dealId: createdDeal.id,
        timestamp: new Date().toISOString(),
        type: 'dealCreated',
        message: `Создана сделка «${createdDeal.title}» для клиента ${createdDeal.client}.`,
      };

      await crmRepository.addActivityEvent(activityEvent);
      setDeals((currentDeals) => [createdDeal, ...currentDeals]);
      setActivityEvents((currentEvents) => [activityEvent, ...currentEvents]);
      closeDealForm();
      return;
    }

    if (dealFormMode === 'edit' && editingDealId) {
      const updatedDeal = await crmRepository.updateDeal(editingDealId, {
        ...normalizedValues,
        price: formatCurrency(normalizedValues.revenue),
        client: client.name,
      });

      if (!updatedDeal) {
        setDealFormError('Сделка не найдена. Обновите страницу и повторите операцию.');
        return;
      }

      setDeals((currentDeals) => currentDeals.map((deal) => deal.id === updatedDeal.id ? updatedDeal : deal));
      closeDealForm();
    }
  }, [clients, closeDealForm, dealFormMode, dealFormValues, editingDealId]);

  const handleDeleteDeal = useCallback(async (deal: Deal) => {
    const isConfirmed = window.confirm(`Удалить сделку «${deal.title}»? Связанные файлы и события активности будут удалены.`);

    if (!isConfirmed) {
      return;
    }

    const isDeleted = await crmRepository.deleteDeal(deal.id);

    if (!isDeleted) {
      window.alert('Сделка не была удалена. Обновите страницу и повторите операцию.');
      return;
    }

    setDeals((currentDeals) => currentDeals.filter((currentDeal) => currentDeal.id !== deal.id));
    setDealFiles((currentFiles) => currentFiles.filter((file) => file.dealId !== deal.id));
    setActivityEvents((currentEvents) => currentEvents.filter((activityEvent) => activityEvent.dealId !== deal.id));
    if (editingDealId === deal.id) closeDealForm();
    if (drawingDealId === deal.id) setDrawingDealId(null);
  }, [closeDealForm, drawingDealId, editingDealId]);

  const handleDeleteClient = useCallback(async (client: Client) => {
    const relatedDeals = deals.filter((deal) => deal.clientId === client.id);

    if (relatedDeals.length > 0) {
      window.alert(`Нельзя удалить клиента «${client.name}»: с ним связано сделок — ${relatedDeals.length}. Сначала перенесите или удалите связанные сделки.`);
      return;
    }

    const isConfirmed = window.confirm(`Удалить клиента «${client.name}»? Это действие нельзя отменить.`);

    if (!isConfirmed) {
      return;
    }

    const isDeleted = await crmRepository.deleteClient(client.id);

    if (!isDeleted) {
      window.alert('Клиент не был удалён. Проверьте наличие связанных сделок или обновите страницу.');
      return;
    }

    setClients((currentClients) => {
      const nextClients = currentClients.filter((currentClient) => currentClient.id !== client.id);
      setSelectedClientId((currentClientId) => (
        currentClientId === client.id ? nextClients[0]?.id ?? '' : currentClientId
      ));
      return nextClients;
    });
    closeClientForm();
  }, [closeClientForm, deals]);

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

          <ScrollArea className="max-h-[calc(100vh-160px)] pr-1"><nav className="space-y-2" aria-label="Основная навигация">
            {NAVIGATION_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeSection;

              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'default' : 'ghost'}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full justify-start px-4 py-3 ${isActive ? 'bg-[#2563EB] shadow-lg shadow-blue-700/15' : ''}`}
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </Button>
              );
            })}
          </nav></ScrollArea>
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
                    <Badge className="border-amber-200 bg-white text-amber-700">
                      {upcomingReminders.length + overdueDeals.length}
                    </Badge>
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
          <Separator />

          <section className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
            <label htmlFor="workspace-search" className="mb-2 block text-sm font-semibold text-slate-700">
              Поиск по клиентам и сделкам
            </label>
            <div className="relative max-w-3xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                id="workspace-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Введите имя, компанию, телефон, email, номер сделки, название или заметку"
                className="pl-12"
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
              <Card>
                <CardHeader>
                  <CardDescription className="font-semibold uppercase tracking-[0.18em]">Сделки</CardDescription>
                  <CardTitle className="text-4xl">{totalDeals}</CardTitle>
                </CardHeader>
                <CardContent><p className="text-sm text-slate-500">Активный пайплайн по текущему поиску.</p></CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription className="font-semibold uppercase tracking-[0.18em]">Клиенты</CardDescription>
                  <CardTitle className="text-4xl">{filteredClients.length}</CardTitle>
                </CardHeader>
                <CardContent><p className="text-sm text-slate-500">Карточки клиентов в базе CRM.</p></CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription className="font-semibold uppercase tracking-[0.18em]">Портфель</CardDescription>
                  <CardTitle className="text-4xl">{totalValue} ₽</CardTitle>
                </CardHeader>
                <CardContent><p className="text-sm text-slate-500">Суммарная стоимость сделок.</p></CardContent>
              </Card>
              <Card className="border-red-100 bg-red-50">
                <CardHeader>
                  <CardDescription className="font-semibold uppercase tracking-[0.18em] text-red-700">Просрочки</CardDescription>
                  <CardTitle className="text-4xl">{overdueDeals.length}</CardTitle>
                </CardHeader>
                <CardContent><p className="text-sm text-slate-600">Сделки не в статусе «Выполнено» с истекшим сроком.</p></CardContent>
              </Card>
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
                  <Button type="button" size="sm" onClick={openCreateClientForm} className="shrink-0">
                    <Plus className="h-4 w-4" />
                    Создать контакт
                  </Button>
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
                  <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <div>
                      <p className="font-semibold text-slate-950">Комментарий менеджера</p>
                      <p className="mt-1 max-w-xl leading-6">{selectedClient.comments || 'Комментарий пока не добавлен.'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => openEditClientForm(selectedClient)}>
                        <Pencil className="h-4 w-4" />
                        Редактировать
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleDeleteClient(selectedClient)} className="border-red-200 text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                        Удалить
                      </Button>
                    </div>
                  </div>
                </div>

                {clientFormMode ? (
                  <form onSubmit={handleClientFormSubmit} className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-950">
                          {clientFormMode === 'create' ? 'Создание контакта' : 'Редактирование контакта'}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">Заполните имя, компанию и телефон или email.</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={closeClientForm} aria-label="Закрыть форму клиента">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input value={clientFormValues.name} onChange={(event) => updateClientFormField('name', event.target.value)} placeholder="Имя *" />
                      <Input value={clientFormValues.company} onChange={(event) => updateClientFormField('company', event.target.value)} placeholder="Компания *" />
                      <Input value={clientFormValues.phone} onChange={(event) => updateClientFormField('phone', event.target.value)} placeholder="Телефон" />
                      <Input value={clientFormValues.email} onChange={(event) => updateClientFormField('email', event.target.value)} placeholder="Email" />
                      <Input value={formatMessengersForInput(clientFormValues.messengers)} onChange={(event) => updateClientFormField('messengers', parseMessengersInput(event.target.value))} placeholder="Мессенджеры через запятую" />
                      <Input value={clientFormValues.address} onChange={(event) => updateClientFormField('address', event.target.value)} placeholder="Адрес" />
                      <textarea
                        value={clientFormValues.comments}
                        onChange={(event) => updateClientFormField('comments', event.target.value)}
                        placeholder="Комментарии"
                        className="min-h-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 md:col-span-2"
                      />
                    </div>
                    {clientFormError ? <p className="mt-3 text-sm font-semibold text-red-700">{clientFormError}</p> : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="submit">
                        <Save className="h-4 w-4" />
                        {clientFormMode === 'create' ? 'Создать контакт' : 'Сохранить изменения'}
                      </Button>
                      <Button type="button" variant="outline" onClick={closeClientForm}>Отмена</Button>
                    </div>
                  </form>
                ) : null}

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
                            <Badge variant="outline" className={`shrink-0 ${statusStyles[deal.status]}`}>
                              {STATUS_TITLES[deal.status]}
                            </Badge>
                          </div>
                          <p className="mt-2 font-bold text-slate-950">{formatCurrency(deal.revenue)}</p>
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
          <div className="flex-1 px-5 py-6 sm:px-8">
            <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">Сделки</h2>
                  <p className="mt-1 text-sm text-slate-500">Создавайте, редактируйте и удаляйте карточки сделок в пайплайне.</p>
                </div>
                <Button type="button" onClick={openCreateDealForm}>
                  <Plus className="h-4 w-4" />
                  Создать сделку
                </Button>
              </div>

              {dealFormMode ? (
                <form onSubmit={handleDealFormSubmit} className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-950">{dealFormMode === 'create' ? 'Создание сделки' : 'Редактирование сделки'}</h3>
                      <p className="mt-1 text-sm text-slate-600">При выборе клиента название клиента в сделке заполняется автоматически.</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={closeDealForm} aria-label="Закрыть форму сделки">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input value={dealFormValues.title} onChange={(event) => updateDealFormField('title', event.target.value)} placeholder="Название сделки *" />
                    <select value={dealFormValues.clientId} onChange={(event) => updateDealFormField('clientId', event.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400">
                      <option value="">Выберите клиента *</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>{client.name} · {client.company}</option>
                      ))}
                    </select>
                    <select value={dealFormValues.status} onChange={(event) => updateDealFormField('status', event.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400">
                      {DEAL_STATUSES.map((status) => (
                        <option key={status} value={status}>{STATUS_TITLES[status]}</option>
                      ))}
                    </select>
                    <Input value={dealFormValues.owner} onChange={(event) => updateDealFormField('owner', event.target.value)} placeholder="Ответственный *" />
                    <Input type="date" value={dealFormValues.dueDate} onChange={(event) => updateDealFormField('dueDate', event.target.value)} />
                    <Input type="number" min="0" step="100" value={dealFormValues.revenue || ''} onChange={(event) => updateDealFormField('revenue', event.target.value)} placeholder="Выручка, ₽ *" />
                    <textarea value={dealFormValues.notes} onChange={(event) => updateDealFormField('notes', event.target.value)} placeholder="Заметки" className="min-h-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 md:col-span-2" />
                  </div>

                  <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="font-bold text-slate-950">Расходы по гибке тонколистового металла</h4>
                        <p className="text-sm text-slate-600">Добавляйте несколько строк внутри каждой категории сметы.</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-950">
                        Итого расходов: {formatCurrency(calculateDealExpenses(dealFormValues.financials))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      {DEAL_COST_CATEGORIES.map((category) => (
                        <div key={category} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-950">{DEAL_COST_CATEGORY_TITLES[category]}</p>
                              <p className="text-xs text-slate-500">{dealFormValues.financials[category].length} строк расходов</p>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => addDealCostItem(category)}>
                              <Plus className="h-4 w-4" />
                              Добавить строку
                            </Button>
                          </div>
                          <div className="space-y-3">
                            {dealFormValues.financials[category].map((item) => (
                              <div key={item.id} className="grid gap-2 rounded-xl bg-white p-3 md:grid-cols-12">
                                <Input value={item.title} onChange={(event) => updateDealCostItem(category, item.id, { title: event.target.value })} placeholder="Наименование" className="md:col-span-3" />
                                {category === 'employeeLabor' ? (
                                  <>
                                    <Input type="number" min="0" step="0.5" value={item.hours ?? ''} onChange={(event) => updateDealCostItem(category, item.id, { hours: Number(event.target.value) || 0 })} placeholder="Часы" className="md:col-span-2" />
                                    <Input type="number" min="0" step="100" value={item.hourlyRate ?? ''} onChange={(event) => updateDealCostItem(category, item.id, { hourlyRate: Number(event.target.value) || 0 })} placeholder="Ставка, ₽/ч" className="md:col-span-2" />
                                    <Input value={formatCurrency(calculateDealCostItemTotal(item))} readOnly className="md:col-span-2" />
                                  </>
                                ) : (
                                  <Input type="number" min="0" step="100" value={item.amount || ''} onChange={(event) => updateDealCostItem(category, item.id, { amount: Number(event.target.value) || 0 })} placeholder="Сумма, ₽" className="md:col-span-3" />
                                )}
                                <Input value={item.comment ?? ''} onChange={(event) => updateDealCostItem(category, item.id, { comment: event.target.value })} placeholder="Комментарий" className={category === 'employeeLabor' ? 'md:col-span-2' : 'md:col-span-5'} />
                                <Button type="button" variant="outline" size="sm" onClick={() => removeDealCostItem(category, item.id)} className="border-red-200 text-red-700 hover:bg-red-50 md:col-span-1">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                  {dealFormValues.clientId ? (
                    <p className="mt-3 text-sm text-slate-600">Клиент в карточке сделки: <span className="font-semibold text-slate-950">{clients.find((client) => client.id === dealFormValues.clientId)?.name ?? 'не найден'}</span></p>
                  ) : null}
                  {dealFormError ? <p className="mt-3 text-sm font-semibold text-red-700">{dealFormError}</p> : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="submit">
                      <Save className="h-4 w-4" />
                      {dealFormMode === 'create' ? 'Создать сделку' : 'Сохранить изменения'}
                    </Button>
                    <Button type="button" variant="outline" onClick={closeDealForm}>Отмена</Button>
                  </div>
                </form>
              ) : null}
            </div>

            <div className="overflow-x-auto">
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleKanbanDragEnd}>
              <div className="grid min-w-[1120px] grid-cols-4 gap-5">
                {DEAL_STATUSES.map((status) => (
                  <section key={status} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="font-bold text-slate-950">{STATUS_TITLES[status]}</h2>
                        <p className="text-sm text-slate-500">{columns[status].length} карточек</p>
                      </div>
                      <Badge variant="outline" className={statusStyles[status]}>
                        {STATUS_TITLES[status]}
                      </Badge>
                    </div>

                    <SortableContext items={columns[status].map((deal) => deal.id)} strategy={verticalListSortingStrategy}>
                      <KanbanColumn status={status}>
                        {columns[status].map((deal, index) => (
                          <SortableDealCard
                            key={deal.id}
                            deal={deal}
                            index={index}
                            status={status}
                            isDragDisabled={hasSearchQuery}
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

                                  <div className="mb-3 flex flex-wrap gap-2">
                                    <Button type="button" variant="outline" size="sm" onPointerDown={(event) => event.stopPropagation()} onClick={() => openEditDealForm(deal)} className="h-8">
                                      <Pencil className="h-4 w-4" />
                                      Редактировать
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" onPointerDown={(event) => event.stopPropagation()} onClick={() => handleDeleteDeal(deal)} className="h-8 border-red-200 text-red-700 hover:bg-red-50">
                                      <Trash2 className="h-4 w-4" />
                                      Удалить
                                    </Button>
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
                                        Выручка
                                      </dt>
                                      <dd className="font-bold text-slate-950">{formatCurrency(deal.revenue)}</dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                      <dt>Расходы</dt>
                                      <dd className="font-medium text-slate-900">{formatCurrency(calculateDealExpenses(deal.financials))}</dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                      <dt>Чистая прибыль</dt>
                                      <dd className="font-medium text-emerald-700">{formatCurrency(calculateDealNetProfit(deal.revenue, deal.financials))}</dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                      <dt>Маржинальность</dt>
                                      <dd className="font-medium text-slate-900">{formatPercent(calculateDealMarginPercent(deal.revenue, calculateDealNetProfit(deal.revenue, deal.financials)))}</dd>
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
                                    <Button
                                      onClick={() => setDrawingDealId(deal.id)}
                                      className="w-full"
                                    >
                                      Создать чертеж
                                    </Button>

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
                          </SortableDealCard>
                        ))}
                      </KanbanColumn>
                    </SortableContext>
                  </section>
                ))}
              </div>
            </DndContext>
            </div>
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
