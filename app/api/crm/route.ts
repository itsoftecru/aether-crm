import { NextRequest, NextResponse } from 'next/server';
import { getSqliteCrmStore } from '@/lib/server/sqliteCrmStore';
import type { ActivityEvent, Client, CrmSettings, Deal, DealStatus, Reminder } from '@/types/crm';

export const runtime = 'nodejs';

type CrmActionRequest = {
  action: string;
  payload?: unknown;
};

type AddFilePayload = {
  file: Parameters<ReturnType<typeof getSqliteCrmStore>['upsertDealFile']>[0];
};

function jsonResponse<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Некорректное тело запроса CRM API.');
  }
  return value as Record<string, unknown>;
}

export async function GET() {
  try {
    return jsonResponse(getSqliteCrmStore().getSnapshot());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка чтения CRM.';
    return jsonResponse({ error: message }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CrmActionRequest;
    const payload = requireRecord(body.payload ?? {});
    const store = getSqliteCrmStore();

    switch (body.action) {
      case 'importSnapshot':
        return jsonResponse(store.importSnapshot(payload));
      case 'updateSettings':
        return jsonResponse(store.setSettings(payload.settings as CrmSettings));
      case 'addDeal':
        return jsonResponse(store.upsertDeal(payload.deal as Deal));
      case 'updateDeal':
        return jsonResponse(store.updateDeal(String(payload.dealId), payload.patch as Partial<Deal>));
      case 'deleteDeal':
        return jsonResponse(store.deleteDeal(String(payload.dealId)));
      case 'addClient':
        return jsonResponse(store.upsertClient(payload.client as Client));
      case 'updateClient':
        return jsonResponse(store.updateClient(String(payload.clientId), payload.patch as Partial<Client>));
      case 'deleteClient':
        return jsonResponse(store.deleteClient(String(payload.clientId)));
      case 'addFile':
        return jsonResponse(store.upsertDealFile((payload as AddFilePayload).file));
      case 'addActivityEvent':
        return jsonResponse(store.upsertActivityEvent(payload.event as ActivityEvent));
      case 'addReminder':
        return jsonResponse(store.upsertReminder(payload.reminder as Reminder));
      case 'updateReminder':
        return jsonResponse(store.updateReminder(String(payload.reminderId), payload.patch as Partial<Reminder>));
      case 'deleteReminder':
        return jsonResponse(store.deleteReminder(String(payload.reminderId)));
      case 'completeReminder':
        return jsonResponse(store.updateReminder(String(payload.reminderId), {
          isDone: true,
          completedAt: new Date().toISOString(),
          isOverdue: false,
        }));
      case 'updateDealStatus':
        return jsonResponse(store.updateDeal(String(payload.dealId), { status: payload.status as DealStatus }));
      case 'replaceDeals':
        return jsonResponse(store.replaceDeals(payload.deals as Deal[]));
      default:
        return jsonResponse({ error: `Неизвестное действие CRM API: ${body.action}` }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка изменения CRM.';
    return jsonResponse({ error: message }, 500);
  }
}
