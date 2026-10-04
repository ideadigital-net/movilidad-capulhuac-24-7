import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import PassengerApp from './pages/PassengerApp'
import DriverApp from './pages/DriverApp'
import CentralApp from './pages/CentralApp'

// Componente para ocultar nav en apps
function AppContent(){
  const location = useLocation()
  const isCentral = location.pathname === '/central'
  const isDriver = location.pathname === '/chofer' || location.pathname === '/driver'
  const isPassenger = location.pathname === '/' || location.pathname === '/pasajero'

  return (
    <>
      {/* NAV SOLO PARA PRUEBAS LOCAL - En produccion puedes quitarlo */}
      {!isCentral && !isDriver && (
        <div className="bg-black text-white p-2 flex gap-2 text-[10px] justify-center fixed top-0 w-full z-[100] md:hidden">
          <Link to="/" className={`${isPassenger?'bg-white text-black':'bg-gray-800'} px-3 py-1 rounded-full font-bold`}>📍 Pasajero</Link>
          <Link to="/chofer" className={`${isDriver?'bg-white text-black':'bg-gray-800'} px-3 py-1 rounded-full font-bold`}>🚕 Chofer</Link>
          <Link to="/central" className={`${isCentral?'bg-yellow-500 text-black':'bg-gray-800'} px-3 py-1 rounded-full font-bold`}>📡 Central</Link>
        </div>
      )}

      <div className={!isCentral && !isDriver ? 'pt-8 md:pt-0' : ''}>
        <Routes>
          {/* PASAJERO - Ruta principal - Con registro + GPS + calle + Toluca fix + paradas + chat voz + panico link chofer */}
          <Route path="/" element={<PassengerApp />} />
          <Route path="/pasajero" element={<PassengerApp />} />
          
          {/* CHOFER - Ve viajes, acepta, chat con pasajero, recibe panico */}
          <Route path="/chofer" element={<DriverApp />} />
          <Route path="/driver" element={<DriverApp />} />
          
          {/* CENTRAL - Se registra, recibe notificaciones, asigna choferes, ve panicos y chats */}
          {/* Central registrada: Central Capulhuac - 7221417521 */}
          <Route path="/central" element={<CentralApp />} />
          <Route path="/admin" element={<CentralApp />} />
        </Routes>
      </div>

      {/* FOOTER SOLO EN PASAJERO PARA NAV RAPIDA LOCAL */}
      {isPassenger && (
        <div className="fixed bottom-0 w-full bg-white border-t p-2 flex justify-around text-[9px] md:hidden z-[90]">
          <Link to="/" className="text-center"><div className="text-lg">📍</div>Pasajero</Link>
          <Link to="/chofer" className="text-center"><div className="text-lg">🚕</div>Chofer</Link>
          <Link to="/central" className="text-center"><div className="text-lg">📡</div>Central<br/>7221417521</Link>
        </div>
      )}
    </>
  )
}

export default function App(){
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}