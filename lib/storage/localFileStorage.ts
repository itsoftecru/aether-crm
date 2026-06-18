import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { contentToBuffer, sanitizeStorageSegment, type FileStorage, type FileStorageSaveInput, type FileStorageSaveResult } from '@/lib/storage/fileStorage';

const DEFAULT_UPLOAD_DIR = join(process.cwd(), 'data', 'uploads');
const LOCAL_FILE_ROUTE = '/api/crm/files';

export class LocalFileStorage implements FileStorage {
  private readonly rootDirectory: string;

  constructor(rootDirectory = process.env.CRM_UPLOAD_DIR ?? DEFAULT_UPLOAD_DIR) {
    this.rootDirectory = resolve(rootDirectory);
  }

  async save(input: FileStorageSaveInput): Promise<FileStorageSaveResult> {
    const body = await contentToBuffer(input.content);
    if (!body) return { storageKey: null, previewUrl: null };
    const safeDealId = sanitizeStorageSegment(input.dealId);
    const safeFileId = sanitizeStorageSegment(input.fileId);
    const safeName = sanitizeStorageSegment(input.fileName);
    const storageKey = join(safeDealId, `${safeFileId}-${safeName}`);
    const absolutePath = this.resolveStorageKey(storageKey);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, body);
    return { storageKey, previewUrl: this.buildUrl(input.fileId, 'preview') };
  }

  async getPreviewUrl(_storageKey: string | null | undefined, fileId?: string): Promise<string | null> {
    return fileId ? this.buildUrl(fileId, 'preview') : null;
  }

  async getDownloadUrl(_storageKey: string | null | undefined, fileId?: string): Promise<string | null> {
    return fileId ? this.buildUrl(fileId, 'download') : null;
  }

  async read(storageKey: string): Promise<{ body: Buffer; contentType: string; fileName?: string }> {
    const absolutePath = this.resolveStorageKey(storageKey);
    const body = await readFile(absolutePath);
    const fileName = absolutePath.split(/[\\/]/).pop();
    return { body, contentType: 'application/octet-stream', fileName };
  }

  async delete(storageKey: string | null | undefined): Promise<void> {
    if (!storageKey) return;
    await rm(this.resolveStorageKey(storageKey), { force: true });
  }

  private resolveStorageKey(storageKey: string): string {
    const resolved = resolve(this.rootDirectory, storageKey);
    if (!resolved.startsWith(`${this.rootDirectory}`)) {
      throw new Error('Некорректный ключ локального файлового хранилища.');
    }
    return resolved;
  }

  private buildUrl(fileId: string, disposition: 'preview' | 'download'): string {
    const params = new URLSearchParams({ id: fileId, disposition });
    return `${LOCAL_FILE_ROUTE}?${params.toString()}`;
  }
}
