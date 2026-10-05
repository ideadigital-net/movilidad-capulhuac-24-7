
import { useEffect, useState } from 'react'

export default function AppPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const h = (e:any) => { e.preventDefault(); setDeferredPrompt(e); setShowInstall(true) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])

  const instalar = async () => {
    if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; setShowInstall(false) }
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
            <div className="text-[10px] text-zinc-400">rodrigueznetflixr@gmail.com • Capul...</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center">🔊</button>
          <button className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">🚨</button>
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

      {/* Mapa completo */}
      <div className="flex-1 relative bg-[#c9d6de] overflow-hidden">
        <iframe
          title="mapa"
          className="absolute inset-0 w-full h-full border-0"
          src="https://www.openstreetmap.org/export/embed.html?bbox=-99.9%2C19.15%2C-99.3%2C19.55&layer=mapnik&marker=19.29%2C-99.56"
        />
      </div>

      {/* Bottom sheet Tu perfil */}
      <div className="bg-white text-black rounded-t-[1.8rem] p-4 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-10">
        <div className="w-12 h-1.5 bg-zinc-300 rounded-full mx-auto mb-4"></div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-[18px] font-black">Tu perfil</h2>
          <span className="text-[11px] bg-black text-white px-2.5 py-1 rounded-full font-bold">1 / 5</span>
        </div>
        <div className="bg-black text-white rounded-2xl p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#0f3d2e] border-2 border-yellow-500 flex items-center justify-center text-xl">N</div>
          <div>
            <div className="font-bold text-[14px]">Netflix.r Rodriguez</div>
            <div className="text-[11px] text-zinc-400">rodrigueznetflixr@gmail.com</div>
            <div className="text-[11px] text-yellow-500">✓ Verificado • 7221417521</div>
          </div>
        </div>
      </div>

      {/* Banner Instalar */}
      {showInstall && (
        <div className="bg-[#fef9e7] border-t border-yellow-200 p-3 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-2">
            <img src="/logo.png" className="w-9 h-9 rounded-lg object-contain bg-black p-1" alt="" />
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
