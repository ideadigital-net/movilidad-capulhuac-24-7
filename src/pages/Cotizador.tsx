// src/pages/Cotizador.tsx - PASO 2 - CENTRO VS PIN EXACTO + IDA Y VUELTA 50% MENOS
import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix iconos leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const CAPULHUAC = { lat: 19.1965, lng: -99.4640 }

// Calcular distancia haversine
function getDist(lat1:number,lng1:number,lat2:number,lng2:number){
  const R=6371
  const dLat=(lat2-lat1)*Math.PI/180
  const dLng=(lng2-lng1)*Math.PI/180
  const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}

function DraggablePin({ position, setPosition }: { position: [number,number], setPosition: (p:[number,number])=>void }) {
  const map = useMapEvents({
    click(e){
      setPosition([e.latlng.lat, e.latlng.lng])
    }
  })
  return (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const m = e.target
          const pos = m.getLatLng()
          setPosition([pos.lat, pos.lng])
        }
      }}
    />
  )
}

export default function Cotizador() {
  const [busqueda, setBusqueda] = useState('')
  const [centro, setCentro] = useState<[number,number] | null>(null)
  const [nombreCentro, setNombreCentro] = useState('')
  const [pin, setPin] = useState<[number,number]>([19.3226, -99.6569]) // Toluca por default
  const [idaVuelta, setIdaVuelta] = useState(false)

  // Config tarifas - viene de tu pantalla tarifas (PASO 1)
  const TARIFA_BASE = 50
  const RADIO_BASE = 4
  const PRECIO_KM = 12
  const FACTOR_IDA_VUELTA = 1.5

  // Buscar centro (simulado con OpenStreetMap real)
  const buscarCentro = async () => {
    if(!busqueda) return
    try{
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(busqueda)}&limit=1`)
      const data = await res.json()
      if(data[0]){
        const lat = parseFloat(data[0].lat)
        const lon = parseFloat(data[0].lon)
        setCentro([lat, lon])
        setPin([lat, lon])
        setNombreCentro(data[0].display_name.split(',')[0])
      } else {
        alert('No se encontró: '+busqueda)
      }
    }catch(e){
      // fallback si no hay internet
      setCentro([19.3226, -99.6569])
      setPin([19.3226, -99.6569])
      setNombreCentro(busqueda + ' Centro')
    }
  }

  const distCapulhuacCentro = centro ? getDist(CAPULHUAC.lat, CAPULHUAC.lng, centro[0], centro[1]) : 0
  const distCentroPin = centro ? getDist(centro[0], centro[1], pin[0], pin[1]) : 0
  const distTotal = distCapulhuacCentro + distCentroPin

  // Cálculo PASO 1
  let costo = TARIFA_BASE
  if(distTotal > RADIO_BASE){
    costo += (distTotal - RADIO_BASE) * PRECIO_KM
  }
  costo = Math.max(costo, 80)
  const costoSoloIda = Math.round(costo)
  const costoIdaVuelta = Math.round(costo * FACTOR_IDA_VUELTA)

  const costoFinal = idaVuelta ? costoIdaVuelta : costoSoloIda

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <h1 className="text-xl font-black mb-4">COTIZADOR PASO 2 - CENTRO VS PIN REAL</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Izquierda - Buscador */}
        <div className="space-y-3">
          <div className="bg-[#111] p-4 rounded-xl border border-[#222]">
            <input
              value={busqueda}
              onChange={e=>setBusqueda(e.target.value)}
              placeholder="Ej: Toluca, Cuernavaca, Chalco"
              className="w-full bg-black border border-[#333] rounded-lg p-3 text-white"
              onKeyDown={e=> e.key==='Enter' && buscarCentro()}
            />
            <div className="flex gap-2 mt-3">
              <button onClick={buscarCentro} className="flex-1 bg-white text-black font-bold py-3 rounded-lg">BUSCAR CENTRO</button>
              <label className="flex items-center gap-2 bg-[#222] px-3 rounded-lg text-xs cursor-pointer">
                <input type="checkbox" checked={idaVuelta} onChange={e=>setIdaVuelta(e.target.checked)} />
                Ida y vuelta<br/>50% menos regreso
              </label>
            </div>
          </div>

          {centro && (
            <div className="bg-[#111] p-4 rounded-xl border border-[#222]">
              <div className="flex justify-between text-xs text-gray-400 mb-2">
                <span>Centro: {nombreCentro}</span>
                <span>{distCapulhuacCentro.toFixed(1)}km - ${costoSoloIda}</span>
              </div>
              <div className="bg-[#332200] border border-yellow-800 p-3 rounded-lg mb-3">
                <p className="text-yellow-400 text-xs">📍 Pin movido {distCentroPin.toFixed(1)}km más lejos del centro</p>
                <p className="text-xs">Centro ${costoSoloIda} + Extra {distCentroPin.toFixed(1)}km x $ {PRECIO_KM} = ${Math.round(distCentroPin*PRECIO_KM)}</p>
                <p className="font-bold mt-1">Total exacto: ${costoFinal} - {distTotal.toFixed(1)}km {idaVuelta?'IDA Y VUELTA':'SOLO IDA'}</p>
              </div>
              <button className="w-full bg-blue-600 py-3 rounded-lg font-bold">
                SOLICITAR {idaVuelta?'IDA Y VUELTA':'SOLO IDA'} ${costoFinal}
              </button>
              <p className="text-[10px] text-gray-500 mt-2">Toca el mapa para mover el pin a la dirección exacta. Si escribe Av. Pino Suarez 123, mueva el pin ahí.</p>
            </div>
          )}
        </div>

        {/* Derecha - Mapa REAL */}
        <div className="bg-[#111] p-3 rounded-xl border border-[#222]">
          <div className="flex justify-between mb-2 text-[11px] font-bold">
            <span>MAPA - TOCA O ARRASTRA EL PIN</span>
            <span className="text-gray-400">{pin[0].toFixed(4)}, {pin[1].toFixed(4)}</span>
          </div>
          <div className="h-[400px] rounded-lg overflow-hidden">
            <MapContainer center={pin} zoom={14} style={{height:'100%', width:'100%'}}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <DraggablePin position={pin} setPosition={setPin} />
              {centro && centro[0]!==pin[0] && <Marker position={centro} opacity={0.5} />}
            </MapContainer>
          </div>
          <p className="text-[10px] text-gray-500 mt-2">Capulhuac: 19.1965, -99.4640 | Pin actual: {pin[0].toFixed(4)}, {pin[1].toFixed(4)}</p>
        </div>
      </div>
    </div>
  )
}