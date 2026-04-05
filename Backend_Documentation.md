# Backend Documentation - AI-Based Smart Parking Automation System

**Technology Stack:** Django + Django REST Framework + OpenCV  
**Frontend:** React (Vite) + Zustand  
**Contributors:** Abhiraj Dixit, Anshika Mishra, Prashant Shukla, Utkarsh Trivedi

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Backend Setup & Installation](#2-backend-setup--installation)
3. [Project Structure](#3-project-structure)
4. [API Documentation](#4-api-documentation)
   - [4.1 POST /api/video/upload/](#41-post-apivideoupload---video-upload)
   - [4.2 POST /api/marking/](#42-post-apimarking---save-coordinates--start-detector)
   - [4.3 GET /api/stream/\<session_id\>/](#43-get-apistreamsession_id---mjpeg-live-stream)
   - [4.4 GET /api/status/](#44-get-apistatus---slot-occupancy-status)
5. [Computer Vision Model (main.py) - Changes & Details](#5-computer-vision-model-mainpy---changes--details)
6. [Frontend Changes](#6-frontend-changes)
7. [Data Flow - End to End](#7-data-flow---end-to-end)
8. [Issues & Challenges Faced During Development](#8-issues--challenges-faced-during-development)
9. [Configuration Details](#9-configuration-details)

---

## 1. Project Overview

This project implements an AI-based smart parking automation system that uses computer vision to detect and display parking space availability in real-time. The system consists of three main components:

- **Backend (Django):** Handles video uploads, coordinate storage, launches the CV detector, streams processed video frames, and serves real-time slot occupancy data.
- **Frontend (React/Vite):** Provides the user interface for uploading parking lot videos, marking parking slot coordinates on a video frame, and viewing the live detection feed with real-time occupancy statistics.
- **CV Model (main.py):** The computer vision engine that processes video frames using OpenCV's adaptive thresholding pipeline to determine whether each marked parking slot is free or occupied.

**User Workflow:** Upload a parking lot video -> Mark parking slot boundaries on a frame -> View the live processed stream with green (free) and red (occupied) overlays, along with per-slot occupancy counts and statistics in the sidebar.

---

## 2. Backend Setup & Installation

### 2.1 Prerequisites

- Python 3.10 or higher
- pip (Python package installer)
- Node.js 18+ and npm (for frontend)

### 2.2 Dependencies (requirements.txt)

```
django>=4.2,<5.1
djangorestframework>=3.14
django-cors-headers>=4.3
```

Additionally, the CV model (main.py) requires: `opencv-python`, `numpy`, and `cvzone`. These should be installed in the same Python environment.

### 2.3 Step-by-Step Setup

**Step 1:** Navigate to the Backend directory
```bash
cd Backend
```

**Step 2:** Create and activate a virtual environment (recommended)
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
```

**Step 3:** Install Python dependencies
```bash
pip install -r requirements.txt
pip install opencv-python numpy cvzone
```

**Step 4:** Run database migrations
```bash
python manage.py migrate
```

**Step 5:** Start the development server
```bash
python manage.py runserver
```

The backend will be available at `http://localhost:8000`

### 2.4 Running the Frontend

```bash
cd Frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000` (or the port Vite assigns).

---

## 3. Project Structure

```
Backend/
|-- manage.py                  # Django management script
|-- requirements.txt           # Python dependencies
|-- db.sqlite3                 # SQLite database
|
|-- parking_backend/           # Django project settings
|   |-- __init__.py
|   |-- settings.py            # Project configuration
|   |-- urls.py                # Root URL routing
|   |-- wsgi.py                # WSGI entry point
|
|-- api/                       # Main Django app
|   |-- __init__.py
|   |-- apps.py                # App configuration
|   |-- models.py              # Database models (empty)
|   |-- admin.py               # Admin registration
|   |-- views.py               # API view handlers
|   |-- urls.py                # API URL patterns
|
|-- Model/                     # Computer Vision engine
|   |-- main.py                # Detection script
|   |-- Positions              # Pickled slot coordinates
|   |-- carPark.mp4            # Sample test video
|   |-- img.png                # Reference image
|   |-- space.py               # Manual marking tool
|   |-- test.py                # Alt marking tool
|
|-- media/                     # Runtime files
    |-- videos/                # Uploaded videos
    |-- latest_frame.jpg       # Current annotated frame
    |-- slot_status.json       # Current slot occupancy
```

---

## 4. API Documentation

All API endpoints are prefixed with `/api/` and served at `http://localhost:8000/api/`.

### 4.1 POST /api/video/upload/ - Video Upload

#### Purpose

Accepts a parking lot video file uploaded from the frontend, saves it to the server's media directory, and returns a unique session ID that identifies this upload throughout the workflow.

#### Request

- **Method:** POST
- **Content-Type:** multipart/form-data
- **Body:** Form field `video` containing the video file

#### Example (cURL)

```bash
curl -X POST http://localhost:8000/api/video/upload/ \
  -F "video=@parking_lot.mp4"
```

#### Response (201 Created)

```json
{
  "session_id": "747eb363-0e7d-4c5c-8afa-0a85ad59844b"
}
```

#### Internal Behavior

1. Generates a UUID v4 as the `session_id`.
2. Extracts the file extension from the original filename (defaults to `.mp4`).
3. **IMPORTANT:** Deletes all previously uploaded videos from `media/videos/` before saving the new one. This ensures only one video exists at a time, preventing disk bloat.
4. Saves the file as `media/videos/<session_id>.<ext>` using chunked writing for memory efficiency with large video files.

#### Error Responses

- **400 Bad Request:** `{ "detail": "No video file provided" }` - when the `video` field is missing.

#### Frontend Integration

Called by the `uploadVideo()` function in `Frontend/src/services/api.js`. Uses XMLHttpRequest (not fetch) to support upload progress tracking via `xhr.upload.onprogress`, which drives the progress bar in the Upload page UI.

---

### 4.2 POST /api/marking/ - Save Coordinates & Start Detector

#### Purpose

Receives the parking slot coordinates marked by the user on the frontend canvas, saves them to the `Model/Positions` pickle file, and then launches the computer vision detector (`main.py`) as a background subprocess to begin real-time video analysis.

#### Request

- **Method:** POST
- **Content-Type:** application/json
- **Body:**

```json
{
  "session_id": "747eb363-0e7d-4c5c-8afa-0a85ad59844b",
  "positions": [
    { "x1": 387, "y1": 188, "x2": 494, "y2": 235 },
    { "x1": 501, "y1": 288, "x2": 608, "y2": 334 }
  ]
}
```

#### Response (200 OK)

```json
{
  "count": 2,
  "status": "detector started"
}
```

#### Internal Behavior - Step by Step

1. **VALIDATION:** Checks that `positions` is a non-empty list and each entry has `x1`, `y1`, `x2`, `y2` integer fields.
2. **COORDINATE CONVERSION:** Converts the JSON array of `{x1, y1, x2, y2}` objects into a Python list of `(x1, y1, x2, y2)` tuples.
3. **PICKLE SAVE:** Serializes the tuple list using Python's pickle module and writes it to `Backend/Model/Positions`. This is the same file that `main.py` reads to know where the parking slots are located.
4. **KILL PREVIOUS DETECTOR:** If a previous `main.py` subprocess is still running (tracked via the global `_detector_process` variable), it is terminated with `terminate()` and `wait()` to ensure clean shutdown before starting a new one.
5. **FIND VIDEO:** Uses the `session_id` to locate the uploaded video file in `media/videos/` using glob pattern matching (`session_id.*`).
6. **LAUNCH DETECTOR:** Starts `main.py` as a subprocess using `subprocess.Popen()`, passing the video file path as a command-line argument. The subprocess runs independently and continuously writes annotated frames and status data to shared files.

#### Error Responses

- **400:** No positions provided, or positions have invalid format.
- **404:** Video not found for the given session_id.

#### Frontend Integration

Called by `saveCoordinates()` in `Frontend/src/services/api.js`, which is triggered when the user clicks "Send & view stream" on the MarkCoordsPage. The coordinates are converted from `{x, y, w, h}` (canvas format) to `{x1, y1, x2, y2}` before sending.

---

### 4.3 GET /api/stream/\<session_id\>/ - MJPEG Live Stream

#### Purpose

Serves a live MJPEG (Motion JPEG) video stream to the frontend. The browser's native `<img>` tag can render this stream directly without any JavaScript video handling - the browser replaces the image on each frame boundary automatically.

#### Request

- **Method:** GET
- **URL parameter:** `session_id` (UUID string)
- **Example:** `GET http://localhost:8000/api/stream/747eb363-0e7d-4c5c-8afa-0a85ad59844b/`

#### Response

- **Content-Type:** `multipart/x-mixed-replace; boundary=frame`
- **Body:** Continuous stream of JPEG frames separated by `--frame` boundaries

Each frame in the stream follows this format:
```
--frame\r\n
Content-Type: image/jpeg\r\n
\r\n
<JPEG binary data>\r\n
```

#### Internal Behavior

This endpoint does NOT process video itself. Instead, it reads the `latest_frame.jpg` file that `main.py` continuously writes to. The flow is:

- Runs an infinite generator loop at approximately 30 FPS (`time.sleep(0.03)`).
- On each tick, reads `media/latest_frame.jpg` from disk.
- **JPEG VALIDATION:** Before sending, validates that the file starts with `FFD8` and ends with `FFD9` (standard JPEG markers). This prevents sending partially-written frames that would cause image corruption or flickering.
- **LAST GOOD FRAME:** If the current read is invalid (file being written to), the endpoint re-sends the last successfully validated frame, ensuring smooth playback.
- **ERROR HANDLING:** Catches `OSError` and `PermissionError` (common on Windows when `main.py` and the stream endpoint access the file simultaneously) and silently skips to the next tick.

#### Frontend Integration

The LiveStreamPage renders this as: `<img src={getStreamUrl(sessionId)} />`. The browser natively handles `multipart/x-mixed-replace` responses, replacing the image content on each frame boundary to produce a live video effect. `getStreamUrl()` is defined in `Frontend/src/services/api.js`.

---

### 4.4 GET /api/status/ - Slot Occupancy Status

#### Purpose

Returns the current occupancy status of all marked parking slots. This data is used by the frontend sidebar to display Free/Occupied counts, per-slot status cards, and pixel count values.

#### Request

- **Method:** GET
- **No parameters required**

#### Response (200 OK)

```json
{
  "slots": [
    { "id": 0, "occupied": false, "pixel_count": 8 },
    { "id": 1, "occupied": false, "pixel_count": 316 },
    { "id": 2, "occupied": true,  "pixel_count": 1240 },
    { "id": 3, "occupied": false, "pixel_count": 0 }
  ]
}
```

#### Field Descriptions

- **id:** Zero-based index of the slot (matches the order coordinates were submitted).
- **occupied:** Boolean. `true` if `pixel_count >= 900` (threshold), `false` otherwise.
- **pixel_count:** Number of non-zero (white) pixels in the processed crop of this slot. Lower values indicate an empty slot; higher values indicate a vehicle is present.

#### Internal Behavior

This is a simple file-read endpoint. It reads `media/slot_status.json` which `main.py` writes on every frame. If the file does not exist (detector not yet started), returns an empty slots array.

#### Frontend Integration

The LiveStreamPage polls this endpoint every 1 second using `setInterval`. The response data drives the Free Slots / Occupied counters and the per-slot status cards (Slot 1: Free, Slot 2: Occupied, etc.) in the sidebar.

---

## 5. Computer Vision Model (main.py) - Changes & Details

The original `main.py` was a standalone desktop application that displayed results using `cv2.imshow()`. Several modifications were made to integrate it with the web-based backend:

### 5.1 Path Resolution Fix

**PROBLEM:** The original code used hardcoded relative paths like `'Backend/Model/carPark.mp4'` and `'Backend/Model/Positions'`. These only worked when running from the repository root directory.

**FIX:** Introduced `DIR = os.path.dirname(os.path.abspath(__file__))` and used `os.path.join(DIR, ...)` for all file paths. This makes the script work regardless of the current working directory.

### 5.2 Dynamic Video Path via Command-Line Argument

**PROBLEM:** The video source was hardcoded to `carPark.mp4`.

**FIX:** Added `sys.argv[1]` support so the backend can launch `main.py` with any uploaded video path. Falls back to `carPark.mp4` if no argument is provided.

```python
video_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(DIR, 'carPark.mp4')
```

### 5.3 Coordinate Format Change: (x, y) -> (x1, y1, x2, y2)

**PROBLEM:** The original `Positions` file stored `(x, y)` tuples with a fixed `width=107` and `height=48` for all slots. This meant every parking slot had to be the exact same size, which is unrealistic for real-world parking lots.

**FIX:** Changed to `(x1, y1, x2, y2)` tuples representing the top-left and bottom-right corners of each slot. This allows variable-sized slots drawn by the user on the frontend canvas. The `chkSpace()` function was updated accordingly:

```python
# BEFORE:
x, y = pos
crop = modified_img[y:y+h, x:x+w]  # fixed 107x48

# AFTER:
x1, y1, x2, y2 = pos
crop = modified_img[y1:y2, x1:x2]  # variable size
```

### 5.4 Frame Output to File (for Web Streaming)

**PROBLEM:** The original script displayed frames using `cv2.imshow()` which opens a desktop GUI window. This doesn't work for web streaming.

**FIX:** Each annotated frame is encoded to JPEG in memory using `cv2.imencode()` and written to `media/latest_frame.jpg`. The Django stream endpoint reads this file and serves it as an MJPEG stream.

```python
_, buf = cv2.imencode('.jpg', img)
frame_bytes = buf.tobytes()
with open(FRAME_OUTPUT, 'wb') as f:
    f.write(frame_bytes)
```

### 5.5 Slot Status JSON Output

**PROBLEM:** The original script only displayed slot counts visually on the video. There was no way for the frontend to get structured occupancy data.

**FIX:** Added JSON output (`media/slot_status.json`) written on every frame with per-slot `id`, `occupied` boolean, and `pixel_count`. The `/api/status/` endpoint serves this data, and the frontend polls it every second.

---

## 6. Frontend Changes

### 6.1 api.js - saveCoordinates() Connected to Real Backend

**BEFORE:** The `saveCoordinates()` function was a mock that returned a fake success response after 800ms delay using `setTimeout`.

**AFTER:** Replaced with a real API call to `POST /api/marking/` that sends the `session_id` and coordinate array to the Django backend.

```javascript
// BEFORE (mock):
console.log('Sending coords to backend:', ...)
return new Promise((res) => setTimeout(() => res({ ok: true }), 800))

// AFTER (real):
return call('/api/marking/', {
  method: 'POST',
  body: JSON.stringify({ session_id: sessionId, positions: coords }),
})
```

### 6.2 LiveStreamPage.jsx - WebSocket Replaced with HTTP Polling

**BEFORE:** The LiveStreamPage used WebSocket (`ws://localhost:8000/ws/parking/...`) to receive real-time slot occupancy updates. This required Django Channels, Daphne ASGI server, and potentially Redis - significant infrastructure complexity.

**AFTER:** Replaced WebSocket with simple HTTP polling. The frontend calls `GET /api/status/` every 1 second using `setInterval` and updates the occupancy state from the JSON response.

**WHY:** This eliminated the need for Django Channels, Daphne, and Redis while still providing near-real-time updates (1 second latency). For a parking detection system, 1-second update frequency is more than sufficient.

```javascript
// Polls /api/status/ every 1 second
function startPolling() {
  async function fetchStatus() {
    const res = await fetch(`${BASE}/api/status/`)
    const data = await res.json()
    // Update occupancy, freeCount, occCount state
  }
  fetchStatus()
  pollRef.current = setInterval(fetchStatus, 1000)
}
```

### 6.3 Video Stream - Native MJPEG via \<img\> Tag

The video stream required zero frontend changes. The LiveStreamPage already had an `<img>` tag pointed at `getStreamUrl(sessionId)`, which resolves to `http://localhost:8000/api/stream/<session_id>/`. The browser natively renders the `multipart/x-mixed-replace` response as live video.

---

## 7. Data Flow - End to End

The complete flow from user action to live detection:

### Step 1: Video Upload
User selects a video file on the Upload page. Frontend sends it via XHR to `POST /api/video/upload/`. Backend saves it to `media/videos/<uuid>.mp4` and returns the `session_id`. Frontend stores the `session_id` in Zustand state.

### Step 2: Mark Parking Slots
User draws rectangles on the video frame canvas on the Mark Slots page. Each rectangle is stored as `{x, y, w, h}` in Zustand state. On submit, the frontend converts to `{x1, y1, x2, y2}` format and POSTs to `/api/marking/`.

### Step 3: Backend Processes Marking Request
The `MarkingView` saves coordinates as pickled tuples to `Model/Positions`, kills any existing detector subprocess, then launches `main.py` with the video path.

### Step 4: main.py Runs Detection Loop
`main.py` opens the video, reads the `Positions` file, and enters an infinite loop: read frame -> grayscale -> blur -> adaptive threshold -> median blur -> dilate -> count pixels per slot -> annotate frame -> write `latest_frame.jpg` + `slot_status.json`.

### Step 5: Frontend Displays Results
The LiveStreamPage loads. The `<img>` tag fetches `/api/stream/<session_id>/` which reads `latest_frame.jpg` in a loop and streams it as MJPEG. Simultaneously, the frontend polls `/api/status/` every second to update the sidebar stats.

---

## 8. Issues & Challenges Faced During Development

### 8.1 FileNotFoundError - Hardcoded Relative Paths

**ISSUE:** Running `main.py` from inside `Backend/Model/` directory caused `FileNotFoundError` because paths like `'Backend/Model/Positions'` were relative to the repository root, not the script location.

**ERROR:**
```
FileNotFoundError: [Errno 2] No such file or directory: 'Backend/Model/Positions'
```

**FIX:** Used `os.path.dirname(os.path.abspath(__file__))` to resolve all paths relative to the script's own directory. This made `main.py` work correctly regardless of where it was invoked from.

### 8.2 ValueError - Coordinate Format Mismatch

**ISSUE:** After the marking API saved coordinates as `(x1, y1, x2, y2)` tuples, `main.py` crashed because it still tried to unpack them as `(x, y)` with fixed dimensions.

**ERROR:**
```
ValueError: too many values to unpack (expected 2)
```

**FIX:** Updated `main.py`'s `chkSpace()` function to unpack four values `(x1, y1, x2, y2)` and use them directly for cropping instead of the old fixed `w=107, h=48` approach.

### 8.3 ImportError - Stale Admin/Model References

**ISSUE:** During the initial backend setup, old auto-generated files (`admin.py`) referenced models (`ParkingSession`, `ParkingSlot`) that had been removed during cleanup, causing `ImportError` on server startup.

**ERROR:**
```
ImportError: cannot import name 'ParkingSession' from 'api.models'
```

**FIX:** Cleaned up `admin.py` and all other files to remove references to non-existent models. Reduced all files to minimal stubs.

### 8.4 Video Flickering in MJPEG Stream

**ISSUE:** The live video stream in the frontend was flickering because `main.py` and the stream endpoint were accessing `latest_frame.jpg` simultaneously. The stream would sometimes read a partially-written file, resulting in corrupted JPEG data.

**ATTEMPTED FIX 1:** Write to a `.tmp` file then use `os.replace()` for atomic rename. This broke the stream entirely on Windows because `os.replace()` can fail when another process has the target file open.

**FINAL FIX (two-part):**
- **In main.py:** Encode JPEG in memory using `cv2.imencode()` first, then write the complete byte buffer in a single `f.write()` call. This minimizes the window during which the file is in a partial state.
- **In stream endpoint:** Added JPEG validation by checking `FFD8` (start) and `FFD9` (end) markers before sending. If the current read is invalid, the endpoint re-sends the last known good frame. Also wrapped file reads in try/except for `OSError` and `PermissionError` (Windows file locking).

### 8.5 Infrastructure Complexity - WebSocket vs Polling

**ISSUE:** The original frontend was designed to receive slot status via WebSocket (Django Channels). This required installing `daphne`, `channels`, and `channels-redis`, configuring ASGI, and writing WebSocket consumers - significant complexity for a feature that only needed ~1 second update granularity.

**FIX:** Replaced WebSocket with simple HTTP polling (`GET /api/status/` every 1 second). This eliminated three dependencies (`daphne`, `channels`, `channels-redis`), removed the need for ASGI configuration, and simplified the backend to a standard WSGI Django application. The 1-second polling interval is more than adequate for parking occupancy updates.

### 8.6 cv2.waitKey() Not Working Without GUI Window

**ISSUE:** After removing `cv2.imshow()` from `main.py` (since we write frames to file instead of displaying them), `cv2.waitKey()` stopped providing the frame delay it normally does. `cv2.waitKey()` only works when a GUI window (HighGUI) is active. Without it, the script processes frames as fast as possible with no pacing.

**STATUS:** This is a known behavior. The detection still works correctly because the stream endpoint controls its own read rate (30 FPS via `time.sleep(0.03)`). However, `main.py` runs at maximum CPU speed, which is a potential optimization point.

---

## 9. Configuration Details

### 9.1 Django Settings (parking_backend/settings.py)

- `DEBUG = True` (development mode)
- `ALLOWED_HOSTS = ['*']` (accepts connections from any host)
- `CORS_ALLOW_ALL_ORIGINS = True` (allows frontend cross-origin requests)
- `MEDIA_ROOT = Backend/media/` (uploaded files and runtime data)
- Database: SQLite (`db.sqlite3`)
- Installed apps: `django`, `rest_framework`, `corsheaders`, `api`

### 9.2 Detection Threshold

The occupancy detection threshold is set at **900 pixels** in `main.py`. If the non-zero pixel count in a slot's processed crop is `>= 900`, the slot is considered occupied. This value may need tuning based on camera angle, lighting, and parking lot characteristics.

### 9.3 Stream Frame Rate

The MJPEG stream endpoint reads frames at approximately **30 FPS** (`time.sleep(0.03)` between reads). This can be adjusted in `views.py`'s `stream_video()` function.

### 9.4 Status Polling Interval

The frontend polls `/api/status/` every **1000ms (1 second)**. This is configured in `LiveStreamPage.jsx`'s `startPolling()` function and can be adjusted by changing the `setInterval` delay value.
