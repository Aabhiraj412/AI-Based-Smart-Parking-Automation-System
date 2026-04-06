// import { useState }     from 'react'
// import { useNavigate }  from 'react-router-dom'
// import { useStore }     from '../store/useStore'
// import { authAPI }      from '../services/api'
// import { showToast }    from '../components/Common'

// export default function LoginPage() {
//   const [tab,      setTab]      = useState('login')   // 'login' | 'signup'
//   const [loading,  setLoading]  = useState(false)
//   const [errors,   setErrors]   = useState({})

//   // form fields
//   const [name,     setName]     = useState('')
//   const [email,    setEmail]    = useState('')
//   const [password, setPassword] = useState('')

//   const setAuth  = useStore((s) => s.setAuth)
//   const navigate = useNavigate()

//   function switchTab(t) {
//     setTab(t)
//     setErrors({})
//     setName(''); setEmail(''); setPassword('')
//   }

//   async function handleSubmit(e) {
//     e.preventDefault()
//     const errs = {}
//     if (tab === 'signup' && !name)    errs.name     = 'Name is required'
//     if (!email)                        errs.email    = 'Email is required'
//     if (password.length < 6)           errs.password = 'Min. 6 characters'
//     if (Object.keys(errs).length) { setErrors(errs); return }

//     setLoading(true)
//     try {
//       const { token, user } = tab === 'login'
//         ? await authAPI.login(email, password)
//         : await authAPI.signup(name, email, password)

//       setAuth(token, user)
//       showToast(`Welcome, ${user.name}!`, 'success')
//       navigate('/upload')
//     } catch (err) {
//       setErrors({ password: err.message })
//       showToast(err.message, 'error')
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="auth-page page-enter">
//       <div className="auth-wrap">

//         {/* Logo */}
//         <div className="auth-hero">
//           <div className="auth-logo">
//             <span>P</span><span>A</span><span>R</span><span>K</span><span>I</span><span>T</span>
//           </div>
//           <p className="auth-tagline">AI-powered smart parking management</p>
//         </div>

//         {/* Card */}
//         <div className="card">
//           {/* Tabs */}
//           <div className="auth-tabs">
//             <button className={`auth-tab${tab === 'login'  ? ' active' : ''}`} onClick={() => switchTab('login')}>Sign in</button>
//             <button className={`auth-tab${tab === 'signup' ? ' active' : ''}`} onClick={() => switchTab('signup')}>Create account</button>
//           </div>

//           {/* Form */}
//           <form onSubmit={handleSubmit} noValidate>
//             {tab === 'signup' && (
//               <div className="form-group">
//                 <label className="form-label">Full name</label>
//                 <input className={`form-input${errors.name ? ' error' : ''}`} type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
//                 {errors.name && <span className="form-error">{errors.name}</span>}
//               </div>
//             )}

//             <div className="form-group">
//               <label className="form-label">Email address</label>
//               <input className={`form-input${errors.email ? ' error' : ''}`} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
//               {errors.email && <span className="form-error">{errors.email}</span>}
//             </div>

//             <div className="form-group">
//               <label className="form-label">Password</label>
//               <input className={`form-input${errors.password ? ' error' : ''}`} type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} />
//               {errors.password && <span className="form-error">{errors.password}</span>}
//             </div>

//             <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
//               {loading ? <><div className="spinner" /> {tab === 'login' ? 'Signing in…' : 'Creating…'}</> : tab === 'login' ? 'Sign in' : 'Create account'}
//             </button>
//           </form>

//           <div className="auth-footer">
//             {tab === 'login'
//               ? <>Don't have an account? <span onClick={() => switchTab('signup')}>Create one</span></>
//               : <>Already have an account? <span onClick={() => switchTab('login')}>Sign in</span></>}
//           </div>
//         </div>

//         <p style={{ textAlign:'center', fontSize:'11px', color:'var(--ink3)', marginTop:'1rem' }}>
//           Demo: any email + 6+ char password works
//         </p>
//       </div>
//     </div>
//   )
// }



import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let t = 0

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const SPOTS = Array.from({ length: 18 }, (_, i) => ({
      col: i % 6,
      row: Math.floor(i / 6),
      occ: Math.random() > 0.45,
      pulse: Math.random() * Math.PI * 2,
    }))

    function draw() {
      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      const cols = 6, rows = 3
      const cw = W / (cols + 1), ch = H / (rows + 1)

      SPOTS.forEach(s => {
        const x = cw * (s.col + 0.9)
        const y = ch * (s.row + 0.8)
        const alpha = 0.08 + 0.04 * Math.sin(t * 0.02 + s.pulse)

        // parking slot outline
        ctx.beginPath()
        ctx.rect(x - cw * 0.3, y - ch * 0.38, cw * 0.6, ch * 0.76)
        ctx.strokeStyle = s.occ
          ? `rgba(42, 147, 88, ${alpha * 3})`
          : `rgba(200, 210, 200, ${alpha * 2})`
        ctx.lineWidth = 1
        ctx.stroke()

        if (s.occ) {
          // car silhouette
          const cx = x, cy = y
          const sw = cw * 0.38, sh = ch * 0.42
          ctx.beginPath()
          ctx.roundRect(cx - sw / 2, cy - sh / 2, sw, sh, 4)
          ctx.fillStyle = `rgba(42, 147, 88, ${alpha * 2.5})`
          ctx.fill()
        }
      })

      t++
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0f0c',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Space+Grotesk:wght@700;800&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 24px rgba(42,147,88,0.35), 0 0 60px rgba(42,147,88,0.12); }
          50%       { box-shadow: 0 0 36px rgba(42,147,88,0.55), 0 0 80px rgba(42,147,88,0.2); }
        }
        @keyframes scanline {
          0%   { top: -4px; }
          100% { top: 100%; }
        }
        @keyframes letterPop {
          0%   { opacity:0; transform: translateY(10px) scale(0.8); }
          100% { opacity:1; transform: translateY(0)    scale(1);   }
        }

        .enter-btn {
          background: #2a9358;
          color: #fff;
          border: none;
          padding: 0 0;
          width: 220px;
          height: 56px;
          border-radius: 12px;
          font-family: 'DM Sans', sans-serif;
          font-size: 17px;
          font-weight: 600;
          letter-spacing: 0.06em;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 0.15s ease, background 0.2s ease;
          animation: glow 3s ease-in-out infinite;
        }
        .enter-btn:hover {
          background: #33b06a;
          transform: translateY(-2px) scale(1.03);
        }
        .enter-btn:active {
          transform: translateY(0) scale(0.98);
        }
        .enter-btn::before {
          content: '';
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: rgba(255,255,255,0.3);
          animation: scanline 2.6s linear infinite;
        }

        .logo-letter {
          display: inline-block;
          animation: letterPop 0.5s ease both;
        }
      `}</style>

      {/* Animated parking grid background */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none',
        }}
      />

      {/* Radial vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, #0a0f0c 100%)',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2rem',
        animation: 'fadeUp 0.7s ease both',
      }}>

        {/* Top badge */}
        <div style={{
          fontSize: '11px',
          letterSpacing: '0.18em',
          color: '#2a9358',
          textTransform: 'uppercase',
          fontWeight: 600,
          background: 'rgba(42,147,88,0.1)',
          border: '1px solid rgba(42,147,88,0.25)',
          borderRadius: '999px',
          padding: '5px 16px',
          animation: 'fadeUp 0.5s ease 0.1s both',
          opacity: 0,
        }}>
          AI-Powered Smart Parking
        </div>

        {/* Logo */}
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 'clamp(52px, 10vw, 84px)',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: '#f0f4f1',
          lineHeight: 1,
          userSelect: 'none',
        }}>
          {'PARKIT'.split('').map((l, i) => (
            <span
              key={i}
              className="logo-letter"
              style={{
                animationDelay: `${0.3 + i * 0.07}s`,
                opacity: 0,
                color: i === 4 ? '#2a9358' : '#f0f4f1',
              }}
            >
              {l}
            </span>
          ))}
        </div>

        {/* Tagline */}
        <p style={{
          color: '#6b7c6e',
          fontSize: '15px',
          fontWeight: 400,
          letterSpacing: '0.02em',
          margin: '-0.5rem 0 0',
          animation: 'fadeUp 0.5s ease 0.8s both',
          opacity: 0,
        }}>
          Monitor · Manage · Optimize
        </p>

        {/* Divider */}
        <div style={{
          width: '48px',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #2a9358, transparent)',
          borderRadius: '1px',
          animation: 'fadeUp 0.5s ease 0.9s both',
          opacity: 0,
        }} />

        {/* Enter button */}
        <div style={{
          animation: 'fadeUp 0.5s ease 1.0s both',
          opacity: 0,
        }}>
          <button className="enter-btn" onClick={() => navigate('/upload')}>
            ENTER →
          </button>
        </div>

        {/* Footer note */}
        <p style={{
          fontSize: '12px',
          color: '#3a4a3c',
          letterSpacing: '0.04em',
          animation: 'fadeUp 0.5s ease 1.15s both',
          opacity: 0,
          marginTop: '-0.5rem',
        }}>
          Parking Management System v2.0
        </p>
      </div>

    </div>
  )
}