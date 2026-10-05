import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function PanicButton({ codigo, tipo = 'pasajero' }: { codigo?: number, tipo?: 'pasajero'|'conductor' }) {
  const auth = useAuth() as any
  const user = auth?.user ?? null
  const [enviando, setEnviando] = useState(false)
  const [activa, setActiva] = useState(false)

  const activarPanico = async () => {
    if (!confirm('¿CONFIRMAR ALERTA DE PÁNICO? Se notificará a base y se compartirá tu ubicación.')) return
    setEnviando(true)
    try {
      const pos = await new Promise<any>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true }))
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude

      await supabase.from('panic_alerts').insert({
        user_id: tipo === 'pasajero'? user?.id : null,
        driver_id: tipo === 'conductor'? user?.id : null,
        trip_codigo: codigo || null,
        tipo,
        lat, lng,
        mensaje: tipo === 'pasajero'? 'PASAJERO EN EMERGENCIA' : 'CONDUCTOR EN EMERGENCIA'
      })

      // Hablar alerta
      if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance('Alerta de pánico activada. Compartiendo ubicación con central de seguridad. Mantenga la calma.')
        msg.lang = 'es-MX'; window.speechSynthesis.speak(msg)
      }
      if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 1000])
      setActiva(true)
      setTimeout(()=>setActiva(false), 10000)
      alert('🚨 ALERTA ENVIADA A CENTRAL - Ubicación compartida')
    } catch (e) { alert('Error al obtener ubicación, activa GPS') }
    setEnviando(false)
  }

  return (
    <button onClick={activarPanico} disabled={enviando} className={`w-full py-4 rounded-full font-black text-sm border-2 flex items-center justify-center gap-2 ${activa? 'bg-red-600 text-white animate-pulse border-red-400' : 'bg-red-500/10 text-red-500 border-red-500/50 hover:bg-red-500 hover:text-white'}`}>
      {enviando? 'ENVIANDO ALERTA...' : activa? '🚨 ALERTA ACTIVA - AYUDA EN CAMINO' : `🚨 BOTÓN DE PÁNICO - ${tipo.toUpperCase()}`}
    </button>
  )
}