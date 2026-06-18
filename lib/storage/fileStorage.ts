import type { DealFile } from '@/types/crm';

export type StoredFileContent = Blob | Buffer | Uint8Array | ArrayBuffer | string | null | undefined;

export type StoredDealFile = DealFile & {
  storageKey?: string | null;
};

export type FileStorageSaveInput = {
  fileId: string;
  dealId: string;
  fileName: string;
  mimeType: string;
  content: StoredFileContent;
};

export type FileStorageSaveResult = {
  storageKey: string | null;
  previewUrl: string | null;
};

export interface FileStorage {
  save(input: FileStorageSaveInput): Promise<FileStorageSaveResult>;
  getPreviewUrl(storageKey: string | null | undefined, fileId?: string): Promise<string | null>;
  getDownloadUrl(storageKey: string | null | undefined, fileId?: string): Promise<string | null>;
  read?(storageKey: string): Promise<{ body: Buffer; contentType: string; fileName?: string }>;
  delete?(storageKey: string | null | undefined): Promise<void>;
}

export function isDataUrl(value: string): boolean {
  return /^data:[^;,]+(?:;[^,]+)*,/.test(value);
}

export async function contentToBuffer(content: StoredFileContent): Promise<Buffer | null> {
  if (!content) return null;
  if (Buffer.isBuffer(content)) return content;
  if (content instanceof Uint8Array) return Buffer.from(content);
  if (content instanceof ArrayBuffer) return Buffer.from(content);
  if (typeof Blob !== 'undefined' && content instanceof Blob) {
    return Buffer.from(await content.arrayBuffer());
  }
  if (typeof content === 'string') {
    if (isDataUrl(content)) {
      const [, payload = ''] = content.split(',', 2);
      return Buffer.from(payload, content.includes(';base64,') ? 'base64' : 'utf8');
    }
    return Buffer.from(content, 'utf8');
  }
  return null;
}

export function sanitizeStorageSegment(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return 'file';
  return trimmed.replace(/[\\/\0<>:"|?*]+/g, '-').replace(/\s+/g, '-').slice(0, 160);
}
