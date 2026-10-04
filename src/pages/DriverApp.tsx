// src/pages/DriverApp.tsx - CHOFER ENLAZADO CON PASAJERO + CENTRAL + PANICO + CHAT VOZ
import { useState, useEffect, useRef } from 'react'
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { db, auth } from '../lib/firebase'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const iconChofer = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] })
const iconPasajero = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] })
const iconDestino = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] })

function MapController({ center }: { center: [number,number] }) { const map = useMap(); useEffect(()=>{ map.setView(center, 14) }, [center]); return null }

export default function DriverApp(){
  const [chofer,setChofer]=useState<any>(null)
  const [nombreChofer,setNombreChofer]=useState(localStorage.getItem('chofer_nombre')||'')
  const [telefonoChofer,setTelefonoChofer]=useState(localStorage.getItem('chofer_telefono')||'')
  const [vehiculo,setVehiculo]=useState(localStorage.getItem('chofer_vehiculo')||'Tsuru blanco')
  const [placas,setPlacas]=useState(localStorage.getItem('chofer_placas')||'')
  const [showRegistro,setShowRegistro]=useState(false)
  const [viajesPendientes,setViajesPendientes]=useState<any[]>([])
  const [viajeActivo,setViajeActivo]=useState<any>(null)
  const [chats,setChats]=useState<any[]>([])
  const [textoChat,setTextoChat]=useState('')
  const [panicos,setPanicos]=useState<any[]>([])
  const [grabando,setGrabando]=useState(false)
  const mediaRecorderRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const TELEFONO_BASE = '527221417521'

  useEffect(()=>{
    onAuthStateChanged(auth, async (user)=>{
      if(!user){ await signInAnonymously(auth) }
      const n = localStorage.getItem('chofer_nombre')
      const t = localStorage.getItem('chofer_telefono')
      if(n && t){
        setChofer({ uid: user?.uid||'chofer-'+t, nombre: n, telefono: t, vehiculo: localStorage.getItem('chofer_vehiculo'), placas: localStorage.getItem('chofer_placas') })
        setNombreChofer(n); setTelefonoChofer(t)
      } else {
        setShowRegistro(true)
      }
    })
    if(Notification && Notification.permission!=='granted') Notification.requestPermission()
  }, [])

  // ESCUCHA VIAJES PENDIENTES + MIS VIAJES
  useEffect(()=>{
    const q = query(collection(db,'viajes'), where('estado','in',['pendiente','asignado','aceptado','en_curso']), orderBy('createdAt','desc'))
    const unsub = onSnapshot(q, (snap)=>{
      const lista:any[]=[]
      snap.forEach(d=>lista.push({ id: d.id, ...d.data() }))
      // Si hay uno asignado a mi, ponlo como activo
      const mio = lista.find((v:any)=>v.choferId===chofer?.uid || v.choferTelefono===telefonoChofer)
      if(mio && !viajeActivo) setViajeActivo(mio)
      setViajesPendientes(lista.filter((v:any)=>v.estado==='pendiente' || v.choferId===chofer?.uid))
      if(lista.length>0 && viajesPendientes.length>0 && lista.filter((v:any)=>v.estado==='pendiente').length > viajesPendientes.filter((v:any)=>v.estado==='pendiente').length){
        if(Notification.permission==='granted') new Notification(`🚕 Nuevo viaje ${lista[0].codigo}`, { body: `${lista[0].pasajeroNombre} - ${lista[0].origen?.slice(0,40)} → $${lista[0].precio}` })
      }
    }, (err)=>{
      // Fallback si no hay indice compuesto, escucha sin orderBy
      const q2 = query(collection(db,'viajes'))
      onSnapshot(q2, (snap)=>{
        const lista:any[]=[]
        snap.forEach(d=>lista.push({ id: d.id, ...d.data() }))
        setViajesPendientes(lista.filter((v:any)=>['pendiente','asignado'].includes(v.estado)).slice(0,20))
      })
    })
    return ()=>unsub()
  }, [chofer?.uid, telefonoChofer])

  // ESCUCHA CHAT DE MI VIAJE ACTIVO
  useEffect(()=>{
    if(!viajeActivo?.codigo) return
    const q = query(collection(db,'chats'), where('viajeCodigo','==',viajeActivo.codigo), orderBy('createdAt','asc'))
    const unsub = onSnapshot(q, (snap)=>{
      const lista:any[]=[]
      snap.forEach(d=>lista.push({ id: d.id, ...d.data() }))
      setChats(lista)
      const ultimo = lista[lista.length-1]
      if(ultimo && ultimo.de==='pasajero' && chats.length>0 && ultimo.timestamp!==chats[chats.length-1]?.timestamp){
        if(Notification.permission==='granted') new Notification(`💬 ${ultimo.deNombre||'Pasajero'}: ${ultimo.texto?.slice(0,50)}`)
      }
    })
    return ()=>unsub()
  }, [viajeActivo?.codigo])

  // ESCUCHA PANICOS DE MIS VIAJES
  useEffect(()=>{
    if(!viajeActivo?.codigo) return
    const q = query(collection(db,'panicos'), where('viajeCodigo','==',viajeActivo.codigo), orderBy('createdAt','desc'))
    const unsub = onSnapshot(q, (snap)=>{
      const lista:any[]=[]
      snap.forEach(d=>lista.push({ id: d.id, ...d.data() }))
      if(lista.length>panicos.length && panicos.length>0){
        if(audioRef.current) audioRef.current.play()
        if(navigator.vibrate) navigator.vibrate([200,100,200,100,500])
        if(Notification.permission==='granted') new Notification(`🚨 PÁNICO ${lista[0].pasajeroNombre}`, { body: `Viaje ${lista[0].viajeCodigo} - ${lista[0].link}` })
      }
      setPanicos(lista)
    })
    return ()=>unsub()
  }, [viajeActivo?.codigo])

  const guardarRegistroChofer = async ()=>{
    if(!nombreChofer || !telefonoChofer) return alert('Pon nombre y telefono')
    localStorage.setItem('chofer_nombre', nombreChofer)
    localStorage.setItem('chofer_telefono', telefonoChofer)
    localStorage.setItem('chofer_vehiculo', vehiculo)
    localStorage.setItem('chofer_placas', placas)
    const uid = auth.currentUser?.uid || 'chofer-'+telefonoChofer.replace(/\D/g,'')
    const datosChofer = { id: uid, nombre: nombreChofer, telefono: telefonoChofer, vehiculo, placas, estado: 'disponible', telefonoBase: TELEFONO_BASE, createdAt: serverTimestamp() }
    try{
      const ref = doc(db,'choferes',uid)
      const snap = await getDoc(ref)
      if(!snap.exists()){
        await addDoc(collection(db,'choferes'), { ...datosChofer, uid })
      } else {
        await updateDoc(ref, { nombre: nombreChofer, telefono: telefonoChofer, vehiculo, placas, estado: 'disponible' })
      }
    }catch(e){ console.log('local chofer',e) }
    setChofer({ uid, ...datosChofer })
    setShowRegistro(false)
    alert(`Chofer registrado: ${nombreChofer} - ${telefonoChofer} - Ya puedes tomar viajes`)
  }

  const aceptarViaje = async (viaje:any)=>{
    if(!chofer) return setShowRegistro(true)
    if(!confirm(`¿Aceptar viaje ${viaje.codigo}?\nPasajero: ${viaje.pasajeroNombre} ${viaje.pasajeroTelefono}\n${viaje.origen} → ${viaje.destino}\n$${viaje.precio}`)) return
    try{
      await updateDoc(doc(db,'viajes',viaje.id), {
        choferId: chofer.uid,
        choferNombre: nombreChofer,
        choferTelefono: telefonoChofer,
        choferVehiculo: vehiculo,
        choferPlacas: placas,
        estado: 'asignado',
        aceptadoAt: serverTimestamp(),
        centralTelefono: TELEFONO_BASE
      })
      await addDoc(collection(db,'chats'), {
        viajeCodigo: viaje.codigo,
        de: 'chofer',
        deNombre: nombreChofer,
        deTelefono: telefonoChofer,
        texto: `🚕 Chofer ${nombreChofer} aceptó tu viaje - Vehículo ${vehiculo} ${placas} - Voy para allá - Tel ${telefonoChofer}`,
        tipo: 'sistema',
        hora: new Date().toLocaleTimeString(),
        createdAt: serverTimestamp()
      })
      setViajeActivo({ ...viaje, choferId: chofer.uid, choferNombre: nombreChofer, choferTelefono: telefonoChofer })
    }catch(e){ 
      // Fallback local
      setViajeActivo({ ...viaje, choferId: chofer.uid, choferNombre: nombreChofer, choferTelefono: telefonoChofer, estado: 'asignado' })
    }
  }

  const enviarMensaje = async ()=>{
    if(!textoChat.trim() || !viajeActivo) return
    const msg = { de: 'chofer', deNombre: nombreChofer, deTelefono: telefonoChofer, texto: textoChat, tipo: 'texto', hora: new Date().toLocaleTimeString(), timestamp: Date.now() }
    setChats([...chats, msg]); setTextoChat('')
    try{ await addDoc(collection(db,'chats'), { viajeCodigo: viajeActivo.codigo, choferId: chofer?.uid, ...msg, createdAt: serverTimestamp() }) }catch{}
  }

  const compartirUbicacion = ()=>{
    if(!navigator.geolocation) return alert('No GPS')
    navigator.geolocation.getCurrentPosition((pos)=>{
      const { latitude, longitude } = pos.coords
      const link = `https://www.google.com/maps?q=${latitude},${longitude}`
      const msg = `📍 Mi ubicación chofer ${nombreChofer}: ${link}`
      setTextoChat(msg)
    })
  }

  return(
    <div className="min-h-screen bg-gray-50 p-3 pb-20">
      <audio ref={audioRef} src="https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c8b9bd.mp3?filename=emergency-alarm-100504.mp3" preload="auto" />
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-black">🚕 Chofer - {nombreChofer||'Sin registro'}</h1>
          <span className="text-[9px] bg-green-100 px-2 py-1 rounded-full border">{telefonoChofer||'Sin tel'}</span>
        </div>
        <div className="text-[10px] text-gray-500 mb-2">Link con pasajero {viajeActivo?.pasajeroNombre?`→ ${viajeActivo.pasajeroNombre} ${viajeActivo.pasajeroTelefono}`:''} | Base {TELEFONO_BASE}</div>

        {showRegistro && (
          <div className="bg-yellow-50 border-2 border-yellow-400 p-3 rounded-xl mb-3">
            <div className="text-xs font-black mb-2">🚕 Registro chofer - Para enlazar con pasajero y central {TELEFONO_BASE}</div>
            <input value={nombreChofer} onChange={e=>setNombreChofer(e.target.value)} placeholder="Tu nombre completo" className="w-full p-2 border rounded-xl text-sm mb-2" />
            <input value={telefonoChofer} onChange={e=>setTelefonoChofer(e.target.value)} placeholder="Tu WhatsApp 722..." className="w-full p-2 border rounded-xl text-sm mb-2" />
            <input value={vehiculo} onChange={e=>setVehiculo(e.target.value)} placeholder="Vehículo Ej: Tsuru blanco" className="w-full p-2 border rounded-xl text-sm mb-2" />
            <input value={placas} onChange={e=>setPlacas(e.target.value)} placeholder="Placas" className="w-full p-2 border rounded-xl text-sm mb-2" />
            <div className="flex gap-2"><button onClick={guardarRegistroChofer} className="flex-1 bg-black text-white p-2 rounded-xl font-bold text-xs">Guardar chofer</button><button onClick={()=>setShowRegistro(false)} className="bg-gray-200 px-3 rounded-xl text-xs">Cerrar</button></div>
          </div>
        )}

        {/* PANICO ALERTA */}
        {panicos.length>0 && (
          <div className="bg-red-600 text-white p-3 rounded-xl mb-3 animate-pulse border-4 border-white shadow-2xl">
            <div className="font-black">🚨 PÁNICO ACTIVO - Viaje {panicos[0].viajeCodigo}</div>
            <div className="text-xs">Pasajero {panicos[0].pasajeroNombre} - {panicos[0].pasajeroTelefono}</div>
            <div className="flex gap-2 mt-2">
              <a href={panicos[0].link} target="_blank" className="bg-white text-red-600 px-3 py-1 rounded-full text-xs font-black">📍 Ver ubicación</a>
              <button onClick={()=>window.open(`https://wa.me/52${panicos[0].pasajeroTelefono?.replace(/\D/g,'').slice(-10)}?text=🚨 Soy tu chofer ${nombreChofer} recibí tu pánico voy para allá ${panicos[0].link}`,'_blank')} className="bg-green-600 px-3 py-1 rounded-full text-xs font-bold">WhatsApp pasajero</button>
            </div>
          </div>
        )}

        {/* VIAJE ACTIVO */}
        {viajeActivo ? (
          <div className="bg-blue-50 border-2 border-blue-400 p-3 rounded-xl mb-3">
            <div className="flex justify-between"><span className="font-black">Viaje #{viajeActivo.codigo} - ${viajeActivo.precio} - {viajeActivo.estado}</span><button onClick={()=>setViajeActivo(null)} className="text-[9px] bg-gray-200 px-2 py-1 rounded-full">Ver lista</button></div>
            <div className="text-[11px] mt-2 bg-white p-2 rounded border">
              <div className="font-bold">👤 Pasajero registrado: {viajeActivo.pasajeroNombre} - 📞 {viajeActivo.pasajeroTelefono}</div>
              <div>📍 Origen: {viajeActivo.origen}</div>
              <div>🔴 Destino: {viajeActivo.destino}</div>
              {viajeActivo.numParadas>0 && <div>🟢 {viajeActivo.numParadas} paradas</div>}
              <div className="mt-1 text-[10px]">Origen: {viajeActivo.origenCoords?.lat},{viajeActivo.origenCoords?.lng} | Destino: {viajeActivo.destinoCoords?.lat},{viajeActivo.destinoCoords?.lng}</div>
            </div>
            <div className="flex gap-1 mt-2">
              <button onClick={()=>window.open(`https://www.google.com/maps/dir/?api=1&destination=${viajeActivo.origenCoords?.lat},${viajeActivo.origenCoords?.lng}`,'_blank')} className="bg-blue-600 text-white text-[10px] px-3 py-2 rounded-full font-bold">📍 Ir a origen Maps</button>
              <button onClick={()=>window.open(`https://wa.me/52${viajeActivo.pasajeroTelefono?.replace(/\D/g,'').slice(-10)}?text=Hola ${viajeActivo.pasajeroNombre} soy tu chofer ${nombreChofer} ${vehiculo} voy en camino a ${viajeActivo.origen}`,'_blank')} className="bg-green-600 text-white text-[10px] px-3 py-2 rounded-full font-bold">WhatsApp {viajeActivo.pasajeroNombre?.split(' ')[0]}</button>
              <button onClick={compartirUbicacion} className="bg-gray-700 text-white text-[10px] px-3 py-2 rounded-full">📍 Mi ubi</button>
            </div>

            {/* CHAT CON PASAJERO - TEXTO Y VOZ */}
            <div className="bg-white border-2 border-blue-200 rounded-xl p-2 mt-3">
              <div className="text-[11px] font-black mb-1">💬 Chat con {viajeActivo.pasajeroNombre} - Link directo</div>
              <div className="bg-gray-50 rounded-xl p-2 h-48 overflow-y-auto mb-2 border">
                {chats.length===0 ? <div className="text-[10px] text-gray-400 text-center mt-10">Chatea con el pasajero para que te de referencia exacta<br/>Ej: Casa azul, portón negro</div> :
                  chats.map((c,i)=>(
                    <div key={i} className={`mb-2 p-2 rounded-xl text-xs max-w-[85%] ${c.de==='chofer'?'bg-blue-600 text-white ml-auto':'bg-white border shadow-sm'} ${c.tipo==='panico'?'bg-red-100 border-red-500 border-2':''}`}>
                      <div className="font-bold text-[9px]">{c.deNombre||c.de} • {c.hora}</div>
                      <div>{c.texto}</div>
                      {c.tipo==='voz' && c.audioUrl && <audio controls src={c.audioUrl} className="w-full mt-1 h-8" />}
                    </div>
                  ))
                }
              </div>
              <div className="flex gap-1">
                <input value={textoChat} onChange={e=>setTextoChat(e.target.value)} placeholder="Ej: Ya voy, estoy a 2 min, sal..." className="flex-1 p-2 border-2 border-blue-200 rounded-full text-xs" onKeyDown={e=>e.key==='Enter'&&enviarMensaje()} />
                <button onClick={enviarMensaje} className="bg-blue-600 text-white px-3 rounded-full text-xs font-bold">Enviar</button>
                <button onClick={async ()=>{
                  if(grabando){ if(mediaRecorderRef.current){ mediaRecorderRef.current.stop(); setGrabando(false) } return }
                  try{
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                    const recorder = new MediaRecorder(stream); mediaRecorderRef.current=recorder; const chunks:any[]=[]
                    recorder.ondataavailable=(e:any)=>chunks.push(e.data)
                    recorder.onstop=async ()=>{ const blob=new Blob(chunks,{type:'audio/webm'}); const audioUrl=URL.createObjectURL(blob); const msg={de:'chofer',deNombre:nombreChofer,texto:'🎤 Nota de voz chofer',tipo:'voz',audioUrl,hora:new Date().toLocaleTimeString(),timestamp:Date.now()}; setChats((prev:any)=>[...prev,msg]); try{ await addDoc(collection(db,'chats'),{ viajeCodigo: viajeActivo.codigo, choferId: chofer?.uid, ...msg, createdAt: serverTimestamp()}) }catch{}; stream.getTracks().forEach(t=>t.stop()) }
                    recorder.start(); setGrabando(true)
                  }catch{ alert('No micrófono') }
                }} className={`${grabando?'bg-red-600 animate-pulse':'bg-green-600'} text-white px-3 rounded-full text-xs font-bold`}>{grabando?'■':'🎤'}</button>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button onClick={async ()=>{ try{ await updateDoc(doc(db,'viajes',viajeActivo.id),{ estado:'en_curso', iniciadoAt: serverTimestamp() }) }catch{}; setViajeActivo({...viajeActivo, estado:'en_curso'}) }} className="flex-1 bg-black text-white p-2 rounded-xl font-bold text-xs">Iniciar viaje</button>
              <button onClick={async ()=>{ try{ await updateDoc(doc(db,'viajes',viajeActivo.id),{ estado:'finalizado', finalizadoAt: serverTimestamp() }) }catch{}; setViajeActivo(null); alert('Viaje finalizado') }} className="flex-1 bg-green-600 text-white p-2 rounded-xl font-bold text-xs">Finalizar</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-2"><h2 className="text-sm font-black">Viajes pendientes ({viajesPendientes.length})</h2><button onClick={()=>setShowRegistro(true)} className="text-[9px] bg-gray-200 px-2 py-1 rounded-full">Editar chofer {nombreChofer?.slice(0,10)}</button></div>
            {viajesPendientes.length===0 && <div className="text-xs text-gray-500 text-center py-10">No hay viajes pendientes<br/>Esperando que pasajero registre viaje...</div>}
            {viajesPendientes.map((viaje:any)=>(
              <div key={viaje.id} className="bg-white border-2 border-yellow-400 rounded-xl p-3 mb-2 shadow">
                <div className="flex justify-between"><span className="font-black">#{viaje.codigo} - ${viaje.precio}</span><span className="text-[9px] bg-yellow-100 px-2 py-1 rounded-full">{viaje.estado}</span></div>
                <div className="text-[11px] mt-1">
                  <div className="font-bold">👤 {viaje.pasajeroNombre||'Sin nombre'} - 📞 {viaje.pasajeroTelefono||'Sin tel'}</div>
                  <div className="truncate">📍 {viaje.origen?.slice(0,50)}</div>
                  <div className="truncate">🔴 {viaje.destino?.slice(0,50)}</div>
                  {viaje.numParadas>0 && <div>🟢 {viaje.numParadas} paradas</div>}
                </div>
                <button onClick={()=>aceptarViaje(viaje)} className="w-full mt-2 bg-black text-white p-2 rounded-xl font-bold text-xs">Aceptar viaje #{viaje.codigo} - LINK con {viaje.pasajeroNombre?.split(' ')[0]||'pasajero'}</button>
              </div>
            ))}
          </div>
        )}

        {/* MAPA */}
        {viajeActivo && viajeActivo.origenCoords && (
          <div className="rounded-xl overflow-hidden border-2 mt-3" style={{height:'250px'}}>
            <MapContainer center={[viajeActivo.origenCoords.lat, viajeActivo.origenCoords.lng]} zoom={14} style={{height:'100%', width:'100%'}}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[viajeActivo.origenCoords.lat, viajeActivo.origenCoords.lng]} icon={iconPasajero} />
              {viajeActivo.destinoCoords && <Marker position={[viajeActivo.destinoCoords.lat, viajeActivo.destinoCoords.lng]} icon={iconDestino} />}
              <MapController center={[viajeActivo.origenCoords.lat, viajeActivo.origenCoords.lng]} />
            </MapContainer>
          </div>
        )}
      </div>
    </div>
  )
}