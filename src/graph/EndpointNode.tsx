import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { HttpMethod, EndpointModel } from '../model';
import { HTTP_METHODS } from '../model/httpMethods';

interface EndpointNodeData {
  endpoint: EndpointModel;
  method: HttpMethod;
  path: string;
  summary: string;
  tags: string[];
}

export const EndpointNode: React.FC<NodeProps<any>> = memo(({ data, selected }) => {
  const nodeData = data as EndpointNodeData;
  const methodConfig = HTTP_METHODS[nodeData.method] || HTTP_METHODS.get;

  return (
    <div
      className={`relative rounded-xl border px-3 py-2.5 shadow-md transition-all duration-150 w-[280px] bg-slate-900/95 backdrop-blur text-slate-100 ${
        selected ? 'ring-2 ring-blue-500 border-blue-500 shadow-blue-500/20' : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-slate-900"
      />

      <div className="flex items-center gap-2 mb-1.5">
        <span
          className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded shadow-sm ${methodConfig.badgeBg}`}
        >
          {methodConfig.label}
        </span>
        <span
          className="text-xs font-mono font-medium text-slate-200 truncate flex-1"
          title={nodeData.path}
        >
          {nodeData.path}
        </span>
      </div>

      <div className="text-[11px] text-slate-400 truncate leading-snug" title={nodeData.summary}>
        {nodeData.summary}
      </div>

      {nodeData.tags && nodeData.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {nodeData.tags.slice(0, 2).map((t) => (
            <span
              key={t}
              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/50"
            >
              {t}
            </span>
          ))}
          {nodeData.tags.length > 2 && (
            <span className="text-[10px] text-slate-500">+{nodeData.tags.length - 2}</span>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-blue-500 !border-2 !border-slate-900"
      />
    </div>
  );
});

EndpointNode.displayName = 'EndpointNode';
