'use client';

import { useCallback, useId, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { ALLOWED_FILE_EXTENSIONS, isAllowedDealFile } from './fileUtils';

type FileDropzoneProps = {
  dealId: string;
  onFilesSelected: (dealId: string, files: File[]) => void;
};

export function FileDropzone({ dealId, onFilesSelected }: FileDropzoneProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      const selectedFiles = Array.from(fileList ?? []);

      if (selectedFiles.length === 0) {
        return;
      }

      const acceptedFiles = selectedFiles.filter((file) => isAllowedDealFile(file.name));
      const rejectedFiles = selectedFiles.filter((file) => !isAllowedDealFile(file.name));

      if (rejectedFiles.length > 0) {
        setError(`Не поддерживается: ${rejectedFiles.map((file) => file.name).join(', ')}`);
      } else {
        setError(null);
      }

      if (acceptedFiles.length > 0) {
        onFilesSelected(dealId, acceptedFiles);
      }
    },
    [dealId, onFilesSelected],
  );

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-4 text-center transition ${
          isDragging ? 'border-slate-950 bg-slate-100 text-slate-950' : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:bg-slate-50'
        }`}
      >
        <UploadCloud className="mb-2 h-6 w-6" />
        <span className="text-sm font-bold text-slate-900">Перетащите файлы сделки</span>
        <span className="mt-1 text-xs leading-5">или нажмите для выбора · {ALLOWED_FILE_EXTENSIONS.join(', ')}</span>
      </label>
      <input
        id={inputId}
        type="file"
        multiple
        accept={ALLOWED_FILE_EXTENSIONS.join(',')}
        className="sr-only"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.currentTarget.value = '';
        }}
      />
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
