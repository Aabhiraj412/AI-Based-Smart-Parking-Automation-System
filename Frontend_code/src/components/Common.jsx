// import { useEffect, useState } from 'react'
// import { useNavigate }         from 'react-router-dom'
// import { useStore }            from '../store/useStore'

// // ── NavBar ────────────────────────────────────────────────────────────────────
// const STEPS = [
//   { path: '/upload',      label: 'Upload' },
//   { path: '/mark-coords', label: 'Mark Slots' },
//   { path: '/live-stream', label: 'Live Feed' },
// ]

// export function NavBar({ currentPath }) {
//   const navigate = useNavigate()
//   const logout   = useStore((s) => s.logout)
//   const activeIdx = STEPS.findIndex((s) => s.path === currentPath)

//   function handleLogout() {
//     logout()
//     navigate('/login')
//   }

//   return (
//     <nav>
//       <div className="nav-logo" onClick={() => navigate('/upload')}>
//         <span>P</span><span>A</span><span>R</span><span>K</span><span>I</span><span>T</span>
//       </div>
//       <div className="nav-steps">
//         {STEPS.map((s, i) => (
//           <span key={s.path} className={`nav-step${i <= activeIdx ? ' active' : ''}`}>
//             {i + 1}. {s.label}
//           </span>
//         ))}
//       </div>
//       <button className="btn-ghost" onClick={handleLogout}>Sign out</button>
//     </nav>
//   )
// }

// // ── ProtectedRoute ────────────────────────────────────────────────────────────
// export function ProtectedRoute({ children }) {
//   const token    = useStore((s) => s.token)
//   const navigate = useNavigate()
//   useEffect(() => { if (!token) navigate('/login') }, [token])
//   return token ? children : null
// }

// // ── Toast system ──────────────────────────────────────────────────────────────
// const toastListeners = []
// export function showToast(message, type = 'info') {
//   toastListeners.forEach((fn) => fn({ message, type, id: Date.now() + Math.random() }))
// }

// export function ToastContainer() {
//   const [toasts, setToasts] = useState([])

//   useEffect(() => {
//     const handler = (t) => {
//       setToasts((prev) => [...prev, t])
//       setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3200)
//     }
//     toastListeners.push(handler)
//     return () => toastListeners.splice(toastListeners.indexOf(handler), 1)
//   }, [])

//   return (
//     <div className="toast-container">
//       {toasts.map((t) => (
//         <div key={t.id} className={`toast ${t.type}`}>
//           <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
//           <span>{t.message}</span>
//         </div>
//       ))}
//     </div>
//   )
// }

import { useEffect, useState } from 'react'
import { useNavigate }         from 'react-router-dom'
import { useStore }            from '../store/useStore'

// ─── NavBar ───────────────────────────────────────────────────────────────────
const STEPS = [
  { path: '/upload',      label: 'Upload' },
  { path: '/mark-coords', label: 'Mark Slots' },
  { path: '/live-stream', label: 'Live Feed' },
]

export function NavBar({ currentPath }) {
  const navigate  = useNavigate()
  const logout    = useStore((s) => s.logout)
  const activeIdx = STEPS.findIndex((s) => s.path === currentPath)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav>
      <div className="nav-logo" onClick={() => navigate('/upload')}>
        <span>P</span><span>A</span><span>R</span><span>K</span><span>I</span><span>T</span>
      </div>
      <div className="nav-steps">
        {STEPS.map((s, i) => (
          <span key={s.path} className={`nav-step${i <= activeIdx ? ' active' : ''}`}>
            {i + 1}. {s.label}
          </span>
        ))}
      </div>
      <button className="btn-ghost" onClick={handleLogout}>Sign out</button>
    </nav>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
const listeners = []

export function showToast(message, type = 'info') {
  const toast = { id: Date.now() + Math.random(), message, type }
  listeners.forEach((fn) => fn(toast))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    function handle(t) {
      setToasts((prev) => [...prev, t])
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3200)
    }
    listeners.push(handle)
    return () => listeners.splice(listeners.indexOf(handle), 1)
  }, [])

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}