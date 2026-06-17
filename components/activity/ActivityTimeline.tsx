import { MessageSquareText } from 'lucide-react';
import type { ActivityEvent } from '@/types/crm';

type ActivityTimelineProps = {
  events: ActivityEvent[];
};

const ACTIVITY_TYPE_TITLES: Record<ActivityEvent['type'], string> = {
  dealCreated: 'Сделка создана',
  statusChanged: 'Статус изменён',
  fileUploaded: 'Файл загружен',
  drawingCreated: 'Чертёж создан',
  documentGenerated: 'Документ сформирован',
};

function sortEventsByTimestamp(events: ActivityEvent[]): ActivityEvent[] {
  return [...events].sort((leftEvent, rightEvent) => {
    return new Date(rightEvent.timestamp).getTime() - new Date(leftEvent.timestamp).getTime();
  });
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  const sortedEvents = sortEventsByTimestamp(events);

  return (
    <section className="mt-4 rounded-2xl bg-slate-50 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-slate-950">Журнал активности</h4>
          <p className="text-xs text-slate-500">{sortedEvents.length} событий по сделке</p>
        </div>
        <MessageSquareText className="h-5 w-5 text-slate-400" />
      </div>

      <ol className="space-y-2">
        {sortedEvents.length === 0 ? (
          <li className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-500">
            Активности по сделке пока нет.
          </li>
        ) : null}

        {sortedEvents.map((event) => (
          <li key={event.id} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-slate-950">{ACTIVITY_TYPE_TITLES[event.type]}</p>
              <time className="shrink-0 text-xs text-slate-500">
                {new Date(event.timestamp).toLocaleString('ru-RU')}
              </time>
            </div>
            <p className="mt-1 leading-5 text-slate-600">{event.message}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
