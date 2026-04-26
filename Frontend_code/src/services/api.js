
// ── Base URL ──────────────────────────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

// ── Helper: get token from store outside React ────────────────────────────────
function getToken() {
  try {
    const raw = localStorage.getItem('parkit-store')
    return raw ? JSON.parse(raw).state?.token : null
  } catch { return null }
}

// ── Base fetch with auth header ───────────────────────────────────────────────
async function call(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || err.message || 'Request failed')
  }
  return res.status === 204 ? null : res.json()
}

// ═══════════════════════════════════════════════════════════
// 1. AUTH  — swap mock → real when backend is ready
// ═══════════════════════════════════════════════════════════
export const authAPI = {
  login: (email, password) =>
    // call('/api/auth/login/', { method: 'POST', body: JSON.stringify({ email, password }) }),
    new Promise((res, rej) =>
      setTimeout(() => {
        if (email && password.length >= 6)
          res({ token: 'tok_' + Date.now(), user: { name: email.split('@')[0], email } })
        else rej(new Error('Invalid credentials'))
      }, 1200)
    ),

  signup: (name, email, password) =>
    // call('/api/auth/signup/', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
    new Promise((res, rej) =>
      setTimeout(() => {
        if (name && email && password.length >= 6)
          res({ token: 'tok_' + Date.now(), user: { name, email } })
        else rej(new Error('Please fill all fields'))
      }, 1400)
    ),
}

// ═══════════════════════════════════════════════════════════
// 2. VIDEO UPLOAD — POST file to backend via XHR (progress)
//    Backend must return: { session_id: "abc123" }
//    Django view: @csrf_exempt + request.FILES['video']
// ═══════════════════════════════════════════════════════════
export function uploadVideo(file, onProgress) {
  return new Promise((resolve, reject) => {
    const token = getToken()
    const form  = new FormData()
    form.append('video', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE}/api/video/upload/`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    // Track upload bytes → update progress bar in UI
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ sessionId: data.session_id || data.sessionId })
        } else {
          reject(new Error(data.detail || data.error || 'Upload failed'))
        }
      } catch {
        reject(new Error('Invalid response from server'))
      }
    }

    xhr.onerror   = () => reject(new Error('Network error — is the backend running?'))
    xhr.onabort   = () => reject(new Error('Upload cancelled'))
    xhr.send(form)
  })
}

// ── Mock upload — use this during development when backend is offline ──────
// export function uploadVideo(file, onProgress) {
//   return new Promise((resolve) => {
//     let p = 0
//     const iv = setInterval(() => {
//       p = Math.min(p + Math.random() * 15 + 5, 100)
//       onProgress(Math.round(p))
//       if (p >= 100) { clearInterval(iv); setTimeout(() => resolve({ sessionId: 'sess_dev_' + Date.now() }), 300) }
//     }, 200)
//   })
// }

// ═══════════════════════════════════════════════════════════
// 3. LIVE CAMERA — start/stop a live session (webcam or IP cam)
//    POST /api/live/start/  → { session_id, source }
//    POST /api/live/stop/   → { status: 'stopped' }
// ═══════════════════════════════════════════════════════════
export function startLiveSession(streamUrl = '') {
  return call('/api/live/start/', {
    method: 'POST',
    body: JSON.stringify({ stream_url: streamUrl }),
  })
}

export function stopLiveSession() {
  return call('/api/live/stop/', { method: 'POST', body: JSON.stringify({}) })
}

// Proxy an IP camera stream through the Django backend to avoid CORS issues.
// The browser <img> tag loads this URL instead of the raw IP camera URL.
export function getCameraProxyUrl(ipCamUrl) {
  return `${BASE}/api/camera-proxy/?url=${encodeURIComponent(ipCamUrl)}`
}

// ═══════════════════════════════════════════════════════════
// 4. COORDINATES — send marked slot array to backend
//    Format: [{ x1, y1, x2, y2 }, ...]
// ═══════════════════════════════════════════════════════════
export function saveCoordinates(sessionId, coords) {
  return call('/api/marking/', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, positions: coords }),
  })
}

// ═══════════════════════════════════════════════════════════
// 4. STREAM — MJPEG URL served by Django
//
//  Django view (views.py):
//  ┌─────────────────────────────────────────────────────────
//  │ def stream_video(request, session_id):
//  │     def frame_gen():
//  │         cap = cv2.VideoCapture(f'media/{session_id}.mp4')
//  │         while True:
//  │             ok, frame = cap.read()
//  │             if not ok: cap.set(cv2.CAP_PROP_POS_FRAMES, 0); continue
//  │             _, buf = cv2.imencode('.jpg', frame)
//  │             yield (b'--frame\r\n'
//  │                    b'Content-Type: image/jpeg\r\n\r\n'
//  │                    + buf.tobytes() + b'\r\n')
//  │     return StreamingHttpResponse(
//  │         frame_gen(),
//  │         content_type='multipart/x-mixed-replace; boundary=frame'
//  │     )
//  └─────────────────────────────────────────────────────────
//  urls.py: path('api/stream/<str:session_id>/', views.stream_video)
//
//  Frontend: <img src={getStreamUrl(sessionId)} />
//  The browser natively renders the multipart response as a live video.
// ═══════════════════════════════════════════════════════════
export function getStreamUrl(sessionId) {
  return `${BASE}/api/stream/${sessionId}/`
}

// WebSocket URL for slot status updates
export function getWebSocketUrl(sessionId) {
  const wsBase = import.meta.env.VITE_WS_BASE || 'ws://localhost:8000'
  const token  = getToken()
  return `${wsBase}/ws/parking/${sessionId}/${token ? `?token=${token}` : ''}`
}