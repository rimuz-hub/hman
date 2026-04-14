import React, {useContext} from 'react'
import { SocketContext } from '../App'
import PlayerList from '../components/PlayerList'

export default function Room({go}){
  const {room, player, socket} = useContext(SocketContext)
  if(!room) return <div className="p-6">No room — go back</div>
  const isHost = player?.id === room.host

  function start(){
    if(!isHost) return
    socket.emit('startGame', {roomCode: room.code, playerId: player.id}, (res)=>{
      if(res.ok) go('game')
      else alert(res.error || 'Unable to start game')
    })
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.12),_transparent_30%),#020617] p-4 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-[2rem] border border-slate-700 bg-slate-950/90 p-6 shadow-2xl shadow-violet-500/10 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Room Lobby</div>
              <h1 className="mt-2 text-3xl font-semibold text-white">Room {room.code}</h1>
              <p className="mt-2 text-sm text-slate-400">Host: {room.players.find(p => p.id === room.host)?.username || room.host}</p>
            </div>
            <button onClick={start} disabled={!isHost} className="rounded-3xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">Start Game</button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Players</div>
              <div className="mt-3 text-2xl font-semibold text-white">{room.players.length}</div>
              <div className="text-sm text-slate-400">/ {room.settings.maxPlayers} max</div>
            </div>
            <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Room status</div>
              <div className="mt-3 text-2xl font-semibold text-emerald-300">{room.state === 'playing' ? 'Active' : 'Waiting'}</div>
              <div className="text-sm text-slate-400">{room.state === 'playing' ? 'A game is in progress' : 'Waiting for host to start'}</div>
            </div>
          </div>
        </div>

        {!isHost && (
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-100">
            <div className="font-semibold">Waiting for host</div>
            <p className="mt-2 text-slate-300">Only the room host can launch the next round. Stay ready and choose strong guesses.</p>
          </div>
        )}

        <div className="rounded-[2rem] border border-slate-700 bg-slate-950/90 p-5 shadow-xl shadow-slate-900/20">
          <PlayerList players={room.players} hostId={room.host} />
        </div>
      </div>
    </div>
  )
}
