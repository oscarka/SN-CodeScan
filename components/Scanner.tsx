
// Fix: Added React to the import to resolve namespace issue for React.FC
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, Camera as CameraIcon, AlertCircle } from 'lucide-react';

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
  const lastFrameRef = useRef<ImageData | null>(null);
  const stableTimeRef = useRef<number>(0);
  const lastCaptureTimeRef = useRef<number>(0);
  const requestRef = useRef<number>();

  const STABILITY_THRESHOLD = 0.035; 
  const MIN_STABLE_TIME = 600; 
  const CAPTURE_COOLDOWN = 1500; // 识别后的冷却时间，单位ms

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("当前浏览器环境不支持摄像头访问");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
        };
      }
    } catch (err: any) {
      setError(err.name === 'NotAllowedError' ? '摄像头权限被拒绝' : '无法启动摄像头');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const checkStability = useCallback(() => {
    const now = Date.now();
    // 关键点：如果在处理中，或者处于冷却时间内，跳过稳定性检查
    if (!videoRef.current || isProcessing || !isActive || (now - lastCaptureTimeRef.current < CAPTURE_COOLDOWN)) {
      requestRef.current = requestAnimationFrame(checkStability);
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2) {
      requestRef.current = requestAnimationFrame(checkStability);
      return;
    }

    const canvas = hiddenCanvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!ctx || !canvas) return;

    canvas.width = 160;
    canvas.height = 120;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (lastFrameRef.current) {
        let diff = 0;
        const data = currentFrame.data;
        const lastData = lastFrameRef.current.data;
        for (let i = 0; i < data.length; i += 12) { // 抽样检查提升性能
          diff += Math.abs(data[i] - lastData[i]);
        }
        const normalizedDiff = diff / ((data.length / 12) * 255);
        
        if (normalizedDiff < STABILITY_THRESHOLD) {
          if (stableTimeRef.current === 0) stableTimeRef.current = now;
          else if (now - stableTimeRef.current > MIN_STABLE_TIME) {
            captureFrame();
            stableTimeRef.current = 0;
            lastCaptureTimeRef.current = now; // 标记最后一次抓取时间
          }
        } else {
          stableTimeRef.current = 0;
        }
      }
      lastFrameRef.current = currentFrame;
    } catch (e) {
      console.error(e);
    }
    requestRef.current = requestAnimationFrame(checkStability);
  }, [isProcessing, isActive]);

  const captureFrame = async () => {
    const video = videoRef.current;
    const canvas = hiddenCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const boxW = vw * 0.85;
    const boxH = boxW * (54 / 85.6);
    const sx = (vw - boxW) / 2;
    const sy = (vh - boxH) / 2;

    canvas.width = Math.floor(boxW);
    canvas.height = Math.floor(boxH);
    ctx.drawImage(video, sx, sy, boxW, boxH, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    if (base64) await onCapture(base64);
  };

  useEffect(() => {
    if (isActive) {
      startCamera();
      requestRef.current = requestAnimationFrame(checkStability);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, startCamera, stopCamera, checkStability]);

  return (
    <div className="relative w-full aspect-[4/3] bg-black overflow-hidden rounded-b-3xl shadow-2xl border-b-4 border-blue-500">
      {isActive ? (
        <>
          <video
            ref={videoRef}
            autoPlay playsInline muted
            className={`w-full h-full object-cover transition-all duration-500 ${isProcessing ? 'scale-105 blur-md opacity-40' : 'scale-100 opacity-100'}`}
          />
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`relative w-[85%] aspect-[85.6/54] border-2 transition-colors duration-300 rounded-2xl shadow-[0_0_0_2000px_rgba(0,0,0,0.5)] ${isProcessing ? 'border-blue-500' : 'border-white/40'}`}>
              {/* 四角引导线 */}
              <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
              <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
              <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
              <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
              
              {!isProcessing && (
                <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_1.5s_ease-in-out_infinite]"></div>
                </div>
              )}
            </div>
          </div>

          <div className="absolute top-6 left-0 right-0 flex justify-center">
             <div className="px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
               <span className="text-[11px] text-white font-medium tracking-wider">
                 {isProcessing ? '智能处理中' : '自动侦测模式'}
               </span>
             </div>
          </div>

          {isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="bg-blue-600/90 p-4 rounded-3xl shadow-2xl animate-bounce">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
              <p className="mt-4 text-white text-sm font-bold tracking-[0.2em] bg-black/20 px-6 py-1 rounded-full backdrop-blur-sm">FLASH 极速识别中</p>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-950 text-gray-700">
          <CameraIcon size={64} className="mb-4 opacity-10" />
          <p className="text-sm font-medium">会话已结束</p>
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
            重启摄像头
          </button>
        </div>
      )}

      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />
      
      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); opacity: 0; }
          10%, 90% { opacity: 1; }
          50% { transform: translateY(calc(100% - 4px)); }
        }
      `}</style>
    </div>
  );
};

export default Scanner;
