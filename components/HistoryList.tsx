
import React from 'react';
import { ScanResult } from '../types';
import { AlertCircle, Trash2, Edit3, ClipboardCheck } from 'lucide-react';

interface HistoryListProps {
  items: ScanResult[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ items, onDelete, onEdit }) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <ClipboardCheck size={64} className="mb-4 opacity-10" />
        <p>暂无扫描记录，请对准标签开始</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3 pb-24">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">已扫描结果 ({items.length})</h3>
        <span className="text-xs text-gray-400">最新在上</span>
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          className={`relative group bg-white rounded-xl shadow-sm border-l-4 p-4 transition-all active:scale-[0.98] ${item.duplicate ? 'border-amber-500 bg-amber-50' : 'border-blue-500'
            }`}
        >
          {item.duplicate && (
            <div className="absolute top-2 right-2 flex items-center gap-1 text-amber-600 bg-amber-100/50 px-2 py-0.5 rounded-full text-[10px] font-bold">
              <AlertCircle size={10} />
              <span>重复: {item.duplicate_fields.join(', ').toUpperCase()}</span>
            </div>
          )}

          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] text-gray-400 font-mono">{item.time}</span>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(item.id)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md">
                <Edit3 size={14} />
              </button>
              <button onClick={() => onDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md">
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {item.sn && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 w-8">SN</span>
                <span className={`text-sm font-mono break-all font-medium ${item.duplicate_fields.includes('sn') ? 'text-amber-700 underline decoration-amber-300' : 'text-gray-800'}`}>
                  {item.sn}
                </span>
              </div>
            )}
            {item.other_codes.length > 0 && (
              <div className="pt-2 border-t border-gray-100 mt-1">
                {item.other_codes.map((code, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 w-8 truncate">{code.label}</span>
                    <span className="text-sm font-mono text-gray-600">{code.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-end">
            <span className="text-[10px] text-gray-400">置信度: {(item.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HistoryList;
