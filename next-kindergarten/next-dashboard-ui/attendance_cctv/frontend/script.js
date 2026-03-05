let cameraRunning = false;

const videoStream = document.getElementById("videoStream");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const processVideoBtn = document.getElementById("processVideoBtn");
const videoFile = document.getElementById("videoFile");
const processingStatus = document.getElementById("processingStatus");
const clearBtn = document.getElementById("clearBtn");

// Start Camera
startBtn.addEventListener("click", function() {
    videoStream.src = "http://localhost:8000/video";
    cameraRunning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    clearStatus();
});

// Stop Camera
stopBtn.addEventListener("click", function() {
    videoStream.src = "";
    cameraRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    clearStatus();
});

// Process Video File
processVideoBtn.addEventListener("click", async function() {
    if (!videoFile.files.length) {
        showStatus("Please select a video file", "error");
        return;
    }

    const file = videoFile.files[0];
    const formData = new FormData();
    formData.append("video", file);

    showStatus("Processing video... This may take a while", "loading");
    processVideoBtn.disabled = true;

    try {
        const response = await fetch("http://localhost:8000/process-video", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();
        showStatus(`✓ Video processed! Detected ${result.detected_faces} faces`, "success");
        loadAttendance(); // Refresh attendance list
    } catch (error) {
        console.error("Error processing video:", error);
        showStatus("Error processing video: " + error.message, "error");
    } finally {
        processVideoBtn.disabled = false;
    }
});

// Clear Attendance Records
clearBtn.addEventListener("click", function() {
    if (confirm("Are you sure you want to clear all attendance records?")) {
        fetch("http://localhost:8000/clear-attendance", {
            method: "POST"
        })
        .then(response => response.json())
        .then(data => {
            alert("Attendance records cleared!");
            loadAttendance();
        })
        .catch(error => console.error("Error:", error));
    }
});

// Load and display attendance
async function loadAttendance() {
    try {
        const response = await fetch("http://localhost:8000/attendance");
        if (!response.ok) {
            console.error("Failed to fetch attendance:", response.status);
            return;
        }
        const data = await response.json();

        const list = document.getElementById("attendanceList");
        list.innerHTML = "";

        if (data.length === 0) {
            const li = document.createElement("li");
            li.textContent = "No attendance records yet";
            li.style.color = "#999";
            list.appendChild(li);
        } else {
            data.forEach(item => {
                const li = document.createElement("li");
                li.textContent = item.name + " - " + item.time;
                list.appendChild(li);
            });
        }
    } catch (error) {
        console.error("Error loading attendance:", error);
    }
}

// Show status message
function showStatus(message, type) {
    processingStatus.textContent = message;
    processingStatus.className = "status-message " + type;
}

// Clear status message
function clearStatus() {
    processingStatus.textContent = "";
    processingStatus.className = "status-message";
}

// Load attendance immediately and then every 3 seconds
loadAttendance();
setInterval(loadAttendance, 3000);
