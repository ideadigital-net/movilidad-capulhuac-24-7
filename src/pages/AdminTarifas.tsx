
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

type RutaTarifa = { id?:string; origen:string; destino:string; precio:number; minutos:number; tipo:'LIBRE'|'CUOTA'|'PAUSAR'; lat?:number; lng?:number }

export default function AdminTarifasPanel(){
  const [config, setConfig] = useState({
    tarifa_base: 40,
    km_gratis: 4,
    por_km: 12,
    por_min: 3.5,
    por_min_espera: 1,
    tolerancia_local_min: 10,
    tolerancia_larga_min: 60,
    km_tolerancia_larga: 15,
    descuento_redondo_pct: 50,
    minimo: 40,
    comision_plataforma: 15,
    iva: 16,
    libre: 0,
    cuota: 45,
    pausar: 30
  })
  const [rutas, setRutas] = useState<RutaTarifa[]>([
    { origen:'Capulhuac', destino:'Amecameca', precio:800, minutos:133, tipo:'LIBRE' },
    { origen:'Capulhuac', destino:'Mercado Municipal Tepoztlan', precio:961, minutos:81, tipo:'CUOTA' },
    { origen:'Capulhuac', destino:'Toluca Centro', precio:450, minutos:45, tipo:'LIBRE' },
    { origen:'Capulhuac', destino:'CDMX Observatorio', precio:1200, minutos:95, tipo:'CUOTA' },
  ])
  const [nuevaRuta, setNuevaRuta] = useState<RutaTarifa>({ origen:'Capulhuac', destino:'', precio:0, minutos:0, tipo:'LIBRE' })
  const [guardando, setGuardando]=useState(false)

  useEffect(()=>{
    (async()=>{
      const { data } = await supabase.from('tariff_config').select('*').order('created_at', {ascending:false}).limit(1)
      if(data && data[0]) setConfig(data[0].config)
      const { data: rutasDB } = await supabase.from('route_tariffs').select('*')
      if(rutasDB && rutasDB.length>0) setRutas(rutasDB.map((r:any)=>({ id:r.id, origen:r.origen, destino:r.destino, precio:r.precio, minutos:r.minutos, tipo:r.tipo })))
    })()
  },[])

  const calcularPrecioDinamico = (km:number, esRedondo:boolean=false)=>{
    let base = 0
    if(km <= config.km_gratis) base = config.tarifa_base
    else base = config.tarifa_base + (km - config.km_gratis) * config.por_km
    if(esRedondo){ base = base * (1 + (100 - (config.descuento_redondo_pct||50))/100) } // ida y vuelta: 50% menos en regreso => 1.5x
    return base
  }
  const calcularEspera = (km:number, minutosEspera:number)=>{
    const tol = km > (config.km_tolerancia_larga||15) ? (config.tolerancia_larga_min||60) : (config.tolerancia_local_min||10)
    if(minutosEspera <= tol) return 0
    return (minutosEspera - tol) * (config.por_min_espera||1)
  }

  const guardarEnFirebase = async ()=>{
    setGuardando(true)
    try{
      // Guardar config general
      await supabase.from('tariff_config').insert([{ config, created_at: new Date().toISOString() }])
      // Guardar rutas (upsert)
      for(let r of rutas){
        if(r.destino){
          await supabase.from('route_tariffs').upsert({ origen:r.origen, destino:r.destino, precio:r.precio, minutos:r.minutos, tipo:r.tipo }, { onConflict:'origen,destino' })
        }
      }
      alert('✅ Configuración guardada en Supabase (Firebase-style)')
    }catch(e:any){ alert('Error: '+e.message) } finally{ setGuardando(false) }
  }

  const ejemploViaje = 500
  const ganancia = ejemploViaje * (1 - config.comision_plataforma/100)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 font-sans">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-[22px] font-black tracking-wider">CONFIGURACIÓN DE TARIFAS</h1><p className="text-[11px] text-zinc-400">PLATAFORMA MOVILIDAD CAPULHUAC • Admin Panel</p></div>
        <button onClick={guardarEnFirebase} disabled={guardando} className="bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-full text-[12px] font-black">💾 {guardando?'GUARDANDO...':'GUARDAR EN FIREBASE'}</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* SERVICIO EJECUTIVO */}
        <div className="bg-[#151515] rounded-[16px] p-5 border border-zinc-800">
          <h3 className="text-[12px] font-black mb-4">SERVICIO EJECUTIVO</h3>
          <div className="space-y-4">
            <div><label className="text-[10px] text-zinc-400">Tarifa Base MXN (rango {config.km_gratis}km desde centro Capulhuac)</label><input type="number" value={config.tarifa_base} onChange={e=>setConfig({...config, tarifa_base: parseFloat(e.target.value)||0})} className="mt-1 w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-[13px] outline-none" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] text-zinc-400">$ por KM (después de {config.km_gratis}km)</label><input type="number" value={config.por_km} onChange={e=>setConfig({...config, por_km: parseFloat(e.target.value)||0})} className="mt-1 w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-[13px]" /></div>
              <div><label className="text-[10px] text-zinc-400">$ por Min</label><input type="number" value={config.por_min} onChange={e=>setConfig({...config, por_min: parseFloat(e.target.value)||0})} className="mt-1 w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-[13px]" /></div>
            </div>
            <div><label className="text-[10px] text-zinc-400">KM Gratis incluidos</label><input type="number" value={config.km_gratis} onChange={e=>setConfig({...config, km_gratis: parseFloat(e.target.value)||0})} className="mt-1 w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-[13px]" /></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="text-[10px] text-zinc-400">$ por Min Espera</label><input type="number" value={config.por_min_espera} onChange={e=>setConfig({...config, por_min_espera: parseFloat(e.target.value)||0})} className="mt-1 w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-[13px]" /></div><div><label className="text-[10px] text-zinc-400">Mínimo</label><input type="number" value={config.minimo} onChange={e=>setConfig({...config, minimo: parseFloat(e.target.value)||0})} className="mt-1 w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-[13px]" /></div></div><div className="grid grid-cols-3 gap-2"><div><label className="text-[10px] text-zinc-400">Tolerancia Local min</label><input type="number" value={config.tolerancia_local_min} onChange={e=>setConfig({...config, tolerancia_local_min: parseFloat(e.target.value)||0})} className="mt-1 w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-[11px]" /></div><div><label className="text-[10px] text-zinc-400">Tolerancia Larga min</label><input type="number" value={config.tolerancia_larga_min} onChange={e=>setConfig({...config, tolerancia_larga_min: parseFloat(e.target.value)||0})} className="mt-1 w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-[11px]" /></div><div><label className="text-[10px] text-zinc-400">KM p/ Larga</label><input type="number" value={config.km_tolerancia_larga} onChange={e=>setConfig({...config, km_tolerancia_larga: parseFloat(e.target.value)||0})} className="mt-1 w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-[11px]" /></div></div><div><label className="text-[10px] text-zinc-400">Descuento Redondo % (en regreso)</label><input type="number" value={config.descuento_redondo_pct} onChange={e=>setConfig({...config, descuento_redondo_pct: parseFloat(e.target.value)||0})} className="mt-1 w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-[13px]" /><p className="text-[8px] text-zinc-500">Ej: 50% = paga 50% menos en vuelta (total 1.5×)</p></div>
            <div className="bg-zinc-900 rounded-xl p-3 text-[10px]"><p className="font-bold text-yellow-400">Regla actual:</p><p>{config.tarifa_base} MXN hasta {config.km_gratis}km desde centro Capulhuac, luego {config.por_km} $/km • Ej: 10km = ${calcularPrecioDinamico(10).toFixed(0)} MXN</p></div>
          </div>
        </div>

        {/* TIPOS DE SERVICIO */}
        <div className="bg-[#151515] rounded-[16px] p-5 border border-zinc-800">
          <h3 className="text-[12px] font-black mb-4">TIPOS DE SERVICIO</h3>
          <div className="space-y-3">
            <div className="bg-black rounded-xl p-3 flex justify-between items-center"><span className="text-[11px]">LIBRE</span><input type="number" value={config.libre} onChange={e=>setConfig({...config, libre: parseFloat(e.target.value)||0})} className="w-[70px] bg-zinc-800 rounded-lg px-2 py-1.5 text-center text-[12px]" /></div>
            <div className="bg-black rounded-xl p-3 flex justify-between items-center"><span className="text-[11px]">CUOTA</span><input type="number" value={config.cuota} onChange={e=>setConfig({...config, cuota: parseFloat(e.target.value)||0})} className="w-[70px] bg-zinc-800 rounded-lg px-2 py-1.5 text-center text-[12px]" /></div>
            <div className="bg-black rounded-xl p-3 flex justify-between items-center"><span className="text-[11px]">PAUSAR</span><input type="number" value={config.pausar} onChange={e=>setConfig({...config, pausar: parseFloat(e.target.value)||0})} className="w-[70px] bg-zinc-800 rounded-lg px-2 py-1.5 text-center text-[12px]" /></div>
          </div>
        </div>

        {/* COMISIONES */}
        <div className="bg-[#151515] rounded-[16px] p-5 border border-zinc-800">
          <h3 className="text-[12px] font-black mb-4">COMISIONES</h3>
          <div className="space-y-3">
            <div><label className="text-[10px] text-zinc-400">% Plataforma</label><input type="number" value={config.comision_plataforma} onChange={e=>setConfig({...config, comision_plataforma: parseFloat(e.target.value)||0})} className="mt-1 w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-[13px]" /><p className="text-[9px] text-zinc-500 mt-1">Se descuenta de cada viaje</p></div>
            <div><label className="text-[10px] text-zinc-400">IVA %</label><input type="number" value={config.iva} onChange={e=>setConfig({...config, iva: parseFloat(e.target.value)||0})} className="mt-1 w-full bg-black border border-zinc-700 rounded-xl px-3 py-2.5 text-[13px]" /></div>
            <div className="bg-blue-900/40 border border-blue-800 rounded-xl p-3"><p className="text-[10px] text-blue-300">Ejemplo: Viaje ${ejemploViaje}</p><p className="text-[13px] font-black">Tu ganancia: ${ganancia.toFixed(0)} MXN</p></div>
          </div>
        </div>
      </div>

      {/* TARIFAS POR RUTA */}
      <div className="mt-6 bg-[#151515] rounded-[16px] p-5 border border-zinc-800">
        <div className="flex justify-between items-center mb-4"><h3 className="text-[12px] font-black">TARIFAS POR RUTA • {rutas.length} rutas</h3><span className="text-[10px] bg-zinc-800 px-3 py-1 rounded-full">Editable en tiempo real</span></div>
        <div className="grid grid-cols-12 gap-2 mb-3 p-2 rounded-xl border border-dashed border-zinc-700">
          <input value={nuevaRuta.origen} onChange={e=>setNuevaRuta({...nuevaRuta, origen:e.target.value})} placeholder="Capulhuac" className="col-span-2 bg-black border border-zinc-700 rounded-xl px-2 py-2 text-[11px]" />
          <input value={nuevaRuta.destino} onChange={e=>setNuevaRuta({...nuevaRuta, destino:e.target.value})} placeholder="Destino (Ej: Chalco)" className="col-span-3 bg-black border border-zinc-700 rounded-xl px-2 py-2 text-[11px]" />
          <input type="number" value={nuevaRuta.precio||''} onChange={e=>setNuevaRuta({...nuevaRuta, precio: parseFloat(e.target.value)||0})} placeholder="$" className="col-span-2 bg-black border border-zinc-700 rounded-xl px-2 py-2 text-[11px]" />
          <input type="number" value={nuevaRuta.minutos||''} onChange={e=>setNuevaRuta({...nuevaRuta, minutos: parseFloat(e.target.value)||0})} placeholder="min" className="col-span-1 bg-black border border-zinc-700 rounded-xl px-2 py-2 text-[11px]" />
          <select value={nuevaRuta.tipo} onChange={e=>setNuevaRuta({...nuevaRuta, tipo:e.target.value as any})} className="col-span-2 bg-black border border-zinc-700 rounded-xl px-2 py-2 text-[11px]"><option>LIBRE</option><option>CUOTA</option><option>PAUSAR</option></select>
          <button onClick={()=>{ if(nuevaRuta.destino){ setRutas([...rutas, nuevaRuta]); setNuevaRuta({ origen:'Capulhuac', destino:'', precio:0, minutos:0, tipo:'LIBRE' }) } }} className="col-span-1 bg-white text-black rounded-xl font-black">+</button>
        </div>
        <div className="space-y-2">
          {rutas.map((r,i)=>(
            <div key={i} className="grid grid-cols-12 gap-2 items-center bg-black rounded-xl p-2">
              <span className="col-span-2 text-[11px]">{r.origen}</span><span className="col-span-2 text-[11px]">{r.destino}</span>
              <div className="col-span-3 flex gap-2"><span className="text-[10px] mt-2">$</span><input type="number" value={r.precio} onChange={e=>{ const nr=[...rutas]; nr[i].precio=parseFloat(e.target.value)||0; setRutas(nr) }} className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-[11px]" /><input type="number" value={r.minutos} onChange={e=>{ const nr=[...rutas]; nr[i].minutos=parseFloat(e.target.value)||0; setRutas(nr) }} className="w-[60px] bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-[11px]" /></div>
              <select value={r.tipo} onChange={e=>{ const nr=[...rutas]; nr[i].tipo=e.target.value as any; setRutas(nr) }} className={`col-span-2 rounded-lg px-2 py-1.5 text-[10px] font-bold ${r.tipo==='LIBRE'?'bg-blue-900 text-blue-200': r.tipo==='CUOTA'?'bg-orange-900 text-orange-200':'bg-zinc-800'}`}><option>LIBRE</option><option>CUOTA</option><option>PAUSAR</option></select>
              <button onClick={()=>setRutas(rutas.filter((_,idx)=>idx!==i))} className="col-span-1 text-red-500 text-[12px]">X</button>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-black rounded-xl p-3 text-[10px] text-zinc-400"><p>Total Rutas LIBRE: {rutas.filter(r=>r.tipo==='LIBRE').length}</p><p>Total Rutas CUOTA: {rutas.filter(r=>r.tipo==='CUOTA').length}</p></div>
          <div className="bg-black rounded-xl p-3 text-[10px] text-zinc-400"><p>Promedio Precio: ${ (rutas.reduce((a,b)=>a+b.precio,0)/(rutas.length||1)).toFixed(0)} MXN</p><p>Ingreso estimado día: ${(rutas.reduce((a,b)=>a+b.precio,0)*0.15).toFixed(0)} MXN</p></div>
        </div>
      </div>

      <div className="mt-6 bg-yellow-900/20 border border-yellow-800 rounded-xl p-4 text-[11px]">
        <p className="font-black text-yellow-400">📋 LEYENDAS OBLIGATORIAS (pasajero):</p>
        <p>• No se puede cargar más de 4 personas en la unidad incluyendo niños</p>
        <p>• Los peajes/casetas se pagan directamente al conductor en efectivo</p>
        <p>• Tarifa base {config.tarifa_base} MXN incluye {config.km_gratis}km desde centro Capulhuac, después {config.por_km}$/km por carretera (no línea recta)</p>
      </div>
    </div>
  )
}
