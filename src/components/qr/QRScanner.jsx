import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, RefreshCw, KeyRound, AlertCircle, Sparkles } from 'lucide-react';

export const QRScanner = ({ onScanSuccess, scannerBranchId, isKiosk = false }) => {
  const scannerRef = useRef(null);
  const isScanningRef = useRef(false);
  const isStartingRef = useRef(false);
  const lastScannedTimeRef = useRef(0);

  const [uiScanning, setUiScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualIdInput, setManualIdInput] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  const containerId = isKiosk ? 'kiosk-qr-reader' : 'modal-qr-reader';

  // Initialize camera list
  useEffect(() => {
    let mounted = true;
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!mounted) return;
        if (devices && devices.length) {
          setCameras(devices);
          const backCam = devices.find(
            (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn('Camera enumeration error:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const stopScanning = useCallback(async () => {
    if (!isScanningRef.current || !scannerRef.current) {
      isScanningRef.current = false;
      setUiScanning(false);
      return;
    }
    try {
      await scannerRef.current.stop();
    } catch (e) {
      // ignore
    } finally {
      isScanningRef.current = false;
      setUiScanning(false);
    }
  }, []);

  const startScanning = useCallback(async (targetCamId) => {
    if (isStartingRef.current || isScanningRef.current) return;
    isStartingRef.current = true;
    setCameraError('');

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(containerId);
      }

      const cam = targetCamId || selectedCameraId || { facingMode: 'environment' };

      await scannerRef.current.start(
        cam,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          const now = Date.now();
          // 2-second debounce between scans
          if (now - lastScannedTimeRef.current > 2000) {
            lastScannedTimeRef.current = now;
            if (onScanSuccess) {
              onScanSuccess(decodedText);
            }
          }
        },
        () => {}
      );

      isScanningRef.current = true;
      setUiScanning(true);
    } catch (err) {
      console.warn('Camera start error:', err);
      setCameraError('Camera access denied or unavailable. Use manual input below.');
      isScanningRef.current = false;
      setUiScanning(false);
    } finally {
      isStartingRef.current = false;
    }
  }, [containerId, onScanSuccess, selectedCameraId]);

  // Auto-start when selectedCameraId is ready
  useEffect(() => {
    if (!selectedCameraId) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!cancelled) {
        await startScanning(selectedCameraId);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selectedCameraId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && isScanningRef.current) {
        scannerRef.current.stop().catch(() => {});
        isScanningRef.current = false;
      }
    };
  }, []);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualIdInput.trim()) return;
    if (onScanSuccess) {
      onScanSuccess(manualIdInput.trim());
      setManualIdInput('');
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto space-y-4">
      {/* Scanner Viewport Container */}
      <div className="relative w-full aspect-square rounded-3xl bg-slate-900 border-2 border-blue-500/30 overflow-hidden shadow-lg flex items-center justify-center">
        <div id={containerId} className="w-full h-full object-cover" />

        {/* Scan Frame Overlay */}
        <div className="absolute inset-0 pointer-events-none border-[30px] border-slate-900/60 flex items-center justify-center">
          <div className="relative w-56 h-56 border-2 border-blue-400 rounded-2xl">
            {/* Corner Reticles */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />

            {/* Animated Laser Beam */}
            {uiScanning && (
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-lg shadow-blue-400/50 animate-bounce" />
            )}
          </div>
        </div>

        {/* Not scanning overlay */}
        {!uiScanning && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center z-10">
            <CameraOff className="w-12 h-12 text-slate-400 mb-2" />
            <p className="text-sm font-bold text-white">Camera Standby</p>
            <p className="text-xs text-slate-300 mt-1 max-w-xs">
              {cameraError || 'Click below to activate attendance scanner camera.'}
            </p>
            <button
              onClick={() => startScanning(selectedCameraId)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4" />
              <span>Turn On Camera</span>
            </button>
          </div>
        )}
      </div>

      {/* Camera Controls */}
      <div className="w-full flex items-center justify-between gap-2 text-xs">
        {cameras.length > 1 && (
          <select
            value={selectedCameraId}
            onChange={(e) => {
              stopScanning();
              setSelectedCameraId(e.target.value);
            }}
            className="flex-1 bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-blue-500 truncate"
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label || `Camera ${c.id.slice(0, 5)}...`}
              </option>
            ))}
          </select>
        )}

        {uiScanning ? (
          <button
            onClick={stopScanning}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition ml-auto shadow-sm"
          >
            <CameraOff className="w-3.5 h-3.5" />
            <span>Pause</span>
          </button>
        ) : (
          <button
            onClick={() => startScanning(selectedCameraId)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition ml-auto shadow-sm"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Resume</span>
          </button>
        )}
      </div>

      {/* Manual Fallback Input */}
      <div className="w-full p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-1.5 text-slate-600 text-xs font-semibold mb-2">
          <KeyRound className="w-3.5 h-3.5 text-blue-600" />
          <span>Manual Fallback Check-In</span>
        </div>

        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualIdInput}
            onChange={(e) => setManualIdInput(e.target.value)}
            placeholder="Type Employee ID or Code"
            className="flex-1 bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2 focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default QRScanner;
