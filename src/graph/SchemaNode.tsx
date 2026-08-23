import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { SchemaModel } from '../model';
import { Box, Repeat, AlertCircle } from 'lucide-react';

interface SchemaNodeData {
  schemaName: string;
  schema: SchemaModel;
  propertyCount: number;
  reuseCount: number;
  isCircular?: boolean;
  direction?: 'LR' | 'TB';
}

export const SchemaNode: React.FC<NodeProps<any>> = memo(({ data, selected }) => {
  const nodeData = data as SchemaNodeData;
  const isVertical = nodeData.direction === 'TB';

  const targetPosition = isVertical ? Position.Top : Position.Left;
  const sourcePosition = isVertical ? Position.Bottom : Position.Right;

  // Heavily referenced schemas get highlighted borders
  const isHighReuse = nodeData.reuseCount > 2;

  return (
    <div
      className={`relative rounded-xl border px-3 py-2.5 shadow-md transition-all duration-150 w-[240px] bg-white/95 dark:bg-slate-900/95 backdrop-blur text-slate-900 dark:text-slate-100 ${
        selected
          ? 'ring-2 ring-indigo-500 border-indigo-500 shadow-indigo-500/20'
          : isHighReuse
          ? 'border-indigo-400 dark:border-indigo-500/60 shadow-indigo-500/10'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <Handle
        type="target"
        position={targetPosition}
        className="!w-2.5 !h-2.5 !bg-indigo-500 !border-2 !border-white dark:!border-slate-900"
      />

      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Box className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <span
            className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 truncate"
            title={nodeData.schemaName}
          >
            {nodeData.schemaName}
          </span>
        </div>

        {nodeData.isCircular && (
          <span
            title="Contains circular reference"
            className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40"
          >
            <AlertCircle className="w-3 h-3" />
            Loop
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
        <span>
          {nodeData.propertyCount} {nodeData.propertyCount === 1 ? 'property' : 'properties'}
        </span>

        {nodeData.reuseCount > 0 && (
          <span
            className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono ${
              isHighReuse
                ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/60 font-semibold'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400'
            }`}
            title={`Referenced by ${nodeData.reuseCount} endpoints or schemas`}
          >
            <Repeat className="w-2.5 h-2.5" />
            {nodeData.reuseCount}x
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={sourcePosition}
        className="!w-2.5 !h-2.5 !bg-indigo-400 !border-2 !border-white dark:!border-slate-900"
      />
    </div>
  );
});

SchemaNode.displayName = 'SchemaNode';
