
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

type DestFrecuente = { texto:string; lat:number; lng:number; count:number; lastUsed:number }
type TariffConfig = { tarifa_base:number; km_gratis:number; por_km:number; por_min:number; minimo:number; comision_plataforma:number; iva:number; rango_base_km?:number; por_km_fuera_rango?:number }

export default function AppPage() {
  const [step, setStep] = useState(0)
  const [telefonoCliente, setTelefonoCliente] = useState("7221417521")
  const [origen, setOrigen] = useState("Capulhuac")
  const [origenCoords, setOrigenCoords] = useState<{lat:number,lng:number}|null>({lat:19.2007,lng:-99.4672})
  const [destino, setDestino] = useState("")
  const [destinoCoords, setDestinoCoords] = useState<{lat:number,lng:number}|null>(null)
  const [detalles, setDetalles] = useState("")
  const [tipoServicio, setTipoServicio] = useState<'normal'|'redondo'>('normal')
  const [minutosEspera, setMinutosEspera] = useState(0)
  const [precioCalculado, setPrecioCalculado] = useState(25)
  const [distanciaKmReal, setDistanciaKmReal] = useState(0)
  const [duracionMin, setDuracionMin] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [buscandoGPS, setBuscandoGPS] = useState(false)
  const [direccionConfirmada, setDireccionConfirmada] = useState("")
  const [direccionDestinoConfirmada, setDireccionDestinoConfirmada] = useState("")
  const [buscandoDireccion, setBuscandoDireccion] = useState(false)
  const [destinosFrecuentes, setDestinosFrecuentes] = useState<DestFrecuente[]>([])
  const [tarifaConfig, setTarifaConfig] = useState<TariffConfig>({ tarifa_base:25, km_gratis:4, por_km:12, por_min:3.5, por_min_espera:1, tolerancia_local_min:10, tolerancia_larga_min:60, km_tolerancia_larga:15, descuento_redondo_pct:50, minimo:25, comision_plataforma:15, iva:16 })
  const [sheetMode, setSheetMode] = useState<'peek'|'half'|'full'>('half')
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<any>(null)
  const markerOrigenRef = useRef<any>(null)
  const markerDestinoRef = useRef<any>(null)
  const polylineRef = useRef<any>(null)
  const [userData] = useState({ nombre: "JORGE HERNANDEZ VALDIN", email: "valdin300499@gmail.com" })

  const BASE_CAPULHUAC = { lat:19.2007, lng:-99.4672 }
  const RADIO_KM = 30 // solo para aprender frecuentes, NO para precio - precio sin límite: 5km=base+12=52
  const hablar = (t:string)=>{ try{ const u=new SpeechSynthesisUtterance(t); u.lang='es-MX'; u.rate=0.95; speechSynthesis.cancel(); speechSynthesis.speak(u)}catch{} }

  // CENTROS REALES - ZOCALO NO ORILLA - Cuando escriban solo nombre poblacion, mandar al centro
  const MUNICIPIOS_CENTRO = [
    { nombre: "Capulhuac Centro", query: "Zocalo de Capulhuac", lat:19.2007,lng:-99.4672 },
    { nombre: "San Antonio la Isla", query: "Centro de San Antonio la Isla", lat:19.1605,lng:-99.5612 }, // FIX orilla -> palacio municipal centro real 19.1605,-99.5612
    { nombre: "Almoloya del Rio", query: "Centro de Almoloya del Rio", lat:19.1590,lng:-99.4910 },
    { nombre: "Atizapan Santa Cruz", query: "Centro de Atizapan Santa Cruz", lat:19.1910,lng:-99.4970 },
    { nombre: "Tianguistenco Centro", query: "Centro de Tianguistenco", lat:19.1815,lng:-99.4658 },
    { nombre: "Ocoyoacac Centro", query: "Plaza de Ocoyoacac", lat:19.2739,lng:-99.4585 },
    { nombre: "Toluca Centro", query: "Plaza de Toluca", lat:19.2920,lng:-99.6565 },
    { nombre: "Lerma Centro", query: "Lerma de Villada Centro", lat:19.2868,lng:-99.5115 },
    { nombre: "Metepec Centro", query: "Metepec Centro", lat:19.2578,lng:-99.6062 },
    { nombre: "Xalatlaco Centro", query: "Centro de Xalatlaco", lat:19.1840,lng:-99.4190 },
    { nombre: "Rayon Centro", query: "Centro de Rayon", lat:19.1450,lng:-99.5750 },
    { nombre: "Calimaya Centro", query: "Centro de Calimaya", lat:19.1610,lng:-99.6180 },
    { nombre: "Mexicaltzingo", query: "Centro de Mexicaltzingo", lat:19.2100,lng:-99.5820 },
    { nombre: "Chapultepec", query: "Centro de Chapultepec", lat:19.2000,lng:-99.5612 },
    { nombre: "San Felipe Tlalmimilolpan", query: "San Felipe Tlalmimilolpan", lat:19.2430,lng:-99.6900 },
  ]

  const distanciaKm = (lat1:number,lng1:number,lat2:number,lng2:number)=>{
    const R=6371; const dLat=(lat2-lat1)*Math.PI/180; const dLon=(lng2-lng1)*Math.PI/180
    const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2)
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
  }

  const cargarConfigTarifas = async ()=>{
    try{
      const local = localStorage.getItem('tariff_config_capulhuac')
      if(local){ const cfg = JSON.parse(local); setTarifaConfig(cfg); }
      const { data } = await supabase.from('tariff_config').select('*').order('created_at',{ascending:false}).limit(1)
      if(data && data[0] && data[0].config){
        setTarifaConfig(data[0].config)
        localStorage.setItem('tariff_config_capulhuac', JSON.stringify(data[0].config))
      }
    }catch(e){ console.log('Error tarifas', e) }
  }

  useEffect(() => {
    try { const frec = localStorage.getItem('destinos_frecuentes_capulhuac'); if(frec){ setDestinosFrecuentes(JSON.parse(frec)) } } catch {}
    if(!document.getElementById('leaflet-css')){ const l=document.createElement('link'); l.id='leaflet-css'; l.rel='stylesheet'; l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(l) }
    cargarConfigTarifas()
    const onVis = ()=>{ if(document.visibilityState==='visible') cargarConfigTarifas() }
    document.addEventListener('visibilitychange', onVis)
    // Fix ERR_NAME_NOT_RESOLVED spam: no interval, solo localStorage fallback si Supabase falla
    return ()=>{ document.removeEventListener('visibilitychange', onVis) }
  }, [])

  const calcularPrecio = (km:number, esRedondo:boolean=false)=>{
    let precio = 0
    if(km <= tarifaConfig.km_gratis) precio = tarifaConfig.tarifa_base
    else precio = tarifaConfig.tarifa_base + (km - tarifaConfig.km_gratis) * tarifaConfig.por_km
    if(esRedondo){ const desc = tarifaConfig.descuento_redondo_pct || 50; precio = precio * (1 + (100-desc)/100) }
    const pisoReal = Math.min(tarifaConfig.tarifa_base, tarifaConfig.minimo)
    return Math.max(precio, pisoReal)
  }
  const calcularEspera = (km:number, mins:number)=>{
    const tolLarga = tarifaConfig.km_tolerancia_larga || 15
    const tol = km > tolLarga ? (tarifaConfig.tolerancia_larga_min||60) : (tarifaConfig.tolerancia_local_min||10)
    const porMin = tarifaConfig.por_min_espera || 1
    if(mins <= tol) return 0
    return (mins - tol) * porMin
  }
  const getTolerancia = (km:number)=>{ return km > (tarifaConfig.km_tolerancia_larga||15) ? (tarifaConfig.tolerancia_larga_min||60) : (tarifaConfig.tolerancia_local_min||10) }

  const trazarRutaReal = async (from:{lat:number,lng:number}, to:{lat:number,lng:number})=>{
    try{
      const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
      const r = await fetch(url); const j = await r.json()
      if(j.routes && j.routes[0]){
        const route = j.routes[0]; const km = route.distance / 1000; const min = route.duration / 60
        const precioNuevo = calcularPrecio(km)
        setDistanciaKmReal(km); setDuracionMin(min); setPrecioCalculado(precioNuevo)
        // @ts-ignore
        const L = window.L
        if(leafletMap.current && L){
          if(polylineRef.current) { try{ leafletMap.current.removeLayer(polylineRef.current) }catch{} }
          polylineRef.current = L.geoJSON(route.geometry, { style:{ color:'#FFD60A', weight:7, opacity:0.95 } }).addTo(leafletMap.current)
          if(km > 0.5) leafletMap.current.fitBounds(polylineRef.current.getBounds(), { padding:[80,80] })
        }
        return
      }
    }catch(e){ console.log('OSRM error', e) }
    const km = distanciaKm(from.lat, from.lng, to.lat, to.lng)
    setDistanciaKmReal(km); setPrecioCalculado(calcularPrecio(km))
  }

  useEffect(()=>{
    if(origenCoords && destinoCoords){
      trazarRutaReal(origenCoords, destinoCoords)
    }
  }, [origenCoords?.lat, origenCoords?.lng, destinoCoords?.lat, destinoCoords?.lng])

  useEffect(()=>{
    if(distanciaKmReal>0){
      setPrecioCalculado(calcularPrecio(distanciaKmReal))
    } else if(origenCoords && destinoCoords){
      const km = distanciaKm(origenCoords.lat, origenCoords.lng, destinoCoords.lat, destinoCoords.lng)
      setPrecioCalculado(calcularPrecio(km))
    }
  }, [tarifaConfig.tarifa_base, tarifaConfig.minimo, tarifaConfig.por_km, tarifaConfig.km_gratis, distanciaKmReal])

  const guardarDestinoFrecuente = (texto:string, lat:number, lng:number)=>{
    const dist = distanciaKm(BASE_CAPULHUAC.lat, BASE_CAPULHUAC.lng, lat, lng)
    // Permitir guardar fuera de rango también, pero marcado
    // if(dist > RADIO_KM) return // ya no bloqueamos, solo marcamos fuera de rango
    setDestinosFrecuentes(prev=>{
      const idx = prev.findIndex(d=> distanciaKm(d.lat,d.lng,lat,lng)<0.5)
      let nuevo:DestFrecuente[]
      if(idx>=0){ nuevo=[...prev]; nuevo[idx]={...nuevo[idx], count:nuevo[idx].count+1, lastUsed:Date.now(), texto, lat,lng}; nuevo.sort((a,b)=> b.count-a.count) }
      else { nuevo=[...prev, {texto, lat,lng, count:1, lastUsed:Date.now()}].sort((a,b)=> b.count-a.count).slice(0,12) }
      localStorage.setItem('destinos_frecuentes_capulhuac', JSON.stringify(nuevo))
      return nuevo
    })
  }

  const reverseGeocodeOrigen = async (lat:number,lng:number)=>{
    try{
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&accept-language=es`)
      const j = await r.json(); const dir=j.display_name||`${lat.toFixed(5)}, ${lng.toFixed(5)}`
      const corto = dir.split(',').slice(0,2).join(', ')
      setOrigen(dir); setDireccionConfirmada(dir); hablar(`Origen, ${corto}`)
    }catch{ setOrigen(`${lat.toFixed(5)}, ${lng.toFixed(5)}`) }
  }
  const reverseGeocodeDestino = async (lat:number,lng:number)=>{
    try{
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&accept-language=es`)
      const j = await r.json(); const dir=j.display_name||`${lat.toFixed(5)}, ${lng.toFixed(5)}`
      const corto = dir.split(',').slice(0,2).join(', ')
      setDestino(dir); setDireccionDestinoConfirmada(dir); guardarDestinoFrecuente(dir, lat,lng); hablar(`Destino, ${corto}`)
    }catch{ setDestino(`${lat.toFixed(5)}, ${lng.toFixed(5)}`) }
  }

  const buscarDireccionInteligente = async (texto:string, tipo:'origen'|'destino')=>{
    if(!texto || texto.length<3) return
    setBuscandoDireccion(true)
    try{
      const lower = texto.toLowerCase().trim()
      // FIX ORILLA: Si texto contiene nombre poblacion, SIEMPRE mandar al centro real zocalo, no a orilla Nominatim
      if(tipo==='destino'){
        // Normalizar: quitar estado, mexico, comas
        const normalizado = lower.replace(/,.*estado.*|mexico|méxico|\d{5}/gi,'').trim()
        // Prioridad 1: match exacto San Antonio la Isla
        if(normalizado.includes('san antonio la isla') || normalizado.includes('san antonio') || normalizado === 'san antonio la isla'){
          const m = MUNICIPIOS_CENTRO.find(x=> x.nombre.toLowerCase().includes('san antonio la isla'))
          if(m){ console.log('FORZANDO CENTRO REAL San Antonio la Isla', m.lat, m.lng); centrarEnMunicipioDirecto(m); setBuscandoDireccion(false); return }
        }
        // Prioridad 2: cualquier centro por nombre
        for(let m of MUNICIPIOS_CENTRO){
          const palabras = m.nombre.toLowerCase().split(' ')
          const primera = palabras[0]
          const nombreSinCentro = m.nombre.toLowerCase().replace(' centro','').trim()
          if(normalizado === nombreSinCentro || normalizado.includes(nombreSinCentro) || (normalizado.includes(primera) && m.nombre.toLowerCase().includes('san antonio')) ){
            centrarEnMunicipioDirecto(m); setBuscandoDireccion(false); return
          }
        }
        // Prioridad 3: match parcial antiguo
        const matchParcial = MUNICIPIOS_CENTRO.find(m=> lower.includes(m.nombre.toLowerCase().split(' ')[0].toLowerCase()))
        if(matchParcial && lower.length<30){ centrarEnMunicipioDirecto(matchParcial); setBuscandoDireccion(false); return }
      }
      const viewbox = '-100.2,19.6,-99.1,18.9'
      const queries = [`${texto}, Capulhuac, Estado de Mexico, Mexico`, `${texto}, Santiago Tianguistenco, Mexico`, `${texto}, Estado de Mexico, Mexico`, texto]
      for(let q of queries){
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=mx&viewbox=${viewbox}&bounded=0&addressdetails=1`
        const r = await fetch(url); const j = await r.json()
        if(j && j.length>0){
          // FORCE: si el query original es San Antonio la Isla, ignorar Nominatim y usar centro real SIEMPRE
          if(texto.toLowerCase().includes('san antonio la isla') || texto.toLowerCase().includes('san antonio')){
            const m = MUNICIPIOS_CENTRO.find(x=> x.nombre.toLowerCase().includes('san antonio la isla'))
            if(m){ centrarEnMunicipioDirecto(m); setBuscandoDireccion(false); return }
          }
          let mejor = j[0]
          let dentroRango = false
          for(let cand of j){ const d = distanciaKm(BASE_CAPULHUAC.lat, BASE_CAPULHUAC.lng, parseFloat(cand.lat), parseFloat(cand.lon)); if(d <= (tarifaConfig.rango_base_km||RADIO_KM)){ mejor = cand; dentroRango=true; break } }
          // Si ninguno dentro de rango, usar el primero aunque esté fuera (se cobrará 12$/km)
          const lat=parseFloat(mejor.lat), lng=parseFloat(mejor.lon)
          const display = mejor.display_name
          const corto = display.split(',').slice(0,2).join(', ')
          if(tipo==='origen'){ setOrigenCoords({lat,lng}); setDireccionConfirmada(display); setOrigen(display); leafletMap.current?.setView([lat,lng],17); markerOrigenRef.current?.setLatLng([lat,lng]); hablar(`Origen encontrado, ${corto}`) }
          else { setDestinoCoords({lat,lng}); setDireccionDestinoConfirmada(display); setDestino(display); leafletMap.current?.setView([lat,lng],16); markerDestinoRef.current?.setLatLng([lat,lng]); guardarDestinoFrecuente(display,lat,lng); hablar(`Destino encontrado, ${corto}`) }
          setBuscandoDireccion(false); return
        }
      }
      hablar(`No encontré ${texto}, mueve el pin`)
    }catch(e){ console.log('Geocode error', e) } setBuscandoDireccion(false)
  }

  const centrarEnMunicipioDirecto = async (m:any)=>{
    const {lat,lng,nombre,query}=m
    // FIX ORILLA: Guardar centro real directo, no esperar reverse que puede dar orilla
    setDestinoCoords({lat,lng}); setDestino(`${nombre} - Centro Real`); setDireccionDestinoConfirmada(`${nombre} - Centro Real (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
    leafletMap.current?.setView([lat,lng], 16); markerDestinoRef.current?.setLatLng([lat,lng]); guardarDestinoFrecuente(query, lat,lng); hablar(`${nombre} centro real seleccionado`)
    if(origenCoords) trazarRutaReal(origenCoords, {lat,lng})
    // Reverse solo para voz corta, pero NO sobrescribir destino con orilla
    try{ const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&accept-language=es`); const j = await r.json(); if(j?.display_name){ const corto = j.display_name.split(',').slice(0,2).join(', '); setDireccionDestinoConfirmada(`${nombre} - ${corto}`); hablar(`${nombre}, ${corto}`) } }catch{}
  }

  useEffect(() => {
    const initMap = async () => {
      if(!mapRef.current) return
      // @ts-ignore
      if(!window.L){ await new Promise<void>((res)=>{ const s=document.createElement('script'); s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload=()=>res(); document.head.appendChild(s) }) }
      // @ts-ignore
      const L = window.L
      if(!leafletMap.current && mapRef.current){
        const center = origenCoords || BASE_CAPULHUAC
        leafletMap.current = L.map(mapRef.current, { zoomControl:false }).setView([center.lat, center.lng], 15)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap' }).addTo(leafletMap.current)
        const iconOrigen = L.divIcon({ html:'<div style="background:#FF3B30;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg)">📍</span></div>', iconSize:[34,34], iconAnchor:[17,34] })
        markerOrigenRef.current = L.marker([center.lat, center.lng], { draggable:true, icon: iconOrigen }).addTo(leafletMap.current)
        markerOrigenRef.current.on('dragend', async ()=>{ const p=markerOrigenRef.current.getLatLng(); if(step===0 || step===1){ setOrigenCoords({lat:p.lat,lng:p.lng}); await reverseGeocodeOrigen(p.lat,p.lng) } })
        const iconDestino = L.divIcon({ html:'<div style="background:#007AFF;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg)">🔴</span></div>', iconSize:[34,34], iconAnchor:[17,34] })
        markerDestinoRef.current = L.marker([center.lat, center.lng], { draggable:true, icon: iconDestino })
        markerDestinoRef.current.on('dragend', async ()=>{ const p=markerDestinoRef.current.getLatLng(); setDestinoCoords({lat:p.lat,lng:p.lng}); await reverseGeocodeDestino(p.lat,p.lng) })
        leafletMap.current.on('click', async (e:any)=>{ const {lat,lng}=e.latlng; if(step===1){ markerOrigenRef.current.setLatLng([lat,lng]); setOrigenCoords({lat,lng}); await reverseGeocodeOrigen(lat,lng) } if(step===2){ markerDestinoRef.current.setLatLng([lat,lng]); setDestinoCoords({lat,lng}); await reverseGeocodeDestino(lat,lng) } })
      }
      if(leafletMap.current){
        if(step===1 && origenCoords){
          if(markerDestinoRef.current && leafletMap.current.hasLayer(markerDestinoRef.current)) leafletMap.current.removeLayer(markerDestinoRef.current)
          // FIX: no borrar polyline aquí, mantener si existe
          if(!leafletMap.current.hasLayer(markerOrigenRef.current)) markerOrigenRef.current.addTo(leafletMap.current)
          markerOrigenRef.current.setLatLng([origenCoords.lat, origenCoords.lng]); leafletMap.current.setView([origenCoords.lat, origenCoords.lng], 16)
          if(markerOrigenRef.current.bringToFront) markerOrigenRef.current.bringToFront()
        }
        if(step===2){
          const centerDest = destinoCoords || BASE_CAPULHUAC
          if(!leafletMap.current.hasLayer(markerDestinoRef.current)) markerDestinoRef.current.addTo(leafletMap.current)
          markerDestinoRef.current.setLatLng([centerDest.lat, centerDest.lng])
          if(markerDestinoRef.current.bringToFront) markerDestinoRef.current.bringToFront()
          if(!destinoCoords) leafletMap.current.setView([centerDest.lat, centerDest.lng], 16)
          else if(origenCoords) { /* mantener ruta visible */ }
        }
        if(step>=3){ // DETALLES y PRECIO: mostrar AMBOS pines + ruta amarilla fija
          if(origenCoords && !leafletMap.current.hasLayer(markerOrigenRef.current)) markerOrigenRef.current.addTo(leafletMap.current)
          if(destinoCoords && !leafletMap.current.hasLayer(markerDestinoRef.current)) markerDestinoRef.current.addTo(leafletMap.current)
          if(origenCoords) markerOrigenRef.current?.setLatLng([origenCoords.lat, origenCoords.lng])
          if(destinoCoords) markerDestinoRef.current?.setLatLng([destinoCoords.lat, destinoCoords.lng])
          if(markerOrigenRef.current?.bringToFront) markerOrigenRef.current.bringToFront()
          if(markerDestinoRef.current?.bringToFront) markerDestinoRef.current.bringToFront()
          if(polylineRef.current) leafletMap.current.fitBounds(polylineRef.current.getBounds(), { padding:[80,80] })
        }
      }
    }
    initMap()
  }, [step])

  useEffect(()=>{ setTimeout(()=>{ leafletMap.current?.invalidateSize() }, 350) }, [sheetMode, step])

  const asegurarOrigenUsuario = ()=>{
    if(!origenCoords || (Math.abs(origenCoords.lat - BASE_CAPULHUAC.lat)<0.0001 && Math.abs(origenCoords.lng - BASE_CAPULHUAC.lng)<0.0001)){
      console.log('Origen es centro por defecto, solicitando GPS usuario')
      usarMiUbicacionOrigen()
    }
  }
  const usarMiUbicacionOrigen = ()=>{
    if(!navigator.geolocation){ alert('Tu navegador no soporta GPS'); return }
    setBuscandoGPS(true)
    const onSuccess = async (pos:any)=>{
      const {latitude:lat, longitude:lng}=pos.coords
      setOrigenCoords({lat,lng}); setBuscandoGPS(false); await reverseGeocodeOrigen(lat,lng)
      leafletMap.current?.setView([lat,lng], 18); markerOrigenRef.current?.setLatLng([lat,lng])
    }
    const onError = (err:any)=>{
      setBuscandoGPS(false)
      let msg = err.code===1 ? 'Permiso denegado. Candado 🔒 → Ubicación → Permitir → recarga.' : err.code===2 ? 'GPS no disponible. Mueve el pin rojo.' : 'Tiempo agotado.'
      alert('GPS: '+msg)
    }
    navigator.geolocation.getCurrentPosition(onSuccess, onError, { enableHighAccuracy:true, timeout:15000, maximumAge:0 })
  }

  const crearViajeReal = async () => {
    if(!origen || !destino) return
    setGuardando(true)
    try {
      const { error } = await supabase.from('trips').insert([{
        origin: origen, destination: destino, origen, destino,
        origen_lat: origenCoords?.lat, origen_lng: origenCoords?.lng,
        destino_lat: destinoCoords?.lat, destino_lng: destinoCoords?.lng,
        cliente_nombre: userData.nombre, cliente_email: userData.email, cliente_telefono: telefonoCliente,
        detalles, precio: precioCalculado, distancia_km: distanciaKmReal, duracion_min: duracionMin,
        status: 'pendiente'
      }])
      if(error) throw error
      alert(`Viaje creado! ${distanciaKmReal.toFixed(1)}km • $${precioCalculado.toFixed(0)} MXN`); setStep(0)
    } catch (e:any) { alert('Error: '+e.message) } finally { setGuardando(false) }
  }

  const destinosEnRadio = destinosFrecuentes.filter(d=> distanciaKm(BASE_CAPULHUAC.lat,BASE_CAPULHUAC.lng,d.lat,d.lng)<=RADIO_KM)
  const sheetHeight = sheetMode==='peek' ? '28vh' : sheetMode==='half' ? '52vh' : '78vh'

  return (
    <div className="h-[100dvh] w-full bg-black text-white flex flex-col overflow-hidden relative">
      <div className="bg-black px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2"><div className="w-9 h-9 rounded-full bg-[#0f3d2e] border-2 border-yellow-500 flex items-center justify-center font-black text-yellow-500">J</div><div><div className="text-[13px] font-bold">{userData.nombre}</div><div className="text-[10px] text-zinc-400">{userData.email}</div></div></div>
        <div className="text-[9px] bg-zinc-800 px-2 py-1 rounded-full">Tarifa: ${tarifaConfig.tarifa_base} base • ${tarifaConfig.por_km}/km</div>
      </div>
      <div className="bg-black px-2 py-2 grid grid-cols-5 gap-2 shrink-0">
        {[{label:'PERFIL',icon:'👤',active:step===0},{label:'ORIGEN',icon:'📍',active:step===1},{label:'DESTINO',icon:'🔴',active:step===2},{label:'DETALLES',icon:'🟢',active:step===3},{label:'PRECIO',icon:'💰',active:step===4}].map((t,i)=>(
          <button key={i} onClick={()=>{ setStep(i); setSheetMode('half') }} className={`py-2.5 rounded-xl flex flex-col items-center justify-center text-[9px] font-bold ${t.active?'bg-yellow-400 text-black':'bg-zinc-900 text-zinc-400'}`}><span className="text-[14px]">{t.icon}</span>{t.label}</button>
        ))}
      </div>
      <div className="flex-1 relative bg-[#c9d6de] overflow-hidden">
        <div ref={mapRef} className="absolute inset-0 w-full h-full" />
        <button onClick={()=>{ if(sheetMode==='full') setSheetMode('half'); else setSheetMode('full') }} className="absolute top-3 right-3 z-[400] bg-white text-black text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg">
          {sheetMode==='full' ? '🗺️ Ver mapa' : sheetMode==='peek' ? '⬆️ Expandir' : '⬇️ Ver más mapa'}
        </button>
      </div>
      <div style={{ height: sheetHeight }} className="bg-white text-black rounded-t-[1.8rem] p-4 pb-6 z-[500] overflow-y-auto transition-all duration-300 ease-out shadow-[0_-8px_30px_rgba(0,0,0,0.4)]">
        <div onClick={()=>{ setSheetMode(sheetMode==='full' ? 'half' : sheetMode==='half' ? 'peek' : 'half') }} className="w-full flex flex-col items-center cursor-pointer py-1">
          <div className="w-12 h-1.5 bg-zinc-300 rounded-full"></div>
          <p className="text-[9px] text-zinc-400 mt-1">{sheetMode==='peek' ? 'Toca para expandir' : sheetMode==='half' ? 'Desliza para ver más mapa' : 'Toca para bajar pestaña'}</p>
        </div>
        {step===0 && (<><div className="flex justify-between items-center mb-3 mt-2"><h2 className="text-[18px] font-black">Tu perfil</h2><span className="text-[11px] bg-black text-white px-2.5 py-1 rounded-full">1 / 5</span></div><div className="bg-black text-white rounded-2xl p-3 flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-[#0f3d2e] border-2 border-yellow-500 flex items-center justify-center">J</div><div className="flex-1"><div className="font-bold text-[14px]">{userData.nombre}</div><div className="text-[11px] text-zinc-400">{userData.email}</div><div className="text-[11px] text-yellow-400">✓ Verificado Google</div></div></div><div className="mt-4 rounded-[18px] border-2 border-black bg-white p-4"><p className="text-[10px] font-black tracking-[0.25em]">NÚMERO DEL CLIENTE</p><div className="mt-2 flex items-center gap-2"><span className="text-xl">📱</span><input value={telefonoCliente} onChange={(e)=>setTelefonoCliente(e.target.value)} style={{color:'#000'}} className="flex-1 bg-white text-black text-[18px] font-black outline-none" /><span className="bg-green-500 text-white text-[10px] px-2 py-1 rounded-full">✓ OK</span></div></div><button onClick={()=>setStep(1)} className="mt-4 w-full h-[56px] rounded-2xl bg-[#FFD60A] text-black font-black">Continuar → Origen</button></>)}
        {step===1 && (<><div className="flex justify-between items-center mb-3 mt-2"><h2 className="text-[20px] font-black">¿Dónde te recogemos?</h2><span className="text-[11px] bg-black text-white px-2.5 py-1 rounded-full">2 / 5</span></div><div className="rounded-[18px] border-2 border-blue-500 bg-white p-3 flex items-center gap-2"><div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">📍</div><input value={origen} onChange={(e)=>setOrigen(e.target.value)} onBlur={(e)=>buscarDireccionInteligente(e.target.value,'origen')} onKeyDown={(e)=>{ if(e.key==='Enter') buscarDireccionInteligente(origen,'origen') }} placeholder="Ej: Av Niños Héroes 911, La Cruz" style={{color:'#000'}} className="flex-1 bg-white text-black text-[14px] font-bold outline-none" /></div><button onClick={usarMiUbicacionOrigen} disabled={buscandoGPS} className="mt-3 w-full h-[52px] rounded-2xl bg-blue-600 text-white font-black text-[14px]">{buscandoGPS?'📍 Buscando GPS...':'📍 Usar mi ubicación GPS actual'}</button>{buscandoDireccion && <p className="text-[11px] text-blue-600 mt-2 animate-pulse">🔍 Buscando en 30km...</p>}{direccionConfirmada && (<div className="mt-3 rounded-[14px] bg-blue-50 border p-3"><p className="text-[12px] font-bold text-blue-900">{direccionConfirmada}</p></div>)}<div className="mt-4 flex gap-3"><button onClick={()=>setStep(0)} className="flex-1 h-[56px] rounded-2xl bg-zinc-200 text-black font-bold">← Atrás</button><button onClick={()=>setStep(2)} className="flex-[1.5] h-[56px] rounded-2xl bg-black text-white font-black">Siguiente: Destino →</button></div></>)}
        {step===2 && (<><div className="flex justify-between items-center mb-3 mt-2"><h2 className="text-[20px] font-black">¿A dónde vas?</h2><span className="text-[11px] bg-black text-white px-2.5 py-1 rounded-full">3 / 5 • {RADIO_KM}km</span></div><div className="rounded-[18px] border-2 border-red-500 bg-white p-3 flex items-center gap-2"><div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center text-white shrink-0">🔴</div><input value={destino} onChange={(e)=>setDestino(e.target.value)} onBlur={(e)=>buscarDireccionInteligente(e.target.value,'destino')} onKeyDown={(e)=>{ if(e.key==='Enter') buscarDireccionInteligente(destino,'destino') }} placeholder="Ej: Calle Benito Juarez, Capulhuac" style={{color:'#000'}} className="flex-1 bg-white text-black text-[14px] font-bold outline-none" /></div>{buscandoDireccion && <p className="text-[11px] text-red-600 mt-2 animate-pulse">🔍 Buscando en 30km...</p>}{distanciaKmReal>0 && (<div className="mt-3 rounded-[14px] bg-black text-white p-3 flex justify-between items-center"><div><p className="text-[11px] text-zinc-400">Distancia por carretera (OSRM)</p><p className="text-[16px] font-black">{distanciaKmReal.toFixed(1)} km • {duracionMin.toFixed(0)} min</p></div><div className="text-right"><p className="text-[11px] text-zinc-400">Precio estimado</p><p className="text-[18px] font-black text-yellow-400">${precioCalculado.toFixed(0)} MXN</p><p className="text-[9px] text-zinc-500">{tarifaConfig.tarifa_base} base {tarifaConfig.km_gratis}km + {tarifaConfig.por_km}$/km • Mín {tarifaConfig.minimo}</p></div></div>)}{destinosEnRadio.length>0 && (<><p className="text-[11px] font-black mt-3 mb-2">⭐ FRECUENTES:</p><div className="grid grid-cols-1 gap-2 max-h-[140px] overflow-y-auto">{destinosEnRadio.slice(0,5).map((d)=>{ const esSanAntonio = d.texto.toLowerCase().includes('san antonio'); return (<button key={d.texto+d.lat} onClick={()=>{ if(esSanAntonio){ const m = MUNICIPIOS_CENTRO.find(x=> x.nombre.toLowerCase().includes('san antonio la isla')); if(m){ centrarEnMunicipioDirecto(m); return } } setDestino(d.texto); setDestinoCoords({lat:d.lat,lng:d.lng}); hablar(`Destino frecuente ${d.texto.split(',')[0]} seleccionado`); }} className="rounded-xl bg-yellow-50 border border-yellow-300 p-3 flex items-center justify-between text-left"><div><p className="text-[12px] font-black text-black truncate w-[220px]">{d.texto.split(',').slice(0,2).join(',')}</p><p className="text-[9px] text-zinc-600">{d.count} viajes • {distanciaKm(BASE_CAPULHUAC.lat,BASE_CAPULHUAC.lng,d.lat,d.lng).toFixed(1)}km {esSanAntonio ? '• ORILLA VIEJA -> FORZAR CENTRO' : ''}</p></div><span>⭐</span></button>)})}</div></>) }<p className="text-[11px] font-black mt-3 mb-2">⚡ CENTROS (zócalo real no orilla):</p><div className="grid grid-cols-2 gap-2">{MUNICIPIOS_CENTRO.map((m)=>(<button key={m.nombre} onClick={()=>centrarEnMunicipioDirecto(m)} className={`h-[44px] rounded-xl text-[11px] font-bold ${m.nombre.toLowerCase().includes('san antonio') ? 'bg-yellow-400 text-black border-2 border-red-500' : 'bg-zinc-900 text-white'}`}>📍 {m.nombre}</button>))}</div>{direccionDestinoConfirmada && (<div className="mt-3 rounded-[14px] bg-red-50 border border-red-200 p-3"><p className="text-[12px] font-bold text-red-900">{direccionDestinoConfirmada}</p></div>)}<div className="mt-4 flex gap-3"><button onClick={()=>setStep(1)} className="flex-1 h-[56px] rounded-2xl bg-zinc-200 text-black font-bold">← Atrás</button><button onClick={()=>setStep(3)} disabled={!destino} className="flex-[1.5] h-[56px] rounded-2xl bg-black text-white font-black disabled:opacity-30">Siguiente: Detalles →</button></div></>)}
        {step===3 && (<><h2 className="text-[18px] font-black mt-2">Detalles y tipo servicio</h2><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={()=>setTipoServicio('normal')} className={`h-[48px] rounded-xl font-black text-[12px] ${tipoServicio==='normal' ? 'bg-black text-white' : 'bg-zinc-200 text-black'}`}>🚕 Normal</button><button onClick={()=>setTipoServicio('redondo')} className={`h-[48px] rounded-xl font-black text-[12px] ${tipoServicio==='redondo' ? 'bg-black text-white' : 'bg-zinc-200 text-black'}`}>🔄 Redondo ida y vuelta -{tarifaConfig.descuento_redondo_pct||50}% vuelta</button></div>{tipoServicio==='redondo' && <p className="text-[10px] text-blue-600 mt-2">Redondo: paga ida completa + vuelta con {tarifaConfig.descuento_redondo_pct||50}% descuento = { (1 + (100-(tarifaConfig.descuento_redondo_pct||50))/100).toFixed(1)}× precio base</p>}<textarea value={detalles} onChange={(e)=>setDetalles(e.target.value)} placeholder="Referencias, equipaje" style={{color:'#000'}} className="mt-3 w-full rounded-[14px] border-2 border-black p-4 bg-white text-black font-bold outline-none min-h-[60px]" /><div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-[11px] space-y-1"><p className="font-black text-yellow-800">📋 LEYENDAS:</p><p>• Máximo 4 personas por unidad incluyendo niños</p><p>• Peajes/casetas se pagan directamente al conductor</p><p>• Tarifa: {tarifaConfig.tarifa_base} MXN base {tarifaConfig.km_gratis}km, luego {tarifaConfig.por_km}$/km por carretera (sin límite)</p><p>• Espera: {tarifaConfig.por_min_espera}$/min • Local ≤{tarifaConfig.km_tolerancia_larga}km: {tarifaConfig.tolerancia_local_min}min gratis • Largo >{tarifaConfig.km_tolerancia_larga}km: {tarifaConfig.tolerancia_larga_min}min (1h) gratis</p>{tipoServicio==='redondo' && <p>• Redondo: {tarifaConfig.descuento_redondo_pct}% menos en regreso → Total {(1 + (100-(tarifaConfig.descuento_redondo_pct||50))/100).toFixed(1)}× base</p>}</div><button onClick={()=>setStep(4)} className="mt-4 w-full h-[56px] rounded-2xl bg-[#FFD60A] text-black font-black">Siguiente → Precio</button></>)}
        {step===4 && (<><h2 className="text-[18px] font-black mt-2">Precio y confirmar</h2><div className="mt-3 bg-black text-white rounded-2xl p-4"><p className="text-[14px] font-bold">{origen} → {destino}</p><p className="text-[12px] text-yellow-400 mt-1">📍 {distanciaKmReal.toFixed(1)} km por carretera (OSRM) • ⏱️ {duracionMin.toFixed(0)} min</p><p className="text-[20px] font-black mt-2">${precioCalculado.toFixed(0)} MXN</p><p className="text-[10px] text-zinc-400">Base {tarifaConfig.tarifa_base} hasta {tarifaConfig.km_gratis}km + {tarifaConfig.por_km}$/km • Mín ${Math.min(tarifaConfig.tarifa_base, tarifaConfig.minimo)}</p><div className="mt-3 border-t border-zinc-800 pt-2 text-[10px] text-zinc-400"><p>⚠️ Máximo 4 personas incluyendo niños</p><p>💰 Casetas se pagan directo al conductor</p></div></div><div className="mt-3 rounded-xl bg-zinc-100 p-3"><p className="text-[10px] font-bold">Ruta amarilla trazada por carretera - no línea recta</p><p className="text-[9px] text-zinc-600">Se ve en el mapa como línea amarilla de {distanciaKmReal.toFixed(1)}km - baja la pestaña para verla completa</p></div><button onClick={crearViajeReal} disabled={guardando} className="mt-4 w-full h-[56px] rounded-2xl bg-[#FFD60A] text-black font-black">{guardando ? 'Guardando...' : `Confirmar viaje $${precioCalculado.toFixed(0)} ✓`}</button></>)}
      </div>
    </div>
  )
}
