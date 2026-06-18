import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { INITIAL_ACTIVITY_EVENTS, INITIAL_CLIENTS, INITIAL_DEAL_FILES, INITIAL_DEALS, INITIAL_REMINDERS, INITIAL_SETTINGS } from '@/lib/crmRepository';
import type { ActivityEvent, Client, CrmSettings, Deal, DealFile, DealStatus, Reminder } from '@/types/crm';

type StoredDealFile = DealFile & { storageKey?: string | null };

type CrmSnapshot = {
  clients: Client[];
  deals: Deal[];
  dealFiles: StoredDealFile[];
  activityEvents: ActivityEvent[];
  reminders: Reminder[];
  settings: CrmSettings;
};

const DATABASE_PATH = process.env.CRM_SQLITE_PATH ?? join(process.cwd(), 'data', 'aether-crm.sqlite');
const SCHEMA_VERSION = 1;

function json<T>(value: T): string {
  return JSON.stringify(value);
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function createInitialSnapshot(): CrmSnapshot {
  return {
    clients: INITIAL_CLIENTS,
    deals: INITIAL_DEALS,
    dealFiles: INITIAL_DEAL_FILES.map((file) => ({ ...file, storageKey: null })),
    activityEvents: INITIAL_ACTIVITY_EVENTS,
    reminders: INITIAL_REMINDERS,
    settings: INITIAL_SETTINGS,
  };
}

export class SqliteCrmStore {
  private readonly database: DatabaseSync;

  constructor(databasePath = DATABASE_PATH) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    this.migrateSchema();
    this.seedInitialData();
  }

  close(): void {
    this.database.close();
  }

  getSnapshot(): CrmSnapshot {
    return {
      clients: this.allPayloads<Client>('clients', 'name ASC'),
      deals: this.allPayloads<Deal>('deals', 'created_at DESC, id ASC'),
      dealFiles: this.allPayloads<StoredDealFile>('deal_files', 'uploaded_at DESC, id ASC'),
      activityEvents: this.allPayloads<ActivityEvent>('activity_events', 'timestamp DESC, id ASC'),
      reminders: this.allPayloads<Reminder>('reminders', 'due_at ASC, id ASC'),
      settings: this.getSettings(),
    };
  }

  importSnapshot(snapshot: Partial<CrmSnapshot>): CrmSnapshot {
    const current = this.getSnapshot();
    const next: CrmSnapshot = {
      clients: Array.isArray(snapshot.clients) ? snapshot.clients : current.clients,
      deals: Array.isArray(snapshot.deals) ? snapshot.deals : current.deals,
      dealFiles: Array.isArray(snapshot.dealFiles) ? snapshot.dealFiles : current.dealFiles,
      activityEvents: Array.isArray(snapshot.activityEvents) ? snapshot.activityEvents : current.activityEvents,
      reminders: Array.isArray(snapshot.reminders) ? snapshot.reminders : current.reminders,
      settings: snapshot.settings ?? current.settings,
    };

    this.database.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      this.database.exec('DELETE FROM activity_events; DELETE FROM reminders; DELETE FROM deal_files; DELETE FROM deals; DELETE FROM clients;');
      next.clients.forEach((client) => this.upsertClient(client));
      next.deals.forEach((deal) => this.upsertDeal(deal));
      next.dealFiles.forEach((file) => this.upsertDealFile(file));
      next.activityEvents.forEach((event) => this.upsertActivityEvent(event));
      next.reminders.forEach((reminder) => this.upsertReminder(reminder));
      this.setSettings(next.settings);
      this.database.exec('COMMIT;');
    } catch (error) {
      this.database.exec('ROLLBACK;');
      throw error;
    }
    return this.getSnapshot();
  }

  getSettings(): CrmSettings {
    const row = this.database.prepare('SELECT payload FROM crm_settings WHERE id = ?').get('default') as { payload: string } | undefined;
    return row ? parseJson<CrmSettings>(row.payload) : INITIAL_SETTINGS;
  }

  setSettings(settings: CrmSettings): CrmSettings {
    this.database.prepare('INSERT OR REPLACE INTO crm_settings (id, payload, updated_at) VALUES (?, ?, ?)').run('default', json(settings), nowIso());
    return settings;
  }

  upsertClient(client: Client): Client {
    this.database.prepare(`INSERT OR REPLACE INTO clients (id, name, company, phone, email, payload, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(client.id, client.name, client.company, client.phone, client.email, json(client), nowIso());
    return client;
  }

  updateClient(clientId: string, patch: Partial<Client>): Client | null {
    const client = this.getPayload<Client>('clients', clientId);
    if (!client) return null;
    const updated = { ...client, ...patch, id: client.id, communications: patch.communications ?? client.communications, messengers: patch.messengers ?? client.messengers };
    this.upsertClient(updated);
    this.allPayloads<Deal>('deals').filter((deal) => deal.clientId === clientId).forEach((deal) => this.upsertDeal({ ...deal, client: updated.name }));
    return updated;
  }

  deleteClient(clientId: string): boolean {
    const relatedDeal = this.database.prepare('SELECT id FROM deals WHERE client_id = ? LIMIT 1').get(clientId);
    if (relatedDeal || !this.getPayload<Client>('clients', clientId)) return false;
    this.database.prepare('DELETE FROM reminders WHERE client_id = ?').run(clientId);
    this.database.prepare('DELETE FROM clients WHERE id = ?').run(clientId);
    return true;
  }

  upsertDeal(deal: Deal): Deal {
    this.database.prepare(`INSERT OR REPLACE INTO deals (id, client_id, title, status, owner, created_at, due_date, revenue_amount, currency, payload, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(deal.id, deal.clientId, deal.title, deal.status, deal.owner, deal.createdAt, deal.dueDate, deal.revenueAmount, deal.currency, json(deal), nowIso());
    return deal;
  }

  updateDeal(dealId: string, patch: Partial<Deal>): Deal | null {
    const deal = this.getPayload<Deal>('deals', dealId);
    if (!deal) return null;
    const client = patch.clientId ? this.getPayload<Client>('clients', patch.clientId) : null;
    const updated = { ...deal, ...patch, id: deal.id, createdAt: deal.createdAt, client: client?.name ?? patch.client ?? deal.client };
    return this.upsertDeal(updated);
  }

  deleteDeal(dealId: string): boolean {
    if (!this.getPayload<Deal>('deals', dealId)) return false;
    this.database.prepare('DELETE FROM activity_events WHERE deal_id = ?').run(dealId);
    this.database.prepare('DELETE FROM reminders WHERE deal_id = ?').run(dealId);
    this.database.prepare('DELETE FROM deal_files WHERE deal_id = ?').run(dealId);
    this.database.prepare('DELETE FROM deals WHERE id = ?').run(dealId);
    return true;
  }

  replaceDeals(deals: Deal[]): Deal[] {
    this.database.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      this.database.exec('DELETE FROM deals;');
      deals.forEach((deal) => this.upsertDeal(deal));
      this.database.exec('COMMIT;');
      return deals;
    } catch (error) {
      this.database.exec('ROLLBACK;');
      throw error;
    }
  }

  upsertDealFile(file: StoredDealFile): StoredDealFile {
    this.database.prepare(`INSERT OR REPLACE INTO deal_files (id, deal_id, name, mime_type, size_bytes, version, uploaded_at, payload, content, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(file.id, file.dealId, file.name, file.type, file.size, file.version, file.uploadedAt, json(file), file.previewUrl ?? null, nowIso());
    return file;
  }

  upsertActivityEvent(event: ActivityEvent): ActivityEvent {
    this.database.prepare(`INSERT OR REPLACE INTO activity_events (id, deal_id, event_type, timestamp, message, payload) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(event.id, event.dealId, event.type, event.timestamp, event.message, json(event));
    return event;
  }

  upsertReminder(reminder: Reminder): Reminder {
    this.database.prepare(`INSERT OR REPLACE INTO reminders (id, deal_id, client_id, manager_id, title, due_at, is_done, priority, reminder_type, payload, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(reminder.id, reminder.dealId, reminder.clientId, reminder.managerId, reminder.title, reminder.dueAt, reminder.isDone ? 1 : 0, reminder.priority, reminder.type, json(reminder), nowIso());
    return reminder;
  }

  updateReminder(reminderId: string, patch: Partial<Reminder>): Reminder | null {
    const reminder = this.getPayload<Reminder>('reminders', reminderId);
    if (!reminder) return null;
    return this.upsertReminder({ ...reminder, ...patch, id: reminder.id });
  }

  deleteReminder(reminderId: string): boolean {
    const result = this.database.prepare('DELETE FROM reminders WHERE id = ?').run(reminderId);
    return result.changes > 0;
  }

  private migrateSchema(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, name TEXT NOT NULL, company TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS deals (id TEXT PRIMARY KEY, client_id TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL, owner TEXT NOT NULL, created_at TEXT NOT NULL, due_date TEXT NOT NULL, revenue_amount REAL NOT NULL, currency TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS contacts (id TEXT PRIMARY KEY, client_id TEXT NOT NULL, kind TEXT NOT NULL, value TEXT NOT NULL, payload TEXT NOT NULL, FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS communications (id TEXT PRIMARY KEY, client_id TEXT NOT NULL, channel TEXT NOT NULL, communication_date TEXT NOT NULL, summary TEXT NOT NULL, manager TEXT NOT NULL, payload TEXT NOT NULL, FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS deal_files (id TEXT PRIMARY KEY, deal_id TEXT NOT NULL, name TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, version INTEGER NOT NULL, uploaded_at TEXT NOT NULL, payload TEXT NOT NULL, content TEXT, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS drawings (id TEXT PRIMARY KEY, deal_file_id TEXT NOT NULL, format TEXT NOT NULL, payload TEXT NOT NULL, FOREIGN KEY(deal_file_id) REFERENCES deal_files(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY, deal_id TEXT NOT NULL, client_id TEXT NOT NULL, manager_id TEXT NOT NULL, title TEXT NOT NULL, due_at TEXT NOT NULL, is_done INTEGER NOT NULL, priority TEXT NOT NULL, reminder_type TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS financial_rows (id TEXT PRIMARY KEY, deal_id TEXT NOT NULL, category TEXT NOT NULL, title TEXT NOT NULL, amount REAL NOT NULL, payload TEXT NOT NULL, FOREIGN KEY(deal_id) REFERENCES deals(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS activity_events (id TEXT PRIMARY KEY, deal_id TEXT NOT NULL, event_type TEXT NOT NULL, timestamp TEXT NOT NULL, message TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS crm_settings (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
      INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (${SCHEMA_VERSION}, '${nowIso()}');
    `);
  }

  private seedInitialData(): void {
    const row = this.database.prepare('SELECT COUNT(*) AS count FROM clients').get() as { count: number };
    if (row.count > 0) return;
    this.importSnapshot(createInitialSnapshot());
  }

  private allPayloads<T>(table: string, orderBy = 'id ASC'): T[] {
    return this.database.prepare(`SELECT payload FROM ${table} ORDER BY ${orderBy}`).all().map((row: unknown) => parseJson<T>((row as { payload: string }).payload));
  }

  private getPayload<T>(table: string, id: string): T | null {
    const row = this.database.prepare(`SELECT payload FROM ${table} WHERE id = ?`).get(id) as { payload: string } | undefined;
    return row ? parseJson<T>(row.payload) : null;
  }
}

let singleton: SqliteCrmStore | null = null;

export function getSqliteCrmStore(): SqliteCrmStore {
  singleton ??= new SqliteCrmStore();
  return singleton;
}
