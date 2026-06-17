'use client';

import { Paperclip } from 'lucide-react';
import type { DealFile } from '@/types/crm';
import { FilePreview } from './FilePreview';
import { formatFileSize } from './fileUtils';

type FileListProps = {
  files: DealFile[];
};

export function FileList({ files }: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
        Вложений пока нет. Добавьте ТЗ, чертежи, сметы или архивы проекта.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {files.map((file) => (
        <li key={file.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <FilePreview file={file} />
          <div className="mt-3 flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate font-bold text-slate-950">
                <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
                {file.name}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Версия {file.version} · {formatFileSize(file.size)} · {new Date(file.uploadedAt).toLocaleString('ru-RU')}
              </p>
            </div>
            <a
              href={file.previewUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white transition hover:bg-slate-700"
            >
              Открыть
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
