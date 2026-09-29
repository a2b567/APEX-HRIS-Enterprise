import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, KeyRound, CheckCircle2, X } from "lucide-react";

const CONTAINER_ID = "payroll-qr-reader";

export const PayrollQRScanner = ({ onScanSuccess, lastResult }) => {
  const scannerRef = useRef(null);
  const isScanningRef = useRef(false);   // guard flag — avoids double-start in Strict Mode
  const [uiScanning, setUiScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [manualId, setManualId] = useState("");

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length) {
          setCameras(devices);
          const back = devices.find(
            (d) =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("environment")
          );
          setSelectedCameraId(back ? back.id : devices[0].id);
        }
      })
      .catch(() => setCameraError("Could not access cameras. Use the manual fallback below."));
  }, []);

  const startScanning = useCallback(async (camId) => {
    if (isScanningRef.current) return;           // already scanning — skip
    setCameraError("");
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(CONTAINER_ID);
      }
      const id = camId || selectedCameraId || { facingMode: "environment" };
      await scannerRef.current.start(
        id,
        { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
        (decodedText) => { if (onScanSuccess) onScanSuccess(decodedText); },
        () => {}
      );
      isScanningRef.current = true;
      setUiScanning(true);
    } catch (err) {
      console.error("PayrollQRScanner start error:", err);
      setCameraError("Camera access denied or unavailable. Use manual input below.");
      isScanningRef.current = false;
      setUiScanning(false);
    }
  }, [selectedCameraId, onScanSuccess]);

  const stopScanning = useCallback(async () => {
    if (!isScanningRef.current) return;          // not scanning — skip
    try { await scannerRef.current.stop(); } catch (e) {}
    isScanningRef.current = false;
    setUiScanning(false);
  }, []);

  // Auto-start when camera is selected — runs once per camera change
  useEffect(() => {
    if (!selectedCameraId) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      if (!cancelled) await startScanning(selectedCameraId);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [selectedCameraId]);   // intentionally NOT including startScanning to avoid re-trigger

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isScanningRef.current && scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        isScanningRef.current = false;
      }
    };
  }, []);

  const handleManual = (e) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    if (onScanSuccess) onScanSuccess(manualId.trim());
    setManualId("");
  };

  return (
    <div className="flex flex-col items-center w-full space-y-4">

      {/* Camera Viewport */}
      <div className="relative w-full aspect-square rounded-2xl bg-slate-900 border-2 border-blue-500/30 overflow-hidden shadow-md flex items-center justify-center">
        <div id={CONTAINER_ID} className="w-full h-full" />

        {/* Scan-frame overlay */}
        <div className="absolute inset-0 pointer-events-none border-[28px] border-slate-900/60 flex items-center justify-center">
          <div className="relative w-52 h-52 border-2 border-blue-400 rounded-2xl">
            <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
            {uiScanning && (
              <div className="absolute inset-x-2 h-0.5 top-1/2 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-lg shadow-blue-400/60 animate-bounce" />
            )}
          </div>
        </div>

        {/* Standby overlay */}
        {!uiScanning && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center z-10">
            <CameraOff className="w-10 h-10 text-slate-400 mb-2" />
            <p className="text-sm font-bold text-white">Camera Standby</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {cameraError || "Click below to turn on the camera scanner."}
            </p>
            <button
              onClick={() => startScanning(selectedCameraId)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow transition flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Turn On Camera</span>
            </button>
          </div>
        )}

        {/* Success flash */}
        {lastResult?.success && (
          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center pointer-events-none z-20">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 drop-shadow-lg" />
          </div>
        )}
      </div>

      {/* Camera Controls */}
      <div className="w-full flex items-center justify-between gap-2">
        {cameras.length > 1 && (
          <select
            value={selectedCameraId}
            onChange={(e) => { stopScanning(); setSelectedCameraId(e.target.value); }}
            className="flex-1 bg-white border border-slate-200 text-slate-800 rounded-xl py-1.5 px-3 text-xs focus:ring-2 focus:ring-blue-500 truncate"
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>{c.label || `Camera ${c.id.slice(0, 6)}...`}</option>
            ))}
          </select>
        )}
        {uiScanning ? (
          <button onClick={stopScanning} className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition ml-auto">
            <CameraOff className="w-3.5 h-3.5" /><span>Pause</span>
          </button>
        ) : (
          <button onClick={() => startScanning(selectedCameraId)} className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition ml-auto">
            <Camera className="w-3.5 h-3.5" /><span>Resume</span>
          </button>
        )}
      </div>

      {/* Result Banner */}
      {lastResult && (
        <div
          className={`w-full p-3.5 rounded-xl border text-xs ${
            lastResult.success
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : lastResult.alreadyDisbursed
              ? "bg-amber-50 border-amber-300 text-amber-950"
              : "bg-rose-50 border-rose-300 text-rose-900"
          }`}
        >
          {lastResult.success ? (
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{lastResult.employee?.name}</p>
                <p className="font-mono text-[10px] text-emerald-700">
                  {lastResult.employee?.id} · {lastResult.employee?.position}
                </p>
                <p className="mt-1 text-emerald-800">{lastResult.message}</p>
                {lastResult.record?.disbursedAt && (
                  <p className="text-[10px] text-emerald-600 font-mono mt-0.5">
                    Disbursed: {new Date(lastResult.record.disbursedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <X className={`w-4 h-4 shrink-0 mt-0.5 ${lastResult.alreadyDisbursed ? "text-amber-600" : "text-rose-600"}`} />
              <div>
                <p className="font-bold">{lastResult.alreadyDisbursed ? "⚠️ Already Released (1-Time Scan Limit)" : "Scan Failed"}</p>
                <p className="mt-0.5">{lastResult.message}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Fallback */}
      <div className="w-full p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 text-slate-600 text-xs font-semibold mb-2">
          <KeyRound className="w-3.5 h-3.5 text-blue-600" />
          <span>Manual Entry (No Camera / Hardware Scanner)</span>
        </div>
        <form onSubmit={handleManual} className="flex gap-2">
          <input
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="e.g. EMP-001-01 — press Enter to release"
            className="flex-1 bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition">
            Release
          </button>
        </form>
      </div>
    </div>
  );
};

export default PayrollQRScanner;
