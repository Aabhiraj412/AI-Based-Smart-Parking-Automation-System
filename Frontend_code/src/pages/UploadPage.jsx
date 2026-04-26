// import { useState, useRef, useEffect } from 'react'
// import { useNavigate }                  from 'react-router-dom'
// import { useStore }                     from '../store/useStore'
// import { uploadVideo }                  from '../services/api'
// import { NavBar, showToast }            from '../components/Common'

// export default function UploadPage() {
//   const [mode,       setModeState] = useState('upload')   // 'upload' | 'live'
//   const [file,       setFile]      = useState(null)        // selected File object
//   const [previewUrl, setPreviewUrl]= useState(null)        // object URL for <video>
//   const [camReady,   setCamReady]  = useState(false)
//   const [rtspUrl,    setRtspUrl]   = useState('')          // controlled RTSP input
//   const [progress,   setProgress]  = useState(0)
//   const [loading,    setLoading]   = useState(false)
//   const [dragging,   setDragging]  = useState(false)

//   const uploadVideoRef = useRef(null)
//   const camVideoRef    = useRef(null)   // always mounted — never in a conditional branch
//   const fileInputRef   = useRef(null)
//   const camStreamRef   = useRef(null)   // holds the live MediaStream

//   const setSessionId = useStore((s) => s.setSessionId)
//   const setVideoMode = useStore((s) => s.setVideoMode)
//   const navigate     = useNavigate()

//   // ── Cleanup: revoke object URL on change / unmount ────────────────────────────
//   useEffect(() => {
//     return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
//   }, [previewUrl])

//   // ── Cleanup: stop camera tracks on unmount ────────────────────────────────────
//   useEffect(() => {
//     return () => stopCameraStream()
//   }, [])

//   // ── Helper: tear down stream and clear the video element ─────────────────────
//   function stopCameraStream() {
//     if (camStreamRef.current) {
//       camStreamRef.current.getTracks().forEach((t) => t.stop())
//       camStreamRef.current = null
//     }
//     if (camVideoRef.current) {
//       camVideoRef.current.srcObject = null
//     }
//   }

//   // ── Mode switch ───────────────────────────────────────────────────────────────
//   function switchMode(m) {
//     if (m === mode) return
//     stopCameraStream()                    // always kill camera when leaving live mode
//     if (previewUrl) URL.revokeObjectURL(previewUrl)
//     setModeState(m)
//     setVideoMode(m)                       // sync global store
//     setFile(null)
//     setPreviewUrl(null)
//     setCamReady(false)
//     setRtspUrl('')
//     setProgress(0)
//     setLoading(false)
//   }

//   // ── File selection (click-browse & drag-drop) ─────────────────────────────────
//   function pickFile(f) {
//     if (!f) return
//     if (!f.type.startsWith('video/')) {
//       showToast('Please select a video file (MP4, AVI, MOV)', 'error')
//       return
//     }
//     if (previewUrl) URL.revokeObjectURL(previewUrl)
//     const url = URL.createObjectURL(f)
//     setFile(f)
//     setPreviewUrl(url)
//     // Assign src after React re-renders with the <video> element present
//     setTimeout(() => {
//       if (uploadVideoRef.current) {
//         uploadVideoRef.current.src = url
//         uploadVideoRef.current.load()
//       }
//     }, 0)
//   }

//   function handleDrop(e) {
//     e.preventDefault()
//     setDragging(false)
//     pickFile(e.dataTransfer.files[0])
//   }

//   function removeFile() {
//     if (previewUrl) URL.revokeObjectURL(previewUrl)
//     setFile(null)
//     setPreviewUrl(null)
//     setProgress(0)
//     if (fileInputRef.current) fileInputRef.current.value = ''
//   }

//   // ── Camera ────────────────────────────────────────────────────────────────────
//   //
//   // CRITICAL: camVideoRef.current is ALWAYS a valid DOM node because the
//   // <video ref={camVideoRef}> element lives outside any conditional branch.
//   // We assign srcObject here synchronously — no useEffect race condition.
//   //
//   async function startCamera() {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
//       camStreamRef.current = stream

//       const vid = camVideoRef.current       // guaranteed non-null
//       vid.srcObject = stream
//       vid.onloadedmetadata = () => {
//         vid.play().catch((err) => showToast('Playback error: ' + err.message, 'error'))
//       }

//       setCamReady(true)
//       showToast('Camera started', 'success')
//     } catch (e) {
//       showToast('Cannot access camera: ' + e.message, 'error')
//     }
//   }

//   function stopCamera() {
//     stopCameraStream()
//     setCamReady(false)
//   }

//   // ── Submit ────────────────────────────────────────────────────────────────────
//   async function handleSubmit() {
//     if (mode === 'upload') {
//       if (!file) { showToast('Please select a video file first', 'error'); return }

//       setLoading(true)
//       setProgress(0)
//       try {
//         const { sessionId } = await uploadVideo(file, (pct) => setProgress(pct))
//         setSessionId(sessionId)
//         showToast('Video uploaded successfully!', 'success')
//         navigate('/mark-coords')
//       } catch (e) {
//         showToast(e.message, 'error')
//         setLoading(false)
//         setProgress(0)
//       }

//     } else {
//       if (!camReady) { showToast('Start the camera first', 'error'); return }

//       setLoading(true)
//       try {
//         // Real call would pass rtspUrl to backend:
//         // const { sessionId } = await call('/api/session/live/', {
//         //   method: 'POST', body: JSON.stringify({ rtsp_url: rtspUrl || null })
//         // })
//         const sessionId = 'live_' + Date.now()
//         setSessionId(sessionId)
//         showToast('Live session started', 'success')
//         navigate('/mark-coords')
//       } catch (e) {
//         showToast(e.message, 'error')
//         setLoading(false)
//       }
//     }
//   }

//   const canSubmit = mode === 'upload' ? !!file : camReady

//   // ─────────────────────────────────────────────────────────────────────────────

//   return (
//     <>
//       <NavBar currentPath="/upload" />

//       <style>{`
//         .cam-feed-wrap {
//           position: relative;
//           width: 100%;
//           aspect-ratio: 16 / 9;
//           background: #0d1410;
//           border-radius: 10px;
//           overflow: hidden;
//           border: 1px solid rgba(29,158,117,0.25);
//         }
//         /*
//          * The video element is position:absolute to fill the wrapper.
//          * It is ALWAYS in the DOM — the overlay layer hides/shows on top.
//          * This keeps camVideoRef.current valid at all times.
//          */
//         .cam-feed-wrap video {
//           position: absolute;
//           inset: 0;
//           width: 100%;
//           height: 100%;
//           object-fit: cover;
//           display: block;
//           background: #0d1410;
//         }
//         /* Overlay: covers the video until camera is running */
//         .cam-overlay {
//           position: absolute;
//           inset: 0;
//           display: flex;
//           flex-direction: column;
//           align-items: center;
//           justify-content: center;
//           gap: 10px;
//           background: rgba(13,20,16,0.93);
//           z-index: 2;
//           transition: opacity 0.35s ease;
//         }
//         .cam-overlay.hidden {
//           opacity: 0;
//           pointer-events: none;
//         }
//         /* Corner bracket decorations */
//         .cam-feed-wrap::before, .cam-feed-wrap::after {
//           content: '';
//           position: absolute;
//           width: 20px; height: 20px;
//           border-color: rgba(29,158,117,0.55);
//           border-style: solid;
//           z-index: 3;
//           pointer-events: none;
//         }
//         .cam-feed-wrap::before { top:8px; left:8px;  border-width:2px 0 0 2px; border-radius:2px 0 0 0; }
//         .cam-feed-wrap::after  { top:8px; right:8px; border-width:2px 2px 0 0; border-radius:0 2px 0 0; }
//         .cam-corner-bl, .cam-corner-br {
//           position: absolute; width:20px; height:20px;
//           border-color: rgba(29,158,117,0.55); border-style:solid;
//           z-index:3; pointer-events:none; bottom:8px;
//         }
//         .cam-corner-bl { left:8px;  border-width:0 0 2px 2px; border-radius:0 0 0 2px; }
//         .cam-corner-br { right:8px; border-width:0 2px 2px 0; border-radius:0 0 2px 0; }
//         @keyframes livePulse {
//           0%, 100% { opacity:1; }
//           50%       { opacity:0.3; }
//         }
//         .live-dot {
//           width:8px; height:8px; border-radius:50%;
//           background:#e74c3c;
//           animation: livePulse 1.2s ease-in-out infinite;
//           flex-shrink:0;
//         }
//       `}</style>

//       <div className="video-page page-enter">

//         {/* Page title */}
//         <div style={{ marginBottom: '1.5rem' }}>
//           <h1 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '22px', marginBottom: '4px' }}>
//             Video input
//           </h1>
//           <p style={{ color: 'var(--ink3)', fontSize: '14px' }}>
//             Choose a video source to begin parking detection
//           </p>
//         </div>

//         {/* Mode selector cards */}
//         <div className="video-options">
//           <div
//             className={`video-option${mode === 'upload' ? ' selected' : ''}`}
//             onClick={() => !loading && switchMode('upload')}
//           >
//             <div className="video-option-icon">
//               <svg width="22" height="22" fill="none" stroke="#1D9E75" strokeWidth="2" viewBox="0 0 24 24">
//                 <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
//               </svg>
//             </div>
//             <h3>Upload video</h3>
//             <p>MP4, AVI, MOV up to 500 MB</p>
//           </div>

//           <div
//             className={`video-option${mode === 'live' ? ' selected' : ''}`}
//             onClick={() => !loading && switchMode('live')}
//           >
//             <div className="video-option-icon">
//               <svg width="22" height="22" fill="none" stroke="#1D9E75" strokeWidth="2" viewBox="0 0 24 24">
//                 <circle cx="12" cy="12" r="10"/>
//                 <circle cx="12" cy="12" r="3" fill="#1D9E75"/>
//               </svg>
//             </div>
//             <h3>Live camera</h3>
//             <p>Use webcam or IP camera</p>
//           </div>
//         </div>

//         {/* ══════════════════════ UPLOAD MODE ══════════════════════ */}
//         {mode === 'upload' && (
//           <div className="card" style={{ marginBottom: '1rem' }}>
//             {!file ? (
//               <div
//                 className={`drop-zone${dragging ? ' drag' : ''}`}
//                 onClick={() => fileInputRef.current?.click()}
//                 onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
//                 onDragLeave={() => setDragging(false)}
//                 onDrop={handleDrop}
//               >
//                 <div style={{ marginBottom: '12px' }}>
//                   <svg width="40" height="40" fill="none" stroke="#a3e0be" strokeWidth="1.5" viewBox="0 0 24 24">
//                     <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
//                   </svg>
//                 </div>
//                 <p style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px' }}>Drop your video here</p>
//                 <p style={{ fontSize: '13px', color: 'var(--ink3)', marginBottom: '16px' }}>
//                   or click to browse — MP4, AVI, MOV
//                 </p>
//                 <span style={{ fontSize: '12px', color: 'var(--ink3)', background: 'var(--g100)', padding: '4px 12px', borderRadius: '20px' }}>
//                   Max 500 MB
//                 </span>
//                 <input
//                   ref={fileInputRef}
//                   type="file"
//                   accept="video/mp4,video/avi,video/quicktime,video/webm,video/*"
//                   style={{ display: 'none' }}
//                   onChange={(e) => pickFile(e.target.files[0])}
//                 />
//               </div>
//             ) : (
//               <>
//                 <div className="video-preview-wrap">
//                   <video
//                     ref={uploadVideoRef}
//                     controls
//                     style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
//                   />
//                 </div>
//                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', padding: '0 4px' }}>
//                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//                     <svg width="16" height="16" fill="none" stroke="var(--g500)" strokeWidth="2" viewBox="0 0 24 24">
//                       <path d="M15 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7z"/>
//                       <polyline points="14 2 14 8 20 8"/>
//                     </svg>
//                     <span style={{ fontSize: '13px', color: 'var(--ink2)', fontWeight: 500 }}>{file.name}</span>
//                     <span style={{ fontSize: '12px', color: 'var(--ink3)' }}>
//                       ({(file.size / 1024 / 1024).toFixed(1)} MB)
//                     </span>
//                   </div>
//                   <button className="btn btn-sm btn-danger" onClick={removeFile} disabled={loading}>
//                     Remove
//                   </button>
//                 </div>
//               </>
//             )}
//           </div>
//         )}

//         {/* ══════════════════════ LIVE CAMERA MODE ══════════════════════
//          *
//          * The <video ref={camVideoRef}> element is rendered unconditionally
//          * INSIDE this mode block but OUTSIDE any nested conditional — it is
//          * always in the DOM while mode === 'live'. The overlay div floats
//          * on top and fades out once the camera is running, so the video
//          * element is never remounted and camVideoRef.current never goes null.
//          */}
//         {mode === 'live' && (
//           <div className="card" style={{ marginBottom: '1rem' }}>

//             {/* Controlled RTSP URL input */}
//             <div className="form-group" style={{ marginBottom: '14px' }}>
//               <label className="form-label">Camera stream URL (optional)</label>
//               <input
//                 className="form-input"
//                 placeholder="rtsp://192.168.1.x:554/stream  — or leave blank for webcam"
//                 value={rtspUrl}
//                 onChange={(e) => setRtspUrl(e.target.value)}
//                 disabled={camReady || loading}
//               />
//               <span className="form-hint" style={{ marginTop: '4px', display: 'block' }}>
//                 Leave blank to use your computer's built-in webcam
//               </span>
//             </div>

//             {/* Camera feed + overlay */}
//             <div className="cam-feed-wrap">
//               <div className="cam-corner-bl" />
//               <div className="cam-corner-br" />

//               {/* Always present — srcObject assigned synchronously in startCamera() */}
//               <video ref={camVideoRef} autoPlay muted playsInline />

//               {/* Overlay fades away once camReady = true */}
//               <div className={`cam-overlay${camReady ? ' hidden' : ''}`}>
//                 <div style={{
//                   width: '52px', height: '52px', borderRadius: '50%',
//                   border: '1.5px solid rgba(29,158,117,0.4)',
//                   display: 'flex', alignItems: 'center', justifyContent: 'center',
//                 }}>
//                   <svg width="24" height="24" fill="none" stroke="rgba(29,158,117,0.75)" strokeWidth="1.5" viewBox="0 0 24 24">
//                     <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M4 8h11a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/>
//                   </svg>
//                 </div>
//                 <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '4px 0 2px' }}>
//                   Camera not started
//                 </p>
//                 <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '0 0 14px' }}>
//                   Click below to request camera access
//                 </p>
//                 <button
//                   className="btn btn-outline btn-sm"
//                   style={{ borderColor: 'rgba(29,158,117,0.5)', color: 'rgba(29,158,117,0.9)' }}
//                   onClick={startCamera}
//                   disabled={loading}
//                 >
//                   Start camera
//                 </button>
//               </div>
//             </div>

//             {/* Live status bar */}
//             {camReady && (
//               <div style={{
//                 display: 'flex', alignItems: 'center', justifyContent: 'space-between',
//                 marginTop: '10px', padding: '0 2px',
//               }}>
//                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//                   <div className="live-dot" />
//                   <span style={{ fontSize: '13px', color: 'var(--g600)', fontWeight: 500 }}>
//                     Camera live — ready to continue
//                   </span>
//                 </div>
//                 <button
//                   className="btn btn-sm btn-danger"
//                   onClick={stopCamera}
//                   disabled={loading}
//                 >
//                   Stop
//                 </button>
//               </div>
//             )}
//           </div>
//         )}

//         {/* Upload progress bar */}
//         {loading && mode === 'upload' && (
//           <div style={{ marginBottom: '1rem' }}>
//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '8px' }}>
//               <span style={{ color: 'var(--ink2)', fontWeight: 500 }}>
//                 {progress < 100 ? 'Uploading to server…' : 'Processing…'}
//               </span>
//               <span style={{ fontWeight: 600, color: 'var(--g500)', fontSize: '14px' }}>{progress}%</span>
//             </div>
//             <div className="progress-wrap">
//               <div className="progress-bar" style={{ width: progress + '%' }} />
//             </div>
//             <p style={{ fontSize: '11px', color: 'var(--ink3)', marginTop: '6px' }}>
//               {file?.name} · {(file?.size / 1024 / 1024).toFixed(1)} MB
//             </p>
//           </div>
//         )}

//         {/* Action buttons */}
//         <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
//           <button
//             className="btn btn-outline"
//             onClick={() => navigate('/login')}
//             disabled={loading}
//           >
//             Back
//           </button>
//           <button
//             className="btn btn-primary"
//             onClick={handleSubmit}
//             disabled={!canSubmit || loading}
//           >
//             {loading
//               ? <><div className="spinner" /> {mode === 'upload' && progress < 100 ? `${progress}%` : 'Processing…'}</>
//               : 'Continue to marking →'
//             }
//           </button>
//         </div>

//       </div>
//     </>
//   )
// }


// import { useState, useRef, useEffect } from 'react'
// import { useNavigate }                  from 'react-router-dom'
// import { useStore }                     from '../store/useStore'
// import { uploadVideo }                  from '../services/api'
// import { NavBar, showToast }            from '../components/Common'

// // ── Snapshot extractor ────────────────────────────────────────────────────────
// // Robustly extracts a real decoded frame from a video File.
// //
// // Problem with naive implementations:
// //   video.onseeked fires as soon as the seek position is set, but the browser
// //   may not have decoded the frame yet — drawImage() then captures a black
// //   or previous frame. We solve this with a short rAF loop that retries
// //   until the canvas is non-black, falling back after 30 attempts (~500ms).
// //
// function extractSnapshot(file) {
//   return new Promise((resolve, reject) => {
//     const video  = document.createElement('video')
//     const canvas = document.createElement('canvas')
//     const url    = URL.createObjectURL(file)

//     video.src          = url
//     video.muted        = true
//     video.preload      = 'auto'       // 'auto' ensures full decode, not just metadata
//     video.crossOrigin  = 'anonymous'

//     const cleanup = () => {
//       URL.revokeObjectURL(url)
//       video.src = ''                  // release browser media resource + camera light
//     }

//     video.onloadedmetadata = () => {
//       // Seek to 5% of duration, min 0.5s, max 3s — avoids black intros
//       const target = Math.min(Math.max(video.duration * 0.05, 0.5), 3)
//       video.currentTime = isFinite(target) ? target : 0.5
//     }

//     video.onseeked = () => {
//       canvas.width  = video.videoWidth  || 640
//       canvas.height = video.videoHeight || 360
//       const ctx     = canvas.getContext('2d')

//       // Retry loop: keep drawing until we get a non-black frame or give up
//       let attempts = 0
//       const tryDraw = () => {
//         ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

//         // Sample centre pixel — if r+g+b > 10, frame has real content
//         const [r, g, b] = ctx.getImageData(
//           Math.floor(canvas.width  / 2),
//           Math.floor(canvas.height / 2),
//           1, 1
//         ).data
//         const hasContent = (r + g + b) > 10

//         if (hasContent || attempts >= 30) {
//           cleanup()
//           resolve({
//             dataURL: canvas.toDataURL('image/jpeg', 0.88),
//             width:   canvas.width,
//             height:  canvas.height,
//           })
//         } else {
//           attempts++
//           requestAnimationFrame(tryDraw)
//         }
//       }

//       requestAnimationFrame(tryDraw)
//     }

//     video.onerror = () => {
//       cleanup()
//       reject(new Error('Could not decode video file'))
//     }

//     video.load()
//   })
// }
// // ─────────────────────────────────────────────────────────────────────────────

// export default function UploadPage() {
//   const [mode,        setModeState]  = useState('upload')
//   const [file,        setFile]       = useState(null)
//   const [previewUrl,  setPreviewUrl] = useState(null)
//   const [camReady,    setCamReady]   = useState(false)
//   const [rtspUrl,     setRtspUrl]    = useState('')
//   const [progress,    setProgress]   = useState(0)
//   const [loading,     setLoading]    = useState(false)
//   const [dragging,    setDragging]   = useState(false)
//   const [snapState,   setSnapState]  = useState('idle') // 'idle'|'loading'|'done'|'failed'

//   const uploadVideoRef = useRef(null)
//   const camVideoRef    = useRef(null)
//   const fileInputRef   = useRef(null)
//   const camStreamRef   = useRef(null)

//   const setSessionId = useStore((s) => s.setSessionId)
//   const setVideoMode = useStore((s) => s.setVideoMode)
//   const setFrameSnap = useStore((s) => s.setFrameSnap)

//   const navigate = useNavigate()

//   useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])
//   useEffect(() => () => stopCameraStream(), [])

//   function stopCameraStream() {
//     if (camStreamRef.current) {
//       camStreamRef.current.getTracks().forEach((t) => t.stop())
//       camStreamRef.current = null
//     }
//     if (camVideoRef.current) camVideoRef.current.srcObject = null
//   }

//   // ── Mode switch ───────────────────────────────────────────────────────────────
//   function switchMode(m) {
//     if (m === mode) return
//     stopCameraStream()
//     if (previewUrl) URL.revokeObjectURL(previewUrl)
//     setModeState(m); setVideoMode(m)
//     setFile(null); setPreviewUrl(null)
//     setCamReady(false); setRtspUrl('')
//     setProgress(0); setLoading(false)
//     setSnapState('idle'); setFrameSnap(null)
//   }

//   // ── File selection ────────────────────────────────────────────────────────────
//   async function pickFile(f) {
//     if (!f) return
//     if (!f.type.startsWith('video/')) {
//       showToast('Please select a video file (MP4, AVI, MOV)', 'error'); return
//     }

//     if (previewUrl) URL.revokeObjectURL(previewUrl)
//     const url = URL.createObjectURL(f)
//     setFile(f)
//     setPreviewUrl(url)
//     setFrameSnap(null)
//     setSnapState('loading')

//     // Wire preview player
//     setTimeout(() => {
//       if (uploadVideoRef.current) {
//         uploadVideoRef.current.src = url
//         uploadVideoRef.current.load()
//       }
//     }, 0)

//     // Extract snapshot for MarkCoordsPage
//     try {
//       const snap = await extractSnapshot(f)
//       setFrameSnap(snap)
//       setSnapState('done')
//       showToast('Frame snapshot ready ✓', 'success')
//     } catch (err) {
//       setSnapState('failed')
//       setFrameSnap(null)
//       showToast('Snapshot failed — placeholder will be used on marking page', 'warning')
//     }
//   }

//   function handleDrop(e) {
//     e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0])
//   }

//   function removeFile() {
//     if (previewUrl) URL.revokeObjectURL(previewUrl)
//     setFile(null); setPreviewUrl(null)
//     setProgress(0); setSnapState('idle'); setFrameSnap(null)
//     if (fileInputRef.current) fileInputRef.current.value = ''
//   }

//   // ── Camera ────────────────────────────────────────────────────────────────────
//   async function startCamera() {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
//       camStreamRef.current = stream
//       const vid = camVideoRef.current
//       vid.srcObject = stream
//       vid.onloadedmetadata = () => vid.play().catch((e) => showToast('Playback error: ' + e.message, 'error'))
//       setCamReady(true)
//       showToast('Camera started', 'success')
//     } catch (e) {
//       showToast('Cannot access camera: ' + e.message, 'error')
//     }
//   }

//   function stopCamera() { stopCameraStream(); setCamReady(false) }

//   function captureLiveSnapshot() {
//     const vid = camVideoRef.current
//     if (!vid || !camReady) return
//     const canvas  = document.createElement('canvas')
//     canvas.width  = vid.videoWidth  || 640
//     canvas.height = vid.videoHeight || 360
//     canvas.getContext('2d').drawImage(vid, 0, 0, canvas.width, canvas.height)
//     setFrameSnap({ dataURL: canvas.toDataURL('image/jpeg', 0.88), width: canvas.width, height: canvas.height })
//     showToast('Frame captured for slot marking ✓', 'success')
//   }

//   // ── Submit ────────────────────────────────────────────────────────────────────
//   async function handleSubmit() {
//     if (mode === 'upload') {
//       if (!file) { showToast('Please select a video file first', 'error'); return }
//       setLoading(true); setProgress(0)
//       try {
//         const { sessionId } = await uploadVideo(file, (pct) => setProgress(pct))
//         setSessionId(sessionId)
//         showToast('Video uploaded successfully!', 'success')
//         navigate('/mark-coords')
//       } catch (e) {
//         showToast(e.message, 'error'); setLoading(false); setProgress(0)
//       }
//     } else {
//       if (!camReady) { showToast('Start the camera first', 'error'); return }
//       captureLiveSnapshot()
//       setLoading(true)
//       try {
//         const sessionId = 'live_' + Date.now()
//         setSessionId(sessionId)
//         showToast('Live session started', 'success')
//         navigate('/mark-coords')
//       } catch (e) {
//         showToast(e.message, 'error'); setLoading(false)
//       }
//     }
//   }

//   const snapLoading = snapState === 'loading'
//   // Allow submit even if snapshot failed — MarkCoordsPage has a placeholder fallback
//   const canSubmit   = mode === 'upload' ? !!file && !snapLoading : camReady

//   // Snap strip content
//   const snapStrip = file && (
//     <div style={{
//       display:'flex', alignItems:'center', gap:'10px',
//       marginTop:'10px', padding:'8px 12px',
//       background: snapState === 'failed' ? 'rgba(231,76,60,0.06)' : 'var(--g50,#f5f7f5)',
//       borderRadius:'8px',
//       border: `1px solid ${
//         snapState === 'loading' ? 'rgba(29,158,117,0.2)' :
//         snapState === 'done'    ? 'rgba(29,158,117,0.3)' :
//         snapState === 'failed'  ? 'rgba(231,76,60,0.25)' : 'transparent'
//       }`,
//     }}>
//       {snapState === 'loading' && (
//         <><div className="spinner" style={{ width:'14px', height:'14px', flexShrink:0 }} />
//         <span style={{ fontSize:'12px', color:'var(--ink3)' }}>Extracting frame snapshot…</span></>
//       )}
//       {snapState === 'done' && (
//         <><svg width="14" height="14" fill="none" stroke="#1D9E75" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
//           <path d="M20 7L9 18l-5-5"/></svg>
//         <span style={{ fontSize:'12px', color:'var(--g600)', fontWeight:500 }}>
//           Frame snapshot ready — marking canvas will show your actual video frame
//         </span></>
//       )}
//       {snapState === 'failed' && (
//         <><svg width="14" height="14" fill="none" stroke="#e74c3c" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
//           <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
//         <span style={{ fontSize:'12px', color:'#c0392b' }}>
//           Snapshot failed — placeholder grid will be used. You can still mark coordinates.
//         </span></>
//       )}
//     </div>
//   )

//   return (
//     <>
//       <NavBar currentPath="/upload" />

//       <style>{`
//         .cam-feed-wrap {
//           position:relative; width:100%; aspect-ratio:16/9;
//           background:#0d1410; border-radius:10px; overflow:hidden;
//           border:1px solid rgba(29,158,117,0.25);
//         }
//         .cam-feed-wrap video {
//           position:absolute; inset:0; width:100%; height:100%;
//           object-fit:cover; display:block; background:#0d1410;
//         }
//         .cam-overlay {
//           position:absolute; inset:0;
//           display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px;
//           background:rgba(13,20,16,0.93); z-index:2; transition:opacity 0.35s ease;
//         }
//         .cam-overlay.hidden { opacity:0; pointer-events:none; }
//         .cam-feed-wrap::before,.cam-feed-wrap::after {
//           content:''; position:absolute; width:20px; height:20px;
//           border-color:rgba(29,158,117,0.55); border-style:solid; z-index:3; pointer-events:none;
//         }
//         .cam-feed-wrap::before { top:8px; left:8px;  border-width:2px 0 0 2px; border-radius:2px 0 0 0; }
//         .cam-feed-wrap::after  { top:8px; right:8px; border-width:2px 2px 0 0; border-radius:0 2px 0 0; }
//         .cam-corner-bl,.cam-corner-br {
//           position:absolute; width:20px; height:20px;
//           border-color:rgba(29,158,117,0.55); border-style:solid; z-index:3; pointer-events:none; bottom:8px;
//         }
//         .cam-corner-bl { left:8px;  border-width:0 0 2px 2px; border-radius:0 0 0 2px; }
//         .cam-corner-br { right:8px; border-width:0 2px 2px 0; border-radius:0 0 2px 0; }
//         @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
//         .live-dot { width:8px; height:8px; border-radius:50%; background:#e74c3c; animation:livePulse 1.2s ease-in-out infinite; flex-shrink:0; }
//       `}</style>

//       <div className="video-page page-enter">
//         <div style={{ marginBottom:'1.5rem' }}>
//           <h1 style={{ fontFamily:'Space Grotesk', fontWeight:700, fontSize:'22px', marginBottom:'4px' }}>Video input</h1>
//           <p style={{ color:'var(--ink3)', fontSize:'14px' }}>Choose a video source to begin parking detection</p>
//         </div>

//         {/* Mode selector */}
//         <div className="video-options">
//           <div className={`video-option${mode==='upload'?' selected':''}`} onClick={() => !loading && switchMode('upload')}>
//             <div className="video-option-icon">
//               <svg width="22" height="22" fill="none" stroke="#1D9E75" strokeWidth="2" viewBox="0 0 24 24">
//                 <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
//               </svg>
//             </div>
//             <h3>Upload video</h3><p>MP4, AVI, MOV up to 500 MB</p>
//           </div>
//           <div className={`video-option${mode==='live'?' selected':''}`} onClick={() => !loading && switchMode('live')}>
//             <div className="video-option-icon">
//               <svg width="22" height="22" fill="none" stroke="#1D9E75" strokeWidth="2" viewBox="0 0 24 24">
//                 <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="#1D9E75"/>
//               </svg>
//             </div>
//             <h3>Live camera</h3><p>Use webcam or IP camera</p>
//           </div>
//         </div>

//         {/* ══ UPLOAD MODE ══ */}
//         {mode === 'upload' && (
//           <div className="card" style={{ marginBottom:'1rem' }}>
//             {!file ? (
//               <div
//                 className={`drop-zone${dragging?' drag':''}`}
//                 onClick={() => fileInputRef.current?.click()}
//                 onDragOver={(e)=>{ e.preventDefault(); setDragging(true) }}
//                 onDragLeave={()=>setDragging(false)}
//                 onDrop={handleDrop}
//               >
//                 <div style={{ marginBottom:'12px' }}>
//                   <svg width="40" height="40" fill="none" stroke="#a3e0be" strokeWidth="1.5" viewBox="0 0 24 24">
//                     <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
//                   </svg>
//                 </div>
//                 <p style={{ fontSize:'15px', fontWeight:500, marginBottom:'6px' }}>Drop your video here</p>
//                 <p style={{ fontSize:'13px', color:'var(--ink3)', marginBottom:'16px' }}>or click to browse — MP4, AVI, MOV</p>
//                 <span style={{ fontSize:'12px', color:'var(--ink3)', background:'var(--g100)', padding:'4px 12px', borderRadius:'20px' }}>Max 500 MB</span>
//                 <input ref={fileInputRef} type="file"
//                   accept="video/mp4,video/avi,video/quicktime,video/webm,video/*"
//                   style={{ display:'none' }} onChange={(e)=>pickFile(e.target.files[0])} />
//               </div>
//             ) : (
//               <>
//                 <div className="video-preview-wrap">
//                   <video ref={uploadVideoRef} controls
//                     style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }} />
//                 </div>
//                 <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'10px', padding:'0 4px' }}>
//                   <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
//                     <svg width="16" height="16" fill="none" stroke="var(--g500)" strokeWidth="2" viewBox="0 0 24 24">
//                       <path d="M15 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7z"/>
//                       <polyline points="14 2 14 8 20 8"/>
//                     </svg>
//                     <span style={{ fontSize:'13px', color:'var(--ink2)', fontWeight:500 }}>{file.name}</span>
//                     <span style={{ fontSize:'12px', color:'var(--ink3)' }}>({(file.size/1024/1024).toFixed(1)} MB)</span>
//                   </div>
//                   <button className="btn btn-sm btn-danger" onClick={removeFile} disabled={loading}>Remove</button>
//                 </div>
//                 {snapStrip}
//               </>
//             )}
//           </div>
//         )}

//         {/* ══ LIVE CAMERA MODE ══ */}
//         {mode === 'live' && (
//           <div className="card" style={{ marginBottom:'1rem' }}>
//             <div className="form-group" style={{ marginBottom:'14px' }}>
//               <label className="form-label">Camera stream URL (optional)</label>
//               <input className="form-input"
//                 placeholder="rtsp://192.168.1.x:554/stream  — or leave blank for webcam"
//                 value={rtspUrl} onChange={(e)=>setRtspUrl(e.target.value)}
//                 disabled={camReady || loading} />
//               <span className="form-hint" style={{ marginTop:'4px', display:'block' }}>
//                 Leave blank to use your computer's built-in webcam
//               </span>
//             </div>
//             <div className="cam-feed-wrap">
//               <div className="cam-corner-bl" /><div className="cam-corner-br" />
//               <video ref={camVideoRef} autoPlay muted playsInline />
//               <div className={`cam-overlay${camReady?' hidden':''}`}>
//                 <div style={{ width:'52px', height:'52px', borderRadius:'50%', border:'1.5px solid rgba(29,158,117,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
//                   <svg width="24" height="24" fill="none" stroke="rgba(29,158,117,0.75)" strokeWidth="1.5" viewBox="0 0 24 24">
//                     <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M4 8h11a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/>
//                   </svg>
//                 </div>
//                 <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.7)', margin:'4px 0 2px' }}>Camera not started</p>
//                 <p style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', margin:'0 0 14px' }}>Click below to request camera access</p>
//                 <button className="btn btn-outline btn-sm"
//                   style={{ borderColor:'rgba(29,158,117,0.5)', color:'rgba(29,158,117,0.9)' }}
//                   onClick={startCamera} disabled={loading}>Start camera</button>
//               </div>
//             </div>
//             {camReady && (
//               <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'10px', padding:'0 2px' }}>
//                 <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
//                   <div className="live-dot" />
//                   <span style={{ fontSize:'13px', color:'var(--g600)', fontWeight:500 }}>Camera live — ready to continue</span>
//                 </div>
//                 <div style={{ display:'flex', gap:'8px' }}>
//                   <button className="btn btn-sm btn-outline" onClick={captureLiveSnapshot} disabled={loading}
//                     title="Capture current frame for coordinate marking">📸 Capture frame</button>
//                   <button className="btn btn-sm btn-danger" onClick={stopCamera} disabled={loading}>Stop</button>
//                 </div>
//               </div>
//             )}
//           </div>
//         )}

//         {/* Upload progress */}
//         {loading && mode === 'upload' && (
//           <div style={{ marginBottom:'1rem' }}>
//             <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'13px', marginBottom:'8px' }}>
//               <span style={{ color:'var(--ink2)', fontWeight:500 }}>{progress < 100 ? 'Uploading to server…' : 'Processing…'}</span>
//               <span style={{ fontWeight:600, color:'var(--g500)', fontSize:'14px' }}>{progress}%</span>
//             </div>
//             <div className="progress-wrap">
//               <div className="progress-bar" style={{ width:progress+'%' }} />
//             </div>
//             <p style={{ fontSize:'11px', color:'var(--ink3)', marginTop:'6px' }}>
//               {file?.name} · {(file?.size/1024/1024).toFixed(1)} MB
//             </p>
//           </div>
//         )}

//         {/* Actions */}
//         <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
//           <button className="btn btn-outline" onClick={() => navigate('/login')} disabled={loading}>Back</button>
//           <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit || loading}>
//             {loading
//               ? <><div className="spinner" />{mode==='upload' && progress < 100 ? ` ${progress}%` : ' Processing…'}</>
//               : snapLoading ? 'Extracting frame…' : 'Continue to marking →'
//             }
//           </button>
//         </div>
//       </div>
//     </>
//   )
// }

import { useState, useRef, useEffect } from 'react'
import { useNavigate }                  from 'react-router-dom'
import { useStore }                     from '../store/useStore'
import { uploadVideo, startLiveSession, getCameraProxyUrl } from '../services/api'
import { NavBar, showToast }            from '../components/Common'

// ── Snapshot extractor ────────────────────────────────────────────────────────
// Extracts a real decoded frame from a video File.
// Retries via rAF until the canvas has non-black content (up to 30 attempts).
function extractSnapshot(file) {
  return new Promise((resolve, reject) => {
    const video  = document.createElement('video')
    const canvas = document.createElement('canvas')
    const url    = URL.createObjectURL(file)

    video.src         = url
    video.muted       = true
    video.preload     = 'auto'
    video.crossOrigin = 'anonymous'

    const cleanup = () => { URL.revokeObjectURL(url); video.src = '' }

    video.onloadedmetadata = () => {
      const target = Math.min(Math.max(video.duration * 0.05, 0.5), 3)
      video.currentTime = isFinite(target) ? target : 0.5
    }

    video.onseeked = () => {
      canvas.width  = video.videoWidth  || 640
      canvas.height = video.videoHeight || 360
      const ctx     = canvas.getContext('2d')
      let attempts  = 0

      const tryDraw = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const [r, g, b] = ctx.getImageData(
          Math.floor(canvas.width / 2),
          Math.floor(canvas.height / 2),
          1, 1
        ).data
        if ((r + g + b) > 10 || attempts >= 30) {
          cleanup()
          resolve({ dataURL: canvas.toDataURL('image/jpeg', 0.88), width: canvas.width, height: canvas.height })
        } else {
          attempts++
          requestAnimationFrame(tryDraw)
        }
      }
      requestAnimationFrame(tryDraw)
    }

    video.onerror = () => { cleanup(); reject(new Error('Could not decode video file')) }
    video.load()
  })
}

// ─────────────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const [mode,       setModeState]  = useState('upload')
  const [file,       setFile]       = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [camReady,   setCamReady]   = useState(false)
  const [rtspUrl,    setRtspUrl]    = useState('')
  const [progress,   setProgress]   = useState(0)
  const [loading,    setLoading]    = useState(false)
  const [dragging,   setDragging]   = useState(false)
  const [snapState,  setSnapState]  = useState('idle') // 'idle'|'loading'|'done'|'failed'

  const [ipStreamActive, setIpStreamActive] = useState(false) // true when showing IP cam feed

  const uploadVideoRef = useRef(null)
  const camVideoRef    = useRef(null)
  const ipImgRef       = useRef(null)   // ref for IP camera <img> preview
  const fileInputRef   = useRef(null)
  const camStreamRef   = useRef(null)

  const setSessionId = useStore((s) => s.setSessionId)
  const setVideoMode = useStore((s) => s.setVideoMode)
  const setFrameSnap = useStore((s) => s.setFrameSnap)
  const navigate     = useNavigate()

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])
  useEffect(() => () => stopCameraStream(), [])

  function stopCameraStream() {
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach((t) => t.stop())
      camStreamRef.current = null
    }
    if (camVideoRef.current) camVideoRef.current.srcObject = null
  }

  // ── Mode switch ───────────────────────────────────────────────────────────
  function switchMode(m) {
    if (m === mode) return
    stopCameraStream()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setModeState(m); setVideoMode(m)
    setFile(null); setPreviewUrl(null)
    setCamReady(false); setRtspUrl('')
    setIpStreamActive(false)
    setProgress(0); setLoading(false)
    setSnapState('idle'); setFrameSnap(null)
  }

  // ── File selection ────────────────────────────────────────────────────────
  async function pickFile(f) {
    if (!f) return
    if (!f.type.startsWith('video/')) {
      showToast('Please select a video file (MP4, AVI, MOV)', 'error'); return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const url = URL.createObjectURL(f)
    setFile(f); setPreviewUrl(url)
    setFrameSnap(null); setSnapState('loading')

    setTimeout(() => {
      if (uploadVideoRef.current) {
        uploadVideoRef.current.src = url
        uploadVideoRef.current.load()
      }
    }, 0)

    try {
      const snap = await extractSnapshot(f)
      setFrameSnap(snap); setSnapState('done')
      showToast('Frame snapshot ready ✓', 'success')
    } catch {
      setSnapState('failed'); setFrameSnap(null)
      showToast('Snapshot failed — placeholder will be used on marking page', 'info')
    }
  }

  function handleDrop(e) { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]) }

  function removeFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null); setPreviewUrl(null)
    setProgress(0); setSnapState('idle'); setFrameSnap(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Camera ────────────────────────────────────────────────────────────────
  async function startCamera() {
    const url = rtspUrl.trim()

    if (url) {
      // IP camera: show the HTTP stream in an <img> tag — no getUserMedia needed
      setIpStreamActive(true)
      setCamReady(true)
      showToast('IP camera stream connected', 'success')
    } else {
      // Local webcam: use getUserMedia
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        camStreamRef.current = stream
        const vid = camVideoRef.current
        vid.srcObject = stream
        vid.onloadedmetadata = () => vid.play().catch((e) => showToast('Playback error: ' + e.message, 'error'))
        setIpStreamActive(false)
        setCamReady(true)
        showToast('Camera started', 'success')
      } catch (e) {
        showToast('Cannot access camera: ' + e.message, 'error')
      }
    }
  }

  function stopCamera() {
    stopCameraStream()
    setIpStreamActive(false)
    setCamReady(false)
  }

  function captureLiveSnapshot() {
    if (!camReady) return
    const canvas = document.createElement('canvas')

    if (ipStreamActive && ipImgRef.current) {
      // IP camera: capture from the <img> element
      const img = ipImgRef.current
      canvas.width  = img.naturalWidth  || 640
      canvas.height = img.naturalHeight || 360
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    } else if (camVideoRef.current) {
      // Local webcam: capture from the <video> element
      const vid = camVideoRef.current
      canvas.width  = vid.videoWidth  || 640
      canvas.height = vid.videoHeight || 360
      canvas.getContext('2d').drawImage(vid, 0, 0, canvas.width, canvas.height)
    } else {
      return
    }

    setFrameSnap({ dataURL: canvas.toDataURL('image/jpeg', 0.88), width: canvas.width, height: canvas.height })
    showToast('Frame captured for slot marking', 'success')
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (mode === 'upload') {
      if (!file) { showToast('Please select a video file first', 'error'); return }
      setLoading(true); setProgress(0)
      try {
        const { sessionId } = await uploadVideo(file, (pct) => setProgress(pct))
        setSessionId(sessionId)
        showToast('Video uploaded successfully!', 'success')
        navigate('/mark-coords')
      } catch (e) {
        showToast(e.message, 'error'); setLoading(false); setProgress(0)
      }
    } else {
      if (!camReady) { showToast('Start the camera first', 'error'); return }
      captureLiveSnapshot()
      setLoading(true)
      try {
        const { session_id } = await startLiveSession(rtspUrl)
        setSessionId(session_id)
        showToast('Live session started', 'success')
        navigate('/mark-coords')
      } catch (e) {
        showToast(e.message, 'error'); setLoading(false)
      }
    }
  }

  const snapLoading = snapState === 'loading'
  const canSubmit   = mode === 'upload' ? !!file && !snapLoading : camReady

  const snapStrip = file && (
    <div style={{
      display:'flex', alignItems:'center', gap:'10px',
      marginTop:'10px', padding:'8px 12px',
      background: snapState === 'failed' ? 'rgba(231,76,60,0.06)' : 'var(--g50)',
      borderRadius:'8px',
      border:`1px solid ${
        snapState === 'loading' ? 'rgba(29,158,117,0.2)' :
        snapState === 'done'    ? 'rgba(29,158,117,0.3)' :
        snapState === 'failed'  ? 'rgba(231,76,60,0.25)' : 'transparent'
      }`,
    }}>
      {snapState === 'loading' && (
        <><div className="spinner" style={{ width:'14px', height:'14px', flexShrink:0 }}/>
        <span style={{ fontSize:'12px', color:'var(--ink3)' }}>Extracting frame snapshot…</span></>
      )}
      {snapState === 'done' && (
        <><svg width="14" height="14" fill="none" stroke="#1D9E75" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
          <path d="M20 7L9 18l-5-5"/></svg>
        <span style={{ fontSize:'12px', color:'var(--g600)', fontWeight:500 }}>
          Frame snapshot ready — marking canvas will show your actual video frame
        </span></>
      )}
      {snapState === 'failed' && (
        <><svg width="14" height="14" fill="none" stroke="#e74c3c" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        <span style={{ fontSize:'12px', color:'#c0392b' }}>
          Snapshot failed — placeholder grid will be used. You can still mark coordinates.
        </span></>
      )}
    </div>
  )

  return (
    <>
      <NavBar currentPath="/upload" />

      <style>{`
        .cam-feed-wrap {
          position:relative; width:100%; aspect-ratio:16/9;
          background:#0d1410; border-radius:10px; overflow:hidden;
          border:1px solid rgba(29,158,117,0.25);
        }
        .cam-feed-wrap video {
          position:absolute; inset:0; width:100%; height:100%;
          object-fit:cover; display:block; background:#0d1410;
        }
        .cam-overlay {
          position:absolute; inset:0;
          display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px;
          background:rgba(13,20,16,0.93); z-index:2; transition:opacity 0.35s ease;
        }
        .cam-overlay.hidden { opacity:0; pointer-events:none; }
        .cam-feed-wrap::before,.cam-feed-wrap::after {
          content:''; position:absolute; width:20px; height:20px;
          border-color:rgba(29,158,117,0.55); border-style:solid; z-index:3; pointer-events:none;
        }
        .cam-feed-wrap::before { top:8px; left:8px;  border-width:2px 0 0 2px; border-radius:2px 0 0 0; }
        .cam-feed-wrap::after  { top:8px; right:8px; border-width:2px 2px 0 0; border-radius:0 2px 0 0; }
        .cam-corner-bl,.cam-corner-br {
          position:absolute; width:20px; height:20px;
          border-color:rgba(29,158,117,0.55); border-style:solid; z-index:3; pointer-events:none; bottom:8px;
        }
        .cam-corner-bl { left:8px;  border-width:0 0 2px 2px; border-radius:0 0 0 2px; }
        .cam-corner-br { right:8px; border-width:0 2px 2px 0; border-radius:0 0 2px 0; }
        @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .live-dot { width:8px; height:8px; border-radius:50%; background:#e74c3c; animation:livePulse 1.2s ease-in-out infinite; flex-shrink:0; }
      `}</style>

      <div className="video-page page-enter">
        <div style={{ marginBottom:'1.5rem' }}>
          <h1 style={{ fontFamily:'Space Grotesk', fontWeight:700, fontSize:'22px', marginBottom:'4px' }}>Video input</h1>
          <p style={{ color:'var(--ink3)', fontSize:'14px' }}>Choose a video source to begin parking detection</p>
        </div>

        {/* Mode selector */}
        <div className="video-options">
          <div className={`video-option${mode==='upload'?' selected':''}`} onClick={() => !loading && switchMode('upload')}>
            <div className="video-option-icon">
              <svg width="22" height="22" fill="none" stroke="#1D9E75" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
            </div>
            <h3>Upload video</h3><p>MP4, AVI, MOV up to 500 MB</p>
          </div>
          <div className={`video-option${mode==='live'?' selected':''}`} onClick={() => !loading && switchMode('live')}>
            <div className="video-option-icon">
              <svg width="22" height="22" fill="none" stroke="#1D9E75" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="#1D9E75"/>
              </svg>
            </div>
            <h3>Live camera</h3><p>Use webcam or IP camera</p>
          </div>
        </div>

        {/* ── UPLOAD MODE ── */}
        {mode === 'upload' && (
          <div className="card" style={{ marginBottom:'1rem' }}>
            {!file ? (
              <div
                className={`drop-zone${dragging?' drag':''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <div style={{ marginBottom:'12px' }}>
                  <svg width="40" height="40" fill="none" stroke="#a3e0be" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                </div>
                <p style={{ fontSize:'15px', fontWeight:500, marginBottom:'6px' }}>Drop your video here</p>
                <p style={{ fontSize:'13px', color:'var(--ink3)', marginBottom:'16px' }}>or click to browse — MP4, AVI, MOV</p>
                <span style={{ fontSize:'12px', color:'var(--ink3)', background:'var(--g100)', padding:'4px 12px', borderRadius:'20px' }}>Max 500 MB</span>
                <input ref={fileInputRef} type="file"
                  accept="video/mp4,video/avi,video/quicktime,video/webm,video/*"
                  style={{ display:'none' }} onChange={(e) => pickFile(e.target.files[0])} />
              </div>
            ) : (
              <>
                <div className="video-preview-wrap">
                  <video ref={uploadVideoRef} controls
                    style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }} />
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'10px', padding:'0 4px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <svg width="16" height="16" fill="none" stroke="var(--g500)" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M15 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span style={{ fontSize:'13px', color:'var(--ink2)', fontWeight:500 }}>{file.name}</span>
                    <span style={{ fontSize:'12px', color:'var(--ink3)' }}>({(file.size/1024/1024).toFixed(1)} MB)</span>
                  </div>
                  <button className="btn btn-sm btn-danger" onClick={removeFile} disabled={loading}>Remove</button>
                </div>
                {snapStrip}
              </>
            )}
          </div>
        )}

        {/* ── LIVE CAMERA MODE ── */}
        {mode === 'live' && (
          <div className="card" style={{ marginBottom:'1rem' }}>
            <div className="form-group" style={{ marginBottom:'14px' }}>
              <label className="form-label">Camera stream URL (optional)</label>
              <input className="form-input"
                placeholder="http://192.168.1.x:8080/video  — or leave blank for webcam"
                value={rtspUrl} onChange={(e) => setRtspUrl(e.target.value)}
                disabled={camReady || loading} />
              <span className="form-hint" style={{ marginTop:'4px', display:'block' }}>
                Leave blank to use your laptop webcam. For phone camera, use IP Webcam app URL.
              </span>
            </div>
            <div className="cam-feed-wrap">
              <div className="cam-corner-bl" /><div className="cam-corner-br" />

              {/* Local webcam preview — hidden when using IP camera */}
              <video ref={camVideoRef} autoPlay muted playsInline
                style={{ display: (camReady && ipStreamActive) ? 'none' : 'block' }} />

              {/* IP camera preview — proxied through Django backend to avoid CORS */}
              {ipStreamActive && camReady && (
                <img ref={ipImgRef} src={getCameraProxyUrl(rtspUrl.trim())} alt="IP camera feed"
                  style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', display:'block', background:'#0d1410' }} />
              )}

              <div className={`cam-overlay${camReady?' hidden':''}`}>
                <div style={{ width:'52px', height:'52px', borderRadius:'50%', border:'1.5px solid rgba(29,158,117,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="24" height="24" fill="none" stroke="rgba(29,158,117,0.75)" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M4 8h11a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/>
                  </svg>
                </div>
                <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.7)', margin:'4px 0 2px' }}>Camera not started</p>
                <p style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', margin:'0 0 14px' }}>Click below to request camera access</p>
                <button className="btn btn-outline btn-sm"
                  style={{ borderColor:'rgba(29,158,117,0.5)', color:'rgba(29,158,117,0.9)' }}
                  onClick={startCamera} disabled={loading}>Start camera</button>
              </div>
            </div>
            {camReady && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'10px', padding:'0 2px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <div className="live-dot" />
                  <span style={{ fontSize:'13px', color:'var(--g600)', fontWeight:500 }}>
                    {ipStreamActive ? 'IP camera connected' : 'Webcam live'} — ready to continue
                  </span>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button className="btn btn-sm btn-outline" onClick={captureLiveSnapshot} disabled={loading}
                    title="Capture current frame for coordinate marking">Capture frame</button>
                  <button className="btn btn-sm btn-danger" onClick={stopCamera} disabled={loading}>Stop</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload progress */}
        {loading && mode === 'upload' && (
          <div style={{ marginBottom:'1rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'13px', marginBottom:'8px' }}>
              <span style={{ color:'var(--ink2)', fontWeight:500 }}>{progress < 100 ? 'Uploading to server…' : 'Processing…'}</span>
              <span style={{ fontWeight:600, color:'var(--g500)', fontSize:'14px' }}>{progress}%</span>
            </div>
            <div className="progress-wrap">
              <div className="progress-bar" style={{ width:progress+'%' }} />
            </div>
            <p style={{ fontSize:'11px', color:'var(--ink3)', marginTop:'6px' }}>
              {file?.name} · {(file?.size/1024/1024).toFixed(1)} MB
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
          <button className="btn btn-outline" onClick={() => navigate('/login')} disabled={loading}>Back</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit || loading}>
            {loading
              ? <><div className="spinner" />{mode==='upload' && progress < 100 ? ` ${progress}%` : ' Processing…'}</>
              : snapLoading ? 'Extracting frame…' : 'Continue to marking →'
            }
          </button>
        </div>
      </div>
    </>
  )
}