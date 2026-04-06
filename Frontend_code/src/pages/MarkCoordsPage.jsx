// import { useEffect, useRef, useState, useCallback } from 'react'
// import { useNavigate }                               from 'react-router-dom'
// import { useStore }                                  from '../store/useStore'
// import { saveCoordinates }                           from '../services/api'
// import { NavBar, showToast }                         from '../components/Common'

// // ── Canvas draw helpers ───────────────────────────────────────────────────────
// function drawFrame(ctx, canvas, slots, preview) {
//   ctx.clearRect(0, 0, canvas.width, canvas.height)

//   // Dark background
//   ctx.fillStyle = '#0d1b0f'
//   ctx.fillRect(0, 0, canvas.width, canvas.height)

//   // Faint grid
//   ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1
//   for (let x = 0; x < canvas.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke() }
//   for (let y = 0; y < canvas.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke() }

//   // Sample parking lane lines
//   ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2
//   for (let x = 60; x < canvas.width - 60; x += 90) { ctx.beginPath(); ctx.moveTo(x, 80); ctx.lineTo(x, 280); ctx.stroke() }

//   ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.font = '13px DM Sans'
//   ctx.fillText('Sample frame — click and drag to mark parking slots', 16, 26)

//   // Draw saved slots
//   slots.forEach((s, i) => {
//     ctx.fillStyle   = 'rgba(58,179,110,.18)'
//     ctx.strokeStyle = '#3ab36e'; ctx.lineWidth = 2; ctx.setLineDash([])
//     ctx.fillRect(s.x, s.y, s.w, s.h)
//     ctx.strokeRect(s.x, s.y, s.w, s.h)
//     ctx.fillStyle = 'rgba(58,179,110,.9)'; ctx.font = 'bold 12px DM Sans'
//     ctx.fillText(`S${i + 1}`, s.x + 5, s.y + 15)
//   })

//   // Draw drag preview
//   if (preview) {
//     const { x1, y1, x2, y2 } = preview
//     ctx.strokeStyle = '#EF9F27'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4])
//     ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1))
//     ctx.setLineDash([])
//   }
// }

// function getPos(canvas, e) {
//   const r = canvas.getBoundingClientRect()
//   return {
//     x: (e.clientX - r.left) * (canvas.width  / r.width),
//     y: (e.clientY - r.top)  * (canvas.height / r.height),
//   }
// }

// // ── Page component ────────────────────────────────────────────────────────────
// export default function MarkCoordsPage() {
//   const [tool,    setTool]    = useState('draw')    // 'draw' | 'del'
//   const [preview, setPreview] = useState(null)
//   const [loading, setLoading] = useState(false)

//   const canvasRef = useRef(null)
//   const dragging  = useRef(false)
//   const startPos  = useRef({ x: 0, y: 0 })

//   const slots      = useStore((s) => s.slots)
//   const addSlot    = useStore((s) => s.addSlot)
//   const removeSlot = useStore((s) => s.removeSlot)
//   const clearSlots = useStore((s) => s.clearSlots)
//   const sessionId  = useStore((s) => s.sessionId)
//   const navigate   = useNavigate()

//   // Redraw whenever slots or preview change
//   useEffect(() => {
//     const canvas = canvasRef.current
//     if (!canvas) return
//     drawFrame(canvas.getContext('2d'), canvas, slots, preview)
//   }, [slots, preview])

//   // ── Mouse handlers ───────────────────────────────────────────────────────────
//   const onMouseDown = useCallback((e) => {
//     const canvas = canvasRef.current
//     const pos    = getPos(canvas, e)

//     if (tool === 'del' || e.button === 2) {
//       const idx = slots.findIndex((s) => pos.x >= s.x && pos.x <= s.x + s.w && pos.y >= s.y && pos.y <= s.y + s.h)
//       if (idx >= 0) { removeSlot(idx); showToast('Slot removed', 'info') }
//       return
//     }

//     dragging.current = true
//     startPos.current = pos
//     setPreview({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y })
//   }, [tool, slots, removeSlot])

//   const onMouseMove = useCallback((e) => {
//     if (!dragging.current) return
//     const pos = getPos(canvasRef.current, e)
//     setPreview((p) => p ? { ...p, x2: pos.x, y2: pos.y } : null)
//   }, [])

//   const onMouseUp = useCallback((e) => {
//     if (!dragging.current) return
//     dragging.current = false
//     const pos  = getPos(canvasRef.current, e)
//     const x    = Math.min(startPos.current.x, pos.x)
//     const y    = Math.min(startPos.current.y, pos.y)
//     const w    = Math.abs(pos.x - startPos.current.x)
//     const h    = Math.abs(pos.y - startPos.current.y)
//     if (w > 15 && h > 15) addSlot({ x, y, w, h })
//     setPreview(null)
//   }, [addSlot])

//   const onContextMenu = useCallback((e) => {
//     e.preventDefault()
//     const pos = getPos(canvasRef.current, e)
//     const idx = slots.findIndex((s) => pos.x >= s.x && pos.x <= s.x + s.w && pos.y >= s.y && pos.y <= s.y + s.h)
//     if (idx >= 0) removeSlot(idx)
//   }, [slots, removeSlot])

//   const onMouseLeave = useCallback(() => {
//     if (dragging.current) { dragging.current = false; setPreview(null) }
//   }, [])

//   // ── Submit: convert to [x1,y1,x2,y2] and POST to backend ──────────────────
//   async function handleSubmit() {
//     if (!slots.length) { showToast('Mark at least one slot', 'error'); return }

//     // Convert { x, y, w, h } → { x1, y1, x2, y2 }
//     const coords = slots.map((s) => ({
//       x1: Math.round(s.x),
//       y1: Math.round(s.y),
//       x2: Math.round(s.x + s.w),
//       y2: Math.round(s.y + s.h),
//     }))

//     setLoading(true)
//     try {
//       await saveCoordinates(sessionId, coords)
//       showToast(`${slots.length} slot${slots.length > 1 ? 's' : ''} saved!`, 'success')
//       navigate('/live-stream')
//     } catch (e) {
//       showToast('Failed: ' + e.message, 'error')
//     } finally {
//       setLoading(false)
//     }
//   }

//   // ── Coord preview string ─────────────────────────────────────────────────────
//   const coordText = slots.length
//     ? '[\n' + slots.map((s, i) => `  { x1:${Math.round(s.x)}, y1:${Math.round(s.y)}, x2:${Math.round(s.x+s.w)}, y2:${Math.round(s.y+s.h)} }${i < slots.length-1 ? ',' : ''}`).join('\n') + '\n]'
//     : '[]'

//   return (
//     <>
//       <NavBar currentPath="/mark-coords" />
//       <div className="coords-page page-enter">

//         <div style={{ marginBottom:'1.5rem' }}>
//           <h1 style={{ fontFamily:'Space Grotesk', fontWeight:700, fontSize:'22px', marginBottom:'4px' }}>Mark parking slots</h1>
//           <p style={{ color:'var(--ink3)', fontSize:'14px' }}>Click and drag on the frame to define each parking bay</p>
//         </div>

//         <div className="coords-layout">
//           {/* Left: canvas */}
//           <div>
//             <div className="canvas-wrap">
//               <div className="canvas-toolbar">
//                 <button className={`tool-btn${tool === 'draw' ? ' active' : ''}`} onClick={() => setTool('draw')}>Draw slot</button>
//                 <button className={`tool-btn${tool === 'del'  ? ' active' : ''}`} onClick={() => setTool('del')}>Delete mode</button>
//                 <div style={{ flex:1 }} />
//                 <button className="tool-btn" onClick={clearSlots}>Clear all</button>
//               </div>
//               <canvas
//                 ref={canvasRef}
//                 width={640} height={360}
//                 style={{ display:'block', width:'100%', cursor: tool === 'del' ? 'not-allowed' : 'crosshair' }}
//                 onMouseDown={onMouseDown}
//                 onMouseMove={onMouseMove}
//                 onMouseUp={onMouseUp}
//                 onMouseLeave={onMouseLeave}
//                 onContextMenu={onContextMenu}
//               />
//             </div>
//             <p style={{ fontSize:'12px', color:'var(--ink3)', marginTop:'8px' }}>
//               Draw mode: drag to add slot. Delete mode: click a slot to remove. Right-click always deletes.
//             </p>
//           </div>

//           {/* Right: panel */}
//           <div className="coords-panel">
//             {/* Slot list */}
//             <div className="card card-sm">
//               <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
//                 <span style={{ fontWeight:600, fontSize:'14px' }}>Marked slots</span>
//                 <span className="badge badge-green">{slots.length} slot{slots.length !== 1 ? 's' : ''}</span>
//               </div>
//               <div className="slot-list">
//                 {slots.length === 0 ? (
//                   <div className="coords-hint">No slots yet.<br />Draw rectangles on the frame.</div>
//                 ) : (
//                   slots.map((s, i) => (
//                     <div className="slot-item" key={i}>
//                       <div className="slot-num">S{i + 1}</div>
//                       <div className="slot-coords">
//                         x1:{Math.round(s.x)} y1:{Math.round(s.y)}<br />
//                         x2:{Math.round(s.x+s.w)} y2:{Math.round(s.y+s.h)}
//                       </div>
//                       <button className="slot-del" onClick={() => removeSlot(i)}>✕</button>
//                     </div>
//                   ))
//                 )}
//               </div>
//             </div>

//             {/* JSON preview */}
//             <div className="card card-sm">
//               <p style={{ fontSize:'13px', fontWeight:500, marginBottom:'8px' }}>Coordinates sent to backend</p>
//               <pre style={{ fontSize:'11px', background:'var(--g50)', padding:'10px', borderRadius:'8px', overflow:'auto', maxHeight:'140px', color:'var(--ink2)', lineHeight:1.6 }}>
//                 {coordText}
//               </pre>
//             </div>

//             {/* Actions */}
//             <div style={{ display:'flex', gap:'8px' }}>
//               <button className="btn btn-outline btn-sm" onClick={() => navigate('/upload')}>Back</button>
//               <button className="btn btn-primary btn-sm" style={{ flex:1 }} onClick={handleSubmit} disabled={!slots.length || loading}>
//                 {loading ? <><div className="spinner" /> Sending…</> : 'Send & view stream →'}
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   )
// }



import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate }                               from 'react-router-dom'
import { useStore }                                  from '../store/useStore'
import { saveCoordinates }                           from '../services/api'
import { NavBar, showToast }                         from '../components/Common'

// ── Canvas draw helpers ───────────────────────────────────────────────────────

function drawBackground(ctx, canvas, frameImg) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (frameImg) {
    ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height)
    // Slight dark veil so green slot overlays stay legible
    ctx.fillStyle = 'rgba(0,0,0,0.15)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  } else {
    // Fallback placeholder grid
    ctx.fillStyle = '#0d1b0f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x, canvas.height); ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width, y); ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 2
    for (let x = 60; x < canvas.width - 60; x += 90) {
      ctx.beginPath(); ctx.moveTo(x,80); ctx.lineTo(x,280); ctx.stroke()
    }
    ctx.fillStyle = 'rgba(255,255,255,.4)'
    ctx.font = '13px DM Sans'
    ctx.fillText('Placeholder — upload a video to see the real frame', 16, 26)
  }
}

function drawSlots(ctx, slots, preview) {
  slots.forEach((s, i) => {
    ctx.fillStyle   = 'rgba(58,179,110,.22)'
    ctx.strokeStyle = '#3ab36e'
    ctx.lineWidth   = 2
    ctx.setLineDash([])
    ctx.fillRect(s.x, s.y, s.w, s.h)
    ctx.strokeRect(s.x, s.y, s.w, s.h)

    // Slot label badge
    const label = `S${i + 1}`
    ctx.font = 'bold 12px DM Sans'
    const tw  = ctx.measureText(label).width
    ctx.fillStyle = 'rgba(29,120,80,0.88)'
    ctx.fillRect(s.x + 3, s.y + 3, tw + 10, 19)
    ctx.fillStyle = '#fff'
    ctx.fillText(label, s.x + 7, s.y + 16)
  })

  if (preview) {
    const { x1, y1, x2, y2 } = preview
    ctx.strokeStyle = '#EF9F27'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4])
    ctx.strokeRect(Math.min(x1,x2), Math.min(y1,y2), Math.abs(x2-x1), Math.abs(y2-y1))
    ctx.setLineDash([])
  }
}

function getPos(canvas, e) {
  const r = canvas.getBoundingClientRect()
  return {
    x: (e.clientX - r.left) * (canvas.width  / r.width),
    y: (e.clientY - r.top)  * (canvas.height / r.height),
  }
}

// ── Page component ────────────────────────────────────────────────────────────
export default function MarkCoordsPage() {
  const [tool,     setTool]     = useState('draw')  // 'draw' | 'del'
  const [preview,  setPreview]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [frameImg, setFrameImg] = useState(null)    // loaded HTMLImageElement | null

  const canvasRef  = useRef(null)
  const dragging   = useRef(false)
  const startPos   = useRef({ x:0, y:0 })

  const slots      = useStore((s) => s.slots)
  const addSlot    = useStore((s) => s.addSlot)
  const removeSlot = useStore((s) => s.removeSlot)
  const clearSlots = useStore((s) => s.clearSlots)
  const sessionId  = useStore((s) => s.sessionId)
  const frameSnap  = useStore((s) => s.frameSnap)  // { dataURL, width, height } | null

  const navigate = useNavigate()

  // ── Step 1: load dataURL into HTMLImageElement ────────────────────────────────
  useEffect(() => {
    if (!frameSnap?.dataURL) { setFrameImg(null); return }
    const img   = new Image()
    img.onload  = () => setFrameImg(img)
    img.onerror = () => { console.warn('Frame image load failed'); setFrameImg(null) }
    img.src     = frameSnap.dataURL
  }, [frameSnap])

  // ── Step 2: resize canvas + redraw in ONE effect so they never race ───────────
  //
  // BUG in the previous version: two separate useEffects — one for resize (dep:
  // frameSnap) and one for redraw (dep: frameImg) — could fire in either order.
  // If the redraw fired before the resize the canvas still had wrong dimensions.
  // If the resize fired first it blanked the canvas before frameImg was set.
  //
  // Fix: merge both into a single effect that depends on frameImg. By the time
  // frameImg is set (Step 1 effect above), the image is fully loaded and we can
  // safely resize the canvas to its natural dimensions and immediately draw.
  //
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Resize canvas pixel grid to match the actual video frame (or fallback)
    // Important: this must happen BEFORE drawBackground/drawSlots so coordinates
    // stored in the slots array map 1:1 to real video pixels.
    if (frameImg) {
      canvas.width  = frameImg.naturalWidth
      canvas.height = frameImg.naturalHeight
    } else {
      canvas.width  = 640
      canvas.height = 360
    }

    // Redraw immediately after resize — canvas content is wiped by resize
    const ctx = canvas.getContext('2d')
    drawBackground(ctx, canvas, frameImg)
    drawSlots(ctx, slots, preview)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameImg])  // intentionally excludes slots/preview — those have their own effect below

  // ── Step 3: redraw on every slot / preview change (no resize needed) ─────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    drawBackground(ctx, canvas, frameImg)
    drawSlots(ctx, slots, preview)
  }, [slots, preview, frameImg])

  // ── Mouse handlers ────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    const canvas = canvasRef.current
    const pos    = getPos(canvas, e)
    if (tool === 'del' || e.button === 2) {
      const idx = slots.findIndex(s => pos.x>=s.x && pos.x<=s.x+s.w && pos.y>=s.y && pos.y<=s.y+s.h)
      if (idx >= 0) { removeSlot(idx); showToast('Slot removed', 'info') }
      return
    }
    dragging.current = true; startPos.current = pos
    setPreview({ x1:pos.x, y1:pos.y, x2:pos.x, y2:pos.y })
  }, [tool, slots, removeSlot])

  const onMouseMove = useCallback((e) => {
    if (!dragging.current) return
    const pos = getPos(canvasRef.current, e)
    setPreview(p => p ? { ...p, x2:pos.x, y2:pos.y } : null)
  }, [])

  const onMouseUp = useCallback((e) => {
    if (!dragging.current) return
    dragging.current = false
    const pos = getPos(canvasRef.current, e)
    const x = Math.min(startPos.current.x, pos.x)
    const y = Math.min(startPos.current.y, pos.y)
    const w = Math.abs(pos.x - startPos.current.x)
    const h = Math.abs(pos.y - startPos.current.y)
    if (w > 15 && h > 15) addSlot({ x, y, w, h })
    setPreview(null)
  }, [addSlot])

  const onContextMenu = useCallback((e) => {
    e.preventDefault()
    const pos = getPos(canvasRef.current, e)
    const idx = slots.findIndex(s => pos.x>=s.x && pos.x<=s.x+s.w && pos.y>=s.y && pos.y<=s.y+s.h)
    if (idx >= 0) removeSlot(idx)
  }, [slots, removeSlot])

  const onMouseLeave = useCallback(() => {
    if (dragging.current) { dragging.current = false; setPreview(null) }
  }, [])

  // ── Touch support ─────────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e) => {
    e.preventDefault()
    const t = e.touches[0]
    const pos = getPos(canvasRef.current, { clientX:t.clientX, clientY:t.clientY })
    if (tool === 'del') {
      const idx = slots.findIndex(s => pos.x>=s.x && pos.x<=s.x+s.w && pos.y>=s.y && pos.y<=s.y+s.h)
      if (idx >= 0) { removeSlot(idx); showToast('Slot removed', 'info') }
      return
    }
    dragging.current = true; startPos.current = pos
    setPreview({ x1:pos.x, y1:pos.y, x2:pos.x, y2:pos.y })
  }, [tool, slots, removeSlot])

  const onTouchMove = useCallback((e) => {
    e.preventDefault()
    if (!dragging.current) return
    const t = e.touches[0]
    const pos = getPos(canvasRef.current, { clientX:t.clientX, clientY:t.clientY })
    setPreview(p => p ? { ...p, x2:pos.x, y2:pos.y } : null)
  }, [])

  const onTouchEnd = useCallback((e) => {
    e.preventDefault()
    if (!dragging.current) return
    dragging.current = false
    const t = e.changedTouches[0]
    const pos = getPos(canvasRef.current, { clientX:t.clientX, clientY:t.clientY })
    const x = Math.min(startPos.current.x, pos.x)
    const y = Math.min(startPos.current.y, pos.y)
    const w = Math.abs(pos.x - startPos.current.x)
    const h = Math.abs(pos.y - startPos.current.y)
    if (w > 15 && h > 15) addSlot({ x, y, w, h })
    setPreview(null)
  }, [addSlot])

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!slots.length) { showToast('Mark at least one slot', 'error'); return }
    const coords = slots.map(s => ({
      x1: Math.round(s.x),       y1: Math.round(s.y),
      x2: Math.round(s.x + s.w), y2: Math.round(s.y + s.h),
    }))
    setLoading(true)
    try {
      await saveCoordinates(sessionId, coords)
      showToast(`${slots.length} slot${slots.length > 1 ? 's' : ''} saved!`, 'success')
      navigate('/live-stream')
    } catch (e) {
      showToast('Failed: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const coordText = slots.length
    ? '[\n' + slots.map((s,i) =>
        `  { x1:${Math.round(s.x)}, y1:${Math.round(s.y)}, x2:${Math.round(s.x+s.w)}, y2:${Math.round(s.y+s.h)} }${i<slots.length-1?',':''}`
      ).join('\n') + '\n]'
    : '[]'

  return (
    <>
      <NavBar currentPath="/mark-coords" />

      <style>{`
        .frame-badge {
          display:inline-flex; align-items:center; gap:6px;
          font-size:11px; font-weight:500; padding:3px 10px;
          border-radius:20px; margin-bottom:8px;
        }
        .frame-badge.real {
          background:rgba(29,158,117,0.1); color:#1D9E75;
          border:1px solid rgba(29,158,117,0.28);
        }
        .frame-badge.placeholder {
          background:rgba(239,159,39,0.1); color:#BA7517;
          border:1px solid rgba(239,159,39,0.28);
        }
        /* Make canvas wrapper hold aspect ratio while canvas scales */
        .canvas-outer {
          position:relative; width:100%;
        }
        .canvas-outer canvas {
          display:block; width:100%; height:auto;
          cursor:inherit;
        }
      `}</style>

      <div className="coords-page page-enter">
        <div style={{ marginBottom:'1.5rem' }}>
          <h1 style={{ fontFamily:'Space Grotesk', fontWeight:700, fontSize:'22px', marginBottom:'4px' }}>
            Mark parking slots
          </h1>
          <p style={{ color:'var(--ink3)', fontSize:'14px' }}>
            Click and drag on the frame to define each parking bay
          </p>
        </div>

        <div className="coords-layout">

          {/* ── Left: canvas ── */}
          <div>
            {/* Frame source badge */}
            <div className={`frame-badge ${frameSnap ? 'real' : 'placeholder'}`}>
              {frameSnap ? (
                <>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="4"/></svg>
                  Actual video frame &nbsp;·&nbsp; {frameSnap.width}×{frameSnap.height}px
                </>
              ) : (
                <>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><rect width="8" height="8" rx="1.5"/></svg>
                  Placeholder frame — go back and upload a video for accurate marking
                </>
              )}
            </div>

            <div className="canvas-wrap">
              <div className="canvas-toolbar">
                <button className={`tool-btn${tool==='draw'?' active':''}`} onClick={()=>setTool('draw')}>Draw slot</button>
                <button className={`tool-btn${tool==='del'?' active':''}`}  onClick={()=>setTool('del')}>Delete mode</button>
                <div style={{ flex:1 }}/>
                <button className="tool-btn" onClick={clearSlots}>Clear all</button>
              </div>

              {/*
               * canvas-outer keeps the visual aspect ratio responsive via CSS
               * while the canvas pixel grid stays at the video's native resolution.
               * getPos() applies the scale correction so clicks map correctly.
               */}
              <div className="canvas-outer" style={{ cursor: tool==='del' ? 'not-allowed' : 'crosshair' }}>
                <canvas
                  ref={canvasRef}
                  width={640} height={360}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseLeave}
                  onContextMenu={onContextMenu}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                />
              </div>
            </div>

            <p style={{ fontSize:'12px', color:'var(--ink3)', marginTop:'8px' }}>
              Draw mode: drag to add a slot. Delete mode or right-click: remove a slot.
            </p>
          </div>

          {/* ── Right: panel ── */}
          <div className="coords-panel">

            {/* Slot list */}
            <div className="card card-sm">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
                <span style={{ fontWeight:600, fontSize:'14px' }}>Marked slots</span>
                <span className="badge badge-green">{slots.length} slot{slots.length!==1?'s':''}</span>
              </div>
              <div className="slot-list">
                {slots.length === 0 ? (
                  <div className="coords-hint">No slots yet.<br/>Draw rectangles on the frame.</div>
                ) : slots.map((s,i) => (
                  <div className="slot-item" key={i}>
                    <div className="slot-num">S{i+1}</div>
                    <div className="slot-coords">
                      x1:{Math.round(s.x)} y1:{Math.round(s.y)}<br/>
                      x2:{Math.round(s.x+s.w)} y2:{Math.round(s.y+s.h)}
                    </div>
                    <button className="slot-del" onClick={()=>removeSlot(i)}>✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* JSON preview */}
            <div className="card card-sm">
              <p style={{ fontSize:'13px', fontWeight:500, marginBottom:'8px' }}>Coordinates sent to backend</p>
              <pre style={{
                fontSize:'11px', background:'var(--g50)', padding:'10px',
                borderRadius:'8px', overflow:'auto', maxHeight:'140px',
                color:'var(--ink2)', lineHeight:1.6,
              }}>{coordText}</pre>
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:'8px' }}>
              <button className="btn btn-outline btn-sm" onClick={()=>navigate('/upload')}>Back</button>
              <button className="btn btn-primary btn-sm" style={{ flex:1 }}
                onClick={handleSubmit} disabled={!slots.length || loading}>
                {loading ? <><div className="spinner"/> Sending…</> : 'Send & view stream →'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}