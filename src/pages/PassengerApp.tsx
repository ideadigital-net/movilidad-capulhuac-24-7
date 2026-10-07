import { useEffect, useState } from 'react'

export default function AppPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [step, setStep] = useState(0)
  const [telefonoCliente, setTelefonoCliente] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('telefonoCliente') || "" : "")
  const [telefonoGuardado, setTelefonoGuardado] = useState(() => typeof window !== 'undefined' ? !!localStorage.getItem('telefonoCliente') : false)
  
  // Flujo servicio
  const [origen, setOrigen] = useState("")
  const [destino, setDestino] = useState("")
  const [detalles, setDetalles] = useState("")
  const [precio, setPrecio] = useState("80")

  useEffect(() => {
    const h = (e:any) => { e.preventDefault(); setDeferredPrompt(e); setShowInstall(true) }
    window.addEventListener('beforeinstallprompt', h)
    const saved = localStorage.getItem('telefonoCliente')
    if (saved) { setTelefonoCliente(saved); setTelefonoGuardado(true) }
    setOrigen(localStorage.getItem('origen') || "")
    setDestino(localStorage.getItem('destino') || "")
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])

  const instalar = async () => { if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; setShowInstall(false) } }
  const handleLogout = () => { if(confirm('Cerrar sesión y volver al inicio?')) { localStorage.clear(); location.href='/' } }
  const guardarTelefono = () => {
    if (telefonoCliente.length === 10) {
      localStorage.setItem('telefonoCliente', telefonoCliente)
      setTelefonoGuardado(true)
      setStep(1)
    }
  }
  const cambiarNumero = () => { setTelefonoGuardado(false); setTelefonoCliente(""); localStorage.removeItem('telefonoCliente') }

  const solicitarServicio = () => {
    const mensaje = `🚕 SOLICITUD 24/7\nCliente: ${telefonoCliente}\nOrigen: ${origen}\nDestino: ${destino}\nDetalles: ${detalles}\nPrecio: $${precio}`
    localStorage.setItem('origen', origen)
    localStorage.setItem('destino', destino)
    // Aqui puedes mandar a WhatsApp, Firebase, API
    const wa = `https://wa.me/527221417521?text=${encodeURIComponent(mensaje)}`
    window.open(wa, '_blank')
    alert(`Servicio solicitado para ${telefonoCliente}\n${origen} → ${destino}`)
  }

  return (
    <div className="h-[100dvh] w-full bg-black text-white flex flex-col overflow-hidden relative">
      <div className="bg-black px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#0f3d2e] border-2 border-yellow-500 flex items-center justify-center font-black text-yellow-500">N</div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-bold">Netflix.r Rodriguez</span>
              <span className="text-[9px] bg-blue-600 px-1.5 py-0.5 rounded-full">✓ Google</span>
            </div>
            <div className="text-[10px] text-zinc-400">{telefonoCliente ? `${telefonoCliente} • ` : ''}rodrigueznetflixr@gmail.com • Capul...</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center">🔊</button>
          <button className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">🚨</button>
        </div>
      </div>

      <div className="bg-black px-2 py-2 grid grid-cols-5 gap-2 shrink-0">
        {[
          {label:'PERFIL', icon:'👤', active: step===0},
          {label:'ORIGEN', icon:'📍', active: step===1},
          {label:'DESTINO', icon:'🔴', active: step===2},
          {label:'DETALLES', icon:'🟢', active: step===3},
          {label:'PRECIO', icon:'💰', active: step===4},
        ].map((t,i)=>(
          <button key={i} onClick={()=>{ if(telefonoGuardado || i===0) setStep(i)}} className={`py-2.5 rounded-xl flex flex-col items-center justify-center text-[9px] font-bold tracking-wider ${t.active ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-zinc-400'}`}>
            <span className="text-[14px]">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 relative bg-[#c9d6de] overflow-hidden">
        <iframe
          title="mapa"
          className="absolute inset-0 w-full h-full border-0"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=-99.9%2C19.15%2C-99.3%2C19.55&layer=mapnik&marker=19.29%2C-99.56`}
        />
        {origen && <div className="absolute top-2 left-2 bg-black text-white text-[10px] px-2 py-1 rounded-full">📍 {origen.slice(0,25)}</div>}
      </div>

      <div className="bg-white text-black rounded-t-[1.8rem] p-4 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-10 max-h-[62vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-zinc-300 rounded-full mx-auto mb-4"></div>
        
        {step === 0 && (
          <>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-[18px] font-black">Tu perfil</h2>
              <span className="text-[11px] bg-black text-white px-2.5 py-1 rounded-full font-bold">1 / 5</span>
            </div>
            <div className="bg-black text-white rounded-2xl p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#0f3d2e] border-2 border-yellow-500 flex items-center justify-center text-xl">N</div>
              <div className="flex-1">
                <div className="font-bold text-[14px]">Netflix.r Rodriguez</div>
                <div className="text-[11px] text-zinc-400">rodrigueznetflixr@gmail.com</div>
                <div className="text-[11px] text-yellow-500">✓ Verificado • {telefonoCliente || 'Sin número'}</div>
              </div>
              <button onClick={handleLogout} className="text-[10px] bg-zinc-800 px-3 py-1.5 rounded-full font-bold">Salir</button>
            </div>

            {!telefonoGuardado ? (
              <>
                <div className="mt-4 rounded-[18px] border-2 border-black bg-white p-4">
                  <p className="text-[10px] font-black tracking-[0.25em] text-black/50">NÚMERO DEL CLIENTE</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-[20px]">📱</span>
                    <input type="tel" inputMode="numeric" value={telefonoCliente} onChange={(e) => setTelefonoCliente(e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="722 123 4567" className="w-full bg-transparent text-[18px] font-black tracking-wide text-black outline-none placeholder:text-black/30" />
                  </div>
                  <p className="mt-2 text-[9px] text-black/40">10 dígitos • Se usa para confirmar el viaje</p>
                </div>
                <button disabled={telefonoCliente.length < 10} onClick={guardarTelefono} className="mt-4 w-full h-[56px] rounded-2xl bg-[#FFD60A] text-black font-black text-[14px] disabled:opacity-30">Continuar con cliente → {telefonoCliente.length === 10 ? '✓' : ''}</button>
              </>
            ) : (
              <>
                <div className="mt-4 rounded-[18px] border-2 border-black bg-[#FFD60A]/20 p-4 flex justify-between items-center">
                  <div><p className="text-[10px] font-black tracking-[0.25em] text-black/50">CLIENTE ACTUAL</p><p className="text-[16px] font-black">{telefonoCliente}</p></div>
                  <button onClick={cambiarNumero} className="text-[11px] underline font-bold">Cambiar</button>
                </div>
                <button onClick={() => setStep(1)} className="mt-4 w-full h-[56px] rounded-2xl bg-[#FFD60A] text-black font-black text-[14px]">Solicitar servicio para {telefonoCliente} →</button>
              </>
            )}
            <button onClick={handleLogout} className="mt-3 w-full h-[48px] rounded-2xl bg-black text-[#FFD60A] font-bold text-[14px] border-2 border-black">Cerrar sesión</button>
          </>
        )}

        {step === 1 && (
          <>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-[18px] font-black">¿Dónde te recogemos?</h2>
              <span className="text-[11px] bg-black text-white px-2.5 py-1 rounded-full font-bold">2 / 5 • {telefonoCliente}</span>
            </div>
            <div className="rounded-[18px] border-2 border-black p-4">
              <p className="text-[10px] font-black tracking-[0.25em] text-black/50">ORIGEN</p>
              <input value={origen} onChange={e=>setOrigen(e.target.value)} placeholder="Ej: Calle Morelos 10, Capulhuac" className="mt-2 w-full text-[16px] font-bold outline-none" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={()=>setOrigen("Centro Capulhuac")} className="rounded-xl bg-zinc-100 p-3 text-[12px] font-bold text-left">📍 Centro</button>
              <button onClick={()=>setOrigen("Mercado Capulhuac")} className="rounded-xl bg-zinc-100 p-3 text-[12px] font-bold text-left">🛒 Mercado</button>
            </div>
            <button disabled={!origen} onClick={()=>setStep(2)} className="mt-4 w-full h-[56px] rounded-2xl bg-black text-[#FFD60A] font-black disabled:opacity-30">Continuar a destino →</button>
            <button onClick={()=>setStep(0)} className="mt-2 w-full text-[12px] underline">← Perfil</button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-[18px] font-black">¿A dónde vas?</h2>
              <span className="text-[11px] bg-black text-white px-2.5 py-1 rounded-full font-bold">3 / 5 • {telefonoCliente}</span>
            </div>
            <div className="rounded-[18px] border-2 border-black p-4">
              <p className="text-[10px] font-black tracking-[0.25em] text-black/50">DESTINO</p>
              <input value={destino} onChange={e=>setDestino(e.target.value)} placeholder="Ej: Toluca Centro" className="mt-2 w-full text-[16px] font-bold outline-none" />
            </div>
            <button disabled={!destino} onClick={()=>setStep(3)} className="mt-4 w-full h-[56px] rounded-2xl bg-black text-[#FFD60A] font-black disabled:opacity-30">Continuar a detalles →</button>
            <button onClick={()=>setStep(1)} className="mt-2 w-full text-[12px] underline">← Origen: {origen}</button>
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-[18px] font-black">Detalles del viaje</h2>
              <span className="text-[11px] bg-black text-white px-2.5 py-1 rounded-full font-bold">4 / 5 • {telefonoCliente}</span>
            </div>
            <div className="rounded-[18px] border-2 border-black p-4">
              <p className="text-[10px] font-black tracking-[0.25em] text-black/50">NOTAS PARA EL CHOFER</p>
              <textarea value={detalles} onChange={e=>setDetalles(e.target.value)} placeholder="Ej: 2 personas, con maletas" className="mt-2 w-full text-[14px] outline-none resize-none h-[60px]" />
            </div>
            <div className="mt-3 text-[11px] bg-zinc-100 p-3 rounded-xl">
              <p><b>Cliente:</b> {telefonoCliente}</p>
              <p><b>Ruta:</b> {origen} → {destino}</p>
            </div>
            <button onClick={()=>setStep(4)} className="mt-4 w-full h-[56px] rounded-2xl bg-black text-[#FFD60A] font-black">Ver precio →</button>
            <button onClick={()=>setStep(2)} className="mt-2 w-full text-[12px] underline">← Destino</button>
          </>
        )}

        {step === 4 && (
          <>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-[18px] font-black">Confirma tu viaje</h2>
              <span className="text-[11px] bg-black text-white px-2.5 py-1 rounded-full font-bold">5 / 5</span>
            </div>
            <div className="rounded-[18px] border-2 border-black p-4 bg-[#FFD60A]/20">
              <p className="text-[10px] font-black tracking-[0.25em]">RESUMEN</p>
              <p className="mt-2 text-[14px] font-bold">📱 Cliente: {telefonoCliente}</p>
              <p className="text-[13px]">📍 Origen: {origen}</p>
              <p className="text-[13px]">🔴 Destino: {destino}</p>
              {detalles && <p className="text-[12px] mt-1 text-zinc-600">📝 {detalles}</p>}
            </div>
            <div className="mt-4 rounded-[18px] border-2 border-black p-4 flex justify-between items-center">
              <p className="font-black">Precio estimado</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px]">$</span>
                <input type="number" value={precio} onChange={e=>setPrecio(e.target.value)} className="w-[70px] text-right text-[20px] font-black outline-none bg-transparent" />
              </div>
            </div>
            <button onClick={solicitarServicio} className="mt-4 w-full h-[60px] rounded-2xl bg-[#FFD60A] text-black font-black text-[16px]">🚕 Solicitar ahora para {telefonoCliente}</button>
            <button onClick={()=>setStep(3)} className="mt-2 w-full text-[12px] underline">← Editar detalles</button>
          </>
        )}
      </div>

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
