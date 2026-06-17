import { Archive, FileArchive, FileCode2, FileText } from 'lucide-react';
import type { DealFile } from '@/types/crm';
import { formatFileSize, getFileExtension, isPreviewableImage, isPreviewablePdf } from './fileUtils';

type FilePreviewProps = {
  file: DealFile;
};

function getFallbackIcon(file: DealFile) {
  const extension = getFileExtension(file.name);

  if (extension === '.zip') {
    return FileArchive;
  }

  if (extension === '.dwg' || extension === '.dxf') {
    return FileCode2;
  }

  if (extension === '.docx') {
    return FileText;
  }

  return Archive;
}

export function FilePreview({ file }: FilePreviewProps) {
  if (isPreviewableImage(file)) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        <img src={file.previewUrl} alt={`Предпросмотр файла ${file.name}`} className="h-28 w-full object-cover" />
      </div>
    );
  }

  if (isPreviewablePdf(file)) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <object data={file.previewUrl} type="application/pdf" className="h-32 w-full" aria-label={`PDF ${file.name}`}>
          <div className="flex h-32 items-center justify-center gap-2 bg-red-50 text-sm font-semibold text-red-700">
            <FileText className="h-5 w-5" />
            PDF · предпросмотр недоступен
          </div>
        </object>
      </div>
    );
  }

  const Icon = getFallbackIcon(file);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 text-xs text-slate-500">
        <p className="font-bold uppercase tracking-[0.14em] text-slate-700">{getFileExtension(file.name).replace('.', '') || 'file'}</p>
        <p>{file.type || 'тип не указан'}</p>
        <p>{formatFileSize(file.size)}</p>
      </div>
    </div>
  );
}
