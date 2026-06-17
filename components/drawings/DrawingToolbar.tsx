'use client';

import type { ComponentType } from 'react';
import { Circle, DraftingCompass, Grid2X2, Minus, MousePointer2, RectangleHorizontal, Save, Type } from 'lucide-react';
import type { DrawingTool } from '@/types/crm';

type DrawingToolbarProps = {
  activeTool: DrawingTool;
  showGrid: boolean;
  snapToGrid: boolean;
  canSave: boolean;
  onToolChange: (tool: DrawingTool) => void;
  onShowGridChange: (enabled: boolean) => void;
  onSnapToGridChange: (enabled: boolean) => void;
  onSave: () => void;
  onClear: () => void;
  onClose: () => void;
};

const TOOL_BUTTONS: Array<{ tool: DrawingTool; title: string; icon: ComponentType<{ className?: string }> }> = [
  { tool: 'select', title: 'Выбор', icon: MousePointer2 },
  { tool: 'line', title: 'Линия', icon: Minus },
  { tool: 'rectangle', title: 'Прямоугольник', icon: RectangleHorizontal },
  { tool: 'circle', title: 'Окружность', icon: Circle },
  { tool: 'dimension', title: 'Размер', icon: DraftingCompass },
  { tool: 'text', title: 'Текст', icon: Type },
];

export function DrawingToolbar({
  activeTool,
  showGrid,
  snapToGrid,
  canSave,
  onToolChange,
  onShowGridChange,
  onSnapToGridChange,
  onSave,
  onClear,
  onClose,
}: DrawingToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap gap-2" aria-label="Инструменты чертежа">
        {TOOL_BUTTONS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTool === item.tool;

          return (
            <button
              key={item.tool}
              type="button"
              onClick={() => onToolChange(item.tool)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${
                isActive ? 'bg-slate-950 text-white shadow-lg shadow-slate-900/15' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              aria-pressed={isActive}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </button>
          );
        })}
      </div>

      <div className="mx-1 hidden h-8 w-px bg-slate-200 md:block" />

      <button
        type="button"
        onClick={() => onShowGridChange(!showGrid)}
        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${
          showGrid ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
        aria-pressed={showGrid}
      >
        <Grid2X2 className="h-4 w-4" />
        Сетка
      </button>
      <button
        type="button"
        onClick={() => onSnapToGridChange(!snapToGrid)}
        className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
          snapToGrid ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
        aria-pressed={snapToGrid}
      >
        Привязка {snapToGrid ? 'вкл.' : 'выкл.'}
      </button>

      <div className="ml-auto flex flex-wrap gap-2">
        <button type="button" onClick={onClear} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">
          Очистить
        </button>
        <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">
          Закрыть
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Save className="h-4 w-4" />
          Сохранить
        </button>
      </div>
    </div>
  );
}
