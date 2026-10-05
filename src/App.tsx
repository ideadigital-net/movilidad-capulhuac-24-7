
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import PassengerApp from './pages/PassengerApp'
import InstallPWA from './components/InstallPWA'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<PassengerApp />} />
        <Route path="/home" element={<PassengerApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <InstallPWA />
    </BrowserRouter>
    
  )
}