import React, { useState, useRef, useEffect } from 'react';

interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  scrollToIndex?: number;
}

export function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 5,
  scrollToIndex,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollToIndex === undefined || scrollToIndex < 0 || !ref.current) return;
    const top = scrollToIndex * itemHeight;
    if (top < ref.current.scrollTop || top + itemHeight > ref.current.scrollTop + height) {
      ref.current.scrollTop = Math.max(0, top - height / 2);
      setScrollTop(ref.current.scrollTop);
    }
  }, [scrollToIndex, itemHeight, height]);

  useEffect(() => {
    if (!ref.current) return;
    const maximum = Math.max(0, items.length * itemHeight - height);
    ref.current.scrollTop = Math.min(ref.current.scrollTop, maximum);
    setScrollTop(ref.current.scrollTop);
  }, [items.length, itemHeight, height]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => setScrollTop(e.currentTarget.scrollTop);

  const totalHeight = items.length * itemHeight;
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const end = Math.min(items.length, Math.ceil((scrollTop + height) / itemHeight) + overscan);
  const visible = items.slice(start, end);

  return (
    <div
      data-virtual-scroll="true"
      ref={ref}
      onScroll={onScroll}
      style={{ height, overflow: 'auto' }}
      className="relative"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${start * itemHeight}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
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
