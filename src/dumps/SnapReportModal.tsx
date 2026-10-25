import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react';
import type { DumpReport, WasteCategory, DumpSeverity, AIDumpAnalysisResult } from './types';
import { useApp } from '@/state/AppContext';

interface SnapReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportCreated: (newDump: DumpReport, openGovernmentDispatchImmediately?: boolean) => void;
}

export const SnapReportModal: React.FC<SnapReportModalProps> = ({
  isOpen,
  onClose,
  onReportCreated,
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIDumpAnalysisResult | null>(null);

  // Geo-location state
  // default to the Sohna campus area until GPS gives the real spot
  const [lat, setLat] = useState<number>(28.25);
  const [lng, setLng] = useState<number>(77.07);
  const [address, setAddress] = useState<string>('Near Sohna campus, Sector 4, Sohna');
  const [accuracyMeters, setAccuracyMeters] = useState<number>(5);
  const [fetchingGps, setFetchingGps] = useState(false);

  // Citizen details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<DumpSeverity>('high');
  const [categories, setCategories] = useState<WasteCategory[]>(['plastic', 'mixed']);
  const [estimatedKg, setEstimatedKg] = useState<number>(75);
  const [hazardScore, setHazardScore] = useState<number>(7);
  const { profile } = useApp();
  // reported under the leaderboard nickname, if there is one
  const [citizenName, setCitizenName] = useState(profile?.displayName ?? 'Campus student');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Initialize camera when in camera mode
  useEffect(() => {
    if (mode === 'camera' && !imagePreview) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode, imagePreview]);

  // Fetch Geo-Location on mount
  useEffect(() => {
    fetchLiveLocation();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Camera access error, defaulting to upload mode:', err);
      setMode('upload');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const fetchLiveLocation = () => {
    if (!navigator.geolocation) return;
    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFetchingGps(false);
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setAccuracyMeters(Math.round(pos.coords.accuracy || 5));
        setAddress(`GPS: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
      },
      (err) => {
        setFetchingGps(false);
        console.warn('GPS position error:', err.message);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Capture photo from video feed
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setImagePreview(dataUrl);
    stopCamera();
    runAIAnalysis(dataUrl);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImagePreview(dataUrl);
      runAIAnalysis(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Sample photo quick selector for demo
  const handleSelectSample = (url: string, sampleTitle: string) => {
    setImagePreview(url);
    setTitle(sampleTitle);
    runAIAnalysis(url);
  };

  // Run AI Dump Analysis
  const runAIAnalysis = async (imgData: string) => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/dumps/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imgData,
          locationContext: address,
        }),
      });

      const data = await res.json();
      if (data.success && data.analysis) {
        const a: AIDumpAnalysisResult = data.analysis;
        setAnalysisResult(a);
        setTitle(a.title);
        setDescription(a.description);
        setCategories(a.categories);
        setSeverity(a.severity);
        setEstimatedKg(a.estimatedWeightKg);
        setHazardScore(a.hazardScore);
      }
    } catch (err) {
      console.error('AI Analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const resetPhoto = () => {
    setImagePreview(null);
    setAnalysisResult(null);
    if (mode === 'camera') {
      startCamera();
    }
  };

  const handleSubmit = async (dispatchToGovNow = false) => {
    if (!imagePreview) {
      alert('Please snap or upload a roadside dump photo first.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title || 'Roadside Illegal Dump Report',
        description: description || 'Citizen reported illegal dumping on roadway curb.',
        imageUrl: imagePreview,
        location: {
          lat,
          lng,
          address,
          accuracyMeters,
        },
        categories,
        severity,
        estimatedWeightKg: estimatedKg,
        hazardScore,
        healthRisks: analysisResult?.healthRisks || ['Pedestrian hazard', 'Sanitation risk'],
        recommendedEquipment: analysisResult?.recommendedEquipment || ['Municipal sweeper vehicle'],
        reportedBy: {
          name: isAnonymous ? 'Anonymous Citizen' : citizenName,
          isAnonymous,
        },
      };

      const res = await fetch('/api/dumps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.dump) {
        onReportCreated(data.dump, dispatchToGovNow);
        onClose();
      } else {
        alert(data.error || 'Failed to submit report.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error saving roadside dump report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Snap & Report Illegal Roadside Dump
              </h2>
              <p className="text-xs text-slate-500">
                Geo-tagged citizen report with automated AI severity assessment
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Photo Section */}
          {!imagePreview ? (
            <div className="space-y-3">
              {/* Tab Switcher */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setMode('camera')}
                  className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-md transition-all ${
                    mode === 'camera' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-600" /> Live Camera Viewfinder
                </button>
                <button
                  onClick={() => setMode('upload')}
                  className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-md transition-all ${
                    mode === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" /> Upload File
                </button>
              </div>

              {/* Viewfinder or Upload Area */}
              {mode === 'camera' ? (
                <div className="relative h-64 bg-slate-900 rounded-xl overflow-hidden flex flex-col items-center justify-center border border-slate-300">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 z-10">
                    <button
                      onClick={capturePhoto}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-full shadow-lg flex items-center gap-2 border-2 border-white transition-all"
                    >
                      <Camera className="w-4 h-4" /> Snap Photo Now
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="h-56 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl bg-slate-50 flex flex-col items-center justify-center cursor-pointer transition-colors p-4 text-center"
                >
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-slate-800">
                    Click to select roadside dump photo
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    Supports JPG, PNG, WEBP (geo-exif or manual coordinate)
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              {/* Quick Sample Selector for Instant Testing */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 block mb-2">
                  Or select test dump evidence:
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    onClick={() =>
                      handleSelectSample(
                        'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
                        'Roadside Plastic Heap & Wrappers'
                      )
                    }
                    className="p-2 border border-slate-200 hover:border-emerald-500 rounded-lg text-left bg-slate-50 hover:bg-white transition-all"
                  >
                    <span className="font-semibold block truncate">Plastic Bottles</span>
                    <span className="text-[10px] text-slate-500">Curbside heap</span>
                  </button>
                  <button
                    onClick={() =>
                      handleSelectSample(
                        'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
                        'Construction Debris & Dry Bricks'
                      )
                    }
                    className="p-2 border border-slate-200 hover:border-emerald-500 rounded-lg text-left bg-slate-50 hover:bg-white transition-all"
                  >
                    <span className="font-semibold block truncate">Concrete Debris</span>
                    <span className="text-[10px] text-slate-500">Shoulder rubble</span>
                  </button>
                  <button
                    onClick={() =>
                      handleSelectSample(
                        'https://images.unsplash.com/photo-1574974671999-24b7dfc15a39?auto=format&fit=crop&w=800&q=80',
                        'Discarded Vehicle Tires & Grease'
                      )
                    }
                    className="p-2 border border-slate-200 hover:border-emerald-500 rounded-lg text-left bg-slate-50 hover:bg-white transition-all"
                  >
                    <span className="font-semibold block truncate">Vehicle Tires</span>
                    <span className="text-[10px] text-slate-500">Toxic culvert</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Photo Captured Preview + AI Results */
            <div className="space-y-4">
              <div className="relative h-48 rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                <img
                  src={imagePreview}
                  alt="Captured dump evidence"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={resetPhoto}
                  className="absolute top-2 right-2 px-2.5 py-1 bg-black/70 hover:bg-black/90 text-white rounded-lg text-xs font-semibold flex items-center gap-1 backdrop-blur-xs transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Retake Photo
                </button>

                {analyzing && (
                  <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 text-center">
                    <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin mb-2" />
                    <span className="text-xs font-bold">
                      Gemini AI Analyzing Dump Photo...
                    </span>
                    <span className="text-[11px] text-slate-300 mt-1">
                      Classifying waste materials, tonnage & calculating sweeper priority
                    </span>
                  </div>
                )}
              </div>

              {/* AI Analysis Result Callout */}
              {analysisResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> AI Classification Complete
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                      {Math.round(analysisResult.confidence * 100)}% Confidence
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-emerald-200/60">
                    <div>
                      <span className="text-[10px] text-emerald-700 uppercase block">Severity</span>
                      <span className="font-bold text-red-600 uppercase">{severity}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-700 uppercase block">Est. Weight</span>
                      <span className="font-bold text-emerald-950 font-mono">{estimatedKg} kg</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-700 uppercase block">Hazard Rating</span>
                      <span className="font-bold text-emerald-950 font-mono">{hazardScore} / 10</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Geo-tagging details */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-500" /> GPS Geo-Tagging
                  </span>
                  <button
                    onClick={fetchLiveLocation}
                    disabled={fetchingGps}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${fetchingGps ? 'animate-spin' : ''}`} /> Refresh GPS
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-white p-1.5 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-sans">Latitude</span>
                    <span>{lat.toFixed(5)}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-sans">Longitude</span>
                    <span>{lng.toFixed(5)}</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Street Address / Landmark
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Editable Dump Title & Details */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Dump Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Description & Observations
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-1.5 text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Reporter attribution */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span>Report Anonymously (Hide citizen name)</span>
                  </label>

                  {!isAnonymous && (
                    <span className="text-[11px] text-slate-500">
                      Reporting as <b className="text-slate-800">{citizenName}</b>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>

          {imagePreview && (
            <div className="flex items-center gap-2">
              {/* Option to submit & immediately dispatch to government */}
              <button
                onClick={() => handleSubmit(true)}
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-xs transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit & Dispatch to Government</span>
              </button>

              {/* Standard submit to heatmap */}
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-xs transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Add to Municipal Heatmap</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
