import React, { useState, useCallback, useRef } from 'react';
import Scanner, { ScannerRef } from './components/Scanner';
import HistoryList from './components/HistoryList';
import { recognizeLabel } from './services/geminiService';
import { ScanResult } from './types';
import { Download, PlayCircle, StopCircle, RefreshCcw, Bell, Camera, XCircle, Share2, ScanLine, Edit3, Save, X } from 'lucide-react';

const App: React.FC = () => {
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanningActive, setIsScanningActive] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'warning' | 'error' } | null>(null);
  const [editingItem, setEditingItem] = useState<ScanResult | null>(null);
  const [editValue, setEditValue] = useState('');

  const scannerRef = useRef<ScannerRef>(null);

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
    const item = history.find(i => i.id === id);
    if (item) {
      setEditingItem(item);
      setEditValue(item.sn || '');
    }
  };

  const saveEdit = () => {
    if (!editingItem) return;

    setHistory(prev => prev.map(item => {
      if (item.id === editingItem.id) {
        return { ...item, sn: editValue };
      }
      return item;
    }));

    setEditingItem(null);
    showToast('修改已保存');
  };

  const handleShare = async () => {
    if (history.length === 0) return;

    const headers = ['时间', 'SN', '其他编码', '置信度', '重复'];
    const rows = history.map(item => [
      item.time,
      `'${item.sn || ''}`,
      item.other_codes.map(c => `${c.label}:${c.value}`).join('; '),
      `${(item.confidence * 100).toFixed(0)}%`,
      item.duplicate ? '是' : '否'
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");

    const fileName = `SCAN_${new Date().toISOString().slice(0, 10)}.csv`;
    const file = new File(["\ufeff" + csvContent], fileName, { type: 'text/csv' });

    // 优先尝试原生分享
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: '扫描结果导出',
          text: `共 ${history.length} 条扫描记录`
        });
        showToast('分享成功');
        return;
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('分享失败:', error);
          // 失败后回退到下载逻辑
        } else {
          return; // 用户取消
        }
      }
    }

    // 回退到普通下载
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    showToast('文件已下载');
  };

  const resetBatch = () => {
    if (history.length > 0 && confirm('确认清空当前所有记录并开始新批次？')) {
      setHistory([]);
      setIsScanningActive(true);
      showToast('批次已重置');
    }
  };

  // 触发拍照
  const triggerCapture = () => {
    if (scannerRef.current) {
      scannerRef.current.triggerCapture();
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

      {/* 编辑弹窗 */}
      {editingItem && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">修改记录</h3>
              <button onClick={() => setEditingItem(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                <X size={18} />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">SN (序列号)</label>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 font-mono text-lg focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEditingItem(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl">
                取消
              </button>
              <button onClick={saveEdit} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-transform">
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 主视图区域 - Flex Column Layout */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden pb-safe">

        {/* 固定扫描区域 */}
        <div className="shrink-0 z-10 bg-black relative">
          <Scanner
            ref={scannerRef}
            onCapture={handleCapture}
            isProcessing={isProcessing}
            isActive={isScanningActive}
          />
          <button
            onClick={resetBatch}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-white/50 hover:text-white bg-black/20 backdrop-blur-md rounded-full active:rotate-180 transition-all z-20"
          >
            <RefreshCcw size={16} />
          </button>
        </div>

        {/* 可滚动列表区域 */}
        <div className="flex-1 overflow-y-auto bg-gray-100 pb-32">
          <div className="max-w-md mx-auto p-4 min-h-full">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <ScanLine size={48} className="mb-4 opacity-20" />
                <p className="text-sm">暂无扫描记录</p>
              </div>
            ) : (
              <HistoryList
                items={history}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            )}
          </div>
        </div>
      </main>

      {/* 底部控制栏 - Fixed at bottom */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t border-gray-100 z-40 pb-safe">
        <div className="max-w-md mx-auto flex items-center justify-between px-4">

          {/* 左侧：停止/开始 */}
          <button
            onClick={() => setIsScanningActive(!isScanningActive)}
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all active:scale-90 ${isScanningActive
              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              : 'bg-green-100 text-green-600'
              }`}
          >
            {isScanningActive ? <StopCircle size={24} /> : <PlayCircle size={24} />}
          </button>

          {/* 中间：巨大拍照按钮 */}
          <div className="relative -top-8">
            <button
              onClick={triggerCapture}
              disabled={!isScanningActive || isProcessing}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-90 ${isProcessing || !isScanningActive
                ? 'bg-gray-200 cursor-not-allowed'
                : 'bg-blue-600 shadow-blue-300 ring-4 ring-white'
                }`}
            >
              {isProcessing ? (
                <RefreshCcw className="text-white/50 animate-spin" size={32} />
              ) : (
                <ScanLine className="text-white" size={32} />
              )}
            </button>
          </div>

          {/* 右侧：分享/导出 */}
          <button
            disabled={history.length === 0}
            onClick={handleShare}
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all active:scale-90 ${history.length > 0
              ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              : 'bg-gray-50 text-gray-300'
              }`}
          >
            <Share2 size={24} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
