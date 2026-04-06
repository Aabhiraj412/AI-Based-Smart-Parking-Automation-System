// import React from 'react'
// import ReactDOM from 'react-dom/client'
// import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom'
// import './index.css'

// import LoginPage      from './pages/LoginPage'
// import UploadPage     from './pages/UploadPage'
// import MarkCoordsPage from './pages/MarkCoordsPage'
// import LiveStreamPage from './pages/LiveStreamPage'
// import { ProtectedRoute, ToastContainer } from './components/Common'

// const router = createBrowserRouter([
//   { path: '/',            element: <Navigate to="/login" replace /> },
//   { path: '/login',       element: <LoginPage /> },
//   {
//     // All pages behind this require a valid token
//     element: <ProtectedRoute><div style={{display:'flex',flexDirection:'column',minHeight:'100vh'}}><div style={{flex:1,display:'flex',flexDirection:'column'}}>{null}</div></div></ProtectedRoute>,
//     children: [],
//   },
//   {
//     path: '/upload',
//     element: <ProtectedRoute><UploadPage /></ProtectedRoute>,
//   },
//   {
//     path: '/mark-coords',
//     element: <ProtectedRoute><MarkCoordsPage /></ProtectedRoute>,
//   },
//   {
//     path: '/live-stream',
//     element: <ProtectedRoute><LiveStreamPage /></ProtectedRoute>,
//   },
// ])

// ReactDOM.createRoot(document.getElementById('root')).render(
//   <React.StrictMode>
//     <RouterProvider router={router} />
//     <ToastContainer />
//   </React.StrictMode>
// )




import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom'
import './index.css'

import LoginPage      from './pages/LoginPage'
import UploadPage     from './pages/UploadPage'
import MarkCoordsPage from './pages/MarkCoordsPage'
import LiveStreamPage from './pages/LiveStreamPage'
import { ToastContainer } from './components/Common'

const router = createBrowserRouter([
  { path: '/',            element: <Navigate to="/login" replace /> },
  { path: '/login',       element: <LoginPage /> },
  { path: '/upload',      element: <UploadPage /> },
  { path: '/mark-coords', element: <MarkCoordsPage /> },
  { path: '/live-stream', element: <LiveStreamPage /> },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <ToastContainer />
  </React.StrictMode>
)