'use client';

import { useMemo, useState } from 'react';
import type { BendType, DrawingAttachment, DrawingElement, DrawingPoint, DrawingProduct, DrawingTool } from '@/types/crm';
import { DrawingCanvas } from './DrawingCanvas';
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
const MM_TO_CANVAS = 2;

function snapPoint(point: DrawingPoint, enabled: boolean): DrawingPoint {
  if (!enabled) return point;
  return { x: Math.max(0, Math.min(CANVAS_WIDTH, Math.round(point.x / GRID_SIZE) * GRID_SIZE)), y: Math.max(0, Math.min(CANVAS_HEIGHT, Math.round(point.y / GRID_SIZE) * GRID_SIZE)) };
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] ?? char);
}

function getLineLengthMm(start: DrawingPoint, end: DrawingPoint): number {
  return Math.round(Math.hypot(end.x - start.x, end.y - start.y) / MM_TO_CANVAS);
}

function createLineFromParameters(start: DrawingPoint, lengthMm: number, angleDeg: number): { start: DrawingPoint; end: DrawingPoint } {
  const radians = (angleDeg * Math.PI) / 180;
  return { start, end: { x: start.x + lengthMm * MM_TO_CANVAS * Math.cos(radians), y: start.y + lengthMm * MM_TO_CANVAS * Math.sin(radians) } };
}

function createDrawingProducts(specs: ProductSpecDraft[]): DrawingProduct[] {
  return specs
    .filter((spec) => spec.name.trim() || spec.formula.trim())
    .map((spec, index) => ({
      id: `product-spec-${index + 1}`,
      profileElementId: '',
      profileFormula: spec.formula.trim(),
      name: spec.name.trim() || 'Изделие',
      segments: [],
      lengthMm: spec.lengthMm,
      quantity: spec.quantity,
      material: spec.material.trim(),
      thicknessMm: spec.thicknessMm,
      color: spec.color.trim(),
    }));
}

function renderElementToSvg(element: DrawingElement): string {
  const stroke = element.bendType === 'hem' ? '#dc2626' : '#0f172a';
  if (element.tool === 'line') {
    const labelX = (element.start.x + element.end.x) / 2;
    const labelY = (element.start.y + element.end.y) / 2 - 8;
    const length = element.lengthMm ?? getLineLengthMm(element.start, element.end);
    const label = element.bendType === 'hem' ? `Завальцовка ${element.hemSizeMm ?? length} мм` : `${length} мм`;
    const doubleLine = element.bendType === 'hem' ? `<line x1="${element.start.x}" y1="${element.start.y + 5}" x2="${element.end.x}" y2="${element.end.y + 5}" stroke="${stroke}" stroke-width="1.4" stroke-dasharray="8 4"/>` : '';
    return `<g><line x1="${element.start.x}" y1="${element.start.y}" x2="${element.end.x}" y2="${element.end.y}" stroke="${stroke}" stroke-width="2" fill="none" stroke-dasharray="${element.bendType === 'hem' ? '8 4' : ''}"/>${doubleLine}<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="13" font-weight="700" fill="${stroke}">${escapeXml(element.text || label)}</text></g>`;
  }
  if (element.tool === 'rectangle') {
    const x = Math.min(element.start.x, element.end.x);
    const y = Math.min(element.start.y, element.end.y);
    const width = Math.abs(element.end.x - element.start.x);
    const height = Math.abs(element.end.y - element.start.y);
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="2" stroke="#0f172a" stroke-width="2" fill="rgba(15,23,42,0.04)"/>`;
  }
  if (element.tool === 'circle') {
    const radius = Math.hypot(element.end.x - element.start.x, element.end.y - element.start.y);
    return `<circle cx="${element.start.x}" cy="${element.start.y}" r="${radius}" stroke="#0f172a" stroke-width="2" fill="rgba(15,23,42,0.04)"/>`;
  }
  if (element.tool === 'dimension') {
    const labelX = (element.start.x + element.end.x) / 2;
    const labelY = (element.start.y + element.end.y) / 2 - 8;
    return `<g><line x1="${element.start.x}" y1="${element.start.y}" x2="${element.end.x}" y2="${element.end.y}" stroke="#0f172a" stroke-width="1.6" stroke-dasharray="4 4"/><text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="13" font-weight="700" fill="#0f172a">${escapeXml(element.text || `${getLineLengthMm(element.start, element.end)} мм`)}</text></g>`;
  }
  return `<text x="${element.start.x}" y="${element.start.y}" font-size="18" font-weight="600" fill="#0f172a">${escapeXml(element.text || 'Текст')}</text>`;
}

function createSvgDocument(elements: DrawingElement[], title: string, products: DrawingProduct[]): string {
  const body = elements.map(renderElementToSvg).join('');
  const rows = products.map((product, index) => `<text x="30" y="${CANVAS_HEIGHT + 58 + index * 18}" font-size="12" fill="#0f172a">${index + 1}. ${escapeXml(product.name)} ${escapeXml(product.profileFormula)} мм · L=${product.lengthMm} мм · ${product.quantity} шт · ${escapeXml(product.material)} ${product.thicknessMm} мм · ${escapeXml(product.color)}</text>`).join('');
  const specHeight = Math.max(120, 70 + products.length * 18);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT + specHeight}" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT + specHeight}" role="img"><title>${escapeXml(title)}</title><rect width="100%" height="100%" fill="white"/><text x="30" y="32" font-size="20" font-weight="700" fill="#0f172a">${escapeXml(title)}</text><text x="30" y="54" font-size="12" fill="#475569">Дата: ${new Date().toLocaleString('ru-RU')} · Размеры линий: 1 мм = ${MM_TO_CANVAS} px</text>${body}<line x1="20" y1="${CANVAS_HEIGHT + 24}" x2="${CANVAS_WIDTH - 20}" y2="${CANVAS_HEIGHT + 24}" stroke="#cbd5e1"/><text x="30" y="${CANVAS_HEIGHT + 44}" font-size="15" font-weight="700" fill="#0f172a">Спецификация изделий</text>${rows}</svg>`;
}

function createPayload(elements: DrawingElement[], products: DrawingProduct[], title: string): DrawingSavePayload {
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
  const [lineLengthMm, setLineLengthMm] = useState(15);
  const [lineAngleDeg, setLineAngleDeg] = useState(0);
  const [lineBendType, setLineBendType] = useState<BendType>('straight');
  const [hemDirection, setHemDirection] = useState<'inside' | 'outside'>('inside');
  const [productSpecs, setProductSpecs] = useState<ProductSpecDraft[]>(() => (initialDrawing?.products?.length ? initialDrawing.products.map((product) => ({ name: product.name, formula: product.profileFormula, lengthMm: product.lengthMm, quantity: product.quantity, material: product.material, thicknessMm: product.thicknessMm, color: product.color })) : [{ name: 'Отлив', formula: '', lengthMm: 2000, quantity: 1, material: 'Оцинкованная сталь', thicknessMm: 0.5, color: 'RAL 9003' }]));
  const title = useMemo(() => initialDrawing?.title ?? `Чертеж ${dealTitle}`, [dealTitle, initialDrawing?.title]);
  const selectedElement = elements.find((element) => element.id === selectedElementId) ?? null;
  const products = useMemo(() => createDrawingProducts(productSpecs), [productSpecs]);
  const payload = createPayload(elements, products, title);

  const createLineElement = (start: DrawingPoint, end: DrawingPoint, metadata?: Partial<DrawingElement>): DrawingElement => ({ id: `line-${dealId}-${Date.now()}-${elements.length}`, tool: 'line', start, end, lengthMm: metadata?.lengthMm ?? getLineLengthMm(start, end), angleDeg: metadata?.angleDeg, bendType: metadata?.bendType ?? lineBendType, hemSizeMm: metadata?.hemSizeMm, hemDirection: metadata?.hemDirection, text: metadata?.text });

  const addTextElement = (point: DrawingPoint) => {
    const text = window.prompt('Введите текстовую пометку для чертежа:', 'Пометка');
    if (!text || text.trim().length === 0) return;
    const element = { id: `drawing-${dealId}-${Date.now()}`, tool: 'text' as const, start: point, end: point, text: text.trim() };
    setElements((current) => [...current, element]);
    setSelectedElementId(element.id);
  };

  const addParametricLineAtPoint = (point: DrawingPoint) => {
    const line = createLineFromParameters(point, lineLengthMm, lineAngleDeg);
    const element = createLineElement(line.start, line.end, { lengthMm: lineLengthMm, angleDeg: lineAngleDeg, bendType: lineBendType, hemSizeMm: lineBendType === 'hem' ? lineLengthMm : undefined, hemDirection, text: lineBendType === 'hem' ? `Завальцовка ${lineLengthMm} мм` : `${lineLengthMm} мм` });
    setElements((current) => [...current, element]);
    setSelectedElementId(element.id);
  };

  const updatePreview = (start: DrawingPoint, end: DrawingPoint) => {
    if (activeTool === 'select' || activeTool === 'text' || activeTool === 'profile') {
      setPreviewElement(null);
      return;
    }
    const length = getLineLengthMm(start, end);
    setPreviewElement({ id: `preview-${activeTool}`, tool: activeTool, start, end, lengthMm: length, bendType: activeTool === 'line' ? lineBendType : undefined, hemSizeMm: lineBendType === 'hem' ? length : undefined, text: `${length} мм` });
  };

  const updateProductSpec = (index: number, patch: Partial<ProductSpecDraft>) => setProductSpecs((current) => current.map((spec, specIndex) => specIndex === index ? { ...spec, ...patch } : spec));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl rounded-3xl bg-slate-50 p-4 shadow-2xl">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Редактор чертежей</p><h2 className="mt-1 text-2xl font-bold text-slate-950">{title}</h2><p className="mt-1 text-sm text-slate-600">Рисуйте линии вручную. Размер линии виден во время черчения; завальцовку можно поставить отдельной линией с точной длиной.</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Объектов: <span className="font-bold text-slate-950">{elements.length}</span>{mousePoint ? <span> · Курсор X {Math.round(mousePoint.x)} / Y {Math.round(mousePoint.y)}</span> : null}{snappedPoint ? <span> · Привязка X {Math.round(snappedPoint.x)} / Y {Math.round(snappedPoint.y)}</span> : null}</div>
        </div>
        <DrawingToolbar activeTool={activeTool} showGrid={showGrid} snapToGrid={snapToGrid} canSave={elements.length > 0} onToolChange={(tool) => { setActiveTool(tool); setDraftStart(null); setPreviewElement(null); }} onShowGridChange={setShowGrid} onSnapToGridChange={setSnapToGrid} onClear={() => { setElements([]); setSelectedElementId(null); setDraftStart(null); setPreviewElement(null); }} onClose={onClose} onExportPdf={() => onExportPdf?.(dealId, payload)} onSave={() => onSave(dealId, payload)} />
        <div className="mt-4 grid gap-4 xl:grid-cols-[340px_1fr]">
          <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
            <section><h3 className="font-bold text-slate-950">Параметры линии</h3><p className="mt-1 text-xs text-slate-500">Для завальцовки 15 мм выберите тип «Завальцовка», длину 15 и кликните по полю.</p><div className="mt-3 grid gap-2 text-sm"><div className="grid grid-cols-2 gap-2"><input type="number" value={lineLengthMm} onChange={(event) => setLineLengthMm(Number(event.target.value) || 0)} className="rounded-xl border px-3 py-2" placeholder="Длина, мм" /><input type="number" value={lineAngleDeg} onChange={(event) => setLineAngleDeg(Number(event.target.value) || 0)} className="rounded-xl border px-3 py-2" placeholder="Угол, °" /></div><select value={lineBendType} onChange={(event) => setLineBendType(event.target.value as BendType)} className="rounded-xl border px-3 py-2"><option value="straight">Обычная линия</option><option value="bend">Гиб</option><option value="hem">Завальцовка</option><option value="lock">Замок</option><option value="dripEdge">Капельник</option></select>{lineBendType === 'hem' ? <select value={hemDirection} onChange={(event) => setHemDirection(event.target.value as 'inside' | 'outside')} className="rounded-xl border px-3 py-2"><option value="inside">Завальцовка внутрь</option><option value="outside">Завальцовка наружу</option></select> : null}<button type="button" onClick={() => snappedPoint && addParametricLineAtPoint(snappedPoint)} disabled={!snappedPoint} className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white disabled:bg-slate-300">Поставить линию по параметрам</button></div></section>
            <section><h4 className="text-sm font-bold text-slate-950">Изделия и количество</h4><div className="mt-2 space-y-2">{productSpecs.map((spec, index) => <div key={index} className="rounded-xl bg-slate-50 p-2 text-xs"><input value={spec.name} onChange={(event) => updateProductSpec(index, { name: event.target.value })} className="mb-2 w-full rounded-lg border px-2 py-1" placeholder="Название" /><input value={spec.formula} onChange={(event) => updateProductSpec(index, { formula: event.target.value })} className="mb-2 w-full rounded-lg border px-2 py-1" placeholder="Например 15х20х100х20" /><div className="grid grid-cols-2 gap-2"><input type="number" value={spec.lengthMm} onChange={(event) => updateProductSpec(index, { lengthMm: Number(event.target.value) || 0 })} className="rounded-lg border px-2 py-1" /><input type="number" value={spec.quantity} onChange={(event) => updateProductSpec(index, { quantity: Number(event.target.value) || 1 })} className="rounded-lg border px-2 py-1" /></div></div>)}</div><button type="button" onClick={() => setProductSpecs((current) => [...current, { name: 'Изделие', formula: '', lengthMm: 2000, quantity: 1, material: 'Оцинкованная сталь', thicknessMm: 0.5, color: 'RAL 9003' }])} className="mt-2 rounded-xl border px-3 py-2 text-xs font-bold">Добавить изделие</button></section>
            {selectedElement ? <section className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm"><h4 className="font-bold text-slate-950">Выбранный объект</h4><p className="mt-1 text-xs text-slate-600">{selectedElement.tool} · {selectedElement.lengthMm ? `${selectedElement.lengthMm} мм` : selectedElement.id}</p><button type="button" onClick={() => { setElements((current) => current.filter((element) => element.id !== selectedElement.id)); setSelectedElementId(null); }} className="mt-3 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white">Удалить</button></section> : null}
          </aside>
          <DrawingCanvas width={CANVAS_WIDTH} height={CANVAS_HEIGHT} gridSize={GRID_SIZE} showGrid={showGrid} elements={elements} previewElement={previewElement} mousePoint={mousePoint} snappedPoint={snappedPoint} selectedElementId={selectedElementId} onSelectElement={setSelectedElementId} onPointerDown={(rawPoint) => { setMousePoint(rawPoint); const point = snapPoint(rawPoint, snapToGrid); setSnappedPoint(point); if (activeTool === 'select') return; if (activeTool === 'text') { addTextElement(point); return; } setDraftStart(point); updatePreview(point, point); }} onPointerMove={(rawPoint) => { setMousePoint(rawPoint); const point = snapPoint(rawPoint, snapToGrid); setSnappedPoint(point); if (draftStart) updatePreview(draftStart, point); }} onPointerUp={(rawPoint) => { const point = snapPoint(rawPoint, snapToGrid); if (!draftStart || activeTool === 'select' || activeTool === 'text' || activeTool === 'profile') return; const distance = Math.hypot(point.x - draftStart.x, point.y - draftStart.y); if (distance >= GRID_SIZE / 2) { const element = activeTool === 'line' ? createLineElement(draftStart, point, { lengthMm: getLineLengthMm(draftStart, point), bendType: lineBendType, hemSizeMm: lineBendType === 'hem' ? getLineLengthMm(draftStart, point) : undefined, hemDirection }) : { id: `drawing-${dealId}-${Date.now()}-${elements.length}`, tool: activeTool, start: draftStart, end: point, text: activeTool === 'dimension' ? `${getLineLengthMm(draftStart, point)} мм` : undefined } as DrawingElement; setElements((current) => [...current, element]); setSelectedElementId(element.id); } setDraftStart(null); setPreviewElement(null); }} />
        </div>
      </div>
    </div>
  );
}
