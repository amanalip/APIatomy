import React, { useState, useRef } from 'react';

interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
}

export function VirtualList<T>({ items, height, itemHeight, renderItem, overscan = 5 }: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => setScrollTop(e.currentTarget.scrollTop);

  const totalHeight = items.length * itemHeight;
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const end = Math.min(items.length, Math.ceil((scrollTop + height) / itemHeight) + overscan);
  const visible = items.slice(start, end);

  return (
    <div ref={ref} onScroll={onScroll} style={{ height, overflow: 'auto' }} className="relative">
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${start * itemHeight}px)`, position: 'absolute', top: 0, left: 0, right: 0 }}>
          {visible.map((item, idx) => (
            <div key={start + idx} style={{ height: itemHeight }}>
              {renderItem(item, start + idx)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
