'use client';

import React, { useMemo, useState } from 'react';
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from '@hello-pangea/dnd';
import {
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
  Settings,
  UserRound,
  UsersRound,
  Wrench,
} from 'lucide-react';

type DealStatus = 'lead' | 'specApproval' | 'inProgress' | 'done';

type Deal = {
  id: string;
  title: string;
  clientId: string;
  client: string;
  createdAt: string;
  status: DealStatus;
  owner: string;
  dueDate: string;
  price: string;
  notes: string;
};

type Communication = {
  id: string;
  date: string;
  channel: string;
  summary: string;
  manager: string;
};

type Client = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  messengers: string[];
  address: string;
  comments: string;
  communications: Communication[];
};

type NavigationItem = {
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
  { title: 'Главная', icon: Home },
  { title: 'Клиенты', icon: UsersRound },
  { title: 'Сделки', icon: ClipboardList },
  { title: 'Чертежи', icon: FileText },
  { title: 'Файлы', icon: FolderOpen },
  { title: 'Настройки', icon: Settings },
];


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
    dueDate: '2026-06-28',
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

const statusStyles: Record<DealStatus, string> = {
  lead: 'border-slate-200 bg-slate-100 text-slate-700',
  specApproval: 'border-orange-200 bg-orange-50 text-orange-700',
  inProgress: 'border-blue-200 bg-blue-50 text-blue-700',
  done: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};


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
  const [selectedClientId, setSelectedClientId] = useState(INITIAL_CLIENTS[0].id);
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS);

  const columns = useMemo(() => groupDealsByStatus(deals), [deals]);
  const allDeals = deals;

  const selectedClient = useMemo(() => {
    return INITIAL_CLIENTS.find((client) => client.id === selectedClientId) ?? INITIAL_CLIENTS[0];
  }, [selectedClientId]);

  const selectedClientDeals = useMemo(() => {
    return allDeals.filter((deal) => deal.clientId === selectedClient.id);
  }, [allDeals, selectedClient.id]);

  const totalValue = useMemo(() => {
    return allDeals
      .reduce((sum, deal) => sum + Number(deal.price.replace(/[^\d]/g, '')), 0)
      .toLocaleString('ru-RU');
  }, [allDeals]);

  const totalDeals = useMemo(() => allDeals.length, [allDeals]);

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

    setDeals((currentDeals) => {
      const currentColumns = groupDealsByStatus(currentDeals);

      if (sourceStatus === destinationStatus) {
        return flattenColumns({
          ...currentColumns,
          [sourceStatus]: reorderColumn(currentColumns[sourceStatus], source.index, destination.index),
        });
      }

      const moved = moveDealBetweenColumns(
        currentColumns[sourceStatus],
        currentColumns[destinationStatus],
        source.index,
        destination.index,
        destinationStatus,
      );

      return flattenColumns({
        ...currentColumns,
        [sourceStatus]: moved.source,
        [destinationStatus]: moved.destination,
      });
    });
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
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
              const isActive = item.title === 'Сделки';

              return (
                <a
                  key={item.title}
                  href="#"
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-slate-950 text-white shadow-lg shadow-slate-900/15'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </a>
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
                  Kanban-доска сделок
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Перемещайте карточки между этапами, чтобы команда видела актуальное состояние заказов,
                  сроков, стоимости и ответственных сотрудников.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:flex">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Сделок</p>
                  <p className="text-2xl font-bold text-slate-950">{totalDeals}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Портфель</p>
                  <p className="text-2xl font-bold text-slate-950">{totalValue} ₽</p>
                </div>
              </div>
            </div>
          </header>

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
                  {INITIAL_CLIENTS.map((client) => {
                    const isSelected = client.id === selectedClient.id;
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
                  })}
                </div>
              </div>

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
            </div>
          </section>

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
                            <Draggable key={deal.id} draggableId={deal.id} index={index}>
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
                                        onClick={() => setSelectedClientId(deal.clientId)}
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
        </section>
      </div>
    </main>
  );
}
