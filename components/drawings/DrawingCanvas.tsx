'use client';

import type { PointerEvent } from 'react';
import type { DrawingElement, DrawingPoint } from '@/types/crm';

type DrawingCanvasProps = {
  width: number;
  height: number;
  gridSize: number;
  showGrid: boolean;
  elements: DrawingElement[];
  previewElement: DrawingElement | null;
  cursorPoint: DrawingPoint | null;
  onPointerDown: (point: DrawingPoint) => void;
  onPointerMove: (point: DrawingPoint) => void;
  onPointerUp: (point: DrawingPoint) => void;
};

function getSvgPoint(event: PointerEvent<SVGSVGElement>): DrawingPoint {
  const rect = event.currentTarget.getBoundingClientRect();
  const scaleX = event.currentTarget.viewBox.baseVal.width / rect.width;
  const scaleY = event.currentTarget.viewBox.baseVal.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function renderElement(element: DrawingElement, isPreview = false) {
  const stroke = isPreview ? '#2563eb' : '#0f172a';
  const commonProps = {
    stroke,
    strokeWidth: element.tool === 'dimension' ? 1.6 : 2,
    fill: element.tool === 'rectangle' || element.tool === 'circle' ? 'rgba(15, 23, 42, 0.04)' : 'none',
    strokeDasharray: isPreview ? '7 5' : element.tool === 'dimension' ? '4 4' : undefined,
  };

  if (element.tool === 'line') {
    return <line key={element.id} x1={element.start.x} y1={element.start.y} x2={element.end.x} y2={element.end.y} {...commonProps} />;
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

  if (element.tool === 'dimension') {
    const labelX = (element.start.x + element.end.x) / 2;
    const labelY = (element.start.y + element.end.y) / 2 - 8;
    const length = Math.round(Math.hypot(element.end.x - element.start.x, element.end.y - element.start.y));

    return (
      <g key={element.id}>
        <line x1={element.start.x} y1={element.start.y} x2={element.end.x} y2={element.end.y} {...commonProps} />
        <circle cx={element.start.x} cy={element.start.y} r={4} fill={stroke} />
        <circle cx={element.end.x} cy={element.end.y} r={4} fill={stroke} />
        <text x={labelX} y={labelY} textAnchor="middle" className="select-none text-[13px] font-bold" fill={stroke}>
          {element.text || `${length} мм`}
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
  cursorPoint,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: DrawingCanvasProps) {
  const minorGridId = 'drawing-grid-minor';
  const majorGridId = 'drawing-grid-major';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-inner">
      <svg
        role="img"
        aria-label="Рабочее поле редактора чертежей"
        viewBox={`0 0 ${width} ${height}`}
        className="h-[560px] w-full touch-none bg-white"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          onPointerDown(getSvgPoint(event));
        }}
        onPointerMove={(event) => onPointerMove(getSvgPoint(event))}
        onPointerUp={(event) => onPointerUp(getSvgPoint(event))}
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
        {showGrid ? <rect width={width} height={height} fill={`url(#${majorGridId})`} /> : <rect width={width} height={height} fill="#fff" />}
        <g>{elements.map((element) => renderElement(element))}</g>
        {previewElement ? renderElement(previewElement, true) : null}
        {cursorPoint ? (
          <g>
            <line x1={cursorPoint.x} y1={0} x2={cursorPoint.x} y2={height} stroke="#94a3b8" strokeDasharray="3 6" />
            <line x1={0} y1={cursorPoint.y} x2={width} y2={cursorPoint.y} stroke="#94a3b8" strokeDasharray="3 6" />
          </g>
        ) : null}
      </svg>
    </div>
  );
}

export { renderElement };
