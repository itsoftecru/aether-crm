import type { DealFile } from '@/types/crm';

export const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.dwg', '.dxf', '.jpg', '.jpeg', '.png', '.docx', '.zip'] as const;

export function getFileExtension(fileName: string): string {
  const normalizedName = fileName.trim().toLowerCase();
  const lastDotIndex = normalizedName.lastIndexOf('.');

  if (lastDotIndex <= 0 || lastDotIndex === normalizedName.length - 1) {
    return '';
  }

  return normalizedName.slice(lastDotIndex);
}

export function isAllowedDealFile(fileName: string): boolean {
  return ALLOWED_FILE_EXTENSIONS.includes(getFileExtension(fileName) as (typeof ALLOWED_FILE_EXTENSIONS)[number]);
}

export function formatFileSize(size: number): string {
  if (!Number.isFinite(size) || size < 0) {
    return '0 Б';
  }

  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: unitIndex === 0 ? 0 : 1 })} ${units[unitIndex]}`;
}

export function getNextFileVersion(files: DealFile[], dealId: string, fileName: string): number {
  const versions = files
    .filter((file) => file.dealId === dealId && file.name.toLowerCase() === fileName.toLowerCase())
    .map((file) => file.version);

  return versions.length > 0 ? Math.max(...versions) + 1 : 1;
}

export function isPreviewableImage(file: DealFile): boolean {
  return ['.jpg', '.jpeg', '.png'].includes(getFileExtension(file.name)) || file.type.startsWith('image/');
}

export function isPreviewablePdf(file: DealFile): boolean {
  return getFileExtension(file.name) === '.pdf' || file.type === 'application/pdf';
}
