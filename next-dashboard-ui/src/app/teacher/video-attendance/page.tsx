"use client";

import { useState, useEffect, useRef } from "react";
import TeacherTopBar from "@/app/components/TeacherTopBar";
import { Upload, Play, Square, RefreshCw, Check, X, Users, Database, BarChart3 } from "lucide-react";
import { getClientCctvBackendUrl } from "@/lib/clientConfig";

interface ExtractedFace {
  id: string;
  image_b64: string;
  name: string;
  student_id: string | null;
  score: number;
  is_match: boolean;
  frame_num: number;
  confirmed: boolean;
  timestamp: string;
}

interface KnownFace {
  student_id: string;
  name: string;
  num_samples: number;
  image_url?: string;
}

interface TrackerStatus {
  is_processing: boolean;
  confirmed_students: string[];
  pending_students: Record<string, number>;
  config: {
    window_size: number;
    min_confirmations: number;
    threshold: number;
  };
}

interface DebugInfo {
  mongodb_connected: boolean;
  embeddings_loaded: number;
  unique_students: number;
  student_names: string[];
  is_processing: boolean;
  threshold: number;
  multiframe_config: {
    window_size: number;
    min_confirmations: number;
  };
}

interface Analytics {
  total_frames: number;
  processed_frames: number;
  faces_detected: number;
  matched_faces: number;
  unknown_faces: number;
  fps: number;
  video_duration: number;
  processing_time: number;
  current_frame: number;
  is_processing: boolean;
  match_rate: number;
  score_stats: {
    min: number;
    max: number;
    avg: number;
    count: number;
  };
}

export default function VideoAttendancePage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [videoPreviewError, setVideoPreviewError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [trackerStatus, setTrackerStatus] = useState<TrackerStatus | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [extractedFaces, setExtractedFaces] = useState<ExtractedFace[]>([]);
  const [knownFaces, setKnownFaces] = useState<KnownFace[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [message, setMessage] = useState({ text: "", type: "" as "success" | "error" | "" });
  const [backendReady, setBackendReady] = useState(false);
  
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const statusPollRef = useRef<NodeJS.Timeout | null>(null);
  
  const BACKEND_URL = getClientCctvBackendUrl();

  // Check backend status on mount
  useEffect(() => {
    checkBackendStatus();
    fetchKnownFaces();
    return () => {
      if (statusPollRef.current) {
        clearInterval(statusPollRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  useEffect(() => {
    const player = videoPreviewRef.current;
    if (!player || !videoPreviewUrl) return;

    player.load();
    if (isProcessing) {
      player.muted = true;
      player.play().catch(() => {
        setVideoPreviewError("Click Play Preview to start the video preview.");
      });
    }
  }, [isProcessing, videoPreviewUrl]);

  // Poll while processing
  useEffect(() => {
    if (isProcessing) {
      statusPollRef.current = setInterval(async () => {
        await fetchTrackerStatus();
        await fetchExtractedFaces();
        await fetchAnalytics();
      }, 500);
    } else {
      if (statusPollRef.current) {
        clearInterval(statusPollRef.current);
        statusPollRef.current = null;
      }
    }
    return () => {
      if (statusPollRef.current) {
        clearInterval(statusPollRef.current);
      }
    };
  }, [isProcessing]);

  const checkBackendStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/debug`);
      if (res.ok) {
        const data = await res.json();
        setDebugInfo(data);
        setBackendReady(true);
        if (!data.mongodb_connected) {
          setMessage({ text: "MongoDB not connected.", type: "error" });
        } else if (data.embeddings_loaded === 0) {
          setMessage({ text: "No face embeddings loaded.", type: "error" });
        }
      }
    } catch {
      setBackendReady(false);
      setMessage({ text: "Backend not running on port 8000.", type: "error" });
    }
  };

  const fetchTrackerStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/tracker-status`);
      if (res.ok) {
        const data = await res.json();
        setTrackerStatus(data);
        setIsProcessing(data.is_processing);
      }
    } catch {
      console.error("Error fetching tracker status");
    }
  };

  const fetchExtractedFaces = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/extracted-faces`);
      if (res.ok) {
        const data = await res.json();
        setExtractedFaces(data.faces || []);
      }
    } catch {
      console.error("Error fetching extracted faces");
    }
  };

  const fetchKnownFaces = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/known-faces`);
      if (res.ok) {
        const data = await res.json();
        setKnownFaces(data.faces || []);
      }
    } catch {
      console.error("Error fetching known faces");
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/analytics`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch {
      console.error("Error fetching analytics");
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const nextPreviewUrl = URL.createObjectURL(file);
      setVideoFile(file);
      setVideoPreviewUrl(nextPreviewUrl);
      setVideoPreviewError("");
      setMessage({ text: "", type: "" });
      setAnalytics(null);
      setExtractedFaces([]);
    }
  };

  const handlePlayPreview = async () => {
    const player = videoPreviewRef.current;
    if (!player) return;

    try {
      setVideoPreviewError("");
      player.muted = isProcessing;
      await player.play();
    } catch {
      setVideoPreviewError(
        "This browser could not start the preview. Try an MP4/H.264 or WebM video, or use the video controls directly."
      );
    }
  };

  const handleStartProcessing = async () => {
    if (!videoFile) {
      setMessage({ text: "Please select a video file.", type: "error" });
      return;
    }

    if ((videoFile.size || 0) > 4 * 1024 * 1024 && BACKEND_URL.startsWith("/api/")) {
      setMessage({
        text: "Video is too large for Vercel API proxy limits. Set NEXT_PUBLIC_CCTV_BACKEND_URL to your Railway backend URL for direct upload.",
        type: "error",
      });
      return;
    }

    setMessage({ text: "", type: "" });
    setExtractedFaces([]);
    setAnalytics(null);
    setIsProcessing(true);

    const formData = new FormData();
    formData.append("video", videoFile);

    try {
      const res = await fetch(`${BACKEND_URL}/process-video`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setMessage({ text: "Processing started!", type: "success" });
        await fetchTrackerStatus();
        await fetchAnalytics();
      } else {
        const raw = await res.text();
        let err: any = {};
        try {
          err = raw ? JSON.parse(raw) : {};
        } catch {
          err = { detail: raw };
        }
        const detail =
          err?.detail ||
          err?.error ||
          (res.status === 413 || /request entity too large|function_payload_too_large/i.test(raw)
            ? "Upload is too large for the current endpoint. Use direct Railway backend URL and/or smaller video."
            : "Failed to start");
        setMessage({ text: detail, type: "error" });
        setIsProcessing(false);
      }
    } catch {
      setMessage({ text: "Failed to connect to backend", type: "error" });
      setIsProcessing(false);
    }
  };

  const handleStopProcessing = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/stop-processing`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setIsProcessing(false);
        setMessage({ 
          text: `Done! ${data.confirmed_students?.length || 0} students confirmed.`, 
          type: "success" 
        });
        await fetchTrackerStatus();
        await fetchExtractedFaces();
      }
    } catch {
      setMessage({ text: "Failed to stop", type: "error" });
    }
  };

  const handleReloadEmbeddings = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/reload-embeddings`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setMessage({ text: `Loaded ${data.embeddings_loaded} embeddings`, type: "success" });
        await checkBackendStatus();
        await fetchKnownFaces();
      }
    } catch {
      setMessage({ text: "Failed to reload", type: "error" });
    }
  };

  const handleClear = async () => {
    try {
      await fetch(`${BACKEND_URL}/clear-extracted-faces`, { method: "POST" });
      await fetch(`${BACKEND_URL}/clear-attendance`, { method: "POST" });
      setExtractedFaces([]);
      setAnalytics(null);
      setMessage({ text: "Cleared", type: "success" });
    } catch {
      setMessage({ text: "Failed to clear", type: "error" });
    }
  };

  // Count matches and non-matches
  const matchCount = extractedFaces.filter(f => f.is_match).length;
  const unknownCount = extractedFaces.filter(f => !f.is_match).length;
  const confirmedCount = trackerStatus?.confirmed_students?.length || 0;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <TeacherTopBar />
      
      <div className="flex-1 p-4 overflow-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-800">Video Face Recognition</h1>
          <p className="text-sm text-gray-600">
            Upload video → Extract faces → Match against database → Confirm attendance
          </p>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-3 p-2 rounded text-sm ${
            message.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
          }`}>
            {message.text}
          </div>
        )}

        {/* Controls Row */}
        <div className="bg-white rounded-lg p-3 shadow-sm mb-4 flex flex-wrap gap-3 items-center">
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoSelect}
            className="hidden"
          />
          
          <button
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
          >
            <Upload className="w-4 h-4" />
            {videoFile ? videoFile.name.slice(0, 20) + "..." : "Select Video"}
          </button>

          {!isProcessing ? (
            <button
              onClick={handleStartProcessing}
              disabled={!videoFile || !backendReady}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          ) : (
            <button
              onClick={handleStopProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          )}

          <button
            onClick={handleClear}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm"
          >
            Clear
          </button>

          <button
            onClick={handleReloadEmbeddings}
            className="flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm"
          >
            <RefreshCw className="w-3 h-3" />
            Reload DB
          </button>

          <div className="ml-auto flex gap-4 text-sm">
            <span className={`px-2 py-1 rounded ${backendReady ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {backendReady ? "Backend ✓" : "Backend ✗"}
            </span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
              {debugInfo?.embeddings_loaded || 0} embeddings
            </span>
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
              Threshold: {debugInfo?.threshold || 0.4}
            </span>
          </div>
        </div>

        {/* Uploaded Video Preview */}
        {videoPreviewUrl && (
          <div className="bg-white rounded-lg p-3 shadow-sm mb-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">Uploaded Video Preview</h3>
                <p className="text-xs text-gray-500 truncate max-w-[70vw]">
                  {videoFile?.name || "Selected video"}
                </p>
              </div>
              {isProcessing && (
                <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                  Playing while processing
                </span>
              )}
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePlayPreview}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-semibold"
              >
                <Play className="w-3 h-3" />
                Play Preview
              </button>
              <span className="text-xs text-gray-500">
                Preview runs locally in your browser; attendance processing continues separately.
              </span>
            </div>
            {videoPreviewError && (
              <div className="mb-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {videoPreviewError}
              </div>
            )}
            <video
              key={videoPreviewUrl}
              ref={videoPreviewRef}
              src={videoPreviewUrl}
              controls
              autoPlay={isProcessing}
              muted={isProcessing}
              playsInline
              preload="auto"
              onCanPlay={() => {
                setVideoPreviewError("");
                if (isProcessing) {
                  void handlePlayPreview();
                }
              }}
              onError={() => {
                setVideoPreviewError(
                  "Video preview is not playable in this browser. Use MP4/H.264 or WebM for preview playback; backend processing may still work."
                );
              }}
              className="w-full max-h-[320px] rounded-lg bg-black object-contain"
            />
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Known Faces Database - Left Column */}
          <div className="bg-white rounded-lg shadow-sm p-3">
            <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2 text-sm">
              <Database className="w-4 h-4" />
              Known Face Database ({knownFaces.length})
            </h3>
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {knownFaces.length > 0 ? (
                knownFaces.map((face) => (
                  <div key={face.student_id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    {face.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={face.image_url} 
                        alt={face.name}
                        className="w-10 h-10 rounded object-cover"
                        onError={(e) => {
                          // Fallback to initials on error
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-10 h-10 bg-blue-200 rounded flex items-center justify-center text-blue-700 font-bold text-xs ${face.image_url ? 'hidden' : ''}`}>
                      {face.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{face.name}</div>
                      <div className="text-xs text-gray-500">{face.num_samples} sample(s)</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-400 italic">No faces in database</div>
              )}
            </div>
          </div>

          {/* Extracted Faces Grid - Right Columns */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow-sm p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2 text-sm">
                <Users className="w-4 h-4" />
                Extracted Faces from Video
                {isProcessing && (
                  <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </h3>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1 text-green-600">
                  <Check className="w-3 h-3" /> Matched: {matchCount}
                </span>
                <span className="flex items-center gap-1 text-red-600">
                  <X className="w-3 h-3" /> Unknown: {unknownCount}
                </span>
                <span className="flex items-center gap-1 text-blue-600">
                  ✓ Confirmed: {confirmedCount}
                </span>
              </div>
            </div>

            {/* Face Grid */}
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1 max-h-[calc(100vh-320px)] overflow-y-auto">
              {extractedFaces.length > 0 ? (
                extractedFaces.map((face) => (
                  <div 
                    key={face.id} 
                    className={`relative aspect-square rounded overflow-hidden border-2 ${
                      face.confirmed 
                        ? "border-blue-500" 
                        : face.is_match 
                          ? "border-green-500" 
                          : "border-red-500"
                    }`}
                    title={`${face.name} (${(face.score * 100).toFixed(0)}%)`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:image/jpeg;base64,${face.image_b64}`}
                      alt={face.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Status indicator overlay */}
                    <div className={`absolute bottom-0 right-0 p-0.5 ${
                      face.confirmed 
                        ? "bg-blue-500" 
                        : face.is_match 
                          ? "bg-green-500" 
                          : "bg-red-500"
                    }`}>
                      {face.confirmed ? (
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      ) : face.is_match ? (
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      ) : (
                        <X className="w-3 h-3 text-white" strokeWidth={3} />
                      )}
                    </div>
                    {/* Name overlay for matched faces */}
                    {face.is_match && (
                      <div className="absolute top-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1 truncate">
                        {face.name}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-gray-400 text-sm">
                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                      <span>Processing video, detecting faces...</span>
                    </div>
                  ) : (
                    <span>Upload a video and click Start to extract faces</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tracker Status Panel */}
        {trackerStatus && (
          <div className="mt-4 bg-white rounded-lg shadow-sm p-3">
            <h3 className="font-semibold text-gray-700 mb-2 text-sm">Attendance Confirmation Status</h3>
            <div className="flex flex-wrap gap-2">
              {trackerStatus.confirmed_students.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-green-700">Confirmed: </span>
                  {trackerStatus.confirmed_students.map((id) => {
                    const known = knownFaces.find(f => f.student_id === id);
                    return (
                      <span key={id} className="bg-green-100 text-green-700 px-2 py-0.5 rounded mr-1">
                        {known?.name || id}
                      </span>
                    );
                  })}
                </div>
              )}
              {Object.keys(trackerStatus.pending_students).length > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-yellow-700">Pending: </span>
                  {Object.entries(trackerStatus.pending_students).map(([id, count]) => {
                    const known = knownFaces.find(f => f.student_id === id);
                    return (
                      <span key={id} className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded mr-1">
                        {known?.name || id} ({count}/{trackerStatus.config.min_confirmations})
                      </span>
                    );
                  })}
                </div>
              )}
              {trackerStatus.config && (
                <div className="ml-auto text-xs text-gray-500">
                  Window: {trackerStatus.config.window_size} frames | 
                  Min: {trackerStatus.config.min_confirmations} | 
                  Threshold: {trackerStatus.config.threshold}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Panel */}
        {analytics && (analytics.total_frames > 0 || analytics.faces_detected > 0) && (
          <div className="mt-4 bg-white rounded-lg shadow-sm p-3">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Video Analytics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {/* Video Info */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500">Total Frames</div>
                <div className="text-lg font-bold text-gray-800">{analytics.total_frames}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500">Processed</div>
                <div className="text-lg font-bold text-blue-600">
                  {analytics.processed_frames}
                  <span className="text-xs font-normal text-gray-500 ml-1">
                    ({analytics.total_frames > 0 ? ((analytics.processed_frames / analytics.total_frames) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500">FPS / Duration</div>
                <div className="text-lg font-bold text-gray-800">
                  {analytics.fps.toFixed(1)}
                  <span className="text-xs font-normal text-gray-500 ml-1">
                    / {analytics.video_duration.toFixed(1)}s
                  </span>
                </div>
              </div>
              
              {/* Face Detection */}
              <div className="bg-green-50 rounded-lg p-2">
                <div className="text-xs text-green-600">Faces Detected</div>
                <div className="text-lg font-bold text-green-700">{analytics.faces_detected}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-2">
                <div className="text-xs text-blue-600">Matched Faces</div>
                <div className="text-lg font-bold text-blue-700">
                  {analytics.matched_faces}
                  <span className="text-xs font-normal text-blue-500 ml-1">
                    ({analytics.match_rate.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-2">
                <div className="text-xs text-red-600">Unknown Faces</div>
                <div className="text-lg font-bold text-red-700">{analytics.unknown_faces}</div>
              </div>
              
              {/* Score Stats */}
              {analytics.score_stats.count > 0 && (
                <>
                  <div className="bg-purple-50 rounded-lg p-2 col-span-2">
                    <div className="text-xs text-purple-600">Similarity Scores (min / avg / max)</div>
                    <div className="text-lg font-bold text-purple-700">
                      {(analytics.score_stats.min * 100).toFixed(0)}% / 
                      <span className="text-purple-900"> {(analytics.score_stats.avg * 100).toFixed(0)}% </span>/ 
                      {(analytics.score_stats.max * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-2">
                    <div className="text-xs text-yellow-600">Comparisons</div>
                    <div className="text-lg font-bold text-yellow-700">{analytics.score_stats.count}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-xs text-gray-500">Processing Time</div>
                    <div className="text-lg font-bold text-gray-700">{analytics.processing_time.toFixed(1)}s</div>
                  </div>
                </>
              )}
            </div>
            
            {/* Progress Bar */}
            {analytics.is_processing && analytics.total_frames > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Processing Progress</span>
                  <span>{analytics.current_frame} / {analytics.total_frames}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(analytics.current_frame / analytics.total_frames) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
          <strong>How it works:</strong> Green border = face matches a student in the database. 
          Blue border = attendance confirmed (detected {debugInfo?.multiframe_config?.min_confirmations || 5}+ times). 
          Red border = unknown face.
        </div>
      </div>
    </div>
  );
}
