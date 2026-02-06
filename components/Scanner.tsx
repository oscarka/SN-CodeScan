
// Fix: Added React to the import to resolve namespace issue for React.FC
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, Camera as CameraIcon, AlertCircle, ScanLine } from 'lucide-react';

interface ScannerProps {
  onCapture: (base64Image: string) => Promise<void>;
  isProcessing: boolean;
  isActive: boolean;
}

// Fix: Import React to resolve namespace issue
const Scanner: React.FC<ScannerProps> = ({ onCapture, isProcessing, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("当前浏览器环境不支持摄像头访问");
      }

      // 优先尝试后置摄像头
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 }, // 尝试更高分辨率
          height: { ideal: 1080 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
        };
      }
    } catch (err: any) {
      console.error(err);
      setError(err.name === 'NotAllowedError' ? '摄像头权限被拒绝' : '无法启动摄像头，请确保使用HTTPS访问');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleManualCapture = async () => {
    if (isProcessing || !isActive) return;

    // 震动反馈 (如果设备支持)
    if (navigator.vibrate) navigator.vibrate(50);

    const video = videoRef.current;
    const canvas = hiddenCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // 获取视频实际尺寸
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // 截取中间区域 (模拟取景框)
    // 取景框大概是 85% 宽
    const boxW = vw * 0.85;
    const boxH = boxW * (54 / 85.6); // 保持卡片比例
    const sx = (vw - boxW) / 2;
    const sy = (vh - boxH) / 2;

    canvas.width = Math.floor(boxW);
    canvas.height = Math.floor(boxH);

    // 绘制截取的图像
    ctx.drawImage(video, sx, sy, boxW, boxH, 0, 0, canvas.width, canvas.height);

    // 转换为 base64 并发送
    // 使用较高质量 0.9 以确保文字清晰
    const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
    if (base64) {
      await onCapture(base64);
    }
  };

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isActive, startCamera, stopCamera]);

  return (
    <div className="relative w-full aspect-[4/3] bg-black overflow-hidden rounded-b-3xl shadow-2xl border-b-4 border-blue-500">
      {isActive ? (
        <>
          {/* Video Preview */}
          <video
            ref={videoRef}
            autoPlay playsInline muted
            className={`w-full h-full object-cover transition-all duration-300 ${isProcessing ? 'opacity-50 blur-sm' : 'opacity-100'}`}
          />

          {/* Overlay Guide Layer */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            {/* 取景框 */}
            <div className={`relative w-[85%] aspect-[85.6/54] border-2 transition-all duration-300 rounded-xl shadow-[0_0_0_2000px_rgba(0,0,0,0.6)] ${isProcessing ? 'border-blue-400 scale-95' : 'border-white/60'}`}>

              {/* 四角装饰 */}
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>

              {/* 扫描动画 */}
              {!isProcessing && (
                <div className="absolute inset-0 overflow-hidden rounded-xl opacity-50">
                  <div className="w-full h-[2px] bg-blue-400 shadow-[0_0_20px_rgba(59,130,246,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
                </div>
              )}
            </div>

            <p className="mt-6 text-white/80 text-xs font-medium tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
              将标签对准框内
            </p>
          </div>

          {/* Controls Layer */}
          <div className="absolute bottom-10 left-0 right-0 flex justify-center z-20 pointer-events-auto">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-2 animate-pulse">
                <div className="p-4 bg-white/10 backdrop-blur-md rounded-full">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
                <span className="text-blue-400 text-sm font-bold">智能识别中...</span>
              </div>
            ) : (
              <button
                onClick={handleManualCapture}
                className="group relative flex flex-col items-center justify-center"
              >
                {/* 拍照按钮外圈 */}
                <div className="w-20 h-20 rounded-full border-4 border-white/30 group-active:scale-95 transition-transform duration-100 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                  {/* 拍照按钮内芯 */}
                  <div className="w-16 h-16 rounded-full bg-white group-active:bg-blue-100 shadow-lg flex items-center justify-center">
                    <ScanLine className="text-blue-600 w-8 h-8" />
                  </div>
                </div>
                <span className="mt-3 text-white font-bold text-sm tracking-wide drop-shadow-md">点击识别</span>
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-950 text-gray-700">
          <CameraIcon size={64} className="mb-4 opacity-10" />
          <p className="text-sm font-medium">摄像头已关闭</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/98 text-white p-8 text-center z-50">
          <div className="bg-red-500/20 p-4 rounded-full mb-6">
            <AlertCircle size={48} className="text-red-500" />
          </div>
          <p className="text-base font-bold mb-8">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-10 py-3 bg-blue-600 rounded-2xl text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-900/20"
          >
            重启重试
          </button>
        </div>
      )}

      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(200px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Scanner;
