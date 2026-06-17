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
  MessageSquareText,
  Settings,
  UserRound,
  UsersRound,
  Wrench,
} from 'lucide-react';

type DealStatus = 'Обращение' | 'Согласование ТЗ' | 'В работе' | 'Выполнено';

type Deal = {
  id: string;
  title: string;
  client: string;
  createdAt: string;
  status: DealStatus;
  owner: string;
  dueDate: string;
  price: string;
  notes: string;
};

type NavigationItem = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
};

const DEAL_COLUMNS: DealStatus[] = ['Обращение', 'Согласование ТЗ', 'В работе', 'Выполнено'];

const NAVIGATION_ITEMS: NavigationItem[] = [
  { title: 'Главная', icon: Home },
  { title: 'Клиенты', icon: UsersRound },
  { title: 'Сделки', icon: ClipboardList },
  { title: 'Чертежи', icon: FileText },
  { title: 'Файлы', icon: FolderOpen },
  { title: 'Настройки', icon: Settings },
];

const INITIAL_DEALS: Deal[] = [
  {
    id: 'deal-001',
    title: 'Кухонный гарнитур из массива',
    client: 'Анна Смирнова',
    createdAt: '2026-06-02',
    status: 'Обращение',
    owner: 'Мария Орлова',
    dueDate: '2026-07-12',
    price: '420 000 ₽',
    notes: 'Клиент просит предусмотреть встроенную подсветку и скрытые ручки.',
  },
  {
    id: 'deal-002',
    title: 'Шкаф-купе в прихожую',
    client: 'Илья Кузнецов',
    createdAt: '2026-06-04',
    status: 'Согласование ТЗ',
    owner: 'Олег Романов',
    dueDate: '2026-06-28',
    price: '185 000 ₽',
    notes: 'Нужно уточнить глубину секций после повторного замера помещения.',
  },
  {
    id: 'deal-003',
    title: 'Комплект мебели для переговорной',
    client: 'ООО «Северный Вектор»',
    createdAt: '2026-05-25',
    status: 'В работе',
    owner: 'Екатерина Волкова',
    dueDate: '2026-07-05',
    price: '760 000 ₽',
    notes: 'Чертежи утверждены, материалы зарезервированы на складе.',
  },
  {
    id: 'deal-004',
    title: 'Детская комната под ключ',
    client: 'Павел Морозов',
    createdAt: '2026-05-18',
    status: 'В работе',
    owner: 'Мария Орлова',
    dueDate: '2026-06-30',
    price: '315 000 ₽',
    notes: 'Проверить безопасность фурнитуры и согласовать палитру фасадов.',
  },
  {
    id: 'deal-005',
    title: 'Ресепшен для клиники',
    client: 'Медцентр «Альта»',
    createdAt: '2026-05-10',
    status: 'Выполнено',
    owner: 'Олег Романов',
    dueDate: '2026-06-14',
    price: '540 000 ₽',
    notes: 'Заказ смонтирован, акты подписаны, ожидается финальная оплата.',
  },
];

const statusStyles: Record<DealStatus, string> = {
  Обращение: 'border-sky-200 bg-sky-50 text-sky-700',
  'Согласование ТЗ': 'border-amber-200 bg-amber-50 text-amber-700',
  'В работе': 'border-violet-200 bg-violet-50 text-violet-700',
  Выполнено: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

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
  const [columns, setColumns] = useState<Record<DealStatus, Deal[]>>(() => {
    return DEAL_COLUMNS.reduce(
      (accumulator, status) => ({
        ...accumulator,
        [status]: INITIAL_DEALS.filter((deal) => deal.status === status),
      }),
      {} as Record<DealStatus, Deal[]>,
    );
  });

  const totalValue = useMemo(() => {
    return Object.values(columns)
      .flat()
      .reduce((sum, deal) => sum + Number(deal.price.replace(/[^\d]/g, '')), 0)
      .toLocaleString('ru-RU');
  }, [columns]);

  const totalDeals = useMemo(() => Object.values(columns).flat().length, [columns]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source } = result;

    if (!destination) {
      return;
    }

    const sourceStatus = source.droppableId as DealStatus;
    const destinationStatus = destination.droppableId as DealStatus;

    if (!DEAL_COLUMNS.includes(sourceStatus) || !DEAL_COLUMNS.includes(destinationStatus)) {
      return;
    }

    if (sourceStatus === destinationStatus && source.index === destination.index) {
      return;
    }

    setColumns((currentColumns) => {
      if (sourceStatus === destinationStatus) {
        return {
          ...currentColumns,
          [sourceStatus]: reorderColumn(currentColumns[sourceStatus], source.index, destination.index),
        };
      }

      const moved = moveDealBetweenColumns(
        currentColumns[sourceStatus],
        currentColumns[destinationStatus],
        source.index,
        destination.index,
        destinationStatus,
      );

      return {
        ...currentColumns,
        [sourceStatus]: moved.source,
        [destinationStatus]: moved.destination,
      };
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

          <div className="flex-1 overflow-x-auto px-5 py-6 sm:px-8">
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="grid min-w-[1120px] grid-cols-4 gap-5">
                {DEAL_COLUMNS.map((status) => (
                  <section key={status} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="font-bold text-slate-950">{status}</h2>
                        <p className="text-sm text-slate-500">{columns[status].length} карточек</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[status]}`}>
                        {status}
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
                                      <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                                        <UserRound className="h-4 w-4" />
                                        {deal.client}
                                      </p>
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
                                      <dd className="font-medium text-slate-900">{deal.status}</dd>
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
