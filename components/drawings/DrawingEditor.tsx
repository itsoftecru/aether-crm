'use client';

import { useMemo, useState } from 'react';
import type { DrawingAttachment, DrawingElement, DrawingPoint, DrawingProduct, DrawingTool, ProductProfile, ProfileSegment } from '@/types/crm';
import { DrawingCanvas, renderElement } from './DrawingCanvas';
import { DrawingToolbar } from './DrawingToolbar';

export type DrawingSavePayload = { name: string; elements: DrawingElement[]; svg: string; products: DrawingProduct[]; title: string };

type DrawingEditorProps = {
  dealId: string;
  dealTitle: string;
  initialDrawing?: DrawingAttachment | null;
  onSave: (dealId: string, drawing: DrawingSavePayload) => void;
  onExportPdf?: (dealId: string, drawing: DrawingSavePayload) => void;
  onClose: () => void;
};

type ProductSpecDraft = {
  name: string;
  formula: string;
  lengthMm: number;
  quantity: number;
  material: string;
  thicknessMm: number;
  color: string;
};

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 620;
const GRID_SIZE = 20;
const PROFILE_SCALE = 2;
function snapPoint(point: DrawingPoint, enabled: boolean): DrawingPoint {
  if (!enabled) return point;
  return { x: Math.max(0, Math.min(CANVAS_WIDTH, Math.round(point.x / GRID_SIZE) * GRID_SIZE)), y: Math.max(0, Math.min(CANVAS_HEIGHT, Math.round(point.y / GRID_SIZE) * GRID_SIZE)) };
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] ?? char);
}

function buildProfilePoints(start: DrawingPoint, segments: ProfileSegment[]): DrawingPoint[] {
  return segments.reduce<DrawingPoint[]>((points, segment, index) => {
    const previous = points[index];
    const radians = (segment.angleDeg * Math.PI) / 180;
    return [...points, { x: previous.x + segment.lengthMm * PROFILE_SCALE * Math.cos(radians), y: previous.y + segment.lengthMm * PROFILE_SCALE * Math.sin(radians) }];
  }, [start]);
}

function getProfileFormula(profile: ProductProfile): string {
  return profile.segments.map((segment) => segment.lengthMm).join('х');
}

function getManualFormula(elements: DrawingElement[], draft: ProductSpecDraft): string {
  if (draft.formula.trim()) return draft.formula.trim();
  const lineLengths = elements
    .filter((element) => element.tool === 'line' || element.tool === 'hem' || element.tool === 'dimension')
    .map((element) => element.lengthMm ?? Math.round(Math.hypot(element.end.x - element.start.x, element.end.y - element.start.y)));
  return lineLengths.length > 0 ? lineLengths.join('×') : 'по чертежу';
}

function createDrawingProducts(elements: DrawingElement[], draft: ProductSpecDraft): DrawingProduct[] {
  const profileProducts = elements
    .filter((element) => element.tool === 'profile' && element.profile)
    .map((element) => ({ id: `product-${element.id}`, profileElementId: element.id, profileFormula: getProfileFormula(element.profile as ProductProfile), ...(element.profile as ProductProfile) }));

  return [
    {
      id: 'product-manual',
      profileElementId: '',
      profileFormula: getManualFormula(elements, draft),
      name: draft.name || 'Изделие',
      segments: [],
      lengthMm: draft.lengthMm,
      quantity: draft.quantity,
      material: draft.material,
      thicknessMm: draft.thicknessMm,
      color: draft.color,
    },
    ...profileProducts,
  ];
}

function renderElementToSvg(element: DrawingElement): string {
  const stroke = '#0f172a';
  if (element.tool === 'profile' && element.profile) {
    const points = buildProfilePoints(element.start, element.profile.segments);
    const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
    const labels = element.profile.segments.map((segment, index) => {
      const start = points[index];
      const end = points[index + 1];
      const x = (start.x + end.x) / 2;
      const y = (start.y + end.y) / 2;
      const bend = segment.bendType === 'hem' ? `Завальцовка ${segment.hemSizeMm || segment.lengthMm} мм` : `${segment.angleDeg}°`;
      return `<text x="${x}" y="${y - 8}" text-anchor="middle" font-size="12" font-weight="700" fill="${segment.bendType === 'hem' ? '#ea580c' : stroke}">${segment.lengthMm} мм</text><text x="${start.x + 7}" y="${start.y + 16}" font-size="11" font-weight="600" fill="#64748b">${escapeXml(bend)}</text>`;
    }).join('');
    return `<g><polyline points="${polylinePoints}" fill="none" stroke="${stroke}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/><text x="${element.start.x}" y="${element.start.y - 18}" font-size="14" font-weight="700" fill="${stroke}">${escapeXml(element.profile.name)} · ${getProfileFormula(element.profile)} мм · L=${element.profile.lengthMm} мм · ${element.profile.quantity} шт</text>${labels}</g>`;
  }
  if (element.tool === 'line' || element.tool === 'hem') {
    const labelX = (element.start.x + element.end.x) / 2;
    const labelY = (element.start.y + element.end.y) / 2 - 8;
    const length = element.lengthMm ?? Math.round(Math.hypot(element.end.x - element.start.x, element.end.y - element.start.y));
    const isHemLine = element.tool === 'hem' || element.hemSizeMm !== undefined;
    const dash = isHemLine ? ' stroke-dasharray="8 4"' : '';
    const extra = isHemLine ? `<line x1="${element.start.x}" y1="${element.start.y + 5}" x2="${element.end.x}" y2="${element.end.y + 5}" stroke="${stroke}" stroke-width="1.4" stroke-dasharray="8 4"/>` : '';
    const label = isHemLine ? `Завальцовка ${element.hemSizeMm ?? 15} мм` : `${length} мм`;
    return `<g><line x1="${element.start.x}" y1="${element.start.y}" x2="${element.end.x}" y2="${element.end.y}" stroke="${stroke}" stroke-width="2" fill="none"${dash}/>${extra}<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="13" font-weight="700" fill="${stroke}">${escapeXml(element.text || label)}</text></g>`;
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
}

function createSvgDocument(elements: DrawingElement[], title: string, products: DrawingProduct[]): string {
  const body = elements.map(renderElementToSvg).join('');
  const rows = products.map((product, index) => `<text x="30" y="${CANVAS_HEIGHT + 58 + index * 18}" font-size="12" fill="#0f172a">${index + 1}. ${escapeXml(product.name)} ${escapeXml(product.profileFormula)} мм · L=${product.lengthMm} мм · ${product.quantity} шт · ${escapeXml(product.material)} ${product.thicknessMm} мм · ${escapeXml(product.color)}</text>`).join('');
  const specHeight = Math.max(120, 70 + products.length * 18);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT + specHeight}" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT + specHeight}" role="img"><title>${escapeXml(title)}</title><rect width="100%" height="100%" fill="white"/><text x="30" y="32" font-size="20" font-weight="700" fill="#0f172a">${escapeXml(title)}</text><text x="30" y="54" font-size="12" fill="#475569">Дата: ${new Date().toLocaleString('ru-RU')} · Масштаб профилей: 1 мм = ${PROFILE_SCALE} px</text>${body}<line x1="20" y1="${CANVAS_HEIGHT + 24}" x2="${CANVAS_WIDTH - 20}" y2="${CANVAS_HEIGHT + 24}" stroke="#cbd5e1"/><text x="30" y="${CANVAS_HEIGHT + 44}" font-size="15" font-weight="700" fill="#0f172a">Спецификация изделий</text>${rows}</svg>`;
}

function createPayload(elements: DrawingElement[], title: string, productSpec: ProductSpecDraft): DrawingSavePayload {
  const products = createDrawingProducts(elements, productSpec);
  return { name: `${title}.svg`, elements, products, title, svg: createSvgDocument(elements, title, products) };
}

export function DrawingEditor({ dealId, dealTitle, initialDrawing, onSave, onExportPdf, onClose }: DrawingEditorProps) {
  const [activeTool, setActiveTool] = useState<DrawingTool>('line');
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [elements, setElements] = useState<DrawingElement[]>(initialDrawing?.elements ?? []);
  const [draftStart, setDraftStart] = useState<DrawingPoint | null>(null);
  const [mousePoint, setMousePoint] = useState<DrawingPoint | null>(null);
  const [snappedPoint, setSnappedPoint] = useState<DrawingPoint | null>(null);
  const [previewElement, setPreviewElement] = useState<DrawingElement | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(initialDrawing?.elements[0]?.id ?? null);
  const [productSpec, setProductSpec] = useState<ProductSpecDraft>({ name: 'Изделие', formula: '', lengthMm: 2000, quantity: 1, material: 'Оцинкованная сталь', thicknessMm: 0.5, color: 'RAL 9003' });
  const title = useMemo(() => initialDrawing?.title ?? `Чертеж ${dealTitle}`, [dealTitle, initialDrawing?.title]);
  const selectedElement = elements.find((element) => element.id === selectedElementId) ?? null;
  const products = useMemo(() => createDrawingProducts(elements, productSpec), [elements, productSpec]);

  const addTextElement = (point: DrawingPoint) => {
    const text = window.prompt('Введите текстовую пометку для чертежа:', 'Пометка');
    if (!text || text.trim().length === 0) return;
    const element = { id: `drawing-${dealId}-${Date.now()}`, tool: 'text' as const, start: point, end: point, text: text.trim() };
    setElements((current) => [...current, element]);
    setSelectedElementId(element.id);
  };

  const updatePreview = (start: DrawingPoint, end: DrawingPoint) => {
    if (activeTool === 'select' || activeTool === 'text' || activeTool === 'profile') {
      setPreviewElement(null);
      return;
    }
    const length = Math.round(Math.hypot(end.x - start.x, end.y - start.y));
    setPreviewElement({ id: `preview-${activeTool}`, tool: activeTool, start, end, lengthMm: length, hemSizeMm: activeTool === 'hem' ? 15 : undefined, text: activeTool === 'dimension' ? `${length} мм` : undefined });
  };

  const payload = createPayload(elements, title, productSpec);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl rounded-3xl bg-slate-50 p-4 shadow-2xl">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Редактор чертежей</p><h2 className="mt-1 text-2xl font-bold text-slate-950">{title}</h2><p className="mt-1 text-sm text-slate-600">Оранжевая точка — реальный курсор, синяя — точка привязки. Чертите линии вручную, длина показывается сразу во время рисования.</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Объектов: <span className="font-bold text-slate-950">{elements.length}</span>{mousePoint ? <span> · Курсор X {Math.round(mousePoint.x)} / Y {Math.round(mousePoint.y)}</span> : null}{snappedPoint ? <span> · Привязка X {Math.round(snappedPoint.x)} / Y {Math.round(snappedPoint.y)}</span> : null}</div>
        </div>
        <DrawingToolbar activeTool={activeTool} showGrid={showGrid} snapToGrid={snapToGrid} canSave={elements.length > 0} onToolChange={(tool) => { setActiveTool(tool); setDraftStart(null); setPreviewElement(null); }} onShowGridChange={setShowGrid} onSnapToGridChange={setSnapToGrid} onClear={() => { setElements([]); setSelectedElementId(null); setDraftStart(null); setPreviewElement(null); }} onClose={onClose} onExportPdf={() => onExportPdf?.(dealId, payload)} onSave={() => onSave(dealId, payload)} />
        <div className="mt-4 grid gap-4 xl:grid-cols-[320px_1fr]">
          <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
            <section><h3 className="font-bold text-slate-950">Параметры изделия</h3><p className="mt-1 text-xs text-slate-500">Профиль больше не вставляется заранее: нарисуйте контур линиями, а длину и количество укажите отдельно.</p><div className="mt-3 grid gap-2 text-sm"><input value={productSpec.name} onChange={(event) => setProductSpec((current) => ({ ...current, name: event.target.value }))} className="rounded-xl border px-3 py-2" placeholder="Название" /><input value={productSpec.formula} onChange={(event) => setProductSpec((current) => ({ ...current, formula: event.target.value }))} className="rounded-xl border px-3 py-2" placeholder="Формула/размеры, например 15×100×20" /><div className="grid grid-cols-2 gap-2"><input type="number" value={productSpec.lengthMm} onChange={(event) => setProductSpec((current) => ({ ...current, lengthMm: Number(event.target.value) || 0 }))} className="rounded-xl border px-3 py-2" placeholder="Длина" /><input type="number" value={productSpec.quantity} onChange={(event) => setProductSpec((current) => ({ ...current, quantity: Number(event.target.value) || 1 }))} className="rounded-xl border px-3 py-2" placeholder="Кол-во" /></div><div className="grid grid-cols-2 gap-2"><input value={productSpec.material} onChange={(event) => setProductSpec((current) => ({ ...current, material: event.target.value }))} className="rounded-xl border px-3 py-2" placeholder="Материал" /><input type="number" step="0.1" value={productSpec.thicknessMm} onChange={(event) => setProductSpec((current) => ({ ...current, thicknessMm: Number(event.target.value) || 0 }))} className="rounded-xl border px-3 py-2" placeholder="Толщина" /></div><input value={productSpec.color} onChange={(event) => setProductSpec((current) => ({ ...current, color: event.target.value }))} className="rounded-xl border px-3 py-2" placeholder="Цвет" /></div></section>
            <section><h4 className="text-sm font-bold text-slate-950">Спецификация</h4><ul className="mt-2 space-y-2 text-xs text-slate-600">{products.map((product) => <li key={product.id} className="rounded-xl bg-slate-50 p-2"><b>{product.name}</b> {product.profileFormula} мм · L={product.lengthMm} мм · {product.quantity} шт</li>)}</ul></section>
            {selectedElement ? <section className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm"><h4 className="font-bold text-slate-950">Выбранный объект</h4><p className="mt-1 text-xs text-slate-600">{selectedElement.tool} · {selectedElement.id}</p><button type="button" onClick={() => { setElements((current) => current.filter((element) => element.id !== selectedElement.id)); setSelectedElementId(null); }} className="mt-3 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white">Удалить</button></section> : null}
          </aside>
          <DrawingCanvas width={CANVAS_WIDTH} height={CANVAS_HEIGHT} gridSize={GRID_SIZE} showGrid={showGrid} elements={elements} previewElement={previewElement} mousePoint={mousePoint} snappedPoint={snappedPoint} selectedElementId={selectedElementId} onSelectElement={setSelectedElementId} onPointerDown={(rawPoint) => { setMousePoint(rawPoint); const point = snapPoint(rawPoint, snapToGrid); setSnappedPoint(point); if (activeTool === 'select') return; if (activeTool === 'text') { addTextElement(point); return; } setDraftStart(point); updatePreview(point, point); }} onPointerMove={(rawPoint) => { setMousePoint(rawPoint); const point = snapPoint(rawPoint, snapToGrid); setSnappedPoint(point); if (draftStart) updatePreview(draftStart, point); }} onPointerUp={(rawPoint) => { const point = snapPoint(rawPoint, snapToGrid); if (!draftStart || activeTool === 'select' || activeTool === 'text' || activeTool === 'profile') return; const distance = Math.hypot(point.x - draftStart.x, point.y - draftStart.y); if (distance >= GRID_SIZE / 2) { const element = { id: `drawing-${dealId}-${Date.now()}-${elements.length}`, tool: activeTool, start: draftStart, end: point, lengthMm: Math.round(distance), hemSizeMm: activeTool === 'hem' ? 15 : undefined, text: activeTool === 'dimension' ? `${Math.round(distance)} мм` : undefined } as DrawingElement; setElements((current) => [...current, element]); setSelectedElementId(element.id); } setDraftStart(null); setPreviewElement(null); }} />
        </div>
        <div className="hidden">{elements.map((element) => renderElement(element))}</div>
      </div>
    </div>
  );
}
