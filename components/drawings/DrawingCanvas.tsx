'use client';

import type { PointerEvent, WheelEvent } from 'react';
import type { DrawingElement, DrawingPoint, ProfileSegment } from '@/types/crm';

export type DrawingCanvasProps = {
  width: number;
  height: number;
  gridSize: number;
  showGrid: boolean;
  elements: DrawingElement[];
  previewElement: DrawingElement | null;
  mousePoint: DrawingPoint | null;
  snappedPoint: DrawingPoint | null;
  selectedElementId: string | null;
  onPointerDown: (point: DrawingPoint) => void;
  onPointerMove: (point: DrawingPoint) => void;
  onPointerUp: (point: DrawingPoint) => void;
  onWheelZoom: (deltaY: number, point: DrawingPoint) => void;
  zoom: number;
  viewBox: { x: number; y: number; width: number; height: number };
  canSelectElements: boolean;
  onSelectElement: (elementId: string) => void;
};

function getSvgPoint(event: PointerEvent<SVGSVGElement> | WheelEvent<SVGSVGElement>): DrawingPoint {
  const rect = event.currentTarget.getBoundingClientRect();
  const scaleX = event.currentTarget.viewBox.baseVal.width / rect.width;
  const scaleY = event.currentTarget.viewBox.baseVal.height / rect.height;

  return {
    x: event.currentTarget.viewBox.baseVal.x + (event.clientX - rect.left) * scaleX,
    y: event.currentTarget.viewBox.baseVal.y + (event.clientY - rect.top) * scaleY,
  };
}

function buildProfilePoints(start: DrawingPoint, segments: ProfileSegment[], scale = 2): DrawingPoint[] {
  return segments.reduce<DrawingPoint[]>((points, segment, index) => {
    const previous = points[index];
    const radians = (segment.angleDeg * Math.PI) / 180;
    return [
      ...points,
      {
        x: previous.x + segment.lengthMm * scale * Math.cos(radians),
        y: previous.y + segment.lengthMm * scale * Math.sin(radians),
      },
    ];
  }, [start]);
}

function getSegmentMidPoint(points: DrawingPoint[], index: number): DrawingPoint {
  const start = points[index];
  const end = points[index + 1];
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
}


const LABEL_FONT_SIZE = 13;
const LABEL_MIN_FONT_SIZE = 9;
const LABEL_LINE_GAP = 10;
const DIMENSION_STROKE = '#2563eb';
const ANGLE_STROKE = '#ea580c';

function getReadableLabelMetrics(label: string, segmentLength: number) {
  const estimatedTextWidth = Math.max(28, label.length * LABEL_FONT_SIZE * 0.62);
  const maxWidthNearLine = Math.max(34, segmentLength - LABEL_LINE_GAP * 2);
  const shouldMoveOutside = estimatedTextWidth > maxWidthNearLine;
  const fontSize = Math.max(LABEL_MIN_FONT_SIZE, Math.min(LABEL_FONT_SIZE, maxWidthNearLine / Math.max(label.length * 0.62, 1)));
  return { fontSize, offset: shouldMoveOutside ? 34 : 20 };
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
    length,
  };
}


function getAngleMarkerGeometry(element: DrawingElement) {
  const angle = element.angleDeg ?? 0;
  const vertex = element.vertex;
  if (!vertex) {
    const labelX = (element.start.x + element.end.x) / 2;
    const labelY = (element.start.y + element.end.y) / 2 - 18;
    return { angle, label: { x: labelX, y: labelY - 6 }, path: `M ${element.start.x} ${element.start.y} Q ${labelX} ${labelY - 30} ${element.end.x} ${element.end.y}`, rightAnglePoints: null as string | null };
  }

  const radius = Math.max(16, Math.hypot(element.start.x - vertex.x, element.start.y - vertex.y));
  const startAngle = Math.atan2(element.start.y - vertex.y, element.start.x - vertex.x);
  let endAngle = Math.atan2(element.end.y - vertex.y, element.end.x - vertex.x);
  let delta = endAngle - startAngle;
  while (delta <= -Math.PI) delta += Math.PI * 2;
  while (delta > Math.PI) delta -= Math.PI * 2;
  const sweep = delta >= 0 ? 1 : 0;
  const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
  const middleAngle = startAngle + delta / 2;
  const labelRadius = radius + 16;
  const label = { x: vertex.x + Math.cos(middleAngle) * labelRadius, y: vertex.y + Math.sin(middleAngle) * labelRadius };
  const unitStart = { x: Math.cos(startAngle), y: Math.sin(startAngle) };
  const unitEnd = { x: Math.cos(endAngle), y: Math.sin(endAngle) };
  const squareSize = Math.min(18, radius * 0.72);
  const p1 = { x: vertex.x + unitStart.x * squareSize, y: vertex.y + unitStart.y * squareSize };
  const p2 = { x: p1.x + unitEnd.x * squareSize, y: p1.y + unitEnd.y * squareSize };
  const p3 = { x: vertex.x + unitEnd.x * squareSize, y: vertex.y + unitEnd.y * squareSize };
  return {
    angle,
    label,
    path: `M ${element.start.x} ${element.start.y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${element.end.x} ${element.end.y}`,
    rightAnglePoints: `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`,
  };
}

function getBendTitle(segment: ProfileSegment): string {
  if (segment.bendType === 'hem') return `Завальцовка ${segment.hemSizeMm || segment.lengthMm} мм`;
  if (segment.bendType === 'lock') return 'Замок';
  if (segment.bendType === 'dripEdge') return 'Капельник';
  if (segment.bendType === 'bend') return `Гиб ${segment.angleDeg}°`;
  return segment.label || `${segment.lengthMm} мм`;
}

function renderProfile(element: DrawingElement, isPreview: boolean, isSelected: boolean) {
  const profile = element.profile;
  if (!profile) return null;
  const stroke = isPreview ? '#2563eb' : isSelected ? '#ea580c' : '#0f172a';
  const points = buildProfilePoints(element.start, profile.segments);
  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <g key={element.id}>
      <polyline points={polylinePoints} fill="none" stroke={stroke} strokeWidth={isSelected ? 3 : 2.4} strokeLinejoin="round" strokeLinecap="round" />
      {profile.segments.map((segment, index) => {
        const midpoint = getSegmentMidPoint(points, index);
        const start = points[index];
        const isHem = segment.bendType === 'hem';
        return (
          <g key={segment.id}>
            {isHem ? <circle cx={midpoint.x} cy={midpoint.y} r={7} fill="none" stroke="#ea580c" strokeWidth={2} /> : null}
            <text x={midpoint.x} y={midpoint.y - 8} textAnchor="middle" className="select-none text-[12px] font-bold" fill={isHem ? '#ea580c' : stroke}>
              {segment.lengthMm} мм
            </text>
            <text x={start.x + 7} y={start.y + 16} className="select-none text-[11px] font-semibold" fill="#64748b">
              {index > 0 ? `${segment.angleDeg}°` : getBendTitle(segment)}
            </text>
          </g>
        );
      })}
      <text x={element.start.x} y={element.start.y - 18} className="select-none text-[14px] font-bold" fill={stroke}>
        {profile.name} · {profile.segments.map((segment) => segment.lengthMm).join('×')} мм · L={profile.lengthMm} мм · {profile.quantity} шт
      </text>
    </g>
  );
}

export function renderElement(element: DrawingElement, isPreview = false, isSelected = false) {
  if (element.tool === 'profile') return renderProfile(element, isPreview, isSelected);

  const stroke = isPreview ? '#2563eb' : isSelected ? '#ea580c' : '#0f172a';
  const isHemLine = element.tool === 'hem' || element.hemSizeMm !== undefined;
  const commonProps = {
    stroke,
    strokeWidth: element.tool === 'dimension' ? 1.6 : isSelected ? 3 : 2,
    fill: element.tool === 'rectangle' || element.tool === 'circle' ? 'rgba(15, 23, 42, 0.04)' : 'none',
    strokeDasharray: isPreview ? '7 5' : element.tool === 'dimension' ? '4 4' : isHemLine ? '8 4' : undefined,
  };

  if (element.tool === 'line' || element.tool === 'hem') {
    const labelX = (element.start.x + element.end.x) / 2;
    const dx = element.end.x - element.start.x;
    const dy = element.end.y - element.start.y;
    const segmentLength = Math.max(1, Math.hypot(dx, dy));
    const length = element.lengthMm ?? Math.round(Math.hypot(element.end.x - element.start.x, element.end.y - element.start.y));
    const label = isHemLine ? `Завальцовка ${element.hemSizeMm ?? length} мм` : `${length} мм`;
    const labelMetrics = getReadableLabelMetrics(element.text || label, segmentLength);
    const labelXOffset = (-dy / segmentLength) * labelMetrics.offset;
    const labelYOffset = (dx / segmentLength) * labelMetrics.offset;
    const labelY = (element.start.y + element.end.y) / 2 + labelYOffset;
    return (
      <g key={element.id}>
        <line x1={element.start.x} y1={element.start.y} x2={element.end.x} y2={element.end.y} {...commonProps} />
        {isHemLine ? <line x1={element.start.x} y1={element.start.y + 5} x2={element.end.x} y2={element.end.y + 5} stroke={stroke} strokeWidth={1.4} strokeDasharray="8 4" /> : null}
        <text x={labelX + labelXOffset} y={labelY} textAnchor="middle" className="select-none font-bold" fontSize={labelMetrics.fontSize} fill={stroke}>
          {element.text || label}
        </text>
      </g>
    );
  }

  if (element.tool === 'rectangle') {
    const x = Math.min(element.start.x, element.end.x);
    const y = Math.min(element.start.y, element.end.y);
    const width = Math.abs(element.end.x - element.start.x);
    const height = Math.abs(element.end.y - element.start.y);

    return <rect key={element.id} x={x} y={y} width={width} height={height} rx={2} {...commonProps} />;
  }

  if (element.tool === 'circle') {
    const radius = Math.hypot(element.end.x - element.start.x, element.end.y - element.start.y);

    return <circle key={element.id} cx={element.start.x} cy={element.start.y} r={radius} {...commonProps} />;
  }

  if (element.tool === 'angleDimension') {
    const geometry = getAngleMarkerGeometry(element);
    const isRightAngle = Math.abs(geometry.angle - 90) <= 0.5;
    return (
      <g key={element.id}>
        {isRightAngle && geometry.rightAnglePoints ? (
          <polyline points={geometry.rightAnglePoints} stroke={ANGLE_STROKE} strokeWidth={1.8} fill="none" strokeDasharray={isPreview ? '7 5' : undefined} />
        ) : (
          <path d={geometry.path} stroke={ANGLE_STROKE} strokeWidth={1.8} fill="none" strokeDasharray={isPreview ? '7 5' : undefined} />
        )}
        <text x={geometry.label.x} y={geometry.label.y} textAnchor="middle" className="select-none text-[13px] font-bold" fill={ANGLE_STROKE}>
          {element.text || `${geometry.angle}°`}
        </text>
      </g>
    );
  }

  if (element.tool === 'dimension') {
    const rawLength = Math.hypot(element.end.x - element.start.x, element.end.y - element.start.y);
    const length = Math.round(rawLength);
    const label = element.text || `${length} мм`;
    const labelMetrics = getReadableLabelMetrics(label, rawLength);
    const offset = getOffsetLinePoints(element.start, element.end, labelMetrics.offset);
    const extension = 8;
    const tick = 6;
    const labelX = (offset.start.x + offset.end.x) / 2;
    const labelY = (offset.start.y + offset.end.y) / 2 - 4;

    return (
      <g key={element.id}>
        <line x1={element.start.x} y1={element.start.y} x2={offset.start.x + offset.normalX * extension} y2={offset.start.y + offset.normalY * extension} stroke={DIMENSION_STROKE} strokeWidth={1.2} />
        <line x1={element.end.x} y1={element.end.y} x2={offset.end.x + offset.normalX * extension} y2={offset.end.y + offset.normalY * extension} stroke={DIMENSION_STROKE} strokeWidth={1.2} />
        <line x1={offset.start.x} y1={offset.start.y} x2={offset.end.x} y2={offset.end.y} stroke={DIMENSION_STROKE} strokeWidth={1.6} />
        <line x1={offset.start.x - offset.normalX * tick} y1={offset.start.y - offset.normalY * tick} x2={offset.start.x + offset.normalX * tick} y2={offset.start.y + offset.normalY * tick} stroke={DIMENSION_STROKE} strokeWidth={1.6} />
        <line x1={offset.end.x - offset.normalX * tick} y1={offset.end.y - offset.normalY * tick} x2={offset.end.x + offset.normalX * tick} y2={offset.end.y + offset.normalY * tick} stroke={DIMENSION_STROKE} strokeWidth={1.6} />
        <text x={labelX} y={labelY} textAnchor="middle" className="select-none font-bold" fontSize={labelMetrics.fontSize} fill={DIMENSION_STROKE}>
          {label}
        </text>
      </g>
    );
  }

  return (
    <text key={element.id} x={element.start.x} y={element.start.y} className="select-none text-[18px] font-semibold" fill={stroke}>
      {element.text || 'Текст'}
    </text>
  );
}

export function DrawingCanvas({
  width,
  height,
  gridSize,
  showGrid,
  elements,
  previewElement,
  mousePoint,
  snappedPoint,
  selectedElementId,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheelZoom,
  zoom,
  viewBox,
  canSelectElements,
  onSelectElement,
}: DrawingCanvasProps) {
  const minorGridId = 'drawing-grid-minor';
  const majorGridId = 'drawing-grid-major';


  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-inner">
      <svg
        role="img"
        aria-label="Рабочее поле редактора чертежей"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className="h-[560px] w-full touch-none bg-white"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          onPointerDown(getSvgPoint(event));
        }}
        onPointerMove={(event) => onPointerMove(getSvgPoint(event))}
        onPointerUp={(event) => onPointerUp(getSvgPoint(event))}
        onWheel={(event) => {
          event.preventDefault();
          onWheelZoom(event.deltaY, getSvgPoint(event));
        }}
      >
        <defs>
          <pattern id={minorGridId} width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
          </pattern>
          <pattern id={majorGridId} width={gridSize * 5} height={gridSize * 5} patternUnits="userSpaceOnUse">
            <rect width={gridSize * 5} height={gridSize * 5} fill={`url(#${minorGridId})`} />
            <path d={`M ${gridSize * 5} 0 L 0 0 0 ${gridSize * 5}`} fill="none" stroke="#cbd5e1" strokeWidth="1.2" />
          </pattern>
        </defs>
        {showGrid ? <rect x={0} y={0} width={width} height={height} fill={`url(#${majorGridId})`} /> : <rect x={0} y={0} width={width} height={height} fill="#fff" />}
        <g>
          {elements.map((element) => (
            <g
              key={element.id}
              className="cursor-pointer"
              onPointerDown={(event) => {
                if (!canSelectElements) return;
                event.stopPropagation();
                onSelectElement(element.id);
              }}
            >
              {renderElement(element, false, selectedElementId === element.id)}
            </g>
          ))}
        </g>
        {previewElement ? renderElement(previewElement, true) : null}
        {snappedPoint ? (
          <g>
            <line x1={snappedPoint.x} y1={0} x2={snappedPoint.x} y2={height} stroke="#94a3b8" strokeDasharray="3 6" />
            <line x1={0} y1={snappedPoint.y} x2={width} y2={snappedPoint.y} stroke="#94a3b8" strokeDasharray="3 6" />
            <circle cx={snappedPoint.x} cy={snappedPoint.y} r={5} fill="#2563eb" opacity="0.65" />
          </g>
        ) : null}
        {mousePoint ? <circle cx={mousePoint.x} cy={mousePoint.y} r={3 / zoom} fill="#ea580c" /> : null}
      </svg>
    </div>
  );
}
