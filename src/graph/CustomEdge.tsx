import React, { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from '@xyflow/react';

export const CustomEdge: React.FC<EdgeProps<any>> = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
  }) => {
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    const label = data?.label as string | undefined;
    const edgeType = data?.type as 'consumes' | 'produces' | 'references' | undefined;

    // Offset label slightly along the X/Y trajectory based on type to prevent overlapping
    let offsetX = labelX;
    let offsetY = labelY;

    if (edgeType === 'consumes') {
      offsetX = sourceX + (targetX - sourceX) * 0.35;
      offsetY = sourceY + (targetY - sourceY) * 0.35;
    } else if (edgeType === 'produces') {
      offsetX = sourceX + (targetX - sourceX) * 0.65;
      offsetY = sourceY + (targetY - sourceY) * 0.65;
    }

    // Dynamic badge styles based on edge relationship type
    const badgeColorClass =
      edgeType === 'consumes'
        ? 'bg-blue-50 dark:bg-blue-950/90 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/80 shadow-blue-500/5'
        : edgeType === 'produces'
          ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 shadow-emerald-500/5'
          : 'bg-slate-50 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/80';

    return (
      <>
        <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
        {label && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${offsetX}px,${offsetY}px)`,
                pointerEvents: 'all',
              }}
              className={`text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-md border shadow-sm backdrop-blur-sm transition-colors duration-150 ${badgeColorClass}`}
            >
              {label}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  }
);

CustomEdge.displayName = 'CustomEdge';
