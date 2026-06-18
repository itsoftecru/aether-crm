import { createHash, createHmac } from 'node:crypto';
import { contentToBuffer, sanitizeStorageSegment, type FileStorage, type FileStorageSaveInput, type FileStorageSaveResult } from '@/lib/storage/fileStorage';

const DEFAULT_EXPIRES_SECONDS = 900;

type S3Config = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl?: string;
  forcePathStyle: boolean;
};

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value).digest();
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function timestamp(date = new Date()): { amzDate: string; shortDate: string } {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amzDate: iso, shortDate: iso.slice(0, 8) };
}

export class S3FileStorage implements FileStorage {
  private readonly config: S3Config;

  constructor(config: Partial<S3Config> = {}) {
    this.config = {
      endpoint: config.endpoint ?? process.env.CRM_S3_ENDPOINT ?? '',
      region: config.region ?? process.env.CRM_S3_REGION ?? 'us-east-1',
      bucket: config.bucket ?? process.env.CRM_S3_BUCKET ?? '',
      accessKeyId: config.accessKeyId ?? process.env.CRM_S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: config.secretAccessKey ?? process.env.CRM_S3_SECRET_ACCESS_KEY ?? '',
      publicBaseUrl: config.publicBaseUrl ?? process.env.CRM_S3_PUBLIC_BASE_URL,
      forcePathStyle: config.forcePathStyle ?? process.env.CRM_S3_FORCE_PATH_STYLE !== 'false',
    };
  }

  async save(input: FileStorageSaveInput): Promise<FileStorageSaveResult> {
    this.assertConfigured();
    const body = await contentToBuffer(input.content);
    if (!body) return { storageKey: null, previewUrl: null };
    const storageKey = `${sanitizeStorageSegment(input.dealId)}/${sanitizeStorageSegment(input.fileId)}-${sanitizeStorageSegment(input.fileName)}`;
    const url = this.objectUrl(storageKey);
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.signHeaders('PUT', url, body, input.mimeType),
      body: new Uint8Array(body),
    });
    if (!response.ok) throw new Error(`S3-хранилище вернуло статус ${response.status} при сохранении файла.`);
    return { storageKey, previewUrl: await this.getPreviewUrl(storageKey) };
  }

  async getPreviewUrl(storageKey: string | null | undefined): Promise<string | null> {
    return storageKey ? this.createPresignedUrl(storageKey, 'inline') : null;
  }

  async getDownloadUrl(storageKey: string | null | undefined): Promise<string | null> {
    return storageKey ? this.createPresignedUrl(storageKey, 'attachment') : null;
  }

  private assertConfigured(): void {
    if (!this.config.endpoint || !this.config.bucket || !this.config.accessKeyId || !this.config.secretAccessKey) {
      throw new Error('S3-compatible файловое хранилище не настроено: проверьте CRM_S3_* переменные окружения.');
    }
  }

  private objectUrl(storageKey: string): URL {
    const endpoint = new URL(this.config.endpoint);
    if (this.config.forcePathStyle) return new URL(`${endpoint.href.replace(/\/$/, '')}/${this.config.bucket}/${storageKey}`);
    endpoint.hostname = `${this.config.bucket}.${endpoint.hostname}`;
    endpoint.pathname = `/${storageKey}`;
    return endpoint;
  }

  private signHeaders(method: string, url: URL, body: Buffer, contentType: string): Headers {
    const { amzDate, shortDate } = timestamp();
    const payloadHash = sha256(body);
    const canonicalHeaders = `content-type:${contentType}\nhost:${url.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = [method, url.pathname, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
    const scope = `${shortDate}/${this.config.region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
    const signingKey = hmac(hmac(hmac(hmac(`AWS4${this.config.secretAccessKey}`, shortDate), this.config.region), 's3'), 'aws4_request');
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    return new Headers({
      'content-type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      authorization: `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    });
  }

  private createPresignedUrl(storageKey: string, disposition: 'inline' | 'attachment'): string {
    this.assertConfigured();
    if (this.config.publicBaseUrl) return `${this.config.publicBaseUrl.replace(/\/$/, '')}/${encodeURI(storageKey)}`;
    const url = this.objectUrl(storageKey);
    const { amzDate, shortDate } = timestamp();
    const scope = `${shortDate}/${this.config.region}/s3/aws4_request`;
    url.searchParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
    url.searchParams.set('X-Amz-Credential', `${this.config.accessKeyId}/${scope}`);
    url.searchParams.set('X-Amz-Date', amzDate);
    url.searchParams.set('X-Amz-Expires', String(DEFAULT_EXPIRES_SECONDS));
    url.searchParams.set('X-Amz-SignedHeaders', 'host');
    url.searchParams.set('response-content-disposition', disposition);
    const canonicalQuery = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    const canonicalRequest = ['GET', url.pathname, canonicalQuery, `host:${url.host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
    const signingKey = hmac(hmac(hmac(hmac(`AWS4${this.config.secretAccessKey}`, shortDate), this.config.region), 's3'), 'aws4_request');
    const signature = createHmac('sha256', signingKey).update(['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n')).digest('hex');
    url.searchParams.set('X-Amz-Signature', signature);
    return url.toString();
  }
}

export function createProductionFileStorage(): S3FileStorage {
  return new S3FileStorage();
}
