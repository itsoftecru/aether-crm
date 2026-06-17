'use client';

import { useMemo, useState } from 'react';
import type { DrawingElement, DrawingPoint, DrawingTool } from '@/types/crm';
import { DrawingCanvas } from './DrawingCanvas';
import { DrawingToolbar } from './DrawingToolbar';

type DrawingEditorProps = {
  dealId: string;
  dealTitle: string;
  onSave: (dealId: string, drawing: { name: string; elements: DrawingElement[]; svg: string }) => void;
  onClose: () => void;
};

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 620;
const GRID_SIZE = 20;

function snapPoint(point: DrawingPoint, enabled: boolean): DrawingPoint {
  if (!enabled) {
    return point;
  }

  return {
    x: Math.max(0, Math.min(CANVAS_WIDTH, Math.round(point.x / GRID_SIZE) * GRID_SIZE)),
    y: Math.max(0, Math.min(CANVAS_HEIGHT, Math.round(point.y / GRID_SIZE) * GRID_SIZE)),
  };
}

function createSvgDocument(elements: DrawingElement[], title: string): string {
  const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] ?? char);
  const body = elements
    .map((element) => {
      const stroke = '#0f172a';

      if (element.tool === 'line') {
        return `<line x1="${element.start.x}" y1="${element.start.y}" x2="${element.end.x}" y2="${element.end.y}" stroke="${stroke}" stroke-width="2" fill="none"/>`;
      }

      if (element.tool === 'rectangle') {
        const x = Math.min(element.start.x, element.end.x);
        const y = Math.min(element.start.y, element.end.y);
        const width = Math.abs(element.end.x - element.start.x);
        const height = Math.abs(element.end.y - element.start.y);
        return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="2" stroke="${stroke}" stroke-width="2" fill="rgba(15,23,42,0.04)"/>`;
      }

      if (element.tool === 'circle') {
        const radius = Math.hypot(element.end.x - element.start.x, element.end.y - element.start.y);
        return `<circle cx="${element.start.x}" cy="${element.start.y}" r="${radius}" stroke="${stroke}" stroke-width="2" fill="rgba(15,23,42,0.04)"/>`;
      }

      if (element.tool === 'dimension') {
        const labelX = (element.start.x + element.end.x) / 2;
        const labelY = (element.start.y + element.end.y) / 2 - 8;
        const label = escapeXml(element.text || `${Math.round(Math.hypot(element.end.x - element.start.x, element.end.y - element.start.y))} мм`);
        return `<g><line x1="${element.start.x}" y1="${element.start.y}" x2="${element.end.x}" y2="${element.end.y}" stroke="${stroke}" stroke-width="1.6" stroke-dasharray="4 4"/><circle cx="${element.start.x}" cy="${element.start.y}" r="4" fill="${stroke}"/><circle cx="${element.end.x}" cy="${element.end.y}" r="4" fill="${stroke}"/><text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="13" font-weight="700" fill="${stroke}">${label}</text></g>`;
      }

      return `<text x="${element.start.x}" y="${element.start.y}" font-size="18" font-weight="600" fill="${stroke}">${escapeXml(element.text || 'Текст')}</text>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" role="img"><title>${escapeXml(title)}</title><rect width="100%" height="100%" fill="white"/>${body}</svg>`;
}

export function DrawingEditor({ dealId, dealTitle, onSave, onClose }: DrawingEditorProps) {
  const [activeTool, setActiveTool] = useState<DrawingTool>('line');
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [draftStart, setDraftStart] = useState<DrawingPoint | null>(null);
  const [cursorPoint, setCursorPoint] = useState<DrawingPoint | null>(null);
  const [previewElement, setPreviewElement] = useState<DrawingElement | null>(null);

  const title = useMemo(() => `Чертеж ${dealTitle}`, [dealTitle]);

  const addTextElement = (point: DrawingPoint) => {
    const text = window.prompt('Введите текстовую пометку для чертежа:', 'Пометка');

    if (!text || text.trim().length === 0) {
      return;
    }

    setElements((current) => [
      ...current,
      { id: `drawing-${dealId}-${Date.now()}`, tool: 'text', start: point, end: point, text: text.trim() },
    ]);
  };

  const updatePreview = (start: DrawingPoint, end: DrawingPoint) => {
    if (activeTool === 'select' || activeTool === 'text') {
      setPreviewElement(null);
      return;
    }

    const length = Math.round(Math.hypot(end.x - start.x, end.y - start.y));
    setPreviewElement({
      id: `preview-${activeTool}`,
      tool: activeTool,
      start,
      end,
      text: activeTool === 'dimension' ? `${length} мм` : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl rounded-3xl bg-slate-50 p-4 shadow-2xl">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Редактор чертежей</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">Координаты привязываются к сетке {GRID_SIZE} мм при включенной привязке.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            Объектов: <span className="font-bold text-slate-950">{elements.length}</span>
            {cursorPoint ? <span> · X {Math.round(cursorPoint.x)} / Y {Math.round(cursorPoint.y)}</span> : null}
          </div>
        </div>

        <DrawingToolbar
          activeTool={activeTool}
          showGrid={showGrid}
          snapToGrid={snapToGrid}
          canSave={elements.length > 0}
          onToolChange={(tool) => {
            setActiveTool(tool);
            setDraftStart(null);
            setPreviewElement(null);
          }}
          onShowGridChange={setShowGrid}
          onSnapToGridChange={setSnapToGrid}
          onClear={() => {
            setElements([]);
            setDraftStart(null);
            setPreviewElement(null);
          }}
          onClose={onClose}
          onSave={() => {
            const svg = createSvgDocument(elements, title);
            onSave(dealId, { name: `${title}.svg`, elements, svg });
          }}
        />

        <div className="mt-4">
          <DrawingCanvas
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            gridSize={GRID_SIZE}
            showGrid={showGrid}
            elements={elements}
            previewElement={previewElement}
            cursorPoint={cursorPoint}
            onPointerDown={(rawPoint) => {
              const point = snapPoint(rawPoint, snapToGrid);
              setCursorPoint(point);

              if (activeTool === 'text') {
                addTextElement(point);
                return;
              }

              if (activeTool !== 'select') {
                setDraftStart(point);
                updatePreview(point, point);
              }
            }}
            onPointerMove={(rawPoint) => {
              const point = snapPoint(rawPoint, snapToGrid);
              setCursorPoint(point);

              if (draftStart) {
                updatePreview(draftStart, point);
              }
            }}
            onPointerUp={(rawPoint) => {
              const point = snapPoint(rawPoint, snapToGrid);

              if (!draftStart || activeTool === 'select' || activeTool === 'text') {
                return;
              }

              const distance = Math.hypot(point.x - draftStart.x, point.y - draftStart.y);
              if (distance >= GRID_SIZE / 2) {
                setElements((current) => [
                  ...current,
                  {
                    id: `drawing-${dealId}-${Date.now()}-${current.length}`,
                    tool: activeTool,
                    start: draftStart,
                    end: point,
                    text: activeTool === 'dimension' ? `${Math.round(distance)} мм` : undefined,
                  },
                ]);
              }

              setDraftStart(null);
              setPreviewElement(null);
            }}
          />
        </div>
      </div>
    </div>
  );
}
