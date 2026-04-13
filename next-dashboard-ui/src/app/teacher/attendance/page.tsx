"use client";

import { Suspense, useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import TeacherTopBar from "@/app/components/TeacherTopBar";
import { Upload, Camera, Database, Send } from "lucide-react";
import { getClientCctvBackendUrl } from "@/lib/clientConfig";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "next/navigation";

type AttendanceStatus = "present" | "absent" | "late";

interface ClassStudent {
  id: string;
  name: string;
  rollNo?: string;
}

interface TeacherClass {
  _id: string;
  classId?: string;
  name: string;
  grade?: string;
  academicYear: string;
  studentCount: number;
  subjects?: string[];
  students: ClassStudent[];
}

interface BrowserFrameDetection {
  bbox: [number, number, number, number];
  name: string;
  student_name?: string;
  student_id?: string | null;
  score?: number;
  confirmed?: boolean;
}

interface StudentDetailsData {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  rollNo?: string;
  className?: string;
  classId?: string;
  grade?: string;
  academicYear?: string;
  bloodGroup?: string;
  sex?: string;
  birthday?: string | null;
  address?: string;
}

const CCTV_BACKEND_URL = getClientCctvBackendUrl();

function AttendancePageContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const currentYear = String(new Date().getFullYear());
  const preselectedClassId = searchParams.get("classId") || "";
  const preselectedAcademicYear = searchParams.get("academicYear") || "";

  const [academicYear, setAcademicYear] = useState(currentYear);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"manual" | "cctv" | "upload">("manual");
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [studentLoadError, setStudentLoadError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [studentImageCounts, setStudentImageCounts] = useState<Record<string, number>>({});
  const [cameraActive, setCameraActive] = useState(false);
  const [atd, setAtd] = useState<AttendanceRecord[]>([]);
  const [cctvMode, setCctvMode] = useState<"live" | "upload">("live");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [studentRecognitionCount, setStudentRecognitionCount] = useState<Record<string, number>>({});
  const [presentStudents, setPresentStudents] = useState<Set<string>>(new Set());
  const [liveConfirmationMessage, setLiveConfirmationMessage] = useState("");
  const [acknowledgedOtherClassIds, setAcknowledgedOtherClassIds] = useState<Set<string>>(new Set());
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const browserStreamRef = useRef<MediaStream | null>(null);
  const browserCaptureIntervalRef = useRef<number | null>(null);
  const browserCaptureInFlightRef = useRef(false);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [detections, setDetections] = useState<any[]>([]);
  const detectionsRef = useRef<any[]>([]);
  const smoothedBoxesRef = useRef<
    Record<
      string,
      {
        x: number;
        y: number;
        width: number;
        height: number;
        targetX: number;
        targetY: number;
        targetWidth: number;
        targetHeight: number;
        name: string;
        lastSeenAt: number;
      }
    >
  >({});
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string>("");
  const [extractedFaces, setExtractedFaces] = useState<ExtractedFace[]>([]);
  const [detectedNamesById, setDetectedNamesById] = useState<Record<string, string>>({});
  const [liveOverlayDetections, setLiveOverlayDetections] = useState<BrowserFrameDetection[]>([]);
  const [liveFrameSize, setLiveFrameSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [bulkImportMode, setBulkImportMode] = useState(false);
  const [bulkImportProgress, setBulkImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [exportDate, setExportDate] = useState(new Date().toISOString().split("T")[0]);
  const [exportMonth, setExportMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [exportYear, setExportYear] = useState(String(new Date().getFullYear()));
  const [knownStudentNamesById, setKnownStudentNamesById] = useState<Record<string, string>>({});
  const [attendanceOverrides, setAttendanceOverrides] = useState<Record<string, AttendanceStatus>>({});
  const [studentDetailsId, setStudentDetailsId] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<StudentDetailsData | null>(null);
  const [studentDetailsLoading, setStudentDetailsLoading] = useState(false);
  const [studentDetailsError, setStudentDetailsError] = useState("");
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const seenAttendanceIds = useRef<Set<string>>(new Set());
  const confirmedPresenceIdsRef = useRef<Set<string>>(new Set());
  const confirmationTimeoutRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!preselectedAcademicYear) return;
    setAcademicYear(preselectedAcademicYear);
  }, [preselectedAcademicYear]);

  useEffect(() => {
    const loadKnownStudents = async () => {
      try {
        const response = await fetch("/api/attendance/students", { cache: "no-store" });
        if (!response.ok) return;

        const data = await response.json();
        if (!Array.isArray(data)) return;

        const nextMap: Record<string, string> = {};
        data.forEach((item: any) => {
          const id = String(item?._id || "");
          const name = String(item?.name || "").trim();
          if (id && name) {
            nextMap[id] = name;
          }
        });

        setKnownStudentNamesById(nextMap);
      } catch {
        // Keep UI functional even if this helper lookup fails.
      }
    };

    void loadKnownStudents();
  }, []);

  useEffect(() => {
    detectionsRef.current = detections;
  }, [detections]);

  const clearLiveConfirmation = () => {
    if (confirmationTimeoutRef.current !== null) {
      window.clearTimeout(confirmationTimeoutRef.current);
      confirmationTimeoutRef.current = null;
    }
    setLiveConfirmationMessage("");
  };

  const resetLiveConfirmationState = () => {
    clearLiveConfirmation();
    confirmedPresenceIdsRef.current.clear();
  };

  const playPresenceConfirmationTone = async () => {
    if (typeof window === "undefined") return;
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextCtor();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      masterGain.connect(ctx.destination);

      const toneA = ctx.createOscillator();
      toneA.type = "sine";
      toneA.frequency.setValueAtTime(784, now);
      toneA.connect(masterGain);
      toneA.start(now);
      toneA.stop(now + 0.18);

      const toneB = ctx.createOscillator();
      toneB.type = "sine";
      toneB.frequency.setValueAtTime(1046, now + 0.2);
      toneB.connect(masterGain);
      toneB.start(now + 0.2);
      toneB.stop(now + 0.42);
    } catch (error) {
      console.warn("Could not play attendance confirmation tone:", error);
    }
  };

  const unlockPresenceAudio = async () => {
    if (typeof window === "undefined") return;
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextCtor();
      }
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }
    } catch (error) {
      console.warn("Unable to unlock confirmation audio:", error);
    }
  };

  const parseApiResponse = async (response: Response) => {
    const rawBody = await response.text();
    const trimmed = rawBody.trim();
    let data: any = {};

    if (trimmed) {
      try {
        data = JSON.parse(trimmed);
      } catch {
        data = { detail: trimmed };
      }
    }

    return {
      data,
      looksLikeHtml: /<!doctype|<html/i.test(trimmed),
    };
  };

  const classStudentIdSet = useMemo(() => new Set(students.map((student) => String(student._id))), [students]);

  const otherClassRecognized = useMemo(() => {
    return Object.entries(studentRecognitionCount)
      .filter(([studentId, count]) => count >= 3 && !classStudentIdSet.has(String(studentId)))
      .map(([studentId, count]) => ({
        studentId,
        count,
        name: detectedNamesById[studentId] || knownStudentNamesById[studentId] || studentId,
      }));
  }, [studentRecognitionCount, classStudentIdSet, detectedNamesById, knownStudentNamesById]);

  const resolveStudentName = (studentId: string, fallbackName?: string) => {
    const classStudent = students.find((student) => String(student._id) === String(studentId));
    if (classStudent?.name) return classStudent.name;
    if (detectedNamesById[studentId]) return detectedNamesById[studentId];
    if (knownStudentNamesById[studentId]) return knownStudentNamesById[studentId];
    if (fallbackName && fallbackName !== studentId) return fallbackName;
    return studentId;
  };

  const getEffectiveAttendanceStatus = (studentId: string): AttendanceStatus => {
    const override = attendanceOverrides[studentId];
    if (override) return override;
    return presentStudents.has(studentId) ? "present" : "absent";
  };

  const setAttendanceOverride = (studentId: string, status: AttendanceStatus) => {
    setAttendanceOverrides((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const applyDetectionSnapshot = (rawDetections: any[]) => {
    const detectionsArray = Array.isArray(rawDetections)
      ? rawDetections
      : Array.isArray((rawDetections as any)?.detections)
      ? (rawDetections as any).detections
      : [];

    setDetections(detectionsArray);
    setAtd(detectionsArray as AttendanceRecord[]);

    const names: Record<string, string> = {};
    const counts: Record<string, number> = {};

    detectionsArray.forEach((detection: any) => {
      const sid = String(detection?.student_id || "");
      const label = String(detection?.student_name || detection?.name || "").trim();
      if (sid) {
        counts[sid] = (counts[sid] || 0) + 1;
        if (label && label !== "Unknown" && label !== "Spoof") {
          names[sid] = label;
        }
      }
    });

    if (Object.keys(names).length > 0) {
      setDetectedNamesById((prev) => ({ ...prev, ...names }));
    }

    setStudentRecognitionCount(counts);
    setPresentStudents(
      new Set(
        Object.entries(counts)
          .filter(([, count]) => count >= 3)
          .map(([sid]) => sid)
      )
    );
  };

  const openStudentDetails = async (studentId: string) => {
    setStudentDetailsId(studentId);
    setStudentDetailsLoading(true);
    setStudentDetailsError("");

    try {
      if (!user?.id) {
        throw new Error("Teacher account not found");
      }

      const response = await fetch(
        `/api/teacher/students/${encodeURIComponent(studentId)}?teacherId=${encodeURIComponent(user.id)}&academicYear=${encodeURIComponent(academicYear)}`,
        { cache: "no-store" }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to load student details");
      }

      setStudentDetails(data?.student || null);
    } catch (error: any) {
      setStudentDetails(null);
      setStudentDetailsError(error?.message || "Unable to load student details");
    } finally {
      setStudentDetailsLoading(false);
    }
  };

  const closeStudentDetails = () => {
    setStudentDetailsId(null);
    setStudentDetails(null);
    setStudentDetailsError("");
    setStudentDetailsLoading(false);
  };

  useEffect(() => {
    const liveModeActive = cctvMode === "live" && cameraActive;
    const uploadModeActive = cctvMode === "upload" && isVideoProcessing;
    if (!liveModeActive && !uploadModeActive) return;

    const newlyConfirmedIds = Array.from(presentStudents).filter(
      (studentId) => !confirmedPresenceIdsRef.current.has(studentId)
    );

    if (newlyConfirmedIds.length === 0) return;

    newlyConfirmedIds.forEach((studentId) => confirmedPresenceIdsRef.current.add(studentId));
    const studentId = newlyConfirmedIds[0];
    const student = students.find((s) => s._id === studentId);
    const displayName = student?.name || detectedNamesById[studentId] || "Student";

    setLiveConfirmationMessage(`${displayName} marked present`);
    void playPresenceConfirmationTone();

    if (confirmationTimeoutRef.current !== null) {
      window.clearTimeout(confirmationTimeoutRef.current);
    }
    confirmationTimeoutRef.current = window.setTimeout(() => {
      setLiveConfirmationMessage("");
      confirmationTimeoutRef.current = null;
    }, 2400);
  }, [presentStudents, cameraActive, cctvMode, isVideoProcessing, students, detectedNamesById]);

  useEffect(() => {
    return () => {
      clearLiveConfirmation();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  // Load classes assigned to current teacher
  useEffect(() => {
    if (authLoading) return;

    if (!user?.id) {
      setClassesLoading(false);
      setClassesError("Could not identify teacher account");
      return;
    }

    const loadClasses = async () => {
      try {
        setClassesLoading(true);
        setClassesError("");

        const response = await fetch(
          `/api/teacher/classes?teacherId=${encodeURIComponent(user.id)}&academicYear=${encodeURIComponent(academicYear)}`,
          { cache: "no-store" }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load classes");
        }

        const classList = Array.isArray(data) ? data : [];
        setTeacherClasses(classList);

        if (preselectedClassId && classList.some((cls: TeacherClass) => cls._id === preselectedClassId)) {
          setSelectedClassId(preselectedClassId);
        } else if (classList.length === 1) {
          setSelectedClassId(classList[0]._id);
        } else if (!classList.some((cls: TeacherClass) => cls._id === selectedClassId)) {
          setSelectedClassId("");
        }
      } catch (err: any) {
        setTeacherClasses([]);
        setClassesError(err?.message || "Failed to load classes");
      } finally {
        setClassesLoading(false);
      }
    };

    loadClasses();
  }, [user?.id, authLoading, academicYear, preselectedClassId]);

  // Load selected class students into attendance workspace
  useEffect(() => {
    const selectedClass = teacherClasses.find((classDoc) => classDoc._id === selectedClassId);

    if (!selectedClass) {
      setStudents([]);
      setAttendance({});
      return;
    }

    const classStudents = (selectedClass.students || []).map((student) => ({
      _id: student.id,
      name: student.name,
      roll: student.rollNo || "-",
      grade: selectedClass.grade || "-",
      classId: selectedClass._id,
      className: selectedClass.name,
    }));

    setStudentLoadError("");
    setStudents(classStudents);
    setAttendanceOverrides({});

    const initialAttendance: Record<string, AttendanceStatus> = {};
    classStudents.forEach((student) => {
      initialAttendance[student._id] = "present";
    });
    setAttendance(initialAttendance);
  }, [selectedClassId, teacherClasses]);

  // Handle camera active state - fetch live detection data from Python backend
  useEffect(() => {
    let interval: NodeJS.Timer;
    if (cameraActive && cctvMode === "live") {
      interval = setInterval(async () => {
        try {
          const [detRes, facesRes] = await Promise.all([
            fetch(`${CCTV_BACKEND_URL}/video-detections`, { method: "GET" }),
            fetch(`${CCTV_BACKEND_URL}/extracted-faces`, { method: "GET" }),
          ]);

          const detData = await detRes.json();
          const facesData = await facesRes.json();

          applyDetectionSnapshot(detData);

          if (Array.isArray(facesData?.faces)) {
            setExtractedFaces(facesData.faces);
          }
        } catch (err) {
          console.error("Error fetching live detections:", err);
        }
      }, 1000); // fetch every second
    }

    return () => {
      if (interval) clearInterval(interval as unknown as NodeJS.Timeout);
    };
  }, [cameraActive, cctvMode]);

  useEffect(() => {
    if (activeTab !== "cctv" && cameraActive) {
      void stopBrowserCamera();
    }
  }, [activeTab, cameraActive]);

  useEffect(() => {
    if (!cameraActive || cctvMode !== "live") return;

    const video = liveVideoRef.current;
    const stream = browserStreamRef.current;
    if (!video || !stream) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    void video.play().catch((error) => {
      console.error("Error starting browser video preview:", error);
    });
  }, [cameraActive, cctvMode]);

  // Handle video playback and detection overlay
  useEffect(() => {
    if (!videoElementRef.current || !canvasRef.current) return;

    const video = videoElementRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;

    const draw = () => {
      if (video.paused || video.ended || !isVideoProcessing) {
        rafId = 0;
        return;
      }

      if (video.videoWidth && video.videoHeight) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const now = performance.now();
        const rawDetections = Array.isArray(detectionsRef.current) ? detectionsRef.current : [];
        const parsedDetections = rawDetections
          .map((detection: any, index: number) => {
            let x = Number(detection?.x);
            let y = Number(detection?.y);
            let width = Number(detection?.width);
            let height = Number(detection?.height);

            if (Array.isArray(detection?.bbox) && detection.bbox.length === 4) {
              const [x1, y1, x2, y2] = detection.bbox;
              x = Number(x1);
              y = Number(y1);
              width = Number(x2) - Number(x1);
              height = Number(y2) - Number(y1);
            }

            if (
              !Number.isFinite(x) ||
              !Number.isFinite(y) ||
              !Number.isFinite(width) ||
              !Number.isFinite(height) ||
              width <= 0 ||
              height <= 0
            ) {
              return null;
            }

            const label = detection?.student_name || detection?.name || "Unknown";
            const key =
              String(detection?.track_id || detection?.student_id || detection?._id || "") ||
              `${label}-${index}`;

            return {
              key,
              x,
              y,
              width,
              height,
              label,
            };
          })
          .filter(Boolean) as Array<{ key: string; x: number; y: number; width: number; height: number; label: string }>;

        parsedDetections.forEach((detection) => {
          const existing = smoothedBoxesRef.current[detection.key];
          if (!existing) {
            smoothedBoxesRef.current[detection.key] = {
              x: detection.x,
              y: detection.y,
              width: detection.width,
              height: detection.height,
              targetX: detection.x,
              targetY: detection.y,
              targetWidth: detection.width,
              targetHeight: detection.height,
              name: detection.label,
              lastSeenAt: now,
            };
            return;
          }

          existing.targetX = detection.x;
          existing.targetY = detection.y;
          existing.targetWidth = detection.width;
          existing.targetHeight = detection.height;
          existing.name = detection.label;
          existing.lastSeenAt = now;
        });

        Object.entries(smoothedBoxesRef.current).forEach(([key, box]) => {
          if (now - box.lastSeenAt > 1500) {
            delete smoothedBoxesRef.current[key];
            return;
          }

          const smoothing = 0.24;
          box.x += (box.targetX - box.x) * smoothing;
          box.y += (box.targetY - box.y) * smoothing;
          box.width += (box.targetWidth - box.width) * smoothing;
          box.height += (box.targetHeight - box.height) * smoothing;

          ctx.lineWidth = 3;
          ctx.strokeStyle = "#16a34a";
          ctx.strokeRect(box.x, box.y, box.width, box.height);

          ctx.font = "bold 16px Arial";
          const text = box.name;
          const textWidth = ctx.measureText(text).width + 12;
          const textHeight = 22;
          const textY = Math.max(0, box.y - textHeight - 4);

          ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
          ctx.fillRect(box.x, textY, textWidth, textHeight);
          ctx.fillStyle = "#22c55e";
          ctx.fillText(text, box.x + 6, textY + 15);
        });
      }

      rafId = window.requestAnimationFrame(draw);
    };

    const startLoop = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(draw);
      }
    };

    const stopLoop = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    video.addEventListener("play", startLoop);
    video.addEventListener("pause", stopLoop);
    video.addEventListener("ended", stopLoop);

    if (!video.paused && isVideoProcessing) {
      startLoop();
    }

    return () => {
      stopLoop();
      video.removeEventListener("play", startLoop);
      video.removeEventListener("pause", stopLoop);
      video.removeEventListener("ended", stopLoop);
      smoothedBoxesRef.current = {};
    };
  }, [isVideoProcessing]);

  useEffect(() => {
    if (!cameraActive || cctvMode !== "live") {
      const canvas = liveCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    let animationFrameId = 0;

    const drawOverlay = () => {
      const video = liveVideoRef.current;
      const canvas = liveCanvasRef.current;
      const ctx = canvas?.getContext("2d");

      if (video && canvas && ctx) {
        const rect = video.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const sourceWidth = liveFrameSize.width || video.videoWidth || 1;
        const sourceHeight = liveFrameSize.height || video.videoHeight || 1;
        const containScale = Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight);
        const renderedWidth = sourceWidth * containScale;
        const renderedHeight = sourceHeight * containScale;
        const offsetX = (canvas.width - renderedWidth) / 2;
        const offsetY = (canvas.height - renderedHeight) / 2;

        liveOverlayDetections.forEach((detection) => {
          const [x1, y1, x2, y2] = detection.bbox;
          const drawX = offsetX + x1 * containScale;
          const drawY = offsetY + y1 * containScale;
          const drawWidth = (x2 - x1) * containScale;
          const drawHeight = (y2 - y1) * containScale;
          const label = detection.student_name || detection.name || "Unknown";
          const color = detection.name === "Spoof" ? "#ef4444" : detection.student_id ? "#16a34a" : "#f59e0b";

          ctx.lineWidth = 3;
          ctx.strokeStyle = color;
          ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);

          ctx.font = "bold 16px Arial";
          const textMetrics = ctx.measureText(label);
          const textWidth = textMetrics.width + 14;
          const textHeight = 24;
          const textY = Math.max(0, drawY - textHeight - 4);

          ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
          ctx.fillRect(drawX, textY, textWidth, textHeight);
          ctx.fillStyle = color;
          ctx.fillText(label, drawX + 7, textY + 17);
        });
      }

      animationFrameId = window.requestAnimationFrame(drawOverlay);
    };

    drawOverlay();

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [cameraActive, cctvMode, liveOverlayDetections, liveFrameSize]);

  // const [studentLoadError, setStudentLoadError] = useState<string>("");

  const stopBrowserCaptureLoop = () => {
    if (browserCaptureIntervalRef.current !== null) {
      window.clearInterval(browserCaptureIntervalRef.current);
      browserCaptureIntervalRef.current = null;
    }
    browserCaptureInFlightRef.current = false;
  };

  const stopBrowserPreviewStream = () => {
    const stream = browserStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      browserStreamRef.current = null;
    }

    if (liveVideoRef.current) {
      liveVideoRef.current.pause();
      liveVideoRef.current.srcObject = null;
    }
  };

  const captureBrowserFrame = async () => {
    if (!browserStreamRef.current || browserCaptureInFlightRef.current) return;

    const video = liveVideoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    browserCaptureInFlightRef.current = true;

    try {
      const captureCanvas = captureCanvasRef.current ?? document.createElement("canvas");
      captureCanvasRef.current = captureCanvas;

      const maxWidth = 960;
      let targetWidth = video.videoWidth;
      let targetHeight = video.videoHeight;

      if (targetWidth > maxWidth) {
        const ratio = maxWidth / targetWidth;
        targetWidth = maxWidth;
        targetHeight = Math.round(targetHeight * ratio);
      }

      captureCanvas.width = targetWidth;
      captureCanvas.height = targetHeight;

      const ctx = captureCanvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not create a capture canvas.");
      }

      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

      const blob = await new Promise<Blob | null>((resolve) => {
        captureCanvas.toBlob(resolve, "image/jpeg", 0.82);
      });

      if (!blob) {
        throw new Error("Could not capture a browser camera frame.");
      }

      const formData = new FormData();
      formData.append("file", blob, "browser-frame.jpg");

      const response = await fetch(`${CCTV_BACKEND_URL}/process-browser-frame`, {
        method: "POST",
        body: formData,
      });

      const { data: result, looksLikeHtml } = await parseApiResponse(response);
      if (!response.ok || !result.success) {
        throw new Error(
          result?.error ||
            result?.detail ||
            (looksLikeHtml
              ? "Backend returned HTML instead of API JSON. Check NEXT_PUBLIC_CCTV_BACKEND_URL/PYTHON_BACKEND_URL."
              : "Failed to process browser camera frame.")
        );
      }

      setLiveOverlayDetections(Array.isArray(result.detections) ? result.detections : []);
      if (typeof result.frame_width === "number" && typeof result.frame_height === "number") {
        setLiveFrameSize({ width: result.frame_width, height: result.frame_height });
      }
    } catch (error) {
      console.error("Browser camera frame processing error:", error);
    } finally {
      browserCaptureInFlightRef.current = false;
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopBrowserCaptureLoop();
      stopBrowserPreviewStream();

      // Clear any lingering intervals/timeouts
      if ((window as any).processingInterval) {
        clearInterval((window as any).processingInterval);
      }
      if ((window as any).processingTimeout) {
        clearTimeout((window as any).processingTimeout);
      }
      
      // Stop processing if still active
      if (isVideoProcessing) {
        fetch(`${CCTV_BACKEND_URL}/stop-processing`, { method: "POST" }).catch(err => 
          console.error("Error stopping processing on unmount:", err)
        );
      }
    };
  }, [isVideoProcessing]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleBulkFacialImport = async (files: FileList) => {
    if (!files || files.length === 0) return;

    setLoading(true);
    setMessage("");
    setBulkImportProgress({ current: 0, total: 0 });

    try {
      // Group files by the immediate parent folder (student folder)
      const filesByStudent: Record<string, File[]> = {};
      const imageExt = /\.(jpg|jpeg|png|webp)$/i;

      const normalize = (value: string) =>
        value
          .toLowerCase()
          .replace(/[_-]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      // Process all files
      Array.from(files).forEach((file) => {
        const rawPath = ((file as any).webkitRelativePath || file.name) as string;
        const filePath = rawPath.replace(/\\/g, "/");

        // Only import image files for embeddings.
        if (!imageExt.test(file.name)) {
          return;
        }

        const pathParts = filePath.split("/").filter(Boolean);
        if (pathParts.length < 2) {
          // Not inside a folder; skip in bulk mode.
          return;
        }

        // Works for both structures:
        // - Student/photo.jpg
        // - MainFolder/Student/photo.jpg
        const studentFolder = pathParts[pathParts.length - 2];
        if (!filesByStudent[studentFolder]) {
          filesByStudent[studentFolder] = [];
        }
        filesByStudent[studentFolder].push(file);
      });

      const groupEntries = Object.entries(filesByStudent);
      if (groupEntries.length === 0) {
        setMessage("❌ No valid student folders/images found. Select a parent folder that contains student subfolders.");
        setBulkImportProgress(null);
        return;
      }

      setBulkImportProgress({ current: 0, total: groupEntries.length });

      let uploadedCount = 0;
      const results: { studentName: string; status: 'success' | 'error'; message: string }[] = [];

      // Upload files for each student folder
      for (const [studentFolder, folderFiles] of groupEntries) {
        try {
          const folderNorm = normalize(studentFolder);

          // Find student by exact id/name first, then normalized name match.
          const student = students.find(
            (s) =>
              s._id === studentFolder ||
              s.name === studentFolder ||
              normalize(String(s.name || "")) === folderNorm
          );

          if (!student) {
            results.push({
              studentName: studentFolder,
              status: 'error',
              message: 'Student not found (folder name/id does not match)',
            });
            setBulkImportProgress((prev) => prev ? { ...prev, current: prev.current + 1 } : null);
            continue;
          }

          // Upload using existing function
          await new Promise<void>((resolve) => {
            (async () => {
              try {
                const formData = new FormData();
                formData.append('studentId', student._id);
                folderFiles.forEach((file) => {
                  formData.append('files', file);
                });

                const response = await fetch('/api/attendance/facial-upload', {
                  method: 'POST',
                  body: formData,
                });

                const result = await response.json();

                if (response.ok) {
                  uploadedCount += folderFiles.length;
                  results.push({
                    studentName: student.name,
                    status: 'success',
                    message: `Uploaded ${folderFiles.length} images (${result.embeddingsCreated || result.uploadedCount} embeddings)`,
                  });
                  
                  // Update student image count
                  setStudentImageCounts((prev) => ({
                    ...prev,
                    [student._id]: result.embeddingsCreated || result.uploadedCount,
                  }));
                } else {
                  results.push({
                    studentName: student.name,
                    status: 'error',
                    message: result.error || 'Upload failed',
                  });
                }
              } catch (err) {
                results.push({
                  studentName: student.name,
                  status: 'error',
                  message: String(err),
                });
              }
              
              setBulkImportProgress((prev) => prev ? { ...prev, current: prev.current + 1 } : null);
              resolve();
            })();
          });
        } catch (err) {
          results.push({
            studentName: studentFolder,
            status: 'error',
            message: String(err),
          });
          setBulkImportProgress((prev) => prev ? { ...prev, current: prev.current + 1 } : null);
        }
      }

      // Reload embeddings
      try {
        const reloadRes = await fetch(`${CCTV_BACKEND_URL}/reload-embeddings`, {
          method: 'POST',
        });
        const reloadData = await reloadRes.json();
        console.log('✅ Backend embeddings reloaded:', reloadData);
      } catch (err) {
        console.error('⚠️ Error reloading embeddings:', err);
      }

      // Show results
      const successCount = results.filter((r) => r.status === 'success').length;
      const errorCount = results.filter((r) => r.status === 'error').length;
      const firstErrors = results.filter((r) => r.status === 'error').slice(0, 3);

      setMessage([`✅ Bulk import complete: ${successCount} successful, ${errorCount} failed (${uploadedCount} images)`,
        ...firstErrors.map((e) => `• ${e.studentName}: ${e.message}`)
      ].join("\n"));

      // Log results
      console.log('📊 Bulk Import Results:', results);

      setBulkImportProgress(null);
    } catch (error) {
      setMessage(`❌ Error: ${String(error)}`);
      setBulkImportProgress(null);
    } finally {
      setLoading(false);
    }
  };


  const handleBulkImageUpload = async (studentId: string, files: FileList) => {
    if (!files || files.length === 0) return;

    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("studentId", studentId);

      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const response = await fetch("/api/attendance/facial-upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✅ ${result.message}`);
        setStudentImageCounts((prev) => ({
          ...prev,
          [studentId]: result.embeddingsCreated || result.uploadedCount,
        }));
        setSelectedStudent("");
        
        // Reload embeddings from backend
        console.log("🔄 Reloading facial embeddings from backend...");
        try {
          const reloadRes = await fetch(`${CCTV_BACKEND_URL}/reload-embeddings`, {
            method: "POST",
          });
          const reloadData = await reloadRes.json();
          console.log("✅ Backend embeddings reloaded:", reloadData);
        } catch (err) {
          console.error("⚠️ Error reloading embeddings:", err);
        }
      } else {
        setMessage(`❌ Error: ${result.error || "Upload failed"}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadManualAttendanceForDay = async () => {
      if (!selectedClassId || students.length === 0) return;

      try {
        const response = await fetch(
          `/api/teacher/attendance/bulk?classId=${encodeURIComponent(selectedClassId)}&date=${encodeURIComponent(selectedDate)}`,
          { cache: "no-store" }
        );

        if (!response.ok) return;

        const result = await response.json();
        const rows = Array.isArray(result?.students) ? result.students : [];

        const statusByStudentId = new Map<string, AttendanceStatus>();
        rows.forEach((row: any) => {
          const sid = String(row?.studentId || "");
          const rawStatus = String(row?.status || "").toLowerCase();
          if (!sid) return;

          if (rawStatus === "present") statusByStudentId.set(sid, "present");
          else if (rawStatus === "absent") statusByStudentId.set(sid, "absent");
          else if (rawStatus === "late") statusByStudentId.set(sid, "late");
        });

        setAttendance((prev) => {
          const next: Record<string, AttendanceStatus> = {};
          students.forEach((student) => {
            const sid = String(student._id);
            next[sid] = statusByStudentId.get(sid) || prev[sid] || "present";
          });
          return next;
        });
      } catch (error) {
        console.error("Failed to load saved manual attendance:", error);
      }
    };

    void loadManualAttendanceForDay();
  }, [selectedClassId, selectedDate, students]);

  const submitAttendance = async () => {
    setLoading(true);
    setMessage("");

    try {
      const attendanceArray = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status,
      }));

      const response = await fetch("/api/teacher/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          classId: selectedClassId || undefined,
          teacherId: user?.id || undefined,
          source: "manual",
          attendance: attendanceArray,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✅ ${result.message}`);
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const syncCCTVAttendance = async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/attendance/cctv-sync?date=${selectedDate}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(
          `✅ Synced ${result.count} CCTV attendance records for ${selectedDate}`
        );
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

//temp

interface AttendanceRecord {
  _id?: string;
  name: string;
  student_id: string;
  timestamp: string;
  frame_num?: number;
}

interface ExtractedFace {
  id: string;
  image_b64: string;
  name: string;
  student_id?: string | null;
  is_match?: boolean;
  confirmed?: boolean;
  timestamp?: string;
}

interface CCTVTabProps {
  cctvFeedUrl: string; // initial feed URL (optional)
}


  // Start camera
  const startCamera = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${CCTV_BACKEND_URL}/start-camera`, {
        method: "POST",
      });
      const { data, looksLikeHtml } = await parseApiResponse(res);
      if (!res.ok || !data.success) {
        const detail =
          data?.error ||
          data?.detail ||
          (looksLikeHtml
            ? "Backend returned HTML instead of API JSON. Check NEXT_PUBLIC_CCTV_BACKEND_URL/PYTHON_BACKEND_URL."
            : "Failed to start camera");
        setMessage(`❌ Error: ${detail}`);
        setCameraActive(false);
        return;
      }
      setCameraActive(true);
      setMessage("✅ Live camera started");
    } catch (error) {
      setCameraActive(false);
      setMessage(`❌ Error: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // Stop camera
  const stopCamera = async () => {
    setLoading(true);
    // Turn off live polling immediately so local snapshot stays intact.
    setCameraActive(false);
    try {
      await fetch(`${CCTV_BACKEND_URL}/stop-camera`, {
        method: "POST",
      });
      setMessage("✅ Camera stopped");
    } catch (error) {
      setMessage(`❌ Error: ${String(error)}`);
    } finally {
      seenAttendanceIds.current.clear();
      setLoading(false);
    }
  };

  const startBrowserCamera = async () => {
    setLoading(true);
    setMessage("");
    try {
      await unlockPresenceAudio();

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser does not support camera access.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      browserStreamRef.current = stream;

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play().catch(() => undefined);
      }

      const response = await fetch(`${CCTV_BACKEND_URL}/start-browser-camera`, {
        method: "POST",
      });
      const { data: result, looksLikeHtml } = await parseApiResponse(response);

      if (!response.ok || !result.success) {
        stopBrowserPreviewStream();
        setCameraActive(false);
        const detail =
          result?.error ||
          result?.detail ||
          (looksLikeHtml
            ? "Backend returned HTML instead of API JSON. Check NEXT_PUBLIC_CCTV_BACKEND_URL/PYTHON_BACKEND_URL."
            : "Failed to start browser camera");
        setMessage(`âŒ Error: ${detail}`);
        return;
      }

      stopBrowserCaptureLoop();
      setLiveOverlayDetections([]);
      setLiveFrameSize({ width: 0, height: 0 });
      setDetections([]);
      setAtd([]);
      setStudentRecognitionCount({});
      setPresentStudents(new Set());
      setAcknowledgedOtherClassIds(new Set());
      resetLiveConfirmationState();
      seenAttendanceIds.current.clear();

      setCameraActive(true);
      browserCaptureIntervalRef.current = window.setInterval(() => {
        void captureBrowserFrame();
      }, 1200);
      await captureBrowserFrame();
      setMessage("âœ… Live camera started from this browser device");
    } catch (error) {
      stopBrowserCaptureLoop();
      stopBrowserPreviewStream();
      setCameraActive(false);
      setMessage(`âŒ Error: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const stopBrowserCamera = async () => {
    setLoading(true);
    // Turn off live polling immediately so local snapshot stays intact.
    setCameraActive(false);
    try {
      stopBrowserCaptureLoop();
      stopBrowserPreviewStream();
      await fetch(`${CCTV_BACKEND_URL}/stop-camera`, {
        method: "POST",
      });
      setLiveOverlayDetections([]);
      setLiveFrameSize({ width: 0, height: 0 });
      setAcknowledgedOtherClassIds(new Set());
      resetLiveConfirmationState();
      setMessage("âœ… Camera stopped");
    } catch (error) {
      setMessage(`âŒ Error: ${String(error)}`);
    } finally {
      seenAttendanceIds.current.clear();
      setLoading(false);
    }
  };

  // Stop video processing
  const stopProcessing = async () => {
    // Clear polling intervals first
    if ((window as any).processingInterval) {
      clearInterval((window as any).processingInterval);
      (window as any).processingInterval = null;
    }
    if ((window as any).processingTimeout) {
      clearTimeout((window as any).processingTimeout);
      (window as any).processingTimeout = null;
    }
    
    try {
      await fetch(`${CCTV_BACKEND_URL}/stop-processing`, {
        method: "POST",
      });
      console.log("Processing stopped");
    } catch (err) {
      console.error("Error stopping processing:", err);
    }
    
    setIsVideoProcessing(false);
    setProcessedVideoUrl("");
    // Keep results for teacher review after stopping.
    setVideoUrl("stopped");
    setMessage("✅ Processing stopped. Results are kept below until you clear them.");
  };

  // Handle video file upload
  const handleVideoUpload = async (file: File | null) => {
    if (!file) return;

    setLoading(true);
    setMessage("");
    setIsVideoProcessing(true);
    setVideoUrl("processing"); // Set to show processing interface

    try {
      await unlockPresenceAudio();

      const formData = new FormData();
      formData.append("video", file);

      const response = await fetch(`${CCTV_BACKEND_URL}/process-video`, {
        method: "POST",
        body: formData,
      });

      const rawBody = await response.text();
      let result: any = {};
      if (rawBody) {
        try {
          result = JSON.parse(rawBody);
        } catch {
          result = { detail: rawBody };
        }
      }

      if (response.ok) {
        await fetch(`${CCTV_BACKEND_URL}/clear-extracted-faces`, {
          method: "POST",
        }).catch(() => undefined);

        // Reset recognition tracking for new video
        setStudentRecognitionCount({});
        setPresentStudents(new Set());
        setExtractedFaces([]);
        setAcknowledgedOtherClassIds(new Set());
        resetLiveConfirmationState();
        
        setMessage(`✅ Video processing started. Displaying detections in real-time...`);
        
        // Point to the processed video stream from backend
        setProcessedVideoUrl(`${CCTV_BACKEND_URL}/video-stream-processed`);
        
        // Poll for detection results
        let lastDetectionCount = 0;
        
        const pollInterval = setInterval(async () => {
          try {
            const [detRes, facesRes] = await Promise.all([
              fetch(`${CCTV_BACKEND_URL}/video-detections`, { method: "GET" }),
              fetch(`${CCTV_BACKEND_URL}/extracted-faces`, { method: "GET" }),
            ]);
            const detData = await detRes.json();
            const facesData = await facesRes.json();
            if (Array.isArray(facesData?.faces)) {
              setExtractedFaces(facesData.faces);
            }
            
            // Extract detections array
            const detectionsArray = Array.isArray(detData) ? detData : (detData.detections || []);
            
            // Update if we have new detections
            if (detectionsArray.length > lastDetectionCount || detectionsArray.length > 0) {
              lastDetectionCount = detectionsArray.length;
              applyDetectionSnapshot(detectionsArray);

              const countsPreview: Record<string, number> = {};
              detectionsArray.forEach((detection: any) => {
                const sid = String(detection?.student_id || "");
                if (sid) countsPreview[sid] = (countsPreview[sid] || 0) + 1;
              });
              const presentCount = Object.values(countsPreview).filter((count) => count >= 3).length;
              console.log(`📊 Detections: ${detectionsArray.length}, Present: ${presentCount}`);
            }
          } catch (err) {
            console.error("Error fetching detections:", err);
          }
        }, 250);

        // Auto-stop after 5 minutes or when user stops it manually
        const timeout = setTimeout(() => {
          clearInterval(pollInterval);
          if (isVideoProcessing) {
            stopProcessing();
            setMessage("✅ Video processing completed!");
          }
        }, 5 * 60 * 1000);

        // Store interval ID for cleanup
        (window as any).processingInterval = pollInterval;
        (window as any).processingTimeout = timeout;
      } else {
        const payloadTooLarge =
          response.status === 413 || /request entity too large|payload too large/i.test(String(result?.detail || ""));
        const errorDetail =
          result?.error ||
          result?.detail ||
          (payloadTooLarge
            ? "Uploaded video is too large for the server upload limit. Try a shorter/lower-size video."
            : "Video processing failed");
        setMessage(`❌ Error: ${errorDetail}`);
        setIsVideoProcessing(false);
        setVideoUrl("");
      }
    } catch (error) {
      setMessage(`❌ Error: ${String(error)}`);
      setIsVideoProcessing(false);
      setVideoUrl("");
    } finally {
      setLoading(false);
    }
  };

  // Save Attendance snapshot (can just fetch current attendance)
  const saveAttendance = async () => {
    setLoading(true);
    setMessage("");
    try {
      const presentIds = Array.from(presentStudents);
      if (presentIds.length === 0) {
        setMessage("⚠️ No recognized present students to save yet.");
        return;
      }

      const classId = selectedClassId || undefined;

      const records = presentIds.map((studentId) => ({
        studentId,
        timestamp: new Date().toISOString(),
        status: "present" as const,
        source: "cctv" as const,
        remarks: "Live camera recognition",
      }));

      const response = await fetch("/api/attendance/cctv-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records,
          classId,
          date: selectedDate,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setMessage(`❌ Error: ${result.error || "Failed to save attendance"}`);
        return;
      }

      const failedRecords = Array.isArray(result.failedRecords) ? result.failedRecords : [];
      const failedPreview = failedRecords
        .slice(0, 3)
        .map((f: { studentId?: string; error?: string }) => `${f.studentId || "unknown"}: ${f.error || "failed"}`)
        .join(" | ");

      if ((result.synced || 0) === 0) {
        setMessage(
          `❌ Attendance save failed (0/${result.total || presentIds.length}). ${failedPreview || "Students may be missing class assignment."}`
        );
      } else if ((result.failed || 0) > 0) {
        setMessage(
          `⚠️ Attendance partially saved (${result.synced}/${result.total}). Failed: ${result.failed}. ${failedPreview}`
        );
      } else {
        setMessage(`✅ Attendance saved to database (${result.synced}/${result.total} records synced)`);
      }
    } catch (err) {
      console.error("Error saving attendance:", err);
      setMessage(`❌ Error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const saveVideoAttendanceToDatabase = async () => {
    if (!students.length) {
      setMessage("❌ No students available for this class.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const attendanceArray = students.map((student) => ({
        studentId: student._id,
        status:
          getEffectiveAttendanceStatus(student._id) === "late"
            ? "Late"
            : getEffectiveAttendanceStatus(student._id) === "present"
            ? "Present"
            : "Absent",
      }));

      const response = await fetch("/api/teacher/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          classId: selectedClassId || undefined,
          teacherId: user?.id || undefined,
          source: "cctv",
          attendance: attendanceArray,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setMessage(`❌ Error: ${result.error || "Failed to save video attendance"}`);
        return;
      }

      const presentCount = attendanceArray.filter((row) => row.status === "Present").length;

      const verifyRes = await fetch(
        `/api/teacher/attendance/bulk?classId=${encodeURIComponent(selectedClassId)}&date=${encodeURIComponent(selectedDate)}`,
        { method: "GET", cache: "no-store" }
      );

      const verifyData = await verifyRes.json();
      if (verifyRes.ok) {
        setMessage(
          `✅ Attendance saved and verified for ${selectedDate}. Present: ${presentCount}/${attendanceArray.length}. Database marked: ${verifyData.markedCount}/${verifyData.totalStudents}`
        );
      } else {
        setMessage(
          `✅ Attendance save completed for ${selectedDate} (${presentCount}/${attendanceArray.length} present), but verification failed: ${verifyData?.error || "Unknown error"}`
        );
      }
    } catch (error) {
      setMessage(`❌ Error: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  //temp shesh

  const tabButtonClass = (tab: string) =>
    `px-6 py-2 rounded-lg font-semibold transition ${
      activeTab === tab
        ? "bg-[#5a685a] text-white shadow-lg"
        : "text-slate-700 hover:bg-slate-100 border border-slate-200"
    }`;

  const downloadDailyReport = () => {
    const selectedClass = teacherClasses.find((c) => c._id === selectedClassId);
    const className = selectedClass?.name || selectedClass?.classId;
    if (!className) {
      setMessage("❌ Please select a class before exporting reports.");
      return;
    }
    const url = `${CCTV_BACKEND_URL}/export/daily?class=${encodeURIComponent(className)}&date=${encodeURIComponent(exportDate)}`;
    window.open(url, "_blank");
    setMessage(`✅ Daily report requested for ${className} on ${exportDate}`);
  };

  const downloadMonthlyReport = () => {
    const selectedClass = teacherClasses.find((c) => c._id === selectedClassId);
    const className = selectedClass?.name || selectedClass?.classId;
    if (!className) {
      setMessage("❌ Please select a class before exporting reports.");
      return;
    }
    const url = `${CCTV_BACKEND_URL}/export/monthly?class=${encodeURIComponent(className)}&month=${encodeURIComponent(exportMonth)}&year=${encodeURIComponent(exportYear)}`;
    window.open(url, "_blank");
    setMessage(`✅ Monthly report requested for ${className} (${exportYear}-${exportMonth})`);
  };

  return (
    <>
      <TeacherTopBar />

      <main className="teacher-attendance flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6 lg:p-10">
          {!selectedClassId ? (
            <div className="space-y-6">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-5xl font-black text-slate-900 mb-2">📋 Attendance Management</h1>
                  <p className="text-slate-600 text-lg">Select a class to start attendance.</p>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="attendance-year" className="text-sm font-semibold text-slate-600">
                    Academic Year
                  </label>
                  <select
                    id="attendance-year"
                    value={academicYear}
                    onChange={(event) => setAcademicYear(event.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {[String(Number(currentYear) - 2), String(Number(currentYear) - 1), currentYear, String(Number(currentYear) + 1)].map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {classesError && (
                <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">{classesError}</div>
              )}

              {classesLoading ? (
                <div className="text-center py-12 text-slate-500">Loading your assigned classes...</div>
              ) : teacherClasses.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl text-slate-500">
                  <div className="text-4xl mb-2">📚</div>
                  <p className="font-semibold">No classes assigned</p>
                  <p className="text-sm mt-1">No active class assignment found for {academicYear}.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {teacherClasses.map((classDoc) => (
                    <button
                      key={classDoc._id}
                      onClick={() => setSelectedClassId(classDoc._id)}
                      className="text-left border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all bg-white"
                    >
                      <div className="bg-indigo-600 px-5 py-4 text-white">
                        <div className="flex items-center justify-between">
                          <h2 className="text-2xl font-bold">{classDoc.name}</h2>
                          <span className="text-xs bg-white/20 px-2 py-1 rounded">{classDoc.classId || "Class"}</span>
                        </div>
                        <p className="text-indigo-100 text-sm mt-1">
                          Grade: {classDoc.grade || "-"} • Students: {classDoc.studentCount}
                        </p>
                        <p className="text-indigo-100 text-sm mt-1">
                          Subjects: {classDoc.subjects?.length ? classDoc.subjects.join(", ") : "No subject assigned"}
                        </p>
                      </div>
                      <div className="px-5 py-4 text-indigo-700 font-semibold">Open attendance for this class →</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => setSelectedClassId("")}
              className="mb-4 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
            >
              ← Back to My Classes
            </button>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-5xl font-black text-slate-900 mb-2">
                  📋 Attendance Management
                </h1>
                <p className="text-slate-600 text-lg">
                  {teacherClasses.find((classDoc) => classDoc._id === selectedClassId)?.name || "Selected Class"} • Manage attendance with manual entry, CCTV feed, and facial recognition
                </p>
              </div>

              <details className="relative">
                <summary className="list-none cursor-pointer px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-semibold select-none">
                  ☰ Reports
                </summary>
                <div className="absolute right-0 mt-2 w-[22rem] max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-20">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Actions</h3>

                  <Link
                    href="/teacher/video-attendance"
                    className="inline-flex items-center justify-center w-full mb-4 px-3 py-2 rounded-lg font-semibold transition text-slate-700 hover:bg-slate-100 border border-slate-200"
                  >
                    <Send size={16} className="inline mr-2" />
                    Analyze Video
                  </Link>

                  <div className="border-t border-slate-200 pt-3">
                    <h4 className="text-sm font-bold text-slate-900 mb-2">Attendance Excel Reports</h4>
                    <div className="space-y-2 mb-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Class</label>
                        <select
                          value={selectedClassId}
                          onChange={(e) => setSelectedClassId(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                        >
                          {teacherClasses.map((cls) => (
                            <option key={cls._id} value={cls._id}>{cls.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                        <input
                          type="date"
                          value={exportDate}
                          onChange={(e) => setExportDate(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Month</label>
                          <select
                            value={exportMonth}
                            onChange={(e) => setExportMonth(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                          >
                            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Year</label>
                          <input
                            type="number"
                            value={exportYear}
                            onChange={(e) => setExportYear(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={downloadDailyReport}
                        className="px-3 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition text-sm"
                      >
                        Download Daily
                      </button>
                      <button
                        onClick={downloadMonthlyReport}
                        className="px-3 py-2 rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-800 transition text-sm"
                      >
                        Download Monthly
                      </button>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <button onClick={() => setActiveTab("manual")} className={tabButtonClass("manual")}>
              ✏️ Manual Entry
            </button>
            <button onClick={() => setActiveTab("cctv")} className={tabButtonClass("cctv")}>
              <Camera size={16} className="inline mr-2" />
              CCTV Feed
            </button>
            <button onClick={() => setActiveTab("upload")} className={tabButtonClass("upload")}>
              <Upload size={16} className="inline mr-2" />
              Facial Data
            </button>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg font-semibold ${
                message.startsWith("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {message}
            </div>
          )}

          {/* Manual Entry Tab */}
          {activeTab === "manual" && (
            <div className="space-y-6">
              {/* Date Selector */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border-2 border-indigo-200 rounded-lg px-4 py-3 text-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Students Table */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-indigo-600 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold">Student Name</th>
                      <th className="px-6 py-4 text-left font-bold">Roll No</th>
                      <th className="px-6 py-4 text-left font-bold">Class</th>
                      <th className="px-6 py-4 text-center font-bold">Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => (
                      <tr key={student._id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {student.name}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{student.roll || "-"}</td>
                        <td className="px-6 py-4 text-slate-600">{student.grade || "-"}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleStatusChange(student._id, "present")}
                              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                                attendance[student._id] === "present"
                                  ? "bg-green-500 text-white shadow-lg scale-105"
                                  : "bg-gray-200 text-gray-600 hover:bg-green-200"
                              }`}
                            >
                              ✓ Present
                            </button>
                            <button
                              onClick={() => handleStatusChange(student._id, "absent")}
                              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                                attendance[student._id] === "absent"
                                  ? "bg-red-500 text-white shadow-lg scale-105"
                                  : "bg-gray-200 text-gray-600 hover:bg-red-200"
                              }`}
                            >
                              ✗ Absent
                            </button>
                            <button
                              onClick={() => handleStatusChange(student._id, "late")}
                              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                                attendance[student._id] === "late"
                                  ? "bg-yellow-500 text-white shadow-lg scale-105"
                                  : "bg-gray-200 text-gray-600 hover:bg-yellow-200"
                              }`}
                            >
                              ⏰ Late
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  onClick={submitAttendance}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send size={20} />
                  {loading ? "Saving..." : "💾 Save Attendance"}
                </button>
              </div>
            </div>
          )}

          {/* CCTV Feed Tab
          {activeTab === "cctv" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">
                  🎥 Live CCTV Feed with Face Recognition
                </h3>
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-4 border-4 border-slate-300">
                  <img
                    src={cctvFeedUrl}
                    alt="CCTV Feed"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23333' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='%23999' text-anchor='middle' dy='.3em'%3ECannot connect to feed%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>

                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-slate-700">
                    <strong>ℹ️ How it works:</strong> The CCTV analyzes real-time video,
                    identifies student faces, and logs their presence automatically.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={syncCCTVAttendance}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 shadow-lg transition-all"
                  >
                    <Database size={18} />
                    {loading ? "Syncing..." : "🔄 Sync CCTV Attendance"}
                  </button>
                </div>
              </div>
            </div>
          )} */}

          {activeTab === "cctv" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                🎥 Live CCTV Feed with Face Recognition!!!
              </h3>

              {/* CCTV Mode Selector */}
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={async () => {
                        if (cameraActive) {
                          await stopBrowserCamera();
                        }
                        setCctvMode("live");
                        setCameraActive(false);
                      }}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    cctvMode === "live"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  📹 Live Camera
                    </button>
                    <button
                      onClick={async () => {
                        if (cameraActive) {
                          await stopBrowserCamera();
                        }
                        setCctvMode("upload");
                      }}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${
                        cctvMode === "upload"
                          ? "bg-indigo-600 text-white"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  📤 Upload Video
                </button>
              </div>

              {/* Live Camera Mode */}
              {cctvMode === "live" && (
                <div className="space-y-4">
                  {/* Live Feed - Smaller Frame */}
                  <div className="relative bg-black rounded-lg overflow-hidden border-4 border-slate-300 w-full max-w-md mx-auto" style={{ aspectRatio: '4/3' }}>
                    {cameraActive ? (
                      <>
                        <video
                          ref={liveVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-contain bg-black"
                        />
                        <canvas
                          ref={liveCanvasRef}
                          className="absolute inset-0 w-full h-full pointer-events-none"
                        />
                        <div className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded-lg text-xs font-semibold">
                          {liveOverlayDetections.length} live detections
                        </div>
                        {liveConfirmationMessage && (
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-green-600/95 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg border border-green-300">
                            {liveConfirmationMessage}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium">
                        Camera is off. Start to use this device&apos;s browser camera.
                      </div>
                    )}
                  </div>

                  {/* Camera Controls */}
                  <div className="flex gap-2 flex-wrap justify-center">
                    <button
                      onClick={startBrowserCamera}
                      disabled={cameraActive}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      🎬 Start Camera
                    </button>

                    <button
                      onClick={stopBrowserCamera}
                      disabled={!cameraActive}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition"
                    >
                      ⏹ Stop Camera
                    </button>

                    <button
                      onClick={saveVideoAttendanceToDatabase}
                      disabled={loading || students.length === 0}
                      className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition"
                    >
                      <Database size={18} />
                      {loading ? "Saving..." : "💾 Save To Database"}
                    </button>

                    <button
                      onClick={() => {
                        setStudentRecognitionCount({});
                        setPresentStudents(new Set());
                        setAttendanceOverrides({});
                        setAcknowledgedOtherClassIds(new Set());
                        setAtd([]);
                        setDetections([]);
                        setDetectedNamesById({});
                        resetLiveConfirmationState();
                        seenAttendanceIds.current.clear();
                        setMessage("✅ Live recognition results cleared.");
                      }}
                      disabled={loading}
                      className="px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-800 disabled:opacity-50 transition"
                    >
                      🧹 Clear Results
                    </button>
                  </div>

                  {/* How it works info */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-slate-700">
                      <strong>ℹ️ How it works:</strong> The camera analyzes faces and logs attendance automatically. A student is marked present after 3 recognitions.
                      Results remain available after stopping the camera until you clear them.
                    </p>
                  </div>

                  {/* Recognition Status Panel */}
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg border-2 border-indigo-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-slate-900">👥 Recognition Status</h4>
                          <button
                            onClick={() => {
                              setStudentRecognitionCount({});
                              setPresentStudents(new Set());
                              setAcknowledgedOtherClassIds(new Set());
                              resetLiveConfirmationState();
                              setAtd([]);
                              seenAttendanceIds.current.clear();
                            }}
                            className="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 font-semibold transition"
                          >
                            🔄 Reset
                          </button>
                        </div>

                        {/* Present Students Summary */}
                        {presentStudents.size > 0 && (
                          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm font-bold text-green-800 mb-2">
                              ✅ Present ({presentStudents.size}):
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {Array.from(presentStudents).map((studentId) => {
                                const displayName = resolveStudentName(studentId);
                                return (
                                  <span
                                    key={studentId}
                                    className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-semibold"
                                  >
                                    {displayName}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* All Recognition Counts */}
                        {Object.keys(studentRecognitionCount).length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-600">📊 Recognition Count:</p>
                            <div className="max-h-48 overflow-y-auto space-y-1">
                              {Object.entries(studentRecognitionCount)
                                .sort(([, a], [, b]) => b - a)
                                .map(([studentId, count]) => {
                                  const isPresent = presentStudents.has(studentId);
                                  const displayName = resolveStudentName(studentId);
                                  return (
                                    <div
                                      key={studentId}
                                      className={`flex items-center justify-between text-xs p-2 rounded-lg transition ${
                                        isPresent
                                          ? "bg-green-100 border border-green-300"
                                          : "bg-slate-100 border border-slate-200"
                                      }`}
                                    >
                                      <span className="font-semibold text-slate-800">
                                        {displayName}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="bg-white px-2 py-1 rounded font-bold text-indigo-600">
                                          {count}
                                        </span>
                                        {isPresent && (
                                          <span className="text-lg">✅</span>
                                        )}
                                        {count >= 3 && count < 5 && (
                                          <span className="text-xs text-amber-600 font-bold">Mid</span>
                                        )}
                                        {count >= 5 && (
                                          <span className="text-xs text-red-600 font-bold">High</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">
                            Waiting for face recognitions... 👀
                          </p>
                        )}
                      </div>
                    </div>

                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-300 rounded-lg p-4">
                      <h5 className="font-bold text-slate-900 mb-3">🧩 Extracted Faces ({extractedFaces.length})</h5>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-64 overflow-y-auto">
                        {extractedFaces.slice().reverse().map((face) => (
                          <div
                            key={face.id}
                            className={`rounded-md border p-1 bg-white ${face.is_match ? "border-green-300" : "border-red-300"}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`data:image/jpeg;base64,${face.image_b64}`}
                              alt={face.name || "Face"}
                              className="w-full aspect-square object-cover rounded"
                            />
                            <p className="text-[10px] font-semibold text-slate-900 mt-1 truncate">{face.name || "Unknown"}</p>
                            <p className="text-[10px] text-slate-600 truncate">{face.student_id || "No ID"}</p>
                          </div>
                        ))}
                        {extractedFaces.length === 0 && (
                          <p className="text-xs text-slate-500 col-span-full text-center py-6">No extracted faces yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                        <h5 className="font-bold text-slate-900 mb-3">🎯 Detection Status ({detections.length})</h5>
                        <div className="max-h-56 overflow-y-auto space-y-2">
                          {detections.slice(-30).map((det, idx) => {
                            const student = students.find((s) => s._id === det.student_id);
                            const timeStr = det.timestamp ? new Date(det.timestamp).toLocaleTimeString() : "";
                            const displayName = det.student_name || student?.name || det.name || "Unknown";
                            return (
                              <div
                                key={`${det.student_id || "unknown"}-${idx}`}
                                className="p-2 bg-white rounded border border-blue-200 text-sm"
                              >
                                <p className="font-semibold text-slate-900">
                                  {displayName}{det.student_id ? ` (${det.student_id})` : ""}
                                </p>
                                <p className="text-xs text-slate-600">
                                  {det.frame_num ? `Frame: ${det.frame_num}` : timeStr}
                                </p>
                              </div>
                            );
                          })}
                          {detections.length === 0 && (
                            <p className="text-xs text-slate-500 text-center py-4">Waiting for detections...</p>
                          )}
                        </div>
                      </div>

                      <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                          <h5 className="font-bold text-slate-900">🧭 Other Class Recognized</h5>
                          <button
                            onClick={() => setAcknowledgedOtherClassIds(new Set())}
                            className="px-3 py-1.5 text-xs rounded-lg bg-amber-200 text-amber-900 font-semibold hover:bg-amber-300 transition"
                          >
                            Clear Hidden
                          </button>
                        </div>

                        {otherClassRecognized.filter((entry) => !acknowledgedOtherClassIds.has(entry.studentId)).length > 0 ? (
                          <div className="max-h-44 overflow-y-auto space-y-2">
                            {otherClassRecognized
                              .filter((entry) => !acknowledgedOtherClassIds.has(entry.studentId))
                              .map((entry) => (
                                <div
                                  key={entry.studentId}
                                  className="flex items-center justify-between gap-3 p-2 bg-white border border-amber-200 rounded-lg"
                                >
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{entry.name}</p>
                                    <p className="text-xs text-slate-600">Student ID: {entry.studentId} • {entry.count} recognitions</p>
                                  </div>
                                  <button
                                    onClick={() =>
                                      setAcknowledgedOtherClassIds((prev) => {
                                        const next = new Set(prev);
                                        next.add(entry.studentId);
                                        return next;
                                      })
                                    }
                                    className="px-3 py-1.5 text-xs rounded-lg bg-slate-200 text-slate-800 font-semibold hover:bg-slate-300 transition"
                                  >
                                    Hide
                                  </button>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-600">No out-of-class recognized students right now.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-300 rounded-lg p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <h5 className="font-bold text-slate-900">📅 Live Camera Attendance for {selectedDate}</h5>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                        />
                        <button
                          onClick={saveVideoAttendanceToDatabase}
                          disabled={loading || students.length === 0}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          {loading ? "Saving..." : "Save To Database"}
                        </button>
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-2 font-semibold text-slate-600">Student</th>
                            <th className="text-left px-3 py-2 font-semibold text-slate-600">Recognition Count</th>
                            <th className="text-left px-3 py-2 font-semibold text-slate-600">Status</th>
                            <th className="text-left px-3 py-2 font-semibold text-slate-600">Override</th>
                            <th className="text-left px-3 py-2 font-semibold text-slate-600">Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student) => {
                            const sid = student._id;
                            const count = studentRecognitionCount[sid] || 0;
                            const status = getEffectiveAttendanceStatus(sid);
                            const isManualOverride = attendanceOverrides[sid] !== undefined;
                            return (
                              <tr key={sid} className="border-t border-slate-100">
                                <td className="px-3 py-2 font-medium text-slate-800">{student.name}</td>
                                <td className="px-3 py-2 text-slate-600">{count}</td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                      status === "present"
                                        ? "bg-green-100 text-green-800"
                                        : status === "late"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {status === "present" ? "Present" : status === "late" ? "Late" : "Absent"}
                                  </span>
                                  {isManualOverride && (
                                    <span className="ml-2 inline-flex px-2 py-1 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                                      Manual
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    value={status}
                                    onChange={(event) => setAttendanceOverride(sid, event.target.value as AttendanceStatus)}
                                    className="border border-slate-300 rounded-md px-2 py-1 bg-white text-xs font-semibold"
                                  >
                                    <option value="present">Present</option>
                                    <option value="absent">Absent</option>
                                    <option value="late">Late</option>
                                  </select>
                                </td>
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => openStudentDetails(sid)}
                                    className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                                  >
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {students.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-3 py-6 text-center text-slate-500">No students available for this class.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Video Mode */}
              {cctvMode === "upload" && (
                <div className="space-y-4">
                  {!videoUrl ? (
                    <>
                      {/* Video Upload Area */}
                      <div
                        className="border-4 border-dashed rounded-lg p-8 text-center cursor-pointer transition bg-indigo-50 border-indigo-400 hover:bg-indigo-100"
                        onClick={() => videoInputRef.current?.click()}
                      >
                        <Upload size={48} className="mx-auto mb-3 text-indigo-600" />
                        <p className="text-slate-900 font-semibold mb-1 text-lg">
                          Click or drag video here
                        </p>
                        <p className="text-sm text-slate-600">
                          MP4, MOV, AVI (recommended: 5-60 minutes)
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          💡 Video will be analyzed to detect faces and count attendance
                        </p>
                      </div>

                      {/* Selected File Display */}
                      {videoFile && (
                        <div className="p-4 bg-green-50 border border-green-300 rounded-lg">
                          <p className="text-sm text-slate-900 font-semibold">
                            📁 Selected: {videoFile.name}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            Size: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Processed Video Stream with Detections */}
                      <div className="bg-black rounded-lg overflow-hidden border-4 border-slate-300" style={{ maxWidth: '100%' }}>
                        <div
                          className="relative bg-black"
                          style={{
                            width: '100%',
                            maxWidth: '800px',
                            margin: '0 auto',
                            aspectRatio: '16/9',
                          }}
                        >
                          {isVideoProcessing && processedVideoUrl ? (
                            <>
                              {/* Processed Video Stream (MJPEG from backend) */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                key={`stream-${isVideoProcessing}`}
                                src={processedVideoUrl}
                                alt="Processed video with detections"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                  backgroundColor: '#000',
                                }}
                                onError={() => {
                                  console.log("Stream loading...");
                                }}
                              />

                              {/* Detection Count Badge */}
                              <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg text-sm">
                                <p className="font-bold">🎯 Detections: {detections.length}</p>
                                <p className="text-xs">Students: {new Set(detections.map(d => d.student_id)).size}</p>
                              </div>

                              {liveConfirmationMessage && (
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-green-600/95 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg border border-green-300">
                                  {liveConfirmationMessage}
                                </div>
                              )}

                              {/* Processing Status */}
                              <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-blue-600 bg-opacity-90 text-white px-3 py-1 rounded-lg text-xs font-semibold">
                                <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div>
                                Processing...
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <div className="text-center">
                                <p className="text-lg font-semibold">No Stream Available</p>
                                <p className="text-sm">Waiting for backend to start processing...</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Processing Controls */}
                      <div className="flex gap-2 flex-wrap items-center">
                        <button
                          onClick={stopProcessing}
                          disabled={!isVideoProcessing}
                          className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                        >
                          ⏹ Stop Processing
                        </button>

                        {isVideoProcessing && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 border border-blue-300 rounded-lg">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            <span className="text-sm font-semibold text-blue-800">Processing video...</span>
                          </div>
                        )}

                        {!isVideoProcessing && videoUrl && (
                          <>
                            <button
                              onClick={() => {
                                setVideoUrl("");
                                setVideoFile(null);
                                setDetections([]);
                                setExtractedFaces([]);
                                setDetectedNamesById({});
                                setStudentRecognitionCount({});
                                setPresentStudents(new Set());
                                setAcknowledgedOtherClassIds(new Set());
                                setProcessedVideoUrl("");
                                resetLiveConfirmationState();
                                seenAttendanceIds.current.clear();
                              }}
                              className="px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-800 transition"
                            >
                              🧹 Clear Results
                            </button>
                            <button
                              onClick={() => {
                                setVideoUrl("");
                                setVideoFile(null);
                                setProcessedVideoUrl("");
                              }}
                              className="px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-700 transition"
                            >
                              ↩️ Upload Different Video
                            </button>
                          </>
                        )}
                      </div>

                      {/* Analysis Summary Layout */}
                      <div className="space-y-4">
                        <div className="bg-slate-50 border border-slate-300 rounded-lg p-4">
                          <h5 className="font-bold text-slate-900 mb-3">🧩 Extracted Faces ({extractedFaces.length})</h5>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-64 overflow-y-auto">
                            {extractedFaces.slice().reverse().map((face) => (
                              <div
                                key={face.id}
                                className={`rounded-md border p-1 bg-white ${face.is_match ? "border-green-300" : "border-red-300"}`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={`data:image/jpeg;base64,${face.image_b64}`}
                                  alt={face.name || "Face"}
                                  className="w-full aspect-square object-cover rounded"
                                />
                                <p className="text-[10px] font-semibold text-slate-900 mt-1 truncate">{face.name || "Unknown"}</p>
                                <p className="text-[10px] text-slate-600 truncate">{face.student_id || "No ID"}</p>
                              </div>
                            ))}
                            {extractedFaces.length === 0 && (
                              <p className="text-xs text-slate-500 col-span-full text-center py-6">No extracted faces yet.</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                            <h5 className="font-bold text-slate-900 mb-3">🎯 Detection Status ({detections.length})</h5>
                            <div className="max-h-56 overflow-y-auto space-y-2">
                              {detections.slice(-30).map((det, idx) => {
                                const student = students.find(s => s._id === det.student_id);
                                const timeStr = det.timestamp ? new Date(det.timestamp).toLocaleTimeString() : "";
                                const displayName = det.student_name || student?.name || det.name || "Unknown";
                                return (
                                  <div
                                    key={`${det.student_id}-${idx}`}
                                    className="p-2 bg-white rounded border border-blue-200 text-sm"
                                  >
                                    <p className="font-semibold text-slate-900">
                                      {displayName}{det.student_id ? ` (${det.student_id})` : ""}
                                    </p>
                                    <p className="text-xs text-slate-600">
                                      {det.frame_num ? `Frame: ${det.frame_num}` : timeStr}
                                    </p>
                                  </div>
                                );
                              })}
                              {detections.length === 0 && (
                                <p className="text-xs text-slate-500 text-center py-4">Waiting for detections...</p>
                              )}
                            </div>
                          </div>

                          <div className="bg-purple-50 border border-purple-300 rounded-lg p-4">
                            <h5 className="font-bold text-slate-900 mb-3">📊 Recognition Status</h5>
                            <div className="space-y-2">
                              {Object.keys(studentRecognitionCount).length > 0 ? (
                                <div className="max-h-56 overflow-y-auto space-y-2">
                                  {Object.entries(studentRecognitionCount)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([studentId, count]) => {
                                      const isPresent = presentStudents.has(studentId);
                                      const displayName = resolveStudentName(studentId);
                                      return (
                                        <div
                                          key={studentId}
                                          className={`p-2 rounded border text-sm ${
                                            isPresent
                                              ? 'bg-green-100 border-green-400'
                                              : 'bg-white border-purple-200'
                                          }`}
                                        >
                                          <div className="flex justify-between items-center">
                                            <p className={`font-semibold ${isPresent ? 'text-green-900' : 'text-slate-900'}`}>
                                              {displayName}
                                            </p>
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                                              isPresent
                                                ? 'bg-green-500 text-white'
                                                : count >= 2
                                                ? 'bg-yellow-400 text-black'
                                                : 'bg-gray-300 text-black'
                                            }`}>
                                              {count}/3
                                            </span>
                                          </div>
                                          {isPresent && <p className="text-xs text-green-700 mt-1">✅ PRESENT</p>}
                                        </div>
                                      );
                                    })}
                                </div>
                              ) : (
                                <p className="text-sm text-slate-600 text-center py-8">
                                  Waiting for detections...
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                            <h5 className="font-bold text-slate-900">🧭 Other Class Recognized</h5>
                            <button
                              onClick={() => setAcknowledgedOtherClassIds(new Set())}
                              className="px-3 py-1.5 text-xs rounded-lg bg-amber-200 text-amber-900 font-semibold hover:bg-amber-300 transition"
                            >
                              Clear Hidden
                            </button>
                          </div>

                          {otherClassRecognized.filter((entry) => !acknowledgedOtherClassIds.has(entry.studentId)).length > 0 ? (
                            <div className="max-h-44 overflow-y-auto space-y-2">
                              {otherClassRecognized
                                .filter((entry) => !acknowledgedOtherClassIds.has(entry.studentId))
                                .map((entry) => (
                                  <div
                                    key={entry.studentId}
                                    className="flex items-center justify-between gap-3 p-2 bg-white border border-amber-200 rounded-lg"
                                  >
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900">{entry.name}</p>
                                      <p className="text-xs text-slate-600">Student ID: {entry.studentId} • {entry.count} recognitions</p>
                                    </div>
                                    <button
                                      onClick={() =>
                                        setAcknowledgedOtherClassIds((prev) => {
                                          const next = new Set(prev);
                                          next.add(entry.studentId);
                                          return next;
                                        })
                                      }
                                      className="px-3 py-1.5 text-xs rounded-lg bg-slate-200 text-slate-800 font-semibold hover:bg-slate-300 transition"
                                    >
                                      Hide
                                    </button>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-600">No out-of-class recognized students right now.</p>
                          )}
                        </div>

                        <div className="bg-white border border-slate-300 rounded-lg p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <h5 className="font-bold text-slate-900">📅 Class Attendance for {selectedDate}</h5>
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                              />
                              <button
                                onClick={saveVideoAttendanceToDatabase}
                                disabled={loading || students.length === 0}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                              >
                                {loading ? "Saving..." : "Save To Database"}
                              </button>
                            </div>
                          </div>

                          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                  <th className="text-left px-3 py-2 font-semibold text-slate-600">Student</th>
                                  <th className="text-left px-3 py-2 font-semibold text-slate-600">Recognition Count</th>
                                  <th className="text-left px-3 py-2 font-semibold text-slate-600">Status</th>
                                  <th className="text-left px-3 py-2 font-semibold text-slate-600">Override</th>
                                  <th className="text-left px-3 py-2 font-semibold text-slate-600">Details</th>
                                </tr>
                              </thead>
                              <tbody>
                                {students.map((student) => {
                                  const sid = student._id;
                                  const count = studentRecognitionCount[sid] || 0;
                                  const status = getEffectiveAttendanceStatus(sid);
                                  const isManualOverride = attendanceOverrides[sid] !== undefined;
                                  return (
                                    <tr key={sid} className="border-t border-slate-100">
                                      <td className="px-3 py-2 font-medium text-slate-800">{student.name}</td>
                                      <td className="px-3 py-2 text-slate-600">{count}</td>
                                      <td className="px-3 py-2">
                                        <span
                                          className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                            status === "present"
                                              ? "bg-green-100 text-green-800"
                                              : status === "late"
                                              ? "bg-yellow-100 text-yellow-800"
                                              : "bg-red-100 text-red-700"
                                          }`}
                                        >
                                          {status === "present" ? "Present" : status === "late" ? "Late" : "Absent"}
                                        </span>
                                        {isManualOverride && (
                                          <span className="ml-2 inline-flex px-2 py-1 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                                            Manual
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2">
                                        <select
                                          value={status}
                                          onChange={(event) => setAttendanceOverride(sid, event.target.value as AttendanceStatus)}
                                          className="border border-slate-300 rounded-md px-2 py-1 bg-white text-xs font-semibold"
                                        >
                                          <option value="present">Present</option>
                                          <option value="absent">Absent</option>
                                          <option value="late">Late</option>
                                        </select>
                                      </td>
                                      <td className="px-3 py-2">
                                        <button
                                          onClick={() => openStudentDetails(sid)}
                                          className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                                        >
                                          View Details
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                                {students.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">No students available for this class.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const file = e.target.files[0];
                        setVideoFile(file);
                        console.log("Uploading video:", file.name);
                        handleVideoUpload(file);
                      }
                    }}
                  />

                  {/* Info */}
                  {!videoUrl && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-slate-700">
                        <strong>⏱️ How it works:</strong> Upload a video and the backend will process it to detect faces in real-time. You&apos;ll see the video stream with bounding boxes and student names. Click &quot;Stop Processing&quot; to quit at any time.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {studentDetailsId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true">
                  <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl border border-slate-200">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                      <h4 className="text-lg font-bold text-slate-900">Student Details</h4>
                      <button
                        onClick={closeStudentDetails}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
                      >
                        Close
                      </button>
                    </div>

                    <div className="px-5 py-4 space-y-3 text-sm">
                      {studentDetailsLoading ? (
                        <p className="text-slate-600">Loading details...</p>
                      ) : studentDetailsError ? (
                        <div className="space-y-2">
                          <p className="text-red-600 font-semibold">{studentDetailsError}</p>
                          <p className="text-slate-700">
                            Name: <span className="font-semibold">{resolveStudentName(studentDetailsId)}</span>
                          </p>
                          <p className="text-slate-700">Student ID: <span className="font-mono text-xs">{studentDetailsId}</span></p>
                        </div>
                      ) : studentDetails ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <p><span className="font-semibold text-slate-700">Name:</span> {studentDetails.name || "-"}</p>
                          <p><span className="font-semibold text-slate-700">Roll No:</span> {studentDetails.rollNo || "-"}</p>
                          <p><span className="font-semibold text-slate-700">Class:</span> {studentDetails.className || "-"}</p>
                          <p><span className="font-semibold text-slate-700">Grade:</span> {studentDetails.grade || "-"}</p>
                          <p><span className="font-semibold text-slate-700">Academic Year:</span> {studentDetails.academicYear || "-"}</p>
                          <p><span className="font-semibold text-slate-700">Email:</span> {studentDetails.email || "-"}</p>
                          <p><span className="font-semibold text-slate-700">Phone:</span> {studentDetails.phone || "-"}</p>
                          <p><span className="font-semibold text-slate-700">Blood Group:</span> {studentDetails.bloodGroup || "-"}</p>
                          <p><span className="font-semibold text-slate-700">Gender:</span> {studentDetails.sex || "-"}</p>
                          <p><span className="font-semibold text-slate-700">Birthday:</span> {studentDetails.birthday ? new Date(studentDetails.birthday).toLocaleDateString() : "-"}</p>
                          <p className="sm:col-span-2"><span className="font-semibold text-slate-700">Address:</span> {studentDetails.address || "-"}</p>
                          <p className="sm:col-span-2"><span className="font-semibold text-slate-700">Student ID:</span> <span className="font-mono text-xs">{studentDetails._id}</span></p>
                        </div>
                      ) : (
                        <p className="text-slate-600">No details found.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

          {/* Facial Data Upload Tab */}
          {activeTab === "upload" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">
                    📸 Upload Facial Data for Recognition
                  </h3>
                  
                  {/* Import Mode Toggle */}
                  <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-lg">
                    <span className={`text-sm font-semibold ${!bulkImportMode ? 'text-indigo-600' : 'text-slate-600'}`}>
                      👤 Single
                    </span>
                    <button
                      onClick={() => setBulkImportMode(!bulkImportMode)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                        bulkImportMode ? 'bg-indigo-600' : 'bg-slate-400'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          bulkImportMode ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-sm font-semibold ${bulkImportMode ? 'text-indigo-600' : 'text-slate-600'}`}>
                      📦 Bulk
                    </span>
                  </div>
                </div>

                {/* Single Student Mode */}
                {!bulkImportMode && (
                  <>
                    {/* Student Selection */}
                    <div className="mb-6">
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Select Student ({students.length} available)
                      </label>
                      {students.length === 0 ? (
                        <div className="w-full px-4 py-3 bg-red-50 border border-red-300 rounded-lg text-red-800 text-sm">
                          <p className="font-semibold mb-2">⚠️ Unable to load students</p>
                          {studentLoadError && (
                            <p className="text-xs mb-3 font-mono bg-red-100 p-2 rounded">
                              Error: {studentLoadError}
                            </p>
                          )}
                          <p className="text-xs mb-3">
                            Troubleshooting steps:
                          </p>
                          <ul className="text-xs space-y-1 mb-3 list-disc list-inside">
                            <li>Is the Next.js server running? (npm run dev)</li>
                            <li>Is MongoDB running?</li>
                            <li>Are there students in the database?</li>
                            <li>Check browser console (F12) for errors</li>
                          </ul>
                          <p className="text-xs text-slate-700 mt-2">
                            Go back and select another class if this looks incorrect.
                          </p>
                        </div>
                      ) : (
                        <select
                          value={selectedStudent}
                          onChange={(e) => {
                            console.log("Selected student:", e.target.value);
                            setSelectedStudent(e.target.value);
                          }}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                        >
                          <option value="">-- Choose a student --</option>
                          {students.map((student) => (
                            <option key={student._id} value={student._id}>
                              {student.name}
                              {studentImageCounts[student._id] && (
                                ` (${studentImageCounts[student._id]} ✓)`
                              )}
                            </option>
                          ))}
                        </select>
                      )}
                      {selectedStudent && (
                        <p className="text-xs text-green-600 mt-2 font-semibold">
                          ✅ Selected: {students.find(s => s._id === selectedStudent)?.name}
                        </p>
                      )}
                    </div>

                    {/* File Upload Area */}
                    <div
                      className={`border-4 border-dashed rounded-lg p-12 text-center cursor-pointer transition ${
                        selectedStudent
                          ? "border-indigo-600 hover:bg-indigo-50 bg-indigo-50 border-indigo-400"
                          : "border-slate-300 hover:border-slate-400 opacity-50 cursor-not-allowed"
                      }`}
                      onClick={() => {
                        if (selectedStudent) {
                          fileInputRef.current?.click();
                        } else {
                          setMessage("❌ Please select a student first");
                        }
                      }}
                    >
                      <Upload size={48} className="mx-auto mb-3 text-slate-400" />
                      <p className="text-slate-900 font-semibold mb-1 text-lg">
                        {selectedStudent ? "Click or drag photos here" : "Select a student first"}
                      </p>
                      {selectedStudent ? (
                        <p className="text-sm text-slate-600">
                          PNG, JPG, or JPEG (Multi-select to upload multiple photos)
                        </p>
                      ) : (
                        <p className="text-sm text-slate-500">
                          Choose a student above to enable upload
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        💡 Upload 5-10 clear photos per student from different angles
                      </p>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (!selectedStudent) {
                          setMessage("❌ Please select a student first");
                          return;
                        }
                        if (!e.target.files || e.target.files.length === 0) {
                          setMessage("❌ Please select at least one image");
                          return;
                        }
                        console.log("Uploading", e.target.files.length, "files for student", selectedStudent);
                        handleBulkImageUpload(selectedStudent, e.target.files);
                      }}
                    />

                    {/* Info Section */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="font-bold text-sm text-slate-900 mb-2">✅ Best Practices:</p>
                        <ul className="text-xs text-slate-600 space-y-1">
                          <li>• 5-10 clear photos per student</li>
                          <li>• Different angles & lighting</li>
                          <li>• Clear facial visibility</li>
                          <li>• Recent, natural photos</li>
                        </ul>
                      </div>
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="font-bold text-sm text-slate-900 mb-2">🎯 Better Accuracy = Better Recognition</p>
                        <p className="text-xs text-slate-600">
                          The system uses these images to train facial recognition. More variety = more reliable attendance detection.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Bulk Import Mode */}
                {bulkImportMode && (
                  <>
                    {/* Instructions */}
                    <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                      <h4 className="font-bold text-slate-900 mb-3">📁 How to organize files for bulk import:</h4>
                      <div className="text-sm text-slate-700 space-y-2 font-mono bg-white p-3 rounded border border-blue-100 mb-3">
                        <div>StudentFolder/</div>
                        <div className="ml-4">├── photo1.jpg</div>
                        <div className="ml-4">├── photo2.jpg</div>
                        <div className="ml-4">└── photo3.jpg</div>
                        <div>AnotherStudent/</div>
                        <div className="ml-4">├── photo1.jpg</div>
                        <div className="ml-4">└── photo2.jpg</div>
                      </div>
                      <p className="text-xs text-blue-800 mb-2">
                        <strong>✅ Example:</strong> Create a main folder with subfolders named after each student. Each subfolder contains their facial images.
                      </p>
                      <p className="text-xs text-blue-800">
                        <strong>📌 Note:</strong> Folder names should match student names in the system. Alternatively, use full student ID (MongoDB ObjectId).
                      </p>
                    </div>

                    {/* Upload Area for Bulk Import */}
                    <div
                      className="border-4 border-dashed rounded-lg p-12 text-center cursor-pointer transition border-indigo-600 hover:bg-indigo-50 bg-indigo-50 border-indigo-400"
                      onClick={() => {
                        if (students.length === 0) {
                          setMessage("❌ No students available. Please load students first.");
                          return;
                        }
                        bulkFileInputRef.current?.click();
                      }}
                    >
                      <Upload size={48} className="mx-auto mb-3 text-indigo-600" />
                      <p className="text-slate-900 font-semibold mb-1 text-lg">
                        Click to select folder or drag & drop
                      </p>
                      <p className="text-sm text-slate-600 mb-3">
                        Select a folder containing student subfolders with images
                      </p>
                      {bulkImportProgress && (
                        <div className="mt-4 bg-white rounded-lg p-4">
                          <p className="text-sm font-semibold text-slate-900 mb-2">
                            Uploading: {bulkImportProgress.current} / {bulkImportProgress.total}
                          </p>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${(bulkImportProgress.current / bulkImportProgress.total) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Hidden input for folder selection */}
                    <input
                      ref={bulkFileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      {...({ webkitdirectory: "" } as any)}
                      className="hidden"
                      onChange={(e) => {
                        if (!e.target.files || e.target.files.length === 0) {
                          setMessage("❌ Please select at least one image");
                          return;
                        }
                        console.log("Bulk uploading", e.target.files.length, "files");
                        handleBulkFacialImport(e.target.files);
                      }}
                    />

                    {/* Bulk Import Info Section */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="font-bold text-sm text-slate-900 mb-2">✅ Bulk Import Benefits:</p>
                        <ul className="text-xs text-slate-600 space-y-1">
                          <li>• Upload for multiple students at once</li>
                          <li>• Time-efficient for large classes</li>
                          <li>• Organize by student folder name</li>
                          <li>• Automatic mapping to student records</li>
                        </ul>
                      </div>
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="font-bold text-sm text-slate-900 mb-2">📋 Setup Tips:</p>
                        <ul className="text-xs text-slate-600 space-y-1">
                          <li>• Use student name as folder name</li>
                          <li>• Keep folder structure simple</li>
                          <li>• 5-10 images per student works best</li>
                          <li>• Supported: JPG, PNG, JPEG</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </main>
    </>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-600">Loading attendance...</div>}>
      <AttendancePageContent />
    </Suspense>
  );
}
