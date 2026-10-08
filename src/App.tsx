import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import PassengerApp from './pages/PassengerApp'
import AdminTarifasPanel from './pages/AdminTarifas'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<PassengerApp />} />
        <Route path="/home" element={<PassengerApp />} />
        {/* PASO 3: Panel admin tarifas - no afecta funcionalidad existente */}
        <Route path="/admin/tarifas" element={<AdminTarifasPanel />} />
        <Route path="/admin" element={<Navigate to="/admin/tarifas" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
