import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import DashboardNew from './pages/DashboardNew'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Pricing from './pages/Pricing'
import Docs from './pages/Docs'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import AcceptableUse from './pages/AcceptableUse'
import ProxyNetwork from './pages/ProxyNetwork'
import Templates from './pages/Templates'

// Auto sign-in for development - set to true to auto-login as Test User
const DEV_AUTO_LOGIN = true
const DEV_USER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE3NjYyMzAwNTgyMDQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJuYW1lIjoiVGVzdCBVc2VyIiwiaWF0IjoxNzY2NTgzNjkxLCJleHAiOjE3NjcxODg0OTF9.9WhEwOo6FBj3ss03JIXMsS3upfplSHeuj8NvAVsxO2I'

function App() {
  useEffect(() => {
    // Set dark mode as default
    if (!localStorage.getItem('merlin-theme')) {
      document.documentElement.classList.add('dark')
    } else if (localStorage.getItem('merlin-theme') === 'dark') {
      document.documentElement.classList.add('dark')
    }

    if (DEV_AUTO_LOGIN && !localStorage.getItem('token')) {
      console.log('[DEV] Auto sign-in enabled - logging in as Test User')
      localStorage.setItem('token', DEV_USER_TOKEN)
      // Reload the page so components pick up the token
      window.location.reload()
    }
  }, [])
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardNew />} />
        <Route path="/dashboard-old" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/acceptable-use" element={<AcceptableUse />} />
        <Route path="/proxy-network" element={<ProxyNetwork />} />
        <Route path="/templates" element={<Templates />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

