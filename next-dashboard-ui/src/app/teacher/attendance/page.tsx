"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import TeacherTopBar from "@/app/components/TeacherTopBar";
import { Upload, Camera, Database, Send } from "lucide-react";
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

export default function AttendancePage() {
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
  const [cctvFeedUrl] = useState("http://localhost:8000/video");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [studentImageCounts, setStudentImageCounts] = useState<Record<string, number>>({});
  const [cameraActive, setCameraActive] = useState(false);
  const [atd, setAtd] = useState<AttendanceRecord[]>([]);
  const [cctvMode, setCctvMode] = useState<"live" | "upload">("live");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [studentRecognitionCount, setStudentRecognitionCount] = useState<Record<string, number>>({});
  const [presentStudents, setPresentStudents] = useState<Set<string>>(new Set());
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [detections, setDetections] = useState<any[]>([]);
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string>("");
  const [extractedFaces, setExtractedFaces] = useState<ExtractedFace[]>([]);
  const [detectedNamesById, setDetectedNamesById] = useState<Record<string, string>>({});
  const [bulkImportMode, setBulkImportMode] = useState(false);
  const [bulkImportProgress, setBulkImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [exportDate, setExportDate] = useState(new Date().toISOString().split("T")[0]);
  const [exportMonth, setExportMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [exportYear, setExportYear] = useState(String(new Date().getFullYear()));
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const seenAttendanceIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!preselectedAcademicYear) return;
    setAcademicYear(preselectedAcademicYear);
  }, [preselectedAcademicYear]);

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
          const res = await fetch("http://localhost:8000/video-detections");
          const detData = await res.json();
          const data = Array.isArray(detData) ? detData : (detData.detections || []);
          
          if (Array.isArray(data)) {
            setAtd(data);

            const liveNames: Record<string, string> = {};
            data.forEach((record: AttendanceRecord) => {
              if (record.student_id && record.name && record.name !== "Unknown" && record.name !== "Spoof") {
                liveNames[record.student_id] = record.name;
              }
            });
            setDetectedNamesById((prev) => ({ ...prev, ...liveNames }));

            // Recompute from current backend detections so UI always matches backend truth.
            const counts: Record<string, number> = {};
            data.forEach((record: AttendanceRecord) => {
              const sid = record.student_id;
              if (!sid) return;
              counts[sid] = (counts[sid] || 0) + 1;
            });

            setStudentRecognitionCount(counts);
            setPresentStudents(
              new Set(
                Object.entries(counts)
                  .filter(([, count]) => count >= 3)
                  .map(([sid]) => sid)
              )
            );
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

  // Handle video playback and detection overlay
  useEffect(() => {
    if (!videoElementRef.current || !canvasRef.current) return;

    const video = videoElementRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const updateCanvas = () => {
      if (video.paused) return;

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw detections with bounding boxes
      detections.forEach((detection) => {
        if (detection.timestamp && Math.abs(video.currentTime - detection.timestamp) < 0.5) {
          const { x, y, width, height, name } = detection;

          // Draw bounding box
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#00ff00";
          ctx.strokeRect(x, y, width, height);

          // Draw name label
          ctx.fillStyle = "#00ff00";
          ctx.font = "bold 18px Arial";
          ctx.fillText(name, x, y - 10);

          // Draw rectangle behind text for better readability
          const textWidth = ctx.measureText(name).width;
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(x - 5, y - 28, textWidth + 10, 25);

          // Redraw text on top
          ctx.fillStyle = "#00ff00";
          ctx.fillText(name, x, y - 10);
        }
      });

      requestAnimationFrame(updateCanvas);
    };

    video.addEventListener("play", updateCanvas);
    return () => video.removeEventListener("play", updateCanvas);
  }, [detections]);

  // const [studentLoadError, setStudentLoadError] = useState<string>("");

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clear any lingering intervals/timeouts
      if ((window as any).processingInterval) {
        clearInterval((window as any).processingInterval);
      }
      if ((window as any).processingTimeout) {
        clearTimeout((window as any).processingTimeout);
      }
      
      // Stop processing if still active
      if (isVideoProcessing) {
        fetch("http://localhost:8000/stop-processing", { method: "POST" }).catch(err => 
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
        const reloadRes = await fetch('http://localhost:8000/reload-embeddings', {
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
          const reloadRes = await fetch("http://localhost:8000/reload-embeddings", {
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
      const res = await fetch("http://localhost:8000/start-camera", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage(`❌ Error: ${data.error || "Failed to start camera"}`);
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
    try {
      await fetch("http://localhost:8000/stop-camera", {
        method: "POST",
      });
      setMessage("✅ Camera stopped");
    } catch (error) {
      setMessage(`❌ Error: ${String(error)}`);
    } finally {
      setCameraActive(false);
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
      await fetch("http://localhost:8000/stop-processing", {
        method: "POST",
      });
      console.log("Processing stopped");
    } catch (err) {
      console.error("Error stopping processing:", err);
    }
    
    setIsVideoProcessing(false);
    setProcessedVideoUrl("");
    setVideoUrl("");
    setVideoFile(null);
    setDetections([]);
    setExtractedFaces([]);
    setStudentRecognitionCount({});
    setPresentStudents(new Set());
    seenAttendanceIds.current.clear();
  };

  // Handle video file upload
  const handleVideoUpload = async (file: File | null) => {
    if (!file) return;

    setLoading(true);
    setMessage("");
    setIsVideoProcessing(true);
    setVideoUrl("processing"); // Set to show processing interface

    try {
      const formData = new FormData();
      formData.append("video", file);

      const response = await fetch("http://localhost:8000/process-video", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        await fetch("http://localhost:8000/clear-extracted-faces", {
          method: "POST",
        }).catch(() => undefined);

        // Reset recognition tracking for new video
        setStudentRecognitionCount({});
        setPresentStudents(new Set());
        setExtractedFaces([]);
        
        setMessage(`✅ Video processing started. Displaying detections in real-time...`);
        
        // Point to the processed video stream from backend
        setProcessedVideoUrl("http://localhost:8000/video-stream-processed");
        
        // Poll for detection results
        let lastDetectionCount = 0;
        let recognitionCounts: Record<string, number> = {};
        let presentSet = new Set<string>();
        
        const pollInterval = setInterval(async () => {
          try {
            const [detRes, facesRes] = await Promise.all([
              fetch("http://localhost:8000/video-detections", { method: "GET" }),
              fetch("http://localhost:8000/extracted-faces", { method: "GET" }),
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
              setDetections(detectionsArray);
              
              // Only calculate counts from detections that haven't been counted yet
              detectionsArray.forEach((detection: any) => {
                const studentId = detection.student_id;
                if (studentId) {
                  if (!recognitionCounts[studentId]) {
                    recognitionCounts[studentId] = 0;
                  }
                  recognitionCounts[studentId]++;
                  
                  // Mark as present after 3 recognitions
                  if (recognitionCounts[studentId] >= 3 && !presentSet.has(studentId)) {
                    presentSet.add(studentId);
                  }
                }
              });
              
              setStudentRecognitionCount({...recognitionCounts});
              setPresentStudents(new Set(presentSet));
              
              console.log(`📊 Detections: ${detectionsArray.length}, Present: ${presentSet.size}`);
            }
          } catch (err) {
            console.error("Error fetching detections:", err);
          }
        }, 1000);

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
        setMessage(`❌ Error: ${result.error || "Video processing failed"}`);
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
        status: presentStudents.has(student._id) ? "Present" : "Absent",
      }));

      const response = await fetch("/api/teacher/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          classId: selectedClassId || undefined,
          teacherId: user?.id || undefined,
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
        ? "bg-indigo-600 text-white shadow-lg"
        : "text-slate-700 hover:bg-slate-100 border border-slate-200"
    }`;

  const downloadDailyReport = () => {
    const selectedClass = teacherClasses.find((c) => c._id === selectedClassId);
    const className = selectedClass?.name || selectedClass?.classId;
    if (!className) {
      setMessage("❌ Please select a class before exporting reports.");
      return;
    }
    const url = `http://localhost:8000/export/daily?class=${encodeURIComponent(className)}&date=${encodeURIComponent(exportDate)}`;
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
    const url = `http://localhost:8000/export/monthly?class=${encodeURIComponent(className)}&month=${encodeURIComponent(exportMonth)}&year=${encodeURIComponent(exportYear)}`;
    window.open(url, "_blank");
    setMessage(`✅ Monthly report requested for ${className} (${exportYear}-${exportMonth})`);
  };

  return (
    <>
      <TeacherTopBar />

      <main className="flex-1 overflow-y-auto bg-gray-50">
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
            <h1 className="text-5xl font-black text-slate-900 mb-2">
              📋 Attendance Management
            </h1>
            <p className="text-slate-600 text-lg">
              {teacherClasses.find((classDoc) => classDoc._id === selectedClassId)?.name || "Selected Class"} • Manage attendance with manual entry, CCTV feed, and facial recognition
            </p>
          </div>

          <div className="mb-6 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-3">📄 Attendance Excel Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
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
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
              >
                Download Daily Report
              </button>
              <button
                onClick={downloadMonthlyReport}
                className="px-4 py-2 rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-800 transition"
              >
                Download Monthly Report
              </button>
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
            <Link
              href="/teacher/video-attendance"
              className="px-6 py-2 rounded-lg font-semibold transition text-slate-700 hover:bg-slate-100 border border-slate-200"
            >
              <Send size={16} className="inline mr-2" />
              Analyze Video
            </Link>
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
                🎥 Live CCTV Feed with Face Recognition
              </h3>

              {/* CCTV Mode Selector */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => {
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
                  onClick={() => setCctvMode("upload")}
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
                      <iframe
                        key={`stream-${cameraActive}`}
                        src="http://localhost:8000/video"
                        title="CCTV Feed"
                        className="w-full h-full border-0"
                        onError={(e) => {
                          console.log("Stream error");
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium">
                        Camera is off
                      </div>
                    )}
                  </div>

                  {/* Camera Controls */}
                  <div className="flex gap-2 flex-wrap justify-center">
                    <button
                      onClick={startCamera}
                      disabled={cameraActive}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      🎬 Start Camera
                    </button>

                    <button
                      onClick={stopCamera}
                      disabled={!cameraActive}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition"
                    >
                      ⏹ Stop Camera
                    </button>

                    <button
                      onClick={saveAttendance}
                      disabled={!cameraActive || loading}
                      className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition"
                    >
                      <Database size={18} />
                      {loading ? "Saving..." : "💾 Save"}
                    </button>
                  </div>

                  {/* How it works info */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-slate-700">
                      <strong>ℹ️ How it works:</strong> The camera analyzes faces and logs attendance automatically. A student is marked present after 3 recognitions.
                    </p>
                  </div>

                  {/* Recognition Status Panel */}
                  {cameraActive && (
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg border-2 border-indigo-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-slate-900">👥 Recognition Status</h4>
                          <button
                            onClick={() => {
                              setStudentRecognitionCount({});
                              setPresentStudents(new Set());
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
                                const student = students.find((s) => s._id === studentId);
                                const displayName = student?.name || detectedNamesById[studentId] || studentId;
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
                                  const student = students.find((s) => s._id === studentId);
                                  const isPresent = presentStudents.has(studentId);
                                  const displayName = student?.name || detectedNamesById[studentId] || studentId;
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
                  )}
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
                          <button
                            onClick={() => {
                              setVideoUrl("");
                              setVideoFile(null);
                              setDetections([]);
                              setExtractedFaces([]);
                              setDetectedNamesById({});
                              setStudentRecognitionCount({});
                              setPresentStudents(new Set());
                              setProcessedVideoUrl("");
                            }}
                            className="px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-700 transition"
                          >
                            ↩️ Upload Different Video
                          </button>
                        )}
                      </div>

                      {/* Analysis Summary Layout */}
                      <div className="space-y-4">
                        <div className="bg-slate-50 border border-slate-300 rounded-lg p-4">
                          <h5 className="font-bold text-slate-900 mb-3">🧩 Extracted Faces ({extractedFaces.length})</h5>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-64 overflow-y-auto">
                            {extractedFaces.slice().reverse().map((face) => (
                              <div
                                key={face.id}
                                className={`rounded-lg border p-2 bg-white ${face.is_match ? "border-green-300" : "border-red-300"}`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={`data:image/jpeg;base64,${face.image_b64}`}
                                  alt={face.name || "Face"}
                                  className="w-full h-20 object-cover rounded"
                                />
                                <p className="text-xs font-semibold text-slate-900 mt-2 truncate">{face.name || "Unknown"}</p>
                                <p className="text-[11px] text-slate-600 truncate">{face.student_id || "No ID"}</p>
                              </div>
                            ))}
                            {extractedFaces.length === 0 && (
                              <p className="text-xs text-slate-500 col-span-full text-center py-6">No extracted faces yet.</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                            <h5 className="font-bold text-slate-900 mb-3">🎯 All Detections ({detections.length})</h5>
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
                                      const student = students.find(s => s._id === studentId);
                                      const isPresent = presentStudents.has(studentId);
                                      const displayName = student?.name || detectedNamesById[studentId] || studentId;
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
                                </tr>
                              </thead>
                              <tbody>
                                {students.map((student) => {
                                  const sid = student._id;
                                  const count = studentRecognitionCount[sid] || 0;
                                  const isPresent = presentStudents.has(sid);
                                  return (
                                    <tr key={sid} className="border-t border-slate-100">
                                      <td className="px-3 py-2 font-medium text-slate-800">{student.name}</td>
                                      <td className="px-3 py-2 text-slate-600">{count}</td>
                                      <td className="px-3 py-2">
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${isPresent ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                                          {isPresent ? "Present" : "Absent"}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                                {students.length === 0 && (
                                  <tr>
                                    <td colSpan={3} className="px-3 py-6 text-center text-slate-500">No students available for this class.</td>
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

              {/* Realtime Attendance List (shown for both modes) */}
              <div className="mt-6">
                <h4 className="font-bold mb-3 text-slate-900">
                  📋 Recognition Status ({presentStudents.size} Present, {atd.length} Total Detections)
                </h4>
                
                {/* Present Students Summary */}
                {presentStudents.size > 0 && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-lg">
                    <p className="text-xs font-semibold text-green-800 mb-2">✅ Students Marked Present (3+ recognitions):</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(presentStudents).map((studentId) => {
                        const student = students.find(s => s._id === studentId);
                        const displayName = student?.name || detectedNamesById[studentId] || studentId;
                        return (
                          <span key={studentId} className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-xs font-semibold">
                            {displayName}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* All Detections */}
                <ul className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg bg-gray-50">
                  {atd.map((record, idx) => {
                    const recognitionCount = studentRecognitionCount[record.student_id] || 0;
                    const isPresent = presentStudents.has(record.student_id);
                    const resolvedName =
                      record.name ||
                      students.find((s) => s._id === record.student_id)?.name ||
                      detectedNamesById[record.student_id] ||
                      record.student_id;
                    return (
                      <li
                        key={`${record._id}-${idx}`}
                        className={`flex justify-between items-center px-3 py-2 border-b border-gray-200 hover:bg-blue-50 transition text-sm ${
                          isPresent ? "bg-green-100" : ""
                        }`}
                      >
                        <div>
                          <span className="font-medium text-slate-900">{resolvedName}</span>
                          <span className="text-gray-500 text-xs ml-2">
                            ({recognitionCount}/3 recognitions)
                          </span>
                          {isPresent && <span className="text-green-600 text-xs ml-2 font-bold">✅ PRESENT</span>}
                        </div>
                        <span className="text-gray-600 text-xs">
                          {new Date(record.timestamp).toLocaleTimeString()}
                        </span>
                      </li>
                    );
                  })}
                  {atd.length === 0 && (
                    <li className="px-3 py-4 text-center text-gray-400 text-sm">
                      {cctvMode === "live" && !cameraActive
                        ? "Start camera to begin detection"
                        : "No detections yet"}
                    </li>
                  )}
                </ul>
              </div>
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
