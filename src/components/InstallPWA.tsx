import { useEffect, useState } from 'react'

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    if (isStandalone) return
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) setShow(true)

    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }
    const installedHandler = () => {
      setShow(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  if (!show) return null

  const instalar = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') setShow(false)
      setDeferredPrompt(null)
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      alert(
        isIOS
          ? 'En iPhone: pulsa Compartir ↑ luego "Agregar a pantalla de inicio"'
          : 'En Chrome: Menú ⋮ -> Instalar app'
      )
    }
  }

  return (
    <div className="fixed bottom-[85px] left-4 right-4 md:left-auto md:right-4 md:w-[340px] bg-[#fefce8] border border-yellow-200 rounded-2xl p-3 flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.3)] z-[9999] animate-[slideUp_0.3s_ease-out]">
      <div className="flex items-center gap-2.5">
        <img src="/logo.png" className="w-9 h-9 rounded-xl bg-black p-1 object-contain" alt="" onError={(e:any)=>{e.currentTarget.style.display='none'}} />
        <div>
          <div className="text-black font-black text-[12px]">Instalar Movi Capulhuac</div>
          <div className="text-zinc-600 text-[9px]">Acceso directo + sin internet</div>
        </div>
      </div>
      <button onClick={instalar} className="bg-black text-yellow-400 px-4 py-2 rounded-xl font-black text-[11px] hover:bg-zinc-900 active:scale-95 transition">
        Instalar
      </button>
      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity:0 } to { transform: translateY(0); opacity:1 } }`}</style>
    </div>
  )
}
