import React, {useContext, useState} from 'react'
import { SocketContext } from '../App'
import { motion } from 'framer-motion'

export default function Lobby({go}){
  const {socket, player, setPlayer, setRoom, connStatus} = useContext(SocketContext)
  const [name, setName] = useState(player?.username || '')
  const [avatar, setAvatar] = useState(player?.avatar || null)
  const [roomCode, setRoomCode] = useState('')

  function ensurePlayer(){
    let uname = name;
    if(!uname) uname = 'Guest'+Math.floor(Math.random()*1000)
    const newP = {username: uname, avatar};
    setPlayer(newP)
    setName(uname)
    return newP
  }

  function createRoom(){
    if(connStatus !== 'online' || !socket) return alert('Server offline — cannot create room')
    const p = ensurePlayer();
    socket.emit('createRoom', {player:p, settings:{}}, (res)=>{
      if(res.ok){
        setPlayer(res.player)
        setRoom(res.room)
        go('room')
      } else {
        alert(res.error || 'Failed to create room')
      }
    })
  }

  function joinRoom(){
    if(connStatus !== 'online' || !socket) return alert('Server offline — cannot join room')
    const p = ensurePlayer();
    const code = (roomCode||'').trim().toUpperCase();
    socket.emit('joinRoom', {player:p, roomCode:code}, (res)=>{
      if(res.ok){
        setPlayer(res.player)
        setRoom(res.room)
        go('room')
      } else alert(res.error)
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{y:20, opacity:0}} animate={{y:0,opacity:1}} className="w-full max-w-xl bg-card p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Hangman — Multiplayer</h1>
        <div className="space-y-3">
          <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e => e.key==='Enter' && createRoom()} placeholder="Enter username" className="w-full p-3 rounded bg-[#0b1220]" />
          <div className="flex gap-2 flex-wrap">
            <button onClick={createRoom} disabled={connStatus!=='online'} className="flex-1 p-3 rounded bg-indigo-600 disabled:opacity-50">Create Room</button>
            <input value={roomCode} onChange={e=>setRoomCode(e.target.value)} onKeyDown={e => e.key==='Enter' && joinRoom()} placeholder="Room code" className="w-32 p-2 rounded bg-[#071023]" />
            <button onClick={joinRoom} disabled={connStatus!=='online'} className="p-3 rounded bg-emerald-600 disabled:opacity-50">Join</button>
          </div>
          {connStatus !== 'online' && <div className="text-xs text-yellow-300 mt-2">Realtime server unreachable — some features disabled.</div>}
        </div>
      </motion.div>
    </div>
  )
}
