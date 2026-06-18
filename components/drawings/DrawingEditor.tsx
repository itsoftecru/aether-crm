'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DrawingAttachment, DrawingElement, DrawingPoint, DrawingProduct, DrawingTool, ProductProfile, ProfileSegment } from '@/types/crm';
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
  lengthMm: number;
  quantity: number;
  material: string;
  thicknessMm: number;
  color: string;
};

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 620;
const GRID_SIZE = 10;
const SNAP_SIZE = 1;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.12;
const PROFILE_SCALE = 1;
const ENDPOINT_SNAP_RADIUS = 10;
const MIN_DRAW_DISTANCE = 1;
function clampPoint(point: DrawingPoint): DrawingPoint {
  return { x: Math.max(0, Math.min(CANVAS_WIDTH, point.x)), y: Math.max(0, Math.min(CANVAS_HEIGHT, point.y)) };
}

function snapPointToGrid(point: DrawingPoint, enabled: boolean): DrawingPoint {
  if (!enabled) return clampPoint(point);
  return clampPoint({ x: Math.round(point.x / SNAP_SIZE) * SNAP_SIZE, y: Math.round(point.y / SNAP_SIZE) * SNAP_SIZE });
}

function getElementSnapPoint(point: DrawingPoint, elements: DrawingElement[], zoom: number): DrawingPoint | null {
  const radius = ENDPOINT_SNAP_RADIUS / Math.max(zoom, 0.1);
  let nearestPoint: DrawingPoint | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const element of elements) {
    for (const candidate of [element.start, element.end]) {
      const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
      if (distance <= radius && distance < nearestDistance) {
        nearestPoint = candidate;
        nearestDistance = distance;
      }
    }
  }
  return nearestPoint ? { ...nearestPoint } : null;
}

function getSnappedPoint(point: DrawingPoint, elements: DrawingElement[], gridEnabled: boolean, zoom: number): DrawingPoint {
  const endpoint = getElementSnapPoint(point, elements, zoom);
  return endpoint ?? snapPointToGrid(point, gridEnabled);
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

function getUnfoldingElements(elements: DrawingElement[]): DrawingElement[] {
  return elements.filter((element) => element.tool === 'line' || element.tool === 'hem');
}

function getElementLengthMm(element: DrawingElement): number {
  return element.lengthMm ?? Math.round(Math.hypot(element.end.x - element.start.x, element.end.y - element.start.y));
}

function getManualFormula(elements: DrawingElement[]): string {
  const lineLengths = getUnfoldingElements(elements).map(getElementLengthMm);
  return lineLengths.length > 0 ? `${lineLengths.join('×')} = ${lineLengths.reduce((sum, length) => sum + length, 0)} мм` : 'по чертежу';
}

function getUnfoldingMm(elements: DrawingElement[]): number {
  return getUnfoldingElements(elements).reduce((sum, element) => sum + getElementLengthMm(element), 0);
}

function getAreaM2(unfoldingMm: number, lengthMm: number, quantity: number): number {
  return Number(((unfoldingMm / 1000) * (lengthMm / 1000) * quantity).toFixed(3));
}

function resizeElementToExactLength(element: DrawingElement, requestedLengthMm: number): DrawingElement {
  const dx = element.end.x - element.start.x;
  const dy = element.end.y - element.start.y;
  const currentLength = Math.hypot(dx, dy);
  if (!Number.isFinite(requestedLengthMm) || requestedLengthMm <= 0 || currentLength <= 0) return element;
  const ratio = requestedLengthMm / currentLength;
  const end = { x: element.start.x + dx * ratio, y: element.start.y + dy * ratio };
  const roundedLength = Math.round(requestedLengthMm);
  return { ...element, end, lengthMm: roundedLength, text: element.tool === 'dimension' ? `${roundedLength} мм` : element.text };
}


function buildElementFromPoints(dealId: string, tool: DrawingTool, start: DrawingPoint, end: DrawingPoint, index: number): DrawingElement | null {
  if (tool === 'select' || tool === 'text' || tool === 'profile' || tool === 'angleDimension') return null;
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  if (distance < MIN_DRAW_DISTANCE) return null;
  return {
    id: `drawing-${dealId}-${Date.now()}-${index}`,
    tool,
    start,
    end,
    lengthMm: Math.round(distance),
    hemSizeMm: tool === 'hem' ? 15 : undefined,
    text: tool === 'dimension' ? `${Math.round(distance)} мм` : undefined,
  } as DrawingElement;
}

function getDirectedPoint(start: DrawingPoint, directionPoint: DrawingPoint, lengthMm: number): DrawingPoint {
  const dx = directionPoint.x - start.x;
  const dy = directionPoint.y - start.y;
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(lengthMm) || lengthMm <= 0 || distance <= 0) return directionPoint;
  return clampPoint({ x: start.x + (dx / distance) * lengthMm, y: start.y + (dy / distance) * lengthMm });
}

function getSharedEndpoint(first: DrawingElement, second: DrawingElement): DrawingPoint | null {
  const candidates: Array<[DrawingPoint, DrawingPoint]> = [[first.start, second.start], [first.start, second.end], [first.end, second.start], [first.end, second.end]];
  return candidates.find(([a, b]) => Math.hypot(a.x - b.x, a.y - b.y) <= SNAP_SIZE)?.[0] ?? null;
}

function getVectorFromVertex(element: DrawingElement, vertex: DrawingPoint): DrawingPoint {
  const startDistance = Math.hypot(element.start.x - vertex.x, element.start.y - vertex.y);
  const endDistance = Math.hypot(element.end.x - vertex.x, element.end.y - vertex.y);
  const target = startDistance <= endDistance ? element.end : element.start;
  return { x: target.x - vertex.x, y: target.y - vertex.y };
}

function getAngleBetweenElements(first: DrawingElement, second: DrawingElement, vertex = getSharedEndpoint(first, second)): number {
  const firstVector = vertex ? getVectorFromVertex(first, vertex) : { x: first.end.x - first.start.x, y: first.end.y - first.start.y };
  const secondVector = vertex ? getVectorFromVertex(second, vertex) : { x: second.end.x - second.start.x, y: second.end.y - second.start.y };
  const firstAngle = Math.atan2(firstVector.y, firstVector.x);
  const secondAngle = Math.atan2(secondVector.y, secondVector.x);
  const rawAngle = Math.abs(((secondAngle - firstAngle) * 180) / Math.PI);
  const normalized = rawAngle > 180 ? 360 - rawAngle : rawAngle;
  return Number(normalized.toFixed(1));
}

function createAngleElement(dealId: string, first: DrawingElement, second: DrawingElement): DrawingElement | null {
  const vertex = getSharedEndpoint(first, second);
  if (!vertex) return null;
  const firstVector = getVectorFromVertex(first, vertex);
  const secondVector = getVectorFromVertex(second, vertex);
  const firstLength = Math.hypot(firstVector.x, firstVector.y);
  const secondLength = Math.hypot(secondVector.x, secondVector.y);
  if (firstLength < MIN_DRAW_DISTANCE || secondLength < MIN_DRAW_DISTANCE) return null;
  const radius = Math.min(42, Math.max(22, Math.min(firstLength, secondLength) * 0.36));
  const start = { x: vertex.x + (firstVector.x / firstLength) * radius, y: vertex.y + (firstVector.y / firstLength) * radius };
  const end = { x: vertex.x + (secondVector.x / secondLength) * radius, y: vertex.y + (secondVector.y / secondLength) * radius };
  const angle = getAngleBetweenElements(first, second, vertex);
  return { id: `drawing-${dealId}-${Date.now()}-angle`, tool: 'angleDimension', start, end, vertex, angleDeg: angle, text: `${angle}°` };
}

function withAutomaticAngle(elements: DrawingElement[], dealId: string, element: DrawingElement): DrawingElement[] {
  if (element.tool !== 'line' && element.tool !== 'hem') return [...elements, element];
  const connected = [...elements].reverse().find((candidate) => (candidate.tool === 'line' || candidate.tool === 'hem') && getSharedEndpoint(candidate, element));
  const angleElement = connected ? createAngleElement(dealId, connected, element) : null;
  return angleElement ? [...elements, element, angleElement] : [...elements, element];
}

function createDrawingProducts(elements: DrawingElement[], draft: ProductSpecDraft): DrawingProduct[] {
  const profileProducts = elements
    .filter((element) => element.tool === 'profile' && element.profile)
    .map((element) => ({ id: `product-${element.id}`, profileElementId: element.id, profileFormula: getProfileFormula(element.profile as ProductProfile), ...(element.profile as ProductProfile) }));

  return [
    {
      id: 'product-manual',
      profileElementId: 'manual-profile',
      profileFormula: getManualFormula(elements),
      name: draft.name || 'Изделие',
      segments: [],
      lengthMm: draft.lengthMm,
      quantity: draft.quantity,
      material: draft.material,
      thicknessMm: draft.thicknessMm,
      color: draft.color,
      unfoldingMm: getUnfoldingMm(elements),
      areaM2: getAreaM2(getUnfoldingMm(elements), draft.lengthMm, draft.quantity),
    },
    ...profileProducts,
  ];
}


function getOffsetLinePoints(start: DrawingPoint, end: DrawingPoint, offset: number) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const normalX = -dy / length;
  const normalY = dx / length;
  return {
    start: { x: start.x + normalX * offset, y: start.y + normalY * offset },
    end: { x: end.x + normalX * offset, y: end.y + normalY * offset },
    normalX,
    normalY,
  };
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
  if (element.tool === 'angleDimension') {
    const angle = element.angleDeg ?? 0;
    if (element.vertex) {
      const radius = Math.max(16, Math.hypot(element.start.x - element.vertex.x, element.start.y - element.vertex.y));
      const startAngle = Math.atan2(element.start.y - element.vertex.y, element.start.x - element.vertex.x);
      let endAngle = Math.atan2(element.end.y - element.vertex.y, element.end.x - element.vertex.x);
      let delta = endAngle - startAngle;
      while (delta <= -Math.PI) delta += Math.PI * 2;
      while (delta > Math.PI) delta -= Math.PI * 2;
      const middleAngle = startAngle + delta / 2;
      const labelX = element.vertex.x + Math.cos(middleAngle) * (radius + 16);
      const labelY = element.vertex.y + Math.sin(middleAngle) * (radius + 16);
      const isRightAngle = Math.abs(angle - 90) <= 0.5;
      if (isRightAngle) {
        const unitStart = { x: Math.cos(startAngle), y: Math.sin(startAngle) };
        const unitEnd = { x: Math.cos(endAngle), y: Math.sin(endAngle) };
        const squareSize = Math.min(18, radius * 0.72);
        const p1 = { x: element.vertex.x + unitStart.x * squareSize, y: element.vertex.y + unitStart.y * squareSize };
        const p2 = { x: p1.x + unitEnd.x * squareSize, y: p1.y + unitEnd.y * squareSize };
        const p3 = { x: element.vertex.x + unitEnd.x * squareSize, y: element.vertex.y + unitEnd.y * squareSize };
        return `<g><polyline points="${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}" stroke="#ea580c" stroke-width="1.8" fill="none"/><text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="13" font-weight="700" fill="#ea580c">${escapeXml(element.text || `${angle}°`)}</text></g>`;
      }
      let largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
      const sweep = delta >= 0 ? 1 : 0;
      return `<g><path d="M ${element.start.x} ${element.start.y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${element.end.x} ${element.end.y}" stroke="#ea580c" stroke-width="1.8" fill="none"/><text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="13" font-weight="700" fill="#ea580c">${escapeXml(element.text || `${angle}°`)}</text></g>`;
    }
    const labelX = (element.start.x + element.end.x) / 2;
    const labelY = (element.start.y + element.end.y) / 2 - 18;
    const label = escapeXml(element.text || `${angle}°`);
    return `<g><path d="M ${element.start.x} ${element.start.y} Q ${labelX} ${labelY - 30} ${element.end.x} ${element.end.y}" stroke="#ea580c" stroke-width="1.8" fill="none"/><text x="${labelX}" y="${labelY - 6}" text-anchor="middle" font-size="13" font-weight="700" fill="#ea580c">${label}</text></g>`;
  }

  if (element.tool === 'dimension') {
    const label = escapeXml(element.text || `${Math.round(Math.hypot(element.end.x - element.start.x, element.end.y - element.start.y))} мм`);
    const offset = getOffsetLinePoints(element.start, element.end, 20);
    const extension = 8;
    const tick = 6;
    const labelX = (offset.start.x + offset.end.x) / 2;
    const labelY = (offset.start.y + offset.end.y) / 2 - 4;
    return `<g><line x1="${element.start.x}" y1="${element.start.y}" x2="${offset.start.x + offset.normalX * extension}" y2="${offset.start.y + offset.normalY * extension}" stroke="#2563eb" stroke-width="1.2"/><line x1="${element.end.x}" y1="${element.end.y}" x2="${offset.end.x + offset.normalX * extension}" y2="${offset.end.y + offset.normalY * extension}" stroke="#2563eb" stroke-width="1.2"/><line x1="${offset.start.x}" y1="${offset.start.y}" x2="${offset.end.x}" y2="${offset.end.y}" stroke="#2563eb" stroke-width="1.6"/><line x1="${offset.start.x - offset.normalX * tick}" y1="${offset.start.y - offset.normalY * tick}" x2="${offset.start.x + offset.normalX * tick}" y2="${offset.start.y + offset.normalY * tick}" stroke="#2563eb" stroke-width="1.6"/><line x1="${offset.end.x - offset.normalX * tick}" y1="${offset.end.y - offset.normalY * tick}" x2="${offset.end.x + offset.normalX * tick}" y2="${offset.end.y + offset.normalY * tick}" stroke="#2563eb" stroke-width="1.6"/><text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="13" font-weight="700" fill="#2563eb">${label}</text></g>`;
  }
  return `<text x="${element.start.x}" y="${element.start.y}" font-size="18" font-weight="600" fill="${stroke}">${escapeXml(element.text || 'Текст')}</text>`;
}

function createSvgDocument(elements: DrawingElement[], title: string, products: DrawingProduct[]): string {
  const body = elements.map(renderElementToSvg).join('');
  const rows = products.map((product, index) => `<text x="30" y="${CANVAS_HEIGHT + 58 + index * 18}" font-size="12" fill="#0f172a">${index + 1}. ${escapeXml(product.name)} ${escapeXml(product.profileFormula)} · L=${product.lengthMm} мм · ${product.quantity} шт${product.areaM2 !== undefined ? ` · ${product.areaM2} м²` : ''} · ${escapeXml(product.material)} ${product.thicknessMm} мм · ${escapeXml(product.color)}</text>`).join('');
  const specHeight = Math.max(120, 70 + products.length * 18);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT + specHeight}" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT + specHeight}" role="img"><title>${escapeXml(title)}</title><rect width="100%" height="100%" fill="white"/><text x="30" y="32" font-size="20" font-weight="700" fill="#0f172a">${escapeXml(title)}</text><text x="30" y="54" font-size="12" fill="#475569">Дата: ${new Date().toLocaleString('ru-RU')} · Масштаб профилей: 1 мм = ${PROFILE_SCALE} px</text>${body}<line x1="20" y1="${CANVAS_HEIGHT + 24}" x2="${CANVAS_WIDTH - 20}" y2="${CANVAS_HEIGHT + 24}" stroke="#cbd5e1"/><text x="30" y="${CANVAS_HEIGHT + 44}" font-size="15" font-weight="700" fill="#0f172a">Спецификация изделий</text>${rows}</svg>`;
}


function toPdfSafeText(value: string): string {
  const dictionary: Record<string, string> = {
    А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'E', Ж: 'Zh', З: 'Z', И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T', У: 'U', Ф: 'F', Х: 'H', Ц: 'Ts', Ч: 'Ch', Ш: 'Sh', Щ: 'Sch', Ъ: '', Ы: 'Y', Ь: '', Э: 'E', Ю: 'Yu', Я: 'Ya',
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
    '·': '-', '×': 'x', '²': '2', '°': ' deg', '№': 'N',
  };
  return Array.from(value).map((char) => dictionary[char] ?? (char.charCodeAt(0) < 128 ? char : '?')).join('');
}

function encodePdfText(value: string): string {
  return `(${toPdfSafeText(value).replace(/[\\()]/g, '\$&')})`;
}

function pdfY(y: number, pageHeight: number): number {
  return Number((pageHeight - y).toFixed(2));
}

function createPdfDocument(payload: DrawingSavePayload): Uint8Array {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 32;
  const headerHeight = 58;
  const footerHeight = 86;
  const drawingTop = pageHeight - headerHeight;
  const drawingHeight = pageHeight - headerHeight - footerHeight;
  const bounds = payload.elements.reduce((acc, element) => ({
    minX: Math.min(acc.minX, element.start.x, element.end.x, element.vertex?.x ?? element.start.x),
    minY: Math.min(acc.minY, element.start.y, element.end.y, element.vertex?.y ?? element.start.y),
    maxX: Math.max(acc.maxX, element.start.x, element.end.x, element.vertex?.x ?? element.end.x),
    maxY: Math.max(acc.maxY, element.start.y, element.end.y, element.vertex?.y ?? element.end.y),
  }), { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY });
  const safeBounds = Number.isFinite(bounds.minX) ? bounds : { minX: 0, minY: 0, maxX: CANVAS_WIDTH, maxY: CANVAS_HEIGHT };
  const contentWidth = Math.max(1, safeBounds.maxX - safeBounds.minX);
  const contentHeight = Math.max(1, safeBounds.maxY - safeBounds.minY);
  const scale = Math.min((pageWidth - margin * 2) / (contentWidth + 80), drawingHeight / (contentHeight + 80));
  const toPdfX = (x: number) => margin + 40 + (x - safeBounds.minX) * scale;
  const toPdfY = (y: number) => drawingTop - 40 - (y - safeBounds.minY) * scale;
  const point = (value: DrawingPoint) => ({ x: toPdfX(value.x), y: toPdfY(value.y) });
  const commands: string[] = ['1 1 1 rg 0 0 0 RG'];
  commands.push('BT /F1 18 Tf 32 558 Td', `${encodePdfText(payload.title)} Tj`, 'ET');
  commands.push('BT /F1 9 Tf 32 540 Td', `${encodePdfText(`Data: ${new Date().toLocaleString('ru-RU')} - Scale auto`) } Tj`, 'ET');
  for (const element of payload.elements) {
    if (element.tool === 'line' || element.tool === 'hem') {
      const a = point(element.start);
      const b = point(element.end);
      commands.push('0.06 0.09 0.16 RG 2 w', `${a.x.toFixed(2)} ${a.y.toFixed(2)} m ${b.x.toFixed(2)} ${b.y.toFixed(2)} l S`);
      const length = element.lengthMm ?? Math.round(Math.hypot(element.end.x - element.start.x, element.end.y - element.start.y));
      commands.push('BT /F1 12 Tf', `${((a.x + b.x) / 2).toFixed(2)} ${((a.y + b.y) / 2 + 12).toFixed(2)} Td`, `${encodePdfText(`${length} mm`)} Tj`, 'ET');
    }
    if (element.tool === 'dimension') {
      const offset = getOffsetLinePoints(element.start, element.end, 22 / scale);
      const a = point(element.start);
      const b = point(element.end);
      const os = point(offset.start);
      const oe = point(offset.end);
      const normalX = offset.normalX;
      const normalY = -offset.normalY;
      const extension = 8;
      const tick = 6;
      commands.push('0.15 0.39 0.92 RG 1.2 w', `${a.x.toFixed(2)} ${a.y.toFixed(2)} m ${(os.x + normalX * extension).toFixed(2)} ${(os.y + normalY * extension).toFixed(2)} l S`, `${b.x.toFixed(2)} ${b.y.toFixed(2)} m ${(oe.x + normalX * extension).toFixed(2)} ${(oe.y + normalY * extension).toFixed(2)} l S`);
      commands.push('0.15 0.39 0.92 RG 1.6 w', `${os.x.toFixed(2)} ${os.y.toFixed(2)} m ${oe.x.toFixed(2)} ${oe.y.toFixed(2)} l S`, `${(os.x - normalX * tick).toFixed(2)} ${(os.y - normalY * tick).toFixed(2)} m ${(os.x + normalX * tick).toFixed(2)} ${(os.y + normalY * tick).toFixed(2)} l S`, `${(oe.x - normalX * tick).toFixed(2)} ${(oe.y - normalY * tick).toFixed(2)} m ${(oe.x + normalX * tick).toFixed(2)} ${(oe.y + normalY * tick).toFixed(2)} l S`);
      const label = toPdfSafeText(element.text || `${Math.round(Math.hypot(element.end.x - element.start.x, element.end.y - element.start.y))} mm`).replace('мм', 'mm');
      commands.push('BT /F1 12 Tf', `${((os.x + oe.x) / 2 - 18).toFixed(2)} ${((os.y + oe.y) / 2 + 6).toFixed(2)} Td`, `${encodePdfText(label)} Tj`, 'ET');
    }
    if (element.tool === 'angleDimension') {
      const a = point(element.start);
      const b = point(element.end);
      const angle = element.angleDeg ?? 0;
      if (element.vertex) {
        const v = point(element.vertex);
        const steps = 14;
        const startAngle = Math.atan2(a.y - v.y, a.x - v.x);
        let endAngle = Math.atan2(b.y - v.y, b.x - v.x);
        let delta = endAngle - startAngle;
        while (delta <= -Math.PI) delta += Math.PI * 2;
        while (delta > Math.PI) delta -= Math.PI * 2;
        const radius = Math.hypot(a.x - v.x, a.y - v.y);
        const points = Array.from({ length: steps + 1 }, (_, index) => {
          const current = startAngle + (delta * index) / steps;
          return { x: v.x + Math.cos(current) * radius, y: v.y + Math.sin(current) * radius };
        });
        commands.push('0.92 0.32 0.04 RG 1.5 w', `${points.map((item, index) => `${item.x.toFixed(2)} ${item.y.toFixed(2)} ${index === 0 ? 'm' : 'l'}`).join(' ')} S`);
        const middle = points[Math.floor(points.length / 2)];
        commands.push('BT /F1 12 Tf', `${(middle.x + 6).toFixed(2)} ${(middle.y + 8).toFixed(2)} Td`, `${encodePdfText(`${angle} deg`)} Tj`, 'ET');
      } else {
        commands.push('0.92 0.32 0.04 RG 1.5 w', `${a.x.toFixed(2)} ${a.y.toFixed(2)} m ${b.x.toFixed(2)} ${b.y.toFixed(2)} l S`);
      }
    }
    if (element.tool === 'rectangle') {
      const a = point({ x: Math.min(element.start.x, element.end.x), y: Math.min(element.start.y, element.end.y) });
      const width = Math.abs(element.end.x - element.start.x) * scale;
      const height = Math.abs(element.end.y - element.start.y) * scale;
      commands.push('0.06 0.09 0.16 RG 1.6 w', `${a.x.toFixed(2)} ${(a.y - height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S`);
    }
    if (element.tool === 'text') {
      const a = point(element.start);
      commands.push('BT /F1 12 Tf', `${a.x.toFixed(2)} ${a.y.toFixed(2)} Td`, `${encodePdfText(element.text || 'Text')} Tj`, 'ET');
    }
  }
  commands.push('0.80 0.84 0.90 RG 0.8 w 24 74 m 818 74 l S');
  commands.push('BT /F1 13 Tf 32 56 Td', `${encodePdfText('Specification') } Tj`, 'ET');
  payload.products.slice(0, 4).forEach((product, index) => {
    const line = `${index + 1}. ${product.name} ${product.profileFormula} - L=${product.lengthMm} mm - ${product.quantity} pcs - ${product.material} ${product.thicknessMm} mm - ${product.color}`;
    commands.push('BT /F1 9 Tf', `32 ${40 - index * 11} Td`, `${encodePdfText(line)} Tj`, 'ET');
  });
  const stream = commands.join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj`,
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj',
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) { offsets.push(pdf.length); pdf += `${object}\n`; }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\n`;
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function createPayload(elements: DrawingElement[], title: string, productSpec: ProductSpecDraft): DrawingSavePayload {
  const products = createDrawingProducts(elements, productSpec);
  return { name: `${title}.svg`, elements, products, title, svg: createSvgDocument(elements, title, products) };
}

export function DrawingEditor({ dealId, dealTitle, initialDrawing, onSave, onClose }: DrawingEditorProps) {
  const [activeTool, setActiveTool] = useState<DrawingTool>('line');
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [elements, setElements] = useState<DrawingElement[]>(initialDrawing?.elements ?? []);
  const [undoStack, setUndoStack] = useState<DrawingElement[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingElement[][]>([]);
  const [zoom, setZoom] = useState(1);
  const [viewOrigin, setViewOrigin] = useState<DrawingPoint>({ x: 0, y: 0 });
  const [draftStart, setDraftStart] = useState<DrawingPoint | null>(null);
  const [mousePoint, setMousePoint] = useState<DrawingPoint | null>(null);
  const [snappedPoint, setSnappedPoint] = useState<DrawingPoint | null>(null);
  const [previewElement, setPreviewElement] = useState<DrawingElement | null>(null);
  const [manualLength, setManualLength] = useState('');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(initialDrawing?.elements[0]?.id ?? null);
  const [pendingAngleElementId, setPendingAngleElementId] = useState<string | null>(null);
  const [productSpec, setProductSpec] = useState<ProductSpecDraft>({ name: 'Изделие', lengthMm: 2000, quantity: 1, material: 'Оцинкованная сталь', thicknessMm: 0.5, color: 'RAL 9003' });
  const title = useMemo(() => initialDrawing?.title ?? `Чертеж ${dealTitle}`, [dealTitle, initialDrawing?.title]);
  const selectedElement = elements.find((element) => element.id === selectedElementId) ?? null;
  const products = useMemo(() => createDrawingProducts(elements, productSpec), [elements, productSpec]);

  const commitElements = useCallback((next: DrawingElement[] | ((current: DrawingElement[]) => DrawingElement[])) => {
    setElements((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      if (resolved === current) return current;
      setUndoStack((history) => [...history, current]);
      setRedoStack([]);
      return resolved;
    });
  }, []);

  const undo = useCallback(() => {
    setUndoStack((history) => {
      const previous = history.at(-1);
      if (!previous) return history;
      setRedoStack((currentRedo) => [elements, ...currentRedo]);
      setElements(previous);
      setSelectedElementId(previous.at(-1)?.id ?? null);
      return history.slice(0, -1);
    });
  }, [elements]);

  const redo = useCallback(() => {
    setRedoStack((history) => {
      const next = history[0];
      if (!next) return history;
      setUndoStack((currentUndo) => [...currentUndo, elements]);
      setElements(next);
      setSelectedElementId(next.at(-1)?.id ?? null);
      return history.slice(1);
    });
  }, [elements]);


  const addTextElement = (point: DrawingPoint) => {
    const text = window.prompt('Введите текстовую пометку для чертежа:', 'Пометка');
    if (!text || text.trim().length === 0) return;
    const element = { id: `drawing-${dealId}-${Date.now()}`, tool: 'text' as const, start: point, end: point, text: text.trim() };
    commitElements((current) => withAutomaticAngle(current, dealId, element));
    setSelectedElementId(element.id);
  };

  const updatePreview = (start: DrawingPoint, end: DrawingPoint) => {
    if (activeTool === 'select' || activeTool === 'text' || activeTool === 'profile' || activeTool === 'angleDimension') {
      setPreviewElement(null);
      return;
    }
    const length = Math.round(Math.hypot(end.x - start.x, end.y - start.y));
    const previewBase: DrawingElement = { id: `preview-${activeTool}`, tool: activeTool, start, end, lengthMm: length, hemSizeMm: activeTool === 'hem' ? 15 : undefined, text: activeTool === 'dimension' ? `${length} мм` : undefined };
    const connected = (activeTool === 'line' || activeTool === 'hem') ? [...elements].reverse().find((candidate) => (candidate.tool === 'line' || candidate.tool === 'hem') && getSharedEndpoint(candidate, previewBase)) : null;
    const angle = connected ? createAngleElement(dealId, connected, previewBase)?.angleDeg : undefined;
    setPreviewElement(angle === undefined ? previewBase : { ...previewBase, text: `${length} мм · ${angle}°` });
  };

  const selectElement = (elementId: string) => {
    if (activeTool !== 'angleDimension') {
      setSelectedElementId(elementId);
      return;
    }
    const element = elements.find((item) => item.id === elementId);
    if (!element || element.tool !== 'line') return;
    if (!pendingAngleElementId) {
      setPendingAngleElementId(elementId);
      setSelectedElementId(elementId);
      return;
    }
    const first = elements.find((item) => item.id === pendingAngleElementId);
    if (!first || first.id === element.id || first.tool !== 'line') {
      setPendingAngleElementId(elementId);
      setSelectedElementId(elementId);
      return;
    }
    const angleElement = createAngleElement(dealId, first, element);
    if (!angleElement) return;
    commitElements((current) => [...current, angleElement]);
    setSelectedElementId(angleElement.id);
    setPendingAngleElementId(null);
  };

  const viewBox = useMemo(() => ({ x: viewOrigin.x, y: viewOrigin.y, width: CANVAS_WIDTH / zoom, height: CANVAS_HEIGHT / zoom }), [viewOrigin, zoom]);

  const finishDraft = useCallback((end: DrawingPoint, explicitLength?: number) => {
    if (!draftStart) return;
    const finalEnd = explicitLength ? getDirectedPoint(draftStart, end, explicitLength) : end;
    const baseElement = buildElementFromPoints(dealId, activeTool, draftStart, finalEnd, elements.length);
    if (!baseElement) return;
    const element = explicitLength ? resizeElementToExactLength(baseElement, explicitLength) : baseElement;
    commitElements((current) => withAutomaticAngle(current, dealId, element));
    setSelectedElementId(element.id);
    setDraftStart(null);
    setPreviewElement(null);
    setManualLength('');
  }, [activeTool, commitElements, dealId, draftStart, elements.length]);

  const handleWheelZoom = useCallback((deltaY: number, anchor: DrawingPoint) => {
    setZoom((currentZoom) => {
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, deltaY < 0 ? currentZoom * ZOOM_STEP : currentZoom / ZOOM_STEP));
      if (nextZoom === currentZoom) return currentZoom;
      const oldWidth = CANVAS_WIDTH / currentZoom;
      const oldHeight = CANVAS_HEIGHT / currentZoom;
      const newWidth = CANVAS_WIDTH / nextZoom;
      const newHeight = CANVAS_HEIGHT / nextZoom;
      setViewOrigin((currentOrigin) => ({
        x: Math.max(0, Math.min(CANVAS_WIDTH - newWidth, anchor.x - ((anchor.x - currentOrigin.x) / oldWidth) * newWidth)),
        y: Math.max(0, Math.min(CANVAS_HEIGHT - newHeight, anchor.y - ((anchor.y - currentOrigin.y) / oldHeight) * newHeight)),
      }));
      return nextZoom;
    });
  }, []);

  const payload = createPayload(elements, title, productSpec);

  const exportPdf = useCallback(() => {
    const pdfPayload = createPayload(elements, title, productSpec);
    const pdfBytes = createPdfDocument(pdfPayload);
    const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
    new Uint8Array(pdfBuffer).set(pdfBytes);
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pdfPayload.title.replace(/[^a-zа-яё0-9_-]+/giu, '_') || 'drawing'}.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  }, [elements, productSpec, title]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (!draftStart || !mousePoint || activeTool === 'select' || activeTool === 'text' || activeTool === 'profile' || activeTool === 'angleDimension') return;
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        setManualLength((current) => `${current}${event.key}`.replace(/^0+(?=\d)/, ''));
        return;
      }
      if (event.key === 'Backspace') {
        event.preventDefault();
        setManualLength((current) => current.slice(0, -1));
        return;
      }
      if (event.key === 'Enter' && manualLength) {
        event.preventDefault();
        finishDraft(mousePoint, Number(manualLength));
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setDraftStart(null);
        setPreviewElement(null);
        setManualLength('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, draftStart, finishDraft, manualLength, mousePoint]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl rounded-3xl bg-slate-50 p-4 shadow-2xl">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Редактор чертежей</p><h2 className="mt-1 text-2xl font-bold text-slate-950">{title}</h2><p className="mt-1 text-sm text-slate-600">Оранжевая точка — реальный курсор, синяя — точка привязки. Колесо мыши приближает и отдаляет поле. Первый клик задаёт начало, второй фиксирует конец. Можно ввести длину цифрами и нажать Enter — линия построится по текущему направлению мыши. Привязка к концам линий работает всегда, сетка добавляет шаг 1 мм.</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Объектов: <span className="font-bold text-slate-950">{elements.length}</span>{mousePoint ? <span> · Курсор X {Math.round(mousePoint.x)} / Y {Math.round(mousePoint.y)}</span> : null}{snappedPoint ? <span> · Привязка X {Math.round(snappedPoint.x)} / Y {Math.round(snappedPoint.y)}</span> : null}{manualLength ? <span> · Длина: {manualLength} мм ↵</span> : null}</div>
        </div>
        <DrawingToolbar activeTool={activeTool} showGrid={showGrid} snapToGrid={snapToGrid} canSave={elements.length > 0} onToolChange={(tool) => { setActiveTool(tool); setDraftStart(null); setPreviewElement(null); setManualLength(''); setPendingAngleElementId(null); }} onShowGridChange={setShowGrid} onSnapToGridChange={setSnapToGrid} canUndo={undoStack.length > 0} canRedo={redoStack.length > 0} onUndo={undo} onRedo={redo} onClear={() => { commitElements([]); setSelectedElementId(null); setDraftStart(null); setPreviewElement(null); setManualLength(''); setPendingAngleElementId(null); }} onClose={onClose} onExportPdf={exportPdf} onSave={() => onSave(dealId, payload)} />
        <div className="mt-4 grid gap-4 xl:grid-cols-[320px_1fr]">
          <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
            <section><h3 className="font-bold text-slate-950">Параметры изделия</h3><p className="mt-1 text-xs text-slate-500">Развертка считается автоматически по нарисованным линиям, затем умножается на длину изделия для м².</p><div className="mt-3 grid gap-2 text-sm"><input value={productSpec.name} onChange={(event) => setProductSpec((current) => ({ ...current, name: event.target.value }))} className="rounded-xl border px-3 py-2" placeholder="Название" /><div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">Развертка: <b>{getManualFormula(elements)}</b> · площадь: <b>{getAreaM2(getUnfoldingMm(elements), productSpec.lengthMm, productSpec.quantity)} м²</b></div><div className="grid grid-cols-2 gap-2"><input type="number" value={productSpec.lengthMm} onChange={(event) => setProductSpec((current) => ({ ...current, lengthMm: Number(event.target.value) || 0 }))} className="rounded-xl border px-3 py-2" placeholder="Длина" /><input type="number" value={productSpec.quantity} onChange={(event) => setProductSpec((current) => ({ ...current, quantity: Number(event.target.value) || 1 }))} className="rounded-xl border px-3 py-2" placeholder="Кол-во" /></div><div className="grid grid-cols-2 gap-2"><input value={productSpec.material} onChange={(event) => setProductSpec((current) => ({ ...current, material: event.target.value }))} className="rounded-xl border px-3 py-2" placeholder="Материал" /><input type="number" step="0.1" value={productSpec.thicknessMm} onChange={(event) => setProductSpec((current) => ({ ...current, thicknessMm: Number(event.target.value) || 0 }))} className="rounded-xl border px-3 py-2" placeholder="Толщина" /></div><input value={productSpec.color} onChange={(event) => setProductSpec((current) => ({ ...current, color: event.target.value }))} className="rounded-xl border px-3 py-2" placeholder="Цвет" /></div></section>
            <section><h4 className="text-sm font-bold text-slate-950">Спецификация</h4><ul className="mt-2 space-y-2 text-xs text-slate-600">{products.map((product) => <li key={product.id} className="rounded-xl bg-slate-50 p-2"><b>{product.name}</b> {product.profileFormula} · L={product.lengthMm} мм · {product.quantity} шт{product.areaM2 !== undefined ? ` · ${product.areaM2} м²` : ''}</li>)}</ul></section>
            {selectedElement ? <section className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm"><h4 className="font-bold text-slate-950">Выбранный объект</h4><p className="mt-1 text-xs text-slate-600">{selectedElement.tool} · {selectedElement.id}</p><button type="button" onClick={() => { commitElements((current) => current.filter((element) => element.id !== selectedElement.id)); setSelectedElementId(null); }} className="mt-3 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white">Удалить</button></section> : null}
          </aside>
          <DrawingCanvas width={CANVAS_WIDTH} height={CANVAS_HEIGHT} gridSize={GRID_SIZE} showGrid={showGrid} elements={elements} previewElement={previewElement} mousePoint={mousePoint} snappedPoint={snappedPoint} selectedElementId={selectedElementId} zoom={zoom} viewBox={viewBox} canSelectElements={activeTool === 'select' || activeTool === 'angleDimension'} onWheelZoom={handleWheelZoom} onSelectElement={selectElement} onPointerDown={(rawPoint) => { setMousePoint(rawPoint); const point = getSnappedPoint(rawPoint, elements, snapToGrid, zoom); setSnappedPoint(point); if (activeTool === 'select' || activeTool === 'angleDimension') return; if (activeTool === 'text') { addTextElement(point); return; } if (draftStart) { finishDraft(point, manualLength ? Number(manualLength) : undefined); return; } setDraftStart(point); setManualLength(''); updatePreview(point, point); }} onPointerMove={(rawPoint) => { setMousePoint(rawPoint); const point = getSnappedPoint(rawPoint, elements, snapToGrid, zoom); setSnappedPoint(point); if (draftStart) { const previewEnd = manualLength ? getDirectedPoint(draftStart, point, Number(manualLength)) : point; updatePreview(draftStart, previewEnd); } }} onPointerUp={() => undefined} />
        </div>
      </div>
    </div>
  );
}
