
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export default function Landing() {
  const [splash, setSplash] = useState(true)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstall, setShowInstall] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 2500)
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{})
    const h = (e:any) => { e.preventDefault(); setDeferredPrompt(e); setShowInstall(true) }
    window.addEventListener('beforeinstallprompt', h)
    return () => { clearTimeout(t); window.removeEventListener('beforeinstallprompt', h) }
  }, [])

  const instalar = async () => {
    if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; setShowInstall(false) }
  }

  if (splash) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative">
        <div className="absolute inset-0 bg-black"></div>
        <div className="relative animate-[float_3s_ease-in-out_infinite] shadow-[0_0_80px_rgba(234,179,8,0.9)] rounded-[2rem]">
          <img src="/logo.png" className="w-80 h-80 object-contain rounded-[2rem]" alt="" />
        </div>
        <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}`}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col items-center justify-between">
      <div className="absolute inset-0">
        <img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1920" className="w-full h-full object-cover opacity-25" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/60"></div>
      </div>

      <div className="relative z-10 pt-16 animate-[float_3s_ease-in-out_infinite]">
        <div className="w-[90px] h-[90px] rounded-[1.8rem] bg-black border border-yellow-500/30 flex items-center justify-center shadow-[0_0_60px_rgba(234,179,8,1)]">
          <img src="/logo.png" className="w-[72px] h-[72px] object-contain rounded-xl" alt="" />
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <h1 className="text-[2.9rem] font-black tracking-tight">MOVI</h1>
        <p className="text-[10px] tracking-[0.38em] text-yellow-500 font-bold mt-1">CAPULHUAC 24/7</p>
        <p className="text-[13px] text-zinc-300 mt-6 max-w-[250px] leading-snug">Taxis seguros, rápidos y siempre disponibles en tu municipio</p>
        <div className="w-24 h-[2px] bg-zinc-800 mt-8 rounded-full overflow-hidden">
          <div className="h-full bg-yellow-500 w-full animate-[load_2s_ease-in-out_infinite]"></div>
        </div>
        <p className="text-[9px] tracking-[0.35em] text-zinc-500 mt-3">CARGANDO EXPERIENCIA</p>
      </div>

      <div className="relative z-10 w-full max-w-sm px-6 pb-8 flex flex-col gap-3">
        {showInstall && (
          <button onClick={instalar} className="w-full bg-zinc-900/90 border border-yellow-500/50 text-yellow-500 py-3.5 rounded-2xl font-bold text-xs animate-pulse">
            📲 INSTALAR APP EN MI CELULAR
          </button>
        )}
        <Link to="/app" className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black text-sm text-center shadow-[0_0_40px_rgba(234,179,8,0.8)]">
          Comenzar viaje →
        </Link>
        <p className="text-[9px] text-zinc-500 text-center">Toque para continuar • Sin registro previo</p>
      </div>

      <style>{`
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes load{0%{transform:translateX(-100%)}50%{transform:translateX(0)}100%{transform:translateX(100%)}}
      `}</style>
    </div>
  )
}
