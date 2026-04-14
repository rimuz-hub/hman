import React, {useContext, useState} from 'react'
import { SocketContext } from '../App'

export default function GuessInput({disabled=false}){
  const {socket, room, player, connStatus} = useContext(SocketContext)
  const [letter, setLetter] = useState('')
  const [word, setWord] = useState('')
  const canSend = connStatus==='online' && !disabled && socket

  function sendLetter(){
    if(!letter || !canSend) return;
    socket.emit('guessLetter', {roomCode: room.code, playerId: player.id, letter}, (res)=>{
      setLetter('')
    })
  }
  function sendWord(){
    if(!word || !canSend) return;
    socket.emit('guessWord', {roomCode: room.code, playerId: player.id, guess: word}, (res)=>{ setWord('') })
  }

  return (
    <div className="mt-4">
      <div className="flex gap-2 flex-wrap">
        <input value={letter} onChange={e=>setLetter(e.target.value)} onKeyDown={e => e.key==='Enter' && sendLetter()} maxLength={1} disabled={!canSend} className="w-20 p-3 rounded bg-[#071023] text-center disabled:opacity-50" placeholder="A" />
        <button onClick={sendLetter} disabled={!canSend} className="px-4 py-3 rounded bg-indigo-600 disabled:opacity-50">Guess Letter</button>
        <input value={word} onChange={e=>setWord(e.target.value)} onKeyDown={e => e.key==='Enter' && sendWord()} disabled={!canSend} className="flex-1 p-3 rounded bg-[#071023] disabled:opacity-50" placeholder="Guess word" />
        <button onClick={sendWord} disabled={!canSend} className="px-4 py-3 rounded bg-emerald-600 disabled:opacity-50">Guess Word</button>
      </div>
      {disabled && <div className="mt-2 text-sm text-yellow-300">Guessing is disabled until a word is set and you are not the hanger.</div>}
    </div>
  )
}
