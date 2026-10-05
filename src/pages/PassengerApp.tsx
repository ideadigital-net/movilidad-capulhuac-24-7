import { useEffect, useState } from 'react'

export default function AppPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    // Detecta si ya está instalada
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    setIsStandalone(standalone)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(()=>{})
    }

    // Si no está instalada, muestra banner siempre
    if (!standalone) {
      // Para iOS que no dispara beforeinstallprompt
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (isIOS) setShowInstall(true)
    }

    const h = (e:any) => { 
      e.preventDefault()
      setDeferredPrompt(e)
      if (!standalone) setShowInstall(true)
    }
    const installed = () => {
      setShowInstall(false)
      setDeferredPrompt(null)
      setIsStandalone(true)
    }

    window.addEventListener('beforeinstallprompt', h)
    window.addEventListener('appinstalled', installed)
    return () => {
      window.removeEventListener('beforeinstallprompt', h)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  const instalar = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setShowInstall(false)
      }
      setDeferredPrompt(null)
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (isIOS) {
        alert('En iPhone: pulsa Compartir ↑ y luego "Agregar a pantalla de inicio"')
      } else {
        alert('En Chrome: menú ⋮ -> Instalar app o Agregar a pantalla de inicio')
      }
    }
  }

  const cerrarSesion = async () => {
    if (!confirm('¿Cerrar sesión y volver al intro Porsche?')) return
    
    // 1. Cierra Firebase real
    try {
      const { getAuth, signOut } = await import('firebase/auth')
      const auth = getAuth()
      await signOut(auth)
    } catch (e) {
      console.log('Sin firebase auth o ya cerrado', e)
    }

    // 2. Limpia todo
    try {
      localStorage.clear()
      sessionStorage.clear()
      indexedDB.deleteDatabase('firebaseLocalStorageDb')
      indexedDB.deleteDatabase('firebase-heartbeat-database')
      Object.keys(localStorage).forEach(k => localStorage.removeItem(k))
    } catch {}

    // 3. Borra cookies
    document.cookie.split(";").forEach(c => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/")
    })

    // 4. Fuerza al inicio con intro
    window.location.replace('/')
    setTimeout(() => {
      window.location.href = '/'
      window.location.reload()
    }, 200)
  }

  return (
    <div className="h-[100dvh] w-full bg-black text-white flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="bg-black px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#0f3d2e] border-2 border-yellow-500 flex items-center justify-center font-black text-yellow-500">N</div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-bold">Netflix.r Rodriguez</span>
              <span className="text-[9px] bg-blue-600 px-1.5 py-0.5 rounded-full">✓ Google</span>
            </div>
            <div className="text-[10px] text-zinc-400">rodrigueznetflixr@gmail.com • Capulhuac 24/7</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center">🔊</button>
          <button className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">🚨</button>
          <button onClick={cerrarSesion} className="w-8 h-8 rounded-full bg-yellow-400 text-black flex items-center justify-center font-black text-[14px]" title="Cerrar sesión">↩</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-black px-2 py-2 grid grid-cols-5 gap-2 shrink-0">
        {[
          {label:'PERFIL', icon:'👤', active: step===0},
          {label:'ORIGEN', icon:'📍', active: step===1},
          {label:'DESTINO', icon:'🔴', active: step===2},
          {label:'DETALLES', icon:'🟢', active: step===3},
          {label:'PRECIO', icon:'💰', active: step===4},
        ].map((t,i)=>(
          <button key={i} onClick={()=>setStep(i)} className={`py-2.5 rounded-xl flex flex-col items-center justify-center text-[9px] font-bold tracking-wider ${t.active ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-zinc-400'}`}>
            <span className="text-[14px]">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* MAPA GOOGLE QUE SI CARGA EN LOCALHOST */}
      <div className="flex-1 relative bg-zinc-900 overflow-hidden min-h-[280px]">
        <iframe
          title="mapa capulhuac"
          className="absolute inset-0 w-full h-full border-0"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3773.5!2d-99.565!3d19.29!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85cd65f3d5d5d5d5%3A0x0!2sCapulhuac%20de%20Mirafuentes%2C%20M%C3%A9x.!5e0!3m2!1ses!2smx!4v1"
          loading="eager"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="absolute bottom-2 left-2 bg-black/80 text-white px-2 py-1 rounded-lg text-[9px] font-bold border border-white/20">
          📍 Capulhuac 24/7 • 19.29, -99.56
        </div>
      </div>

      {/* Bottom sheet Tu perfil */}
      <div className="bg-white text-black rounded-t-[1.8rem] p-4 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-10 shrink-0">
        <div className="w-12 h-1.5 bg-zinc-300 rounded-full mx-auto mb-4"></div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-[18px] font-black">Tu perfil</h2>
          <span className="text-[11px] bg-black text-white px-2.5 py-1 rounded-full font-bold">1 / 5</span>
        </div>
        <div className="bg-black text-white rounded-2xl p-3 flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-[#0f3d2e] border-2 border-yellow-500 flex items-center justify-center text-xl">N</div>
          <div className="flex-1">
            <div className="font-bold text-[14px]">Netflix.r Rodriguez</div>
            <div className="text-[11px] text-zinc-400">rodrigueznetflixr@gmail.com</div>
            <div className="text-[11px] text-yellow-500">✓ Verificado • 7221417521</div>
          </div>
          <button onClick={cerrarSesion} className="bg-zinc-800 px-3 py-2 rounded-xl text-[10px] font-bold border border-zinc-700">Salir</button>
        </div>

        <button onClick={cerrarSesion} className="w-full bg-black text-yellow-400 py-4 rounded-xl font-black text-sm border-2 border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
          Cerrar sesión
        </button>
        <p className="text-[9px] text-zinc-500 text-center mt-2">Vuelve al intro Porsche 2.5s</p>
      </div>

      {/* Banner Instalar - AHORA SIEMPRE VISIBLE SI NO ESTA INSTALADA */}
      {showInstall && !isStandalone && (
        <div className="bg-[#fef9e7] border-t border-yellow-200 p-3 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center border border-yellow-500/30">
              <img src="/logo.png" className="w-7 h-7 object-contain" alt="logo" onError={(e:any)=>{e.currentTarget.style.display='none'}} />
              <span className="text-yellow-500 font-black text-[10px]">M</span>
            </div>
            <div>
              <div className="text-[13px] font-black text-black">Instalar Movi Capulhuac</div>
              <div className="text-[10px] text-zinc-600">Acceso directo + funciona sin internet</div>
            </div>
          </div>
          <button onClick={instalar} className="bg-black text-yellow-400 px-5 py-2 rounded-xl font-black text-xs">Instalar</button>
        </div>
      )}
    </div>
  )
}