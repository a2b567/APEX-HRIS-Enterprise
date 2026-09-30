import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, CameraOff, KeyRound, Upload, Image as ImageIcon, CheckCircle2, RefreshCw } from "lucide-react";

export const QRScanner = ({ onScanSuccess, isKiosk = false }) => {
  const containerId = isKiosk ? "kiosk-qr-reader" : "modal-qr-reader";
  const fileInputRef = useRef(null);

  const html5QrRef  = useRef(null);
  const runningRef  = useRef(false);
  const startingRef = useRef(false);
  const cbRef       = useRef(onScanSuccess);
  const debounceRef = useRef(0);
  cbRef.current = onScanSuccess;

  const [cameras,  setCameras]  = useState([]);
  const [activeCam, setActiveCam] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error,    setError]    = useState("");
  const [manual,   setManual]   = useState("");
  const [lastScannedText, setLastScannedText] = useState("");
  const [justScanned, setJustScanned] = useState(false);

  // Discover camera devices
  useEffect(() => {
    let alive = true;
    Html5Qrcode.getCameras()
      .then((devs) => {
        if (!alive || !devs?.length) return;
        setCameras(devs);
        const back = devs.find((d) => /back|environment|rear/i.test(d.label));
        setActiveCam(back ? back.id : devs[0].id);
      })
      .catch((err) => {
        console.warn("Camera enumeration error:", err);
        if (alive) setError("Camera permission needed or camera is in use. You can also upload a QR image or type below.");
      });
    return () => { alive = false; };
  }, []);

  const stopCamera = async () => {
    if (!runningRef.current || !html5QrRef.current) return;
    try {
      await html5QrRef.current.stop();
    } catch (_) {}
    runningRef.current = false;
  };

  const destroyScanner = async () => {
    await stopCamera();
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.clear();
      } catch (_) {}
      html5QrRef.current = null;
    }
  };

  const handleScanHit = useCallback((decodedText) => {
    const now = Date.now();
    if (now - debounceRef.current < 1200) return;
    debounceRef.current = now;
    
    console.log("[QRScanner] Successfully decoded text:", decodedText);
    setLastScannedText(decodedText);
    setJustScanned(true);
    setTimeout(() => setJustScanned(false), 2000);

    if (cbRef.current) {
      cbRef.current(decodedText);
    }
  }, []);

  const startCamera = async (camId) => {
    if (startingRef.current || runningRef.current) return;
    startingRef.current = true;
    setError("");

    let found = false;
    for (let i = 0; i < 35; i++) {
      if (document.getElementById(containerId)) { found = true; break; }
      await new Promise((r) => setTimeout(r, 60));
    }
    if (!found) {
      setError("Scanner element not ready. Please refresh.");
      startingRef.current = false;
      return;
    }

    await destroyScanner();

    try {
      const qr = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
        ],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true, // Uses browser's native hardware BarcodeDetector if available
        },
      });
      html5QrRef.current = qr;

      const cameraConfig = camId || { facingMode: "environment" };

      await qr.start(
        cameraConfig,
        {
          fps: 20,
          aspectRatio: 1.0,
          disableFlip: false,
          videoConstraints: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            focusMode: "continuous",
          },
        },
        (decodedText) => {
          handleScanHit(decodedText);
        },
        () => {}
      );

      runningRef.current = true;
      setScanning(true);
    } catch (err) {
      console.error("[QRScanner] Start error:", err);
      const isDenied = /permission|denied|not allowed/i.test(err?.message ?? "");
      setError(
        isDenied
          ? "Camera access denied. Please allow camera permissions in your browser address bar."
          : "Camera feed unavailable or busy. Try selecting another camera or use manual/image upload."
      );
      await destroyScanner();
      setScanning(false);
    } finally {
      startingRef.current = false;
    }
  };

  useEffect(() => {
    if (!activeCam) return;
    let cancelled = false;
    const t = setTimeout(() => {
      if (!cancelled) startCamera(activeCam);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
      destroyScanner().then(() => setScanning(false));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCam]);

  const handleSwitch = async (newId) => {
    setScanning(false);
    await destroyScanner();
    setActiveCam(newId);
  };

  const handleManual = (e) => {
    e.preventDefault();
    const v = manual.trim();
    if (!v) return;
    handleScanHit(v);
    setManual("");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let qrInstance = html5QrRef.current;
      if (!qrInstance) {
        qrInstance = new Html5Qrcode(containerId, { verbose: false });
      }
      
      const decodedText = await qrInstance.scanFile(file, true);
      if (decodedText) {
        handleScanHit(decodedText);
      }
    } catch (err) {
      console.warn("QR File Scan Error:", err);
      setError("Could not read QR code from the uploaded image. Please try a clearer picture.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto space-y-4">
      {/* Video Viewport */}
      <div
        className="relative w-full rounded-3xl bg-slate-900 border-2 border-blue-500/30 shadow-lg"
        style={{ aspectRatio: "1 / 1", overflow: "hidden" }}
      >
        <div id={containerId} style={{ width: "100%", height: "100%", display: "block" }} />

        {/* Scan Reticle & Guide Overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 5 }}
        >
          <div style={{ position: "relative", width: 230, height: 230 }}>
            <span style={{ position:"absolute", top:0, left:0, width:32, height:32, borderTop:"4px solid #38bdf8", borderLeft:"4px solid #38bdf8", borderRadius:"8px 0 0 0" }} />
            <span style={{ position:"absolute", top:0, right:0, width:32, height:32, borderTop:"4px solid #38bdf8", borderRight:"4px solid #38bdf8", borderRadius:"0 8px 0 0" }} />
            <span style={{ position:"absolute", bottom:0, left:0, width:32, height:32, borderBottom:"4px solid #38bdf8", borderLeft:"4px solid #38bdf8", borderRadius:"0 0 0 8px" }} />
            <span style={{ position:"absolute", bottom:0, right:0, width:32, height:32, borderBottom:"4px solid #38bdf8", borderRight:"4px solid #38bdf8", borderRadius:"0 0 8px 0" }} />
            
            {scanning && (
              <span style={{
                position: "absolute",
                left: 8, right: 8,
                height: 3,
                background: "linear-gradient(90deg, transparent, #38bdf8, #818cf8, transparent)",
                boxShadow: "0 0 12px #38bdf8",
                animation: "qrBeam 2s ease-in-out infinite",
              }} />
            )}
          </div>
        </div>

        {/* Success Flash on Detection */}
        {justScanned && (
          <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center pointer-events-none z-20 backdrop-blur-[1px] animate-in fade-in">
            <div className="p-4 rounded-2xl bg-emerald-600/90 text-white flex items-center gap-2 shadow-2xl">
              <CheckCircle2 className="w-8 h-8 text-white animate-bounce" />
              <div className="text-left">
                <p className="font-bold text-xs">QR Code Detected!</p>
                <p className="font-mono text-[10px] opacity-90 truncate max-w-[180px]">{lastScannedText}</p>
              </div>
            </div>
          </div>
        )}

        {/* Standby / Offline Camera Overlay */}
        {!scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-slate-900/92" style={{ zIndex: 10 }}>
            <CameraOff className="w-12 h-12 text-slate-400" />
            <p className="text-sm font-bold text-white">Camera Offline</p>
            {error ? (
              <p className="text-xs text-rose-300 max-w-xs">{error}</p>
            ) : (
              <p className="text-xs text-slate-400 max-w-xs">Tap below to activate live camera scanning.</p>
            )}
            <button
              onClick={() => startCamera(activeCam)}
              className="mt-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 shadow-lg"
            >
              <Camera className="w-4 h-4" /> Start Camera
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes qrBeam {
          0%   { top: 8%; }
          50%  { top: 88%; }
          100% { top: 8%; }
        }
      `}</style>

      {/* Camera Controls & Upload Image Option */}
      <div className="w-full flex items-center gap-2">
        {cameras.length > 1 && (
          <select
            value={activeCam}
            onChange={(e) => handleSwitch(e.target.value)}
            className="flex-1 bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-blue-500 font-medium truncate"
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label || `Camera ${c.id.slice(0, 6)}`}
              </option>
            ))}
          </select>
        )}

        {scanning ? (
          <button
            onClick={() => { destroyScanner(); setScanning(false); }}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm ml-auto"
          >
            <CameraOff className="w-3.5 h-3.5" /> Pause
          </button>
        ) : (
          <button
            onClick={() => startCamera(activeCam)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm ml-auto"
          >
            <Camera className="w-3.5 h-3.5" /> Resume
          </button>
        )}

        {/* Upload QR Image File Button */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Upload image with QR code"
          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Upload Image</span>
        </button>
      </div>

      {/* Manual Input Fallback */}
      <div className="w-full p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
          <KeyRound className="w-3.5 h-3.5 text-blue-600" /> Manual Fallback Check-In
        </p>
        <form onSubmit={handleManual} className="flex gap-2">
          <input
            type="text"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Type Employee ID (e.g. EMP-001-01)"
            className="flex-1 bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500"
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