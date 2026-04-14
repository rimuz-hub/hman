import React, {useEffect, useState, useRef, useMemo} from 'react'
import io from 'socket.io-client'
import Lobby from './pages/Lobby'
import Room from './pages/Room'
import Game from './pages/Game'
import ConnectionStatus from './components/ConnectionStatus'

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'

export const SocketContext = React.createContext()

export default function App(){
  const [screen, setScreen] = useState('lobby')
  const [player, setPlayer] = useState(()=>{
    try{
      const p = JSON.parse(localStorage.getItem('hangman_player')||'null');
      if(p) return { id: null, username: p.username, avatar: p.avatar };
      return null
    }catch(e){return null}
  })
  const [room, setRoom] = useState(null)
  const [chat, setChat] = useState([])
  const [connStatus, setConnStatus] = useState('connecting') // connecting | online | offline
  const socketRef = useRef(null)
  const retryTimer = useRef(null)

  useEffect(()=>{
    let mounted = true
    async function tryConnect(){
      try{
        const res = await fetch(SERVER+'/', {mode:'cors'})
        if(!mounted) return
        if(res.ok){
          setConnStatus('online')
          // initialize socket once
          if(!socketRef.current){
            socketRef.current = io(SERVER, {autoConnect:true, transports:['websocket','polling']})
            socketRef.current.on('roomUpdate', r=> {
              setRoom(r)
              setChat(r.chat || [])
              if(r.state === 'playing') setScreen('game')
            })
            socketRef.current.on('gameStarted', r=> {
              setRoom(r)
              setChat(r.chat || [])
              setScreen('game')
            })
            socketRef.current.on('roundUpdated', r=> {
              setRoom(r)
              setChat(r.chat || [])
              if(r.state === 'playing') setScreen('game')
            })
            socketRef.current.on('chat', msg => {
              setChat(prev => [...prev, msg])
            })
          }
        } else {
          throw new Error('backend returned non-ok')
        }
      }catch(err){
        setConnStatus('offline')
        // schedule retry
        if(retryTimer.current) clearTimeout(retryTimer.current)
        retryTimer.current = setTimeout(()=> tryConnect(), 3000)
      }
    }
    tryConnect()
    return ()=>{ mounted=false; if(retryTimer.current) clearTimeout(retryTimer.current); if(socketRef.current) socketRef.current.off() }
  },[])

  useEffect(()=>{
    if(player){
      const toStore = { username: player.username, avatar: player.avatar };
      localStorage.setItem('hangman_player', JSON.stringify(toStore))
    }
  },[player])

  const ctx = useMemo(()=>({socket: socketRef.current, player, setPlayer, room, setRoom, chat, go: setScreen, connStatus}),[player,room,chat,connStatus])

  return (
    <SocketContext.Provider value={ctx}>
      <ConnectionStatus status={connStatus} server={SERVER} />
      <div className="pt-20">
        {screen==='lobby' && <Lobby go={setScreen} /> }
        {screen==='room' && <Room go={setScreen} /> }
        {screen==='game' && <Game go={setScreen} /> }
      </div>
    </SocketContext.Provider>
  )
}
