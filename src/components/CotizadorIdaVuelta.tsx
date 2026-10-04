// src/components/CotizadorIdaVuelta.tsx - PASO 1 - CON CHECK IDA Y VUELTA
import { useState, useEffect } from 'react'
import { calcularPrecioFinal, buscarYAprenderDestino, getConfigTarifas, CAPULHUAC } from '../config/tarifas'

export default function CotizadorIdaVuelta() {
  const [destino, setDestino] = useState('')
  const [esIdaVuelta, setEsIdaVuelta] = useState(false)
  const [km, setKm] = useState(0)
  const [precioIda, setPrecioIda] = useState(0)
  const [precioTotal, setPrecioTotal] = useState(0)
  const [info, setInfo] = useState<any>(null)
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    getConfigTarifas().then(setConfig)
  }, [])

  const cotizar = async () => {
    if (!destino) return
    const res = await buscarYAprenderDestino('Capulhuac', destino)
    if (!res) {
      alert('No encontré ese destino, mueve el pin en el mapa')
      return
    }
    setKm(res.km)
    setInfo(res)
    const pIda = await calcularPrecioFinal(res.km, { esIdaVuelta: false })
    const pTotal = await calcularPrecioFinal(res.km, { esIdaVuelta })
    setPrecioIda(pIda)
    setPrecioTotal(esIdaVuelta? pTotal : pIda)
  }

  useEffect(() => {
    if (info) {
      calcularPrecioFinal(info.km, { esIdaVuelta }).then(p => {
        setPrecioTotal(esIdaVuelta? p : precioIda)
      })
    }
  }, [esIdaVuelta])

  const solicitarServicio = () => {
    // Aquí guardas en Firestore el servicio con tipo
    const servicio = {
      origen: 'Capulhuac',
      destino,
      km,
      tipoServicio: esIdaVuelta? 'IDA_Y_VUELTA' : 'SOLO_IDA',
      precioIda,
      precioRegreso: esIdaVuelta? Math.round(precioIda * 0.5) : 0,
      precioTotal,
      esCentro: info?.esCentro,
      coords: info?.coords,
      estado: 'PENDIENTE',
      esperaGratis: km >= 15? 60 : 10,
      createdAt: new Date()
    }
    console.log('SERVICIO SOLICITADO PARA OPERADOR:', servicio)
    alert(`Servicio ${servicio.tipoServicio} solicitado: ${destino} $${precioTotal} - El operador ya ve que es ${esIdaVuelta? 'IDA Y VUELTA' : 'SOLO IDA'}`)
  }

  return (
    <div className="max-w-md mx-auto bg-black text-white p-6 rounded-2xl border border-[#222]">
      <h2 className="text-xl font-black mb-4">¿A DÓNDE VAS?</h2>

      <input
        value={destino}
        onChange={e => setDestino(e.target.value)}
        placeholder="Ej: Toluca, Tianguistenco, Cuernavaca"
        className="w-full bg-[#111] border border-[#333] rounded-xl p-4 mb-4"
      />

      <div className="bg-[#111] border border-[#222] rounded-xl p-4 mb-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={esIdaVuelta}
            onChange={e => setEsIdaVuelta(e.target.checked)}
            className="w-5 h-5"
          />
          <div>
            <p className="font-bold text-sm">¿Es ida y vuelta?</p>
            <p className="text- text-gray-400">Regreso 50% menos</p>
          </div>
        </label>

        {esIdaVuelta && (
          <div className="mt-3 bg-green-900/20 border border-green-800 rounded-lg p-3">
            <p className="text-xs text-green-300">✓ Ida y vuelta marcada</p>
            <p className="text- text-gray-400 mt-1">El operador sabrá que debe esperarte o regresar por ti</p>
          </div>
        )}
      </div>

      <button onClick={cotizar} className="w-full bg-white text-black font-black py-3 rounded-xl mb-4">
        COTIZAR
      </button>

      {info && (
        <div className="bg-[#0a0a0a] border border-[#333] rounded-xl p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-xs text-gray-400">Destino:</span>
            <span className="text-xs font-bold">{info.destino} {info.esCentro? '(Centro)' : ''}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-400">Distancia:</span>
            <span className="text-xs">{km} km</span>
          </div>

          {!esIdaVuelta? (
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
              <p className="text-xs text-gray-400">SOLO IDA</p>
              <p className="text-lg font-black">${precioIda}</p>
              <p className="text- text-gray-500">{km}km × ${config?.precioPorKm || 12}/km</p>
            </div>
          ) : (
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 space-y-2">
              <p className="text-xs text-green-400 font-bold">IDA Y VUELTA</p>
              <div className="flex justify-between text-xs">
                <span>Ida {km}km:</span><span>${precioIda}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Regreso 50% menos:</span><span>${Math.round(precioIda*0.5)}</span>
              </div>
              <div className="border-t border-green-800 pt-2 flex justify-between font-black">
                <span>Total:</span><span>${precioTotal}</span>
              </div>
              <p className="text- text-gray-400">Espera gratis: {km >= 15? 60 : 10} min, luego $1/min</p>
            </div>
          )}

          <button onClick={solicitarServicio} className="w-full bg-blue-600 py-3 rounded-xl font-bold mt-2">
            SOLICITAR {esIdaVuelta? 'IDA Y VUELTA' : 'SOLO IDA'} - ${precioTotal}
          </button>

          <p className="text- text-gray-500 text-center">
            Al operador le llegará: TIPO {esIdaVuelta? 'IDA_Y_VUELTA' : 'SOLO_IDA'} • {km}km • ${precioTotal}
          </p>
        </div>
      )}
    </div>
  )
}