// src/pages/Tarifas.tsx - PASO 1 FINAL - TU DISEÑO ORIGINAL + RADIO + NOCTURNO + ESPERA + IDA Y VUELTA 50% MENOS
import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc } from 'firebase/firestore'

interface Ruta {
  id?: string
  origen: string
  destino: string
  precio: number
  min: number
  tipo: 'LIBRE' | 'CUOTA' | 'PAUSAR'
}

export default function Tarifas() {
  const [tarifaBase, setTarifaBase] = useState(50)
  const [precioPorKm, setPrecioPorKm] = useState(12)
  const [precioPorMin, setPrecioPorMin] = useState(0)
  const [minimo, setMinimo] = useState(80)
  const [radioBase, setRadioBase] = useState(4)
  const [tipoLibre, setTipoLibre] = useState(0)
  const [tipoCuota, setTipoCuota] = useState(45)
  const [tipoPausar, setTipoPausar] = useState(30)
  const [comision, setComision] = useState(15)
  const [iva, setIva] = useState(16)
  const [porcNocturno, setPorcNocturno] = useState(50)
  const [horaInicio, setHoraInicio] = useState(22)
  const [horaFin, setHoraFin] = useState(5)
  const [precioEspera, setPrecioEspera] = useState(1)
  const [minGratisLocal, setMinGratisLocal] = useState(10)
  const [minGratisLargo, setMinGratisLargo] = useState(60)
  const [kmGratisLargo, setKmGratisLargo] = useState(15)
  const [factorIdaVuelta, setFactorIdaVuelta] = useState(1.5)
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [nuevaRuta, setNuevaRuta] = useState({ origen: 'Capulhuac', destino: '', precio: '', min: '', tipo: 'LIBRE' as any })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    try {
      const cfg = await getDoc(doc(db, 'configuracion', 'tarifas'))
      if (cfg.exists()) {
        const d = cfg.data() as any
        setTarifaBase(d.tarifaBase ?? 50)
        setPrecioPorKm(d.precioPorKm ?? 12)
        setPrecioPorMin(d.precioPorMin ?? 0)
        setMinimo(d.minimo ?? 80)
        setRadioBase(d.radioBaseKm ?? 4)
        setTipoLibre(d.tipos?.LIBRE ?? 0)
        setTipoCuota(d.tipos?.CUOTA ?? 45)
        setTipoPausar(d.tipos?.PAUSAR ?? 30)
        setComision(d.comision ?? 15)
        setIva(d.iva ?? 16)
        setPorcNocturno(d.porcentajeNocturno ?? 50)
        setHoraInicio(d.horaNocturnaInicio ?? 22)
        setHoraFin(d.horaNocturnaFin ?? 5)
        setPrecioEspera(d.precioPorMinEspera ?? 1)
        setMinGratisLocal(d.minutosGratisLocal ?? 10)
        setMinGratisLargo(d.minutosGratisLargo ?? 60)
        setKmGratisLargo(d.kmParaGratisLargo ?? 15)
        setFactorIdaVuelta(d.factorIdaVuelta ?? 1.5)
      }
      const snap = await getDocs(collection(db, 'rutas'))
      const lista: Ruta[] = []
      snap.forEach(docu => {
        const data = docu.data() as any
        if (data.destino) lista.push({ id: docu.id, origen: data.origen || 'Capulhuac', destino: data.destino, precio: data.precio, min: data.tiempo || data.min || 60, tipo: data.tipo || 'LIBRE' })
      })
      if (lista.length > 0) setRutas(lista)
      else {
        setRutas([
          { origen: 'Capulhuac', destino: 'Amecameca', precio: 801, min: 133, tipo: 'LIBRE' },
          { origen: 'Capulhuac', destino: 'Mercado Municipal Tepoztlan', precio: 961, min: 81, tipo: 'CUOTA' },
          { origen: 'Capulhuac', destino: 'Toluca Centro', precio: 500, min: 45, tipo: 'LIBRE' },
          { origen: 'Capulhuac', destino: 'CDMX Observatorio', precio: 1200, min: 95, tipo: 'CUOTA' },
        ])
      }
    } catch (e) { console.log(e) }
  }

  const guardarFirebase = async () => {
    setGuardando(true)
    try {
      await setDoc(doc(db, 'configuracion', 'tarifas'), {
        tarifaBase, precioPorKm, precioPorMin, minimo,
        radioBaseKm: radioBase,
        porcentajeNocturno: porcNocturno,
        horaNocturnaInicio: horaInicio,
        horaNocturnaFin: horaFin,
        precioPorMinEspera: precioEspera,
        minutosGratisLocal: minGratisLocal,
        minutosGratisLargo: minGratisLargo,
        kmParaGratisLargo: kmGratisLargo,
        factorIdaVuelta,
        tipos: { LIBRE: tipoLibre, CUOTA: tipoCuota, PAUSAR: tipoPausar },
        comision, iva,
        updatedAt: new Date()
      })
      alert('✅ Guardado en Firebase - PASO 1 con Ida y Vuelta 50% menos')
    } catch (e: any) { alert('Error: ' + e.message) }
    setGuardando(false)
  }

  const agregarRuta = async () => {
    if (!nuevaRuta.destino || !nuevaRuta.precio) return alert('Falta destino y precio')
    const r: Ruta = { origen: nuevaRuta.origen || 'Capulhuac', destino: nuevaRuta.destino, precio: parseInt(nuevaRuta.precio), min: parseInt(nuevaRuta.min) || 60, tipo: nuevaRuta.tipo }
    try {
      await addDoc(collection(db, 'rutas'), { ...r, tiempo: r.min, createdAt: new Date() })
      setRutas([...rutas, r])
      setNuevaRuta({ origen: 'Capulhuac', destino: '', precio: '', min: '', tipo: 'LIBRE' })
    } catch (e) { alert('Error agregando') }
  }

  const borrarRuta = async (idx: number) => {
    const r = rutas[idx]
    if (r.id) try { await deleteDoc(doc(db, 'rutas', r.id)) } catch {}
    setRutas(rutas.filter((_, i) => i !== idx))
  }

  const ganancia = 800 - (800 * comision / 100)

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-wider">CONFIGURACIÓN DE TARIFAS</h1>
            <p className="text-gray-400 text-sm">PLATAFORMA MOVILIDAD CAPULHUAC • Admin Panel • PASO 1</p>
          </div>
          <button onClick={guardarFirebase} disabled={guardando} className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2">
            💾 GUARDAR EN FIREBASE
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
            <h3 className="text-xs font-bold text-gray-300 mb-4 tracking-wider">SERVICIO EJECUTIVO + RADIO</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-gray-500">Tarifa Base MXN (dentro de radio)</label>
                <input type="number" value={tarifaBase} onChange={e=>setTarifaBase(parseInt(e.target.value)||0)} className="w-full mt-1 bg-[#0a0a0a] border border-[#333] rounded-xl p-3 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-500">Radio Base KM (editable)</label>
                  <input type="number" value={radioBase} onChange={e=>setRadioBase(parseFloat(e.target.value)||0)} className="w-full mt-1 bg-yellow-900/30 border border-yellow-700 rounded-xl p-3 text-sm font-bold" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500">$ por KM fuera de radio</label>
                  <input type="number" value={precioPorKm} onChange={e=>setPrecioPorKm(parseFloat(e.target.value)||0)} className="w-full mt-1 bg-[#0a0a0a] border border-[#333] rounded-xl p-3 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-500">Mínimo</label>
                  <input type="number" value={minimo} onChange={e=>setMinimo(parseInt(e.target.value)||0)} className="w-full mt-1 bg-[#0a0a0a] border border-[#333] rounded-xl p-3 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500">Factor Ida y Vuelta (1.5 = 50% menos regreso)</label>
                  <input type="number" step="0.1" value={factorIdaVuelta} onChange={e=>setFactorIdaVuelta(parseFloat(e.target.value)||1.5)} className="w-full mt-1 bg-green-900/30 border border-green-700 rounded-xl p-3 text-sm font-bold" />
                </div>
              </div>
              <div className="bg-[#0a0a0a] rounded-xl p-3 border border-[#333]">
                <p className="text-[10px] text-gray-400">Ejemplo Tianguis 5km: 5×${precioPorKm} = ${5*precioPorKm}</p>
                <p className="text-[10px] text-gray-400">Toluca 28km ida: ${28*precioPorKm} → Ida y vuelta: ${Math.round(28*precioPorKm*factorIdaVuelta)}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
            <h3 className="text-xs font-bold text-gray-300 mb-4 tracking-wider">TIPOS DE SERVICIO + NOCTURNO</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-black rounded-xl p-3 border border-[#222]">
                <span className="text-xs">LIBRE</span>
                <input type="number" value={tipoLibre} onChange={e=>setTipoLibre(parseInt(e.target.value)||0)} className="w-20 bg-[#222] rounded-lg p-2 text-center text-xs" />
              </div>
              <div className="flex justify-between items-center bg-black rounded-xl p-3 border border-[#222]">
                <span className="text-xs">CUOTA</span>
                <input type="number" value={tipoCuota} onChange={e=>setTipoCuota(parseInt(e.target.value)||0)} className="w-20 bg-[#222] rounded-lg p-2 text-center text-xs" />
              </div>
              <div className="flex justify-between items-center bg-black rounded-xl p-3 border border-[#222]">
                <span className="text-xs">PAUSAR</span>
                <input type="number" value={tipoPausar} onChange={e=>setTipoPausar(parseInt(e.target.value)||0)} className="w-20 bg-[#222] rounded-lg p-2 text-center text-xs" />
              </div>
              <div className="border-t border-[#333] pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500">% Nocturno (editable)</label>
                    <input type="number" value={porcNocturno} onChange={e=>setPorcNocturno(parseInt(e.target.value)||0)} className="w-full mt-1 bg-purple-900/30 border border-purple-700 rounded-lg p-2 text-xs text-center" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Horario</label>
                    <div className="flex gap-1 mt-1">
                      <input type="number" value={horaInicio} onChange={e=>setHoraInicio(parseInt(e.target.value)||0)} className="w-full bg-[#222] rounded-lg p-2 text-xs text-center" />
                      <input type="number" value={horaFin} onChange={e=>setHoraFin(parseInt(e.target.value)||0)} className="w-full bg-[#222] rounded-lg p-2 text-xs text-center" />
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-purple-300">Ej: Viaje $100 de noche 22-05 = ${100 + (100*porcNocturno/100)}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
            <h3 className="text-xs font-bold text-gray-300 mb-4 tracking-wider">COMISIONES + ESPERA</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-gray-500">% Plataforma</label>
                <input type="number" value={comision} onChange={e=>setComision(parseInt(e.target.value)||0)} className="w-full mt-1 bg-[#0a0a0a] border border-[#333] rounded-xl p-3 text-sm" />
                <p className="text-[10px] text-gray-500 mt-1">Se descuenta de cada viaje</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500">$ por min espera</label>
                  <input type="number" value={precioEspera} onChange={e=>setPrecioEspera(parseFloat(e.target.value)||0)} className="w-full mt-1 bg-[#0a0a0a] border border-[#333] rounded-lg p-2 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">IVA %</label>
                  <input type="number" value={iva} onChange={e=>setIva(parseInt(e.target.value)||0)} className="w-full mt-1 bg-[#0a0a0a] border border-[#333] rounded-lg p-2 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-gray-500">Min gratis local &lt;15km</label>
                  <input type="number" value={minGratisLocal} onChange={e=>setMinGratisLocal(parseInt(e.target.value)||0)} className="w-full mt-1 bg-[#0a0a0a] border border-[#333] rounded-lg p-2 text-xs text-center" />
                </div>
                <div>
                  <label className="text-[9px] text-gray-500">Min gratis &gt;15km</label>
                  <input type="number" value={minGratisLargo} onChange={e=>setMinGratisLargo(parseInt(e.target.value)||0)} className="w-full mt-1 bg-green-900/20 border border-green-800 rounded-lg p-2 text-xs text-center" />
                </div>
                <div>
                  <label className="text-[9px] text-gray-500">KM para 60min gratis</label>
                  <input type="number" value={kmGratisLargo} onChange={e=>setKmGratisLargo(parseInt(e.target.value)||0)} className="w-full mt-1 bg-[#0a0a0a] border border-[#333] rounded-lg p-2 text-xs text-center" />
                </div>
              </div>
              <div className="bg-[#0f1f3d] border border-blue-900/50 rounded-xl p-3">
                <p className="text-[11px] text-blue-300">Ejemplo: Viaje $800</p>
                <p className="text-sm font-bold text-white mt-1">Tu ganancia: ${ganancia} MXN</p>
                <p className="text-[9px] text-gray-400 mt-2">Espera: {minGratisLocal}min gratis local, {minGratisLargo}min gratis &gt;{kmGratisLargo}km, luego ${precioEspera}/min</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold tracking-wider">TARIFAS POR RUTA • {rutas.length} rutas • Memoria que aprende</h3>
            <span className="text-[10px] bg-[#222] px-3 py-1 rounded-full text-gray-400">Editable en tiempo real</span>
          </div>

          <div className="grid grid-cols-12 gap-2 mb-3 text-[11px] text-gray-500 border border-dashed border-[#333] rounded-xl p-3">
            <input value={nuevaRuta.origen} onChange={e=>setNuevaRuta({...nuevaRuta, origen:e.target.value})} className="col-span-3 bg-[#0a0a0a] border border-[#333] rounded-lg p-2" placeholder="Capulhuac" />
            <input value={nuevaRuta.destino} onChange={e=>setNuevaRuta({...nuevaRuta, destino:e.target.value})} className="col-span-4 bg-[#0a0a0a] border border-[#333] rounded-lg p-2" placeholder="Destino (Ej: Chalco)" />
            <input value={nuevaRuta.precio} onChange={e=>setNuevaRuta({...nuevaRuta, precio:e.target.value})} className="col-span-2 bg-[#0a0a0a] border border-[#333] rounded-lg p-2" placeholder="$" />
            <input value={nuevaRuta.min} onChange={e=>setNuevaRuta({...nuevaRuta, min:e.target.value})} className="col-span-1 bg-[#0a0a0a] border border-[#333] rounded-lg p-2" placeholder="min" />
            <select value={nuevaRuta.tipo} onChange={e=>setNuevaRuta({...nuevaRuta, tipo:e.target.value as any})} className="col-span-1 bg-[#0a0a0a] border border-[#333] rounded-lg p-2 text-xs"><option>LIBRE</option><option>CUOTA</option><option>PAUSAR</option></select>
            <button onClick={agregarRuta} className="col-span-1 bg-white text-black rounded-lg font-bold">+</button>
          </div>

          <div className="space-y-2">
            {rutas.map((r, idx)=>(
              <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-black border border-[#222] rounded-xl p-3">
                <div className="col-span-3 text-xs text-gray-400">{r.origen}</div>
                <div className="col-span-4 text-xs font-bold">{r.destino}</div>
                <div className="col-span-2 flex items-center gap-1"><span className="text-[10px] text-gray-500">$</span><input type="number" value={r.precio} onChange={e=>{const nr=[...rutas]; nr[idx].precio=parseInt(e.target.value)||0; setRutas(nr)}} className="w-full bg-[#111] border border-[#333] rounded-lg p-2 text-xs" /></div>
                <div className="col-span-1"><input type="number" value={r.min} onChange={e=>{const nr=[...rutas]; nr[idx].min=parseInt(e.target.value)||0; setRutas(nr)}} className="w-full bg-[#111] border border-[#333] rounded-lg p-2 text-xs text-center" /></div>
                <div className="col-span-1"><select value={r.tipo} onChange={e=>{const nr=[...rutas]; nr[idx].tipo=e.target.value as any; setRutas(nr)}} className={`w-full rounded-lg p-2 text-[10px] font-bold border ${r.tipo==='LIBRE' ? 'bg-blue-900/30 border-blue-800 text-blue-300' : 'bg-orange-900/30 border-orange-800 text-orange-300'}`}><option>LIBRE</option><option>CUOTA</option></select></div>
                <button onClick={()=>borrarRuta(idx)} className="col-span-1 text-red-400 text-xs">X</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}