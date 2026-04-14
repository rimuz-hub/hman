import React from 'react'

export default function ConnectionStatus({status='connecting', server}){
  const color = status==='online' ? 'bg-emerald-400' : status==='connecting' ? 'bg-yellow-400' : 'bg-red-400'
  const text = status==='online' ? 'Connected' : status==='connecting' ? 'Connecting…' : 'Offline — realtime unavailable'
  return (
    <div className="w-full p-2 fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="mx-auto max-w-3xl flex items-center justify-center gap-3 bg-black/60 backdrop-blur-sm text-sm text-white rounded-full px-4 py-2 shadow-lg">
        <div className={`w-3 h-3 rounded-full ${color}`}></div>
        <div>{text}</div>
        {status!=='online' && <div className="text-xs text-muted">Trying {server}</div>}
      </div>
    </div>
  )
}
