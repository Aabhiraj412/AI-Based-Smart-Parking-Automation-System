//  import { useEffect, useRef, useState } from 'react'
// import { useNavigate }                  from 'react-router-dom'
// import { useStore }                     from '../store/useStore'
// import { getStreamUrl, getWebSocketUrl } from '../services/api'
// import { NavBar, showToast }            from '../components/Common'

// export default function LiveStreamPage() {
//   const [pollStatus,  setWsStatus]  = useState('connecting')  // 'connecting'|'connected'|'error'
//   const [occupancy, setOccupancy] = useState({})            // { [slotIdx]: { occupied, pixel_count } }
//   const [freeCount, setFreeCount] = useState(0)
//   const [occCount,  setOccCount]  = useState(0)
//   const [log,       setLog]       = useState([])
//   const [imgLoaded, setImgLoaded] = useState(false)         // true once first frame arrives
//   const [stopped,   setStopped]   = useState(false)

//   const wsRef  = useRef(null)
//   const slots  = useStore((s) => s.slots)
//   const sessionId = useStore((s) => s.sessionId)
//   const navigate  = useNavigate()

//   // Stream URL — Django serves multipart/x-mixed-replace from this endpoint
//   const streamUrl = getStreamUrl(sessionId)

//   function addLog(msg) {
//     const t = new Date().toLocaleTimeString()
//     setLog((prev) => [...prev.slice(-40), `[${t}] ${msg}`])
//   }

//   // ── Mount: open WebSocket for slot status updates ─────────────────────────
//   useEffect(() => {
//     if (!sessionId) { navigate('/upload'); return }
//     addLog(`Connecting to stream: ${streamUrl}`)
//     addLog(`Opening WebSocket: ${getWebSocketUrl(sessionId)}`)
//     openWebSocket()
//     return () => { wsRef.current?.close() }
//   }, [])

//   // ── WebSocket — receives slot occupancy JSON from Django Channels ──────────
//   // Expected message format from backend:
//   //   { "slots": [{ "id": 0, "occupied": true, "pixel_count": 1240 }, ...] }
//   function openWebSocket() {
//     const url = getWebSocketUrl(sessionId)
//     const ws  = new WebSocket(url)
//     wsRef.current = ws

//     ws.onopen = () => {
//       setWsStatus('connected')
//       addLog('Connected ✓')
//     }

//     ws.onmessage = (e) => {
//       try {
//         const data = JSON.parse(e.data)
//         // data.slots → array of { id, occupied, pixel_count }
//         const slotList = data.slots || []
//         const occ = {}
//         let free = 0, occupied = 0
//         slotList.forEach((s) => {
//           occ[s.id] = { occupied: s.occupied, pixel_count: s.pixel_count }
//           s.occupied ? occupied++ : free++
//         })
//         setOccupancy(occ)
//         setFreeCount(free)
//         setOccCount(occupied)
//       } catch {
//         addLog('Warning: could not parse WS message')
//       }
//     }

//     ws.onerror = () => {
//       setWsStatus('error')
//       addLog('WebSocket error — check backend is running')
//     }

//     ws.onclose = (e) => {
//       setWsStatus('error')
//       addLog(`WebSocket closed (code ${e.code})`)
//     }
//   }

//   function stopStream() {
//     wsRef.current?.close()
//     setWsStatus('error')
//     setStopped(true)
//     addLog('Stream stopped by user')
//     showToast('Stream stopped', 'info')
//   }

//   // Slot pixel count display helper
//   function pxLabel(idx) {
//     const s = occupancy[idx]
//     if (!s) return '–– px'
//     return `${s.pixel_count ?? '––'} px`
//   }

//   function slotOccupied(idx) {
//     return occupancy[idx]?.occupied ?? false
//   }

//   return (
//     <>
//       <NavBar currentPath="/live-stream" />
//       <div className="stream-page page-enter">

//         {/* Header */}
//         <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
//           <div>
//             <h1 style={{ fontFamily:'Space Grotesk', fontWeight:700, fontSize:'22px', marginBottom:'4px' }}>
//               Live detection feed
//             </h1>
//             <p style={{ color:'var(--ink3)', fontSize:'14px' }}>
//               MJPEG stream from backend · slot status via polling
//             </p>
//           </div>
//           {/* WebSocket connection indicator */}
//           <div className="ws-status">
//             <div className={`ws-dot${pollStatus === 'connected' ? ' connected' : pollStatus === 'error' ? ' error' : ''}`} />
//             <span style={{ color: pollStatus === 'connected' ? 'var(--g500)' : pollStatus === 'error' ? 'var(--red)' : 'var(--ink3)', fontSize:'12px', fontWeight:500 }}>
//               {pollStatus === 'connected' ? 'Connected' : pollStatus === 'error' ? 'Disconnected' : 'Connecting…'}
//             </span>
//           </div>
//         </div>

//         <div className="stream-layout">

//           {/* ── Left: MJPEG video stream ── */}
//           <div>
//             <div className="stream-wrap">
//               {/* LIVE overlay bar */}
//               <div className="stream-overlay">
//                 <div className="live-badge">
//                   <div className="live-dot" />
//                   LIVE
//                 </div>
//                 <span style={{ color:'rgba(255,255,255,.6)', fontSize:'11px', fontFamily:'monospace' }}>
//                   {streamUrl}
//                 </span>
//               </div>

//               {/* Loading placeholder — shown until first frame arrives or if stopped */}
//               {(!imgLoaded || stopped) && (
//                 <div className="stream-placeholder">
//                   {stopped ? (
//                     <p style={{ fontSize:'14px', color:'rgba(255,255,255,.5)' }}>Stream stopped</p>
//                   ) : (
//                     <>
//                       <div className="stream-spinner" />
//                       <p style={{ fontSize:'14px', color:'rgba(255,255,255,.7)' }}>
//                         Waiting for backend stream…
//                       </p>
//                       <p style={{ fontSize:'11px', color:'rgba(255,255,255,.35)', fontFamily:'monospace' }}>
//                         GET {streamUrl}
//                       </p>
//                     </>
//                   )}
//                 </div>
//               )}

//               {/*
//                 ── MJPEG image ───────────────────────────────────────────────
//                 Django streams multipart/x-mixed-replace to this URL.
//                 The browser's native <img> tag handles it — each JPEG boundary
//                 replaces the previous frame, producing live video with zero JS.

//                 Django view (views.py):
//                   def stream(request, session_id):
//                       def gen():
//                           cap = cv2.VideoCapture(f'media/{session_id}.mp4')
//                           while True:
//                               ok, frame = cap.read()
//                               if not ok:
//                                   cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
//                                   continue
//                               _, buf = cv2.imencode('.jpg', frame)
//                               yield (b'--frame\r\n'
//                                      b'Content-Type: image/jpeg\r\n\r\n'
//                                      + buf.tobytes() + b'\r\n')
//                       return StreamingHttpResponse(
//                           gen(),
//                           content_type='multipart/x-mixed-replace; boundary=frame'
//                       )
//               */}
//               {!stopped && (
//                 <img
//                   className="stream-img"
//                   src={streamUrl}
//                   alt="Live parking feed"
//                   style={{ display: imgLoaded ? 'block' : 'none' }}
//                   onLoad={() => {
//                     if (!imgLoaded) {
//                       setImgLoaded(true)
//                       addLog('First frame received — MJPEG stream active ✓')
//                     }
//                   }}
//                   onError={() => {
//                     addLog('Stream error — backend may not be running')
//                     setImgLoaded(false)
//                   }}
//                 />
//               )}
//             </div>

//             {/* Action buttons */}
//             <div style={{ display:'flex', gap:'8px', marginTop:'10px', justifyContent:'flex-end' }}>
//               <button className="btn btn-outline btn-sm" onClick={() => navigate('/mark-coords')}>
//                 ← Back to marking
//               </button>
//               <button className="btn btn-sm btn-danger" onClick={stopStream} disabled={stopped}>
//                 Stop stream
//               </button>
//             </div>
//           </div>

//           {/* ── Right: stats + slot grid + log ── */}
//           <div>

//             {/* Free / Occupied big numbers */}
//             <div className="stat-row">
//               <div className="stat-box">
//                 <div className="stat-val">{pollStatus === 'connected' ? freeCount : '–'}</div>
//                 <div className="stat-label">Free slots</div>
//               </div>
//               <div className="stat-box">
//                 <div className="stat-val stat-occ">{pollStatus === 'connected' ? occCount : '–'}</div>
//                 <div className="stat-label">Occupied</div>
//               </div>
//             </div>

//             {/* Per-slot status cards — driven by WS occupancy data */}
//             <div className="card card-sm" style={{ marginBottom:'.75rem' }}>
//               <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
//                 <span style={{ fontWeight:600, fontSize:'14px' }}>Slot status</span>
//                 <span className={`badge ${freeCount > 0 ? 'badge-green' : 'badge-red'}`}>
//                   {slots.length
//                     ? `${freeCount} / ${slots.length} available`
//                     : 'No slots'}
//                 </span>
//               </div>

//               <div className="slot-grid">
//                 {slots.length === 0 && (
//                   <p style={{ fontSize:'12px', color:'var(--ink3)', gridColumn:'1/-1', textAlign:'center', padding:'1rem' }}>
//                     No slots were marked
//                   </p>
//                 )}
//                 {slots.map((_, i) => (
//                   <div key={i} className={`slot-card ${slotOccupied(i) ? 'occupied' : 'free'}`}>
//                     <div className="slot-card-label">Slot {i + 1}</div>
//                     <div className="slot-card-status">
//                       {occupancy[i] === undefined
//                         ? '–'
//                         : slotOccupied(i) ? 'Occupied' : 'Free'}
//                     </div>
//                     <div className="slot-card-px">{pxLabel(i)}</div>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* Connection log */}
//             <div className="card card-sm">
//               <p style={{ fontWeight:600, fontSize:'13px', marginBottom:'8px' }}>Connection log</p>
//               <div className="conn-log">
//                 {log.map((line, i) => (
//                   <div key={i} style={{ color: line.includes('✓') ? 'var(--g500)' : line.includes('error') || line.includes('Error') ? 'var(--red)' : 'inherit' }}>
//                     {line}
//                   </div>
//                 ))}
//               </div>
//             </div>

//           </div>
//         </div>
//       </div>
//     </>
//   )
// }

import { useEffect, useRef, useState } from 'react'
import { useNavigate }                  from 'react-router-dom'
import { useStore }                     from '../store/useStore'
import { getStreamUrl, stopLiveSession } from '../services/api'
import { NavBar, showToast }            from '../components/Common'

const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export default function LiveStreamPage() {
  const [pollStatus, setPollStatus] = useState('connecting') // 'connecting'|'connected'|'error'
  const [occupancy, setOccupancy] = useState({})
  const [freeCount, setFreeCount] = useState(0)
  const [occCount,  setOccCount]  = useState(0)
  const [log,       setLog]       = useState([])
  const [imgLoaded, setImgLoaded] = useState(false)
  const [stopped,   setStopped]   = useState(false)

  const pollRef   = useRef(null)
  const slots     = useStore((s) => s.slots)
  const sessionId = useStore((s) => s.sessionId)
  const navigate  = useNavigate()

  const streamUrl = getStreamUrl(sessionId)

  function addLog(msg) {
    const t = new Date().toLocaleTimeString()
    setLog((prev) => [...prev.slice(-40), `[${t}] ${msg}`])
  }

  useEffect(() => {
    if (!sessionId) { navigate('/upload'); return }
    addLog(`Connecting to stream: ${streamUrl}`)
    addLog('Starting slot status polling...')
    startPolling()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // ── Poll /api/status/ every second for slot occupancy data ──
  function startPolling() {
    async function fetchStatus() {
      try {
        const res = await fetch(`${BASE}/api/status/`)
        if (!res.ok) throw new Error('Status fetch failed')
        const data = await res.json()
        const slotList = data.slots || []
        const occ = {}
        let free = 0, occupied = 0
        slotList.forEach((s) => {
          occ[s.id] = { occupied: s.occupied, pixel_count: s.pixel_count }
          s.occupied ? occupied++ : free++
        })
        setOccupancy(occ); setFreeCount(free); setOccCount(occupied)
        if (pollStatus !== 'connected') {
          setPollStatus('connected')
          addLog('Slot status polling active')
        }
      } catch {
        setPollStatus('error')
      }
    }
    fetchStatus()
    pollRef.current = setInterval(fetchStatus, 1000)
  }

  function stopStream() {
    if (pollRef.current) clearInterval(pollRef.current)
    setPollStatus('error'); setStopped(true)
    addLog('Stream stopped by user')
    showToast('Stream stopped', 'info')
    // Tell backend to kill the detector subprocess
    stopLiveSession().catch(() => {})
  }

  function pxLabel(idx) {
    const s = occupancy[idx]
    return s ? `${s.pixel_count ?? '––'} px` : '–– px'
  }

  function slotOccupied(idx) {
    return occupancy[idx]?.occupied ?? false
  }

  return (
    <>
      <NavBar currentPath="/live-stream" />
      <div className="stream-page page-enter">

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
          <div>
            <h1 style={{ fontFamily:'Space Grotesk', fontWeight:700, fontSize:'22px', marginBottom:'4px' }}>Live detection feed</h1>
            <p style={{ color:'var(--ink3)', fontSize:'14px' }}>MJPEG stream from backend · slot status via polling</p>
          </div>
          <div className="ws-status">
            <div className={`ws-dot${pollStatus==='connected'?' connected':pollStatus==='error'?' error':''}`} />
            <span style={{ color: pollStatus==='connected' ? 'var(--g500)' : pollStatus==='error' ? 'var(--red)' : 'var(--ink3)', fontSize:'12px', fontWeight:500 }}>
              {pollStatus==='connected' ? 'Connected' : pollStatus==='error' ? 'Disconnected' : 'Connecting…'}
            </span>
          </div>
        </div>

        <div className="stream-layout">

          {/* Left: MJPEG stream */}
          <div>
            <div className="stream-wrap">
              <div className="stream-overlay">
                <div className="live-badge"><div className="live-dot" />LIVE</div>
                <span style={{ color:'rgba(255,255,255,.6)', fontSize:'11px', fontFamily:'monospace' }}>{streamUrl}</span>
              </div>

              {/* Placeholder until first frame / after stop */}
              {(!imgLoaded || stopped) && (
                <div className="stream-placeholder">
                  {stopped ? (
                    <p style={{ fontSize:'14px', color:'rgba(255,255,255,.5)' }}>Stream stopped</p>
                  ) : (
                    <>
                      <div className="stream-spinner" />
                      <p style={{ fontSize:'14px', color:'rgba(255,255,255,.7)' }}>Waiting for backend stream…</p>
                      <p style={{ fontSize:'11px', color:'rgba(255,255,255,.35)', fontFamily:'monospace' }}>GET {streamUrl}</p>
                    </>
                  )}
                </div>
              )}

              {/*
                MJPEG stream — browser <img> handles multipart/x-mixed-replace natively.
                Django view must return StreamingHttpResponse with:
                  content_type='multipart/x-mixed-replace; boundary=frame'
                Each frame boundary: b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + jpeg + b'\r\n'
              */}
              {!stopped && (
                <img
                  className="stream-img"
                  src={streamUrl}
                  alt="Live parking feed"
                  style={{ display: imgLoaded ? 'block' : 'none' }}
                  onLoad={() => {
                    if (!imgLoaded) {
                      setImgLoaded(true)
                      addLog('First frame received — MJPEG stream active ✓')
                    }
                  }}
                  onError={() => {
                    addLog('Stream error — backend may not be running')
                    setImgLoaded(false)
                  }}
                />
              )}
            </div>

            <div style={{ display:'flex', gap:'8px', marginTop:'10px', justifyContent:'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/mark-coords')}>← Back to marking</button>
              <button className="btn btn-sm btn-danger" onClick={stopStream} disabled={stopped}>Stop stream</button>
            </div>
          </div>

          {/* Right: stats + slot grid + log */}
          <div>
            <div className="stat-row">
              <div className="stat-box">
                <div className="stat-val">{pollStatus==='connected' ? freeCount : '–'}</div>
                <div className="stat-label">Free slots</div>
              </div>
              <div className="stat-box">
                <div className="stat-val stat-occ">{pollStatus==='connected' ? occCount : '–'}</div>
                <div className="stat-label">Occupied</div>
              </div>
            </div>

            <div className="card card-sm" style={{ marginBottom:'.75rem' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                <span style={{ fontWeight:600, fontSize:'14px' }}>Slot status</span>
                <span className={`badge ${freeCount > 0 ? 'badge-green' : 'badge-red'}`}>
                  {slots.length ? `${freeCount} / ${slots.length} available` : 'No slots'}
                </span>
              </div>
              <div className="slot-grid">
                {slots.length === 0 && (
                  <p style={{ fontSize:'12px', color:'var(--ink3)', gridColumn:'1/-1', textAlign:'center', padding:'1rem' }}>
                    No slots were marked
                  </p>
                )}
                {slots.map((_, i) => (
                  <div key={i} className={`slot-card ${slotOccupied(i) ? 'occupied' : 'free'}`}>
                    <div className="slot-card-label">Slot {i + 1}</div>
                    <div className="slot-card-status">
                      {occupancy[i] === undefined ? '–' : slotOccupied(i) ? 'Occupied' : 'Free'}
                    </div>
                    <div className="slot-card-px">{pxLabel(i)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card card-sm">
              <p style={{ fontWeight:600, fontSize:'13px', marginBottom:'8px' }}>Connection log</p>
              <div className="conn-log">
                {log.map((line, i) => (
                  <div key={i} style={{ color: line.includes('✓') ? 'var(--g500)' : line.includes('error') || line.includes('Error') ? 'var(--red)' : 'inherit' }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}