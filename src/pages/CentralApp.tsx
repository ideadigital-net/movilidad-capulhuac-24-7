// src/pages/CentralApp.tsx - CENTRAL QUE SE REGISTRA Y RECIBE NOTIFICACIONES
import { useState, useEffect, useRef } from 'react'
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore'
import { db, auth } from '../lib/firebase'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'

export default function CentralApp(){
  const [usuarioCentral,setUsuarioCentral]=useState<any>(null)
  const [nombreCentral,setNombreCentral]=useState(localStorage.getItem('central_nombre')||'Central Capulhuac')
  const [telefonoCentral,setTelefonoCentral]=useState(localStorage.getItem('central_telefono')||'7221417521')
  const [tab,setTab]=useState<'viajes'|'panicos'|'chats'|'choferes'>('viajes')
  const [viajes,setViajes]=useState<any[]>([])
  const [panicos,setPanicos]=useState<any[]>([])
  const [chats,setChats]=useState<any[]>([])
  const [choferes,setChoferes]=useState<any[]>([])
  const [notifCount,setNotifCount]=useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  // REGISTRO CENTRAL
  useEffect(()=>{
    onAuthStateChanged(auth, async (user)=>{
      if(!user){
        await signInAnonymously(auth)
      } else {
        setUsuarioCentral(user)
        localStorage.setItem('central_nombre', nombreCentral)
        localStorage.setItem('central_telefono', telefonoCentral)
      }
    })
    // Pide permiso notificaciones
    if(Notification && Notification.permission!=='granted'){
      Notification.requestPermission()
    }
  }, [])

  // ESCUCHA VIAJES PENDIENTES Y TODOS
  useEffect(()=>{
    const q = query(collection(db,'viajes'), orderBy('createdAt','desc'))
    const unsub = onSnapshot(q, (snap)=>{
      const lista:any[]=[]
      snap.forEach(d=>lista.push({ id: d.id, ...d.data() }))
      // Notifica si hay nuevos pendientes
      const pendientesAntes = viajes.filter(v=>v.estado==='pendiente').length
      const pendientesAhora = lista.filter((v:any)=>v.estado==='pendiente').length
      if(pendientesAhora>pendientesAntes && viajes.length>0){
        notificar(`🚕 Nuevo viaje ${lista[0].codigo}`, `${lista[0].pasajeroNombre} - ${lista[0].origen} → ${lista[0].destino} - $${lista[0].precio}`)
        setNotifCount(c=>c+1)
      }
      setViajes(lista)
    })
    return ()=>unsub()
  }, [viajes.length])

  // ESCUCHA PANICOS - CRITICO
  useEffect(()=>{
    const q = query(collection(db,'panicos'), orderBy('createdAt','desc'))
    const unsub = onSnapshot(q, (snap)=>{
      const lista:any[]=[]
      snap.forEach(d=>lista.push({ id: d.id, ...d.data() }))
      if(lista.length>panicos.length && panicos.length>0){
        const ultimo = lista[0]
        notificar(`🚨 PÁNICO ${ultimo.pasajeroNombre}`, `${ultimo.pasajeroTelefono} - ${ultimo.link}`, true)
        if(audioRef.current) audioRef.current.play()
        setNotifCount(c=>c+1)
      }
      setPanicos(lista)
    })
    return ()=>unsub()
  }, [panicos.length])

  // ESCUCHA CHATS
  useEffect(()=>{
    const q = query(collection(db,'chats'), orderBy('createdAt','desc'))
    const unsub = onSnapshot(q, (snap)=>{
      const lista:any[]=[]
      snap.forEach(d=>lista.push({ id: d.id, ...d.data() }))
      setChats(lista.slice(0,50))
    })
    return ()=>unsub()
  }, [])

  // ESCUCHA CHOFERES
  useEffect(()=>{
    const q = query(collection(db,'choferes'))
    const unsub = onSnapshot(q, (snap)=>{
      const lista:any[]=[]
      snap.forEach(d=>lista.push({ id: d.id, ...d.data() }))
      setChoferes(lista)
    })
    return ()=>unsub()
  }, [])

  const notificar = (titulo:string, body:string, esPanico=false)=>{
    if(Notification.permission==='granted'){
      new Notification(titulo, { body, icon: 'https://cdn-icons-png.flaticon.com/512/565/565547.png', vibrate: esPanico?[200,100,200,100,500]:[200] } as any)
    }
    if(esPanico && navigator.vibrate) navigator.vibrate([200,100,200,100,500])
  }

  const asignarChofer = async (viaje:any, chofer:any)=>{
    try{
      await updateDoc(doc(db,'viajes',viaje.id), {
        choferId: chofer.id,
        choferNombre: chofer.nombre||chofer.name,
        choferTelefono: chofer.telefono||chofer.phone,
        estado: 'asignado',
        asignadoPor: nombreCentral,
        asignadoAt: serverTimestamp()
      })
      await addDoc(collection(db,'chats'), {
        viajeCodigo: viaje.codigo,
        de: 'CENTRAL',
        deNombre: nombreCentral,
        texto: `Central ${nombreCentral} asignó chofer ${chofer.nombre||chofer.name} - Tel ${chofer.telefono}`,
        tipo: 'sistema',
        hora: new Date().toLocaleTimeString(),
        createdAt: serverTimestamp()
      })
      alert(`Chofer ${chofer.nombre} asignado a viaje ${viaje.codigo}`)
    }catch(e){ alert('Error asignando') }
  }

  const guardarCentral = ()=>{
    localStorage.setItem('central_nombre', nombreCentral)
    localStorage.setItem('central_telefono', telefonoCentral)
    alert(`Central registrada: ${nombreCentral} - ${telefonoCentral} - Ya recibirás notificaciones`)
  }

  return(
    <div className="min-h-screen bg-gray-900 text-white p-3">
      <audio ref={audioRef} src="https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c8b9bd.mp3?filename=emergency-alarm-100504.mp3" preload="auto" />
      
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-2xl p-4 mb-3 flex justify-between items-center border-2 border-yellow-500">
          <div>
            <h1 className="text-xl font-black">📡 CENTRAL CAPULHUAC - {nombreCentral}</h1>
            <div className="text-[10px] text-gray-400">Tel: {telefonoCentral} | Usuario: {usuarioCentral?.uid?.slice(0,8)} | 🔔 Notificaciones activas</div>
          </div>
          <div className="text-right">
            <div className="text-xs bg-red-600 px-3 py-1 rounded-full animate-pulse font-black">🔴 {notifCount} notificaciones</div>
            <button onClick={()=>setNotifCount(0)} className="text-[9px] underline mt-1">Limpiar</button>
          </div>
        </div>

        {/* REGISTRO CENTRAL */}
        <div className="bg-gray-800 rounded-xl p-3 mb-3 border border-gray-700">
          <div className="text-xs font-bold mb-2">👤 Registro Central (para que choferes y pasajeros se enlacen contigo)</div>
          <div className="flex gap-2">
            <input value={nombreCentral} onChange={e=>setNombreCentral(e.target.value)} placeholder="Nombre central" className="flex-1 p-2 rounded bg-gray-700 text-sm" />
            <input value={telefonoCentral} onChange={e=>setTelefonoCentral(e.target.value)} placeholder="WhatsApp central 722..." className="flex-1 p-2 rounded bg-gray-700 text-sm" />
            <button onClick={guardarCentral} className="bg-yellow-500 text-black px-4 rounded font-bold text-xs">Guardar</button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-1 mb-3 flex-wrap">
          <button onClick={()=>setTab('viajes')} className={`${tab==='viajes'?'bg-white text-black':'bg-gray-700'} px-4 py-2 rounded-full text-xs font-bold`}>🚕 Viajes ({viajes.length}) - {viajes.filter((v:any)=>v.estado==='pendiente').length} pendientes</button>
          <button onClick={()=>setTab('panicos')} className={`${tab==='panicos'?'bg-red-600':'bg-gray-700'} px-4 py-2 rounded-full text-xs font-bold animate-pulse`}>🚨 Pánicos ({panicos.length})</button>
          <button onClick={()=>setTab('chats')} className={`${tab==='chats'?'bg-blue-600':'bg-gray-700'} px-4 py-2 rounded-full text-xs font-bold`}>💬 Chats ({chats.length})</button>
          <button onClick={()=>setTab('choferes')} className={`${tab==='choferes'?'bg-green-600':'bg-gray-700'} px-4 py-2 rounded-full text-xs font-bold`}>🚕 Choferes ({choferes.length})</button>
        </div>

        {/* TAB VIAJES */}
        {tab==='viajes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {viajes.map((viaje:any)=>(
              <div key={viaje.id} className={`bg-gray-800 rounded-xl p-3 border-l-4 ${viaje.estado==='pendiente' ? 'border-yellow-500' : viaje.estado==='asignado' ? 'border-blue-500' : viaje.estado==='panico' ? 'border-red-600' : 'border-green-500'}`}>
                <div className="flex justify-between">
                  <span className="font-black">Viaje #{viaje.codigo} - ${viaje.precio}</span>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${viaje.estado==='pendiente'?'bg-yellow-500 text-black':'bg-green-600'}`}>{viaje.estado}</span>
                </div>
                <div className="text-[11px] mt-2">
                  <div>👤 {viaje.pasajeroNombre} - 📞 {viaje.pasajeroTelefono}</div>
                  <div>📍 {viaje.origen?.slice(0,60)}</div>
                  <div>🔴 {viaje.destino?.slice(0,60)}</div>
                  {viaje.numParadas>0 && <div>🟢 {viaje.numParadas} paradas</div>}
                  {viaje.choferNombre && <div className="text-green-400 font-bold">🚕 Chofer: {viaje.choferNombre} - {viaje.choferTelefono}</div>}
                  <div className="text-[9px] text-gray-400">{viaje.createdAt?.toDate?.()?.toLocaleString?.()||''}</div>
                </div>
                {viaje.estado==='pendiente' && (
                  <div className="mt-2">
                    <div className="text-[10px] font-bold mb-1">Asignar chofer:</div>
                    <div className="flex gap-1 flex-wrap">
                      {choferes.map((ch:any)=>(
                        <button key={ch.id} onClick={()=>asignarChofer(viaje,ch)} className="bg-blue-600 text-[10px] px-2 py-1 rounded-full">{ch.nombre||ch.name} - {ch.telefono?.slice(-4)}</button>
                      ))}
                      {choferes.length===0 && <span className="text-[9px] text-gray-500">No hay choferes registrados en colección choferes</span>}
                    </div>
                  </div>
                )}
                <div className="flex gap-1 mt-2">
                  <button onClick={()=>window.open(`https://www.google.com/maps?q=${viaje.origenCoords?.lat},${viaje.origenCoords?.lng}`,'_blank')} className="bg-gray-700 text-[10px] px-2 py-1 rounded">Ver origen Maps</button>
                  <button onClick={()=>window.open(`https://wa.me/52${viaje.pasajeroTelefono?.replace(/\D/g,'').slice(-10)}?text=Hola ${viaje.pasajeroNombre} soy de central, tu viaje ${viaje.codigo}`,'_blank')} className="bg-green-600 text-[10px] px-2 py-1 rounded">WhatsApp pasajero</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB PANICOS */}
        {tab==='panicos' && (
          <div className="space-y-2">
            {panicos.map((p:any)=>(
              <div key={p.id} className="bg-red-900 border-2 border-red-500 rounded-xl p-3 animate-pulse">
                <div className="flex justify-between">
                  <span className="font-black text-red-300">🚨 PÁNICO - {p.pasajeroNombre} - {p.pasajeroTelefono}</span>
                  <span className="text-[10px]">{p.hora}</span>
                </div>
                <div className="text-xs mt-1">Viaje: {p.viajeCodigo} | Chofer: {p.choferNombre||'sin asignar'}</div>
                <div className="text-xs">Origen: {p.origen}</div>
                <div className="mt-2 flex gap-2">
                  <a href={p.link} target="_blank" className="bg-white text-red-600 px-3 py-1 rounded-full text-xs font-black">📍 Ver ubicación Maps</a>
                  <button onClick={()=>window.open(`https://wa.me/52${p.pasajeroTelefono?.replace(/\D/g,'').slice(-10)}?text=🚨 Recibimos tu pánico ${p.pasajeroNombre} estamos enviando ayuda - Ubicación ${p.link}`,'_blank')} className="bg-green-600 px-3 py-1 rounded-full text-xs font-bold">WhatsApp pasajero</button>
                  {p.choferId && <button onClick={()=>window.open(`https://wa.me/527221417521?text=🚨 PANICO ${p.pasajeroNombre} ${p.link}`,'_blank')} className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">Avisar base</button>}
                </div>
              </div>
            ))}
            {panicos.length===0 && <div className="text-gray-500 text-center text-sm">Sin pánicos - todo tranquilo</div>}
          </div>
        )}

        {/* TAB CHATS */}
        {tab==='chats' && (
          <div className="bg-gray-800 rounded-xl p-3">
            <div className="space-y-1 max-h-[70vh] overflow-y-auto">
              {chats.map((c:any)=>(
                <div key={c.id} className={`p-2 rounded text-xs ${c.de==='pasajero'?'bg-blue-900':c.de==='CENTRAL'?'bg-yellow-900':'bg-gray-700'} ${c.tipo==='panico'?'border-2 border-red-500':''}`}>
                  <span className="font-bold">{c.deNombre||c.de} {c.de==='pasajero'&&`(${c.deTelefono||''})`} - Viaje {c.viajeCodigo} - {c.hora}</span>: {c.texto}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB CHOFERES */}
        {tab==='choferes' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {choferes.map((ch:any)=>(
              <div key={ch.id} className="bg-gray-800 rounded-xl p-3">
                <div className="font-bold">{ch.nombre||ch.name}</div>
                <div className="text-xs">📞 {ch.telefono||ch.phone}</div>
                <div className="text-[10px] text-gray-400">{ch.vehiculo||''} - {ch.placas||''}</div>
                <div className="text-[9px] mt-1">Estado: {ch.estado||'disponible'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}