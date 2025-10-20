'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import { PlotLayoutItem } from '@/types/plotConfig';

interface ResizablePlotGridProps {
  layout: PlotLayoutItem[];
  onLayoutChange: (layout: PlotLayoutItem[]) => void;
  children: React.ReactNode[];
}

export function ResizablePlotGrid({ layout, onLayoutChange, children }: ResizablePlotGridProps) {
  const [resizing, setResizing] = useState<{ index: number; startX: number; startWidth: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Group plots by row
  const rows = layout.reduce((acc, item, index) => {
    if (!acc[item.y]) {
      acc[item.y] = [];
    }
    acc[item.y].push({ ...item, index });
    return acc;
  }, {} as Record<number, Array<PlotLayoutItem & { index: number }>>);

  const sortedRows = Object.entries(rows)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([, items]) => items.sort((a, b) => a.x - b.x));

  const handleMouseDown = useCallback((e: React.MouseEvent, itemIndex: number) => {
    e.preventDefault();
    const item = layout[itemIndex];
    setResizing({
      index: itemIndex,
      startX: e.clientX,
      startWidth: item.w,
    });
  }, [layout]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizing || !containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const deltaX = e.clientX - resizing.startX;
    const deltaColumns = Math.round((deltaX / containerWidth) * 12);
    const newWidth = Math.max(1, Math.min(12, resizing.startWidth + deltaColumns));

    if (newWidth !== layout[resizing.index].w) {
      const newLayout = [...layout];
      newLayout[resizing.index] = { ...newLayout[resizing.index], w: newWidth };
      onLayoutChange(newLayout);
    }
  }, [resizing, layout, onLayoutChange]);

  const handleMouseUp = useCallback(() => {
    setResizing(null);
  }, []);

  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizing, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="space-y-4">
      {sortedRows.map((rowItems, rowIndex) => (
        <div key={rowIndex} className="flex gap-2">
          {rowItems.map((item, itemIndex) => {
            const child = children[item.index];
            const isLast = itemIndex === rowItems.length - 1;
            
            return (
              <div
                key={item.plotId}
                className="relative"
                style={{
                  width: `${(item.w / 12) * 100}%`,
                  minHeight: `${item.h}px`,
                }}
              >
                {child}
                
                {/* Resize handle */}
                {!isLast && (
                  <div
                    className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-blue-500/20 flex items-center justify-center group"
                    onMouseDown={(e) => handleMouseDown(e, item.index)}
                  >
                    <GripVertical className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
