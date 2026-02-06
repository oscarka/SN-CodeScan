
import React, { useState, useCallback } from 'react';
import Scanner from './components/Scanner';
import HistoryList from './components/HistoryList';
import { recognizeLabel } from './services/geminiService';
import { ScanResult } from './types';
import { Download, PlayCircle, StopCircle, RefreshCcw, Bell, Camera, XCircle } from 'lucide-react';

const App: React.FC = () => {
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanningActive, setIsScanningActive] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'warning' | 'error' } | null>(null);

  const showToast = (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    setToast({ message, type });
    // 如果是错误，显示时间稍长
    setTimeout(() => setToast(null), type === 'error' ? 5000 : 3000);
  };

  const handleCapture = useCallback(async (base64Image: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await recognizeLabel(base64Image);

      // 检查是否全为空
      const hasContent = result.sn || result.other_codes.length > 0;

      if (!hasContent) {
        showToast('图中未发现有效编码，请对准标签重试', 'info');
        return;
      }

      // 查重逻辑
      const duplicate_fields: string[] = [];
      const isDuplicate = history.some(item => {
        let match = false;
        if (result.sn && item.sn === result.sn) {
          duplicate_fields.push('SN');
          match = true;
        }
        return match;
      });

      const newResult: ScanResult = {
        id: crypto.randomUUID(),
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        ...result,
        duplicate: isDuplicate,
        duplicate_fields: [...new Set(duplicate_fields)],
      };

      if (isDuplicate) {
        showToast(`发现重复: ${duplicate_fields.join('/')} 已在记录中`, 'warning');
      } else {
        showToast('识别成功', 'info');
      }

      setHistory(prev => [newResult, ...prev]);
    } catch (err: any) {
      console.error(err);
      // 识别失败不阻断，仅提示并允许下一次自动触发
      showToast(err.message || '识别失败，请重试', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [history, isProcessing]);

  const handleDelete = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleEdit = (id: string) => {
    showToast('编辑功能即将上线', 'info');
  };

  const exportToCSV = () => {
    if (history.length === 0) return;
    const headers = ['时间', 'SN', '其他编码', '置信度', '重复'];
    const rows = history.map(item => [
      item.time,
      `'${item.sn || ''}`,
      item.other_codes.map(c => `${c.label}:${c.value}`).join('; '),
      `${(item.confidence * 100).toFixed(0)}%`,
      item.duplicate ? '是' : '否'
    ]);
    const csv = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `BATCH_${new Date().getTime()}.csv`;
    link.click();
  };

  const resetBatch = () => {
    if (history.length > 0 && confirm('确认清空当前所有记录并开始新批次？')) {
      setHistory([]);
      setIsScanningActive(true);
      showToast('批次已重置');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 text-gray-900 font-sans selection:bg-blue-100">
      {/* Toast 提示层 */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-[85%] max-w-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-xl ${toast.type === 'error' ? 'bg-red-500 text-white border-red-400' :
              toast.type === 'warning' ? 'bg-amber-500 text-white border-amber-400' :
                'bg-blue-600/90 text-white border-blue-400/30'
            }`}>
            {toast.type === 'error' ? <XCircle size={18} /> :
              toast.type === 'warning' ? <Bell size={18} /> :
                <PlayCircle size={18} />}
            <span className="text-xs font-bold tracking-wide">{toast.message}</span>
          </div>
        </div>
      )}

      {/* 顶部导航 */}
      <header className="bg-white/70 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Camera className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-base font-black text-gray-900 leading-none mb-1">标签智能扫描</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Doubao Flash Ready</p>
            </div>
          </div>
        </div>
        <button
          onClick={resetBatch}
          className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-500 active:rotate-180 transition-all duration-700"
        >
          <RefreshCcw size={18} />
        </button>
      </header>

      {/* 主视图区域 */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto">
          <Scanner
            onCapture={handleCapture}
            isProcessing={isProcessing}
            isActive={isScanningActive}
          />

          <div className="p-4">
            <HistoryList
              items={history}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          </div>
        </div>
      </main>

      {/* 底部控制栏 */}
      <footer className="fixed bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-2xl border-t border-gray-100 z-40">
        <div className="max-w-md mx-auto flex gap-4">
          <button
            onClick={() => setIsScanningActive(!isScanningActive)}
            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-3xl font-black text-sm transition-all active:scale-95 shadow-xl ${isScanningActive
                ? 'bg-gray-900 text-white shadow-gray-200'
                : 'bg-blue-600 text-white shadow-blue-200'
              }`}
          >
            {isScanningActive ? <StopCircle size={18} /> : <PlayCircle size={18} />}
            <span>{isScanningActive ? '停止扫描' : '恢复扫描'}</span>
          </button>

          <button
            disabled={history.length === 0}
            onClick={exportToCSV}
            className={`w-16 flex items-center justify-center rounded-3xl transition-all active:scale-95 ${history.length > 0
                ? 'bg-green-500 text-white shadow-xl shadow-green-100'
                : 'bg-gray-100 text-gray-300'
              }`}
          >
            <Download size={22} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
