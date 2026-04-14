import React, {useContext, useEffect, useMemo, useRef, useState} from 'react'
import { SocketContext } from '../App'
import HangmanSVG from '../components/HangmanSVG'
import GuessInput from '../components/GuessInput'
import PlayerList from '../components/PlayerList'

export default function Game({go}){
  const {room, player, socket, chat} = useContext(SocketContext)
  const [wordInput, setWordInput] = useState('')
  const [hintInput, setHintInput] = useState('')
  const [chatText, setChatText] = useState('')
  const chatRef = useRef(null)
  if(!room) return <div className="p-6">No game</div>

  const current = room.current || {}
  const isHanger = player?.id === current.hangerId
  const waitingForWord = !current.mask
  const roundOver = current.ended === true
  const [now, setNow] = useState(Date.now())
  const nextRoundSeconds = current.nextRoundAt ? Math.max(0, Math.ceil((current.nextRoundAt - now) / 1000)) : null

  const chatPlayers = useMemo(() => {
    return room?.players?.reduce((acc, p) => {
      acc[p.id] = p
      return acc
    }, {}) || {}
  }, [room])

  const sortedPlayers = useMemo(() => {
    return [...(room.players || [])].sort((a,b)=> (b.score||0)-(a.score||0))
  }, [room.players])

  useEffect(() => {
    if(chatRef.current){
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [chat])

  useEffect(() => {
    if(!current.nextRoundAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [current.nextRoundAt]);

  function setWord(){
    if(!wordInput.trim()) return
    socket.emit('setWord', {roomCode: room.code, playerId: player.id, word: wordInput.trim(), hint: hintInput.trim()}, (res)=>{
      if(!res.ok){
        alert(res.error || 'Unable to set word')
      } else {
        setWordInput('')
        setHintInput('')
      }
    })
  }

  function sendChat(){
    if(!chatText.trim()) return
    socket.emit('chat', {roomCode: room.code, playerId: player.id, text: chatText.trim()}, (res)=>{
      if(res.ok) setChatText('')
    })
  }

  const winner = current.winner ? room.players.find(p => p.id === current.winner) : null
  const hasLost = roundOver && current.winner !== player.id
  const roundResult = roundOver ? (winner ? `${winner.username} guessed the word!` : 'No one guessed the word.') : null
  const currentPlayer = room.players.find(p => p.id === player.id)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.14),_transparent_30%),#020617] p-4 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-[2rem] border border-slate-700 bg-slate-950/75 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Hangman Arena</div>
              <h1 className="mt-2 text-3xl font-semibold text-white">Round {room.round}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">{isHanger ? 'You are the hanger this round. Choose a strong word to challenge the room.' : 'Guess the word before the gallows finish the hangman.'}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-700 bg-slate-900/90 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Your score</div>
                <div className="mt-2 text-3xl font-semibold text-cyan-300">{currentPlayer?.score || 0}</div>
              </div>
              <div className="rounded-3xl border border-slate-700 bg-slate-900/90 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</div>
                <div className="mt-2 text-2xl font-semibold text-emerald-300">{isHanger ? 'Hanger' : waitingForWord ? 'Waiting' : 'Guessing'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <section className="space-y-6 rounded-[1.5rem] border border-slate-700 bg-slate-950/90 p-6 shadow-xl shadow-indigo-600/5">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <h2 className="text-xl font-semibold">Secret Word</h2>
                <p className="text-sm text-slate-400">{current.mask ? 'Guess letters or try the full word.' : 'Hanger needs to set the word.'}</p>
              </div>
              {roundOver && nextRoundSeconds !== null ? (
                <div className="rounded-3xl bg-slate-900 p-3 text-center text-sm text-cyan-200 ring-1 ring-cyan-500/20">
                  Next round in <span className="font-semibold text-white">{nextRoundSeconds}s</span>
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-slate-700 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-6 text-center text-3xl tracking-[0.55em] text-white">
              {current.mask ? current.mask.map((c,i) => <span key={i} className="inline-block px-2">{c === '_' ? '•' : c}</span>) : '_____'}
            </div>

            {current.hint && (
              <div className="rounded-3xl border border-slate-700 bg-slate-900/90 p-4 text-sm text-slate-300">
                <span className="font-semibold text-cyan-300">Hint:</span> {current.hint}
              </div>
            )}

            {waitingForWord && isHanger ? (
              <div className="rounded-3xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-5 text-sm text-fuchsia-100">
                <div className="font-semibold text-fuchsia-200">Hanger task</div>
                <p>Choose a secret word and optional hint. The guessers will try to solve it.</p>
                <div className="mt-4 grid gap-3">
                  <input value={wordInput} onChange={e=>setWordInput(e.target.value)} onKeyDown={e => e.key==='Enter' && setWord()} placeholder="Secret word" className="w-full rounded-3xl border border-slate-700 bg-slate-900/90 p-3 text-white" />
                  <input value={hintInput} onChange={e=>setHintInput(e.target.value)} onKeyDown={e => e.key==='Enter' && setWord()} placeholder="Hint (optional)" className="w-full rounded-3xl border border-slate-700 bg-slate-900/90 p-3 text-white" />
                  <button onClick={setWord} className="rounded-3xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950">Set Word</button>
                </div>
              </div>
            ) : null}

            {!waitingForWord && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-4 text-sm text-slate-300">
                  <div className="font-semibold text-slate-100">Wrong letters</div>
                  <div className="mt-2 text-lg text-rose-300">{(current.wrongLetters || []).join(', ') || 'None yet'}</div>
                </div>
                <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-4 text-sm text-slate-300">
                  <div className="font-semibold text-slate-100">Attempts left</div>
                  <div className="mt-2 text-3xl font-semibold text-emerald-300">{current.attemptsLeft ?? 6}</div>
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-4">
              <GuessInput disabled={waitingForWord || isHanger || roundOver} />
            </div>

            <div className={
                `rounded-3xl border p-5 ${roundOver ? 'border-rose-500/30 bg-rose-500/5 text-rose-100' : 'border-slate-700 bg-slate-900/80 text-slate-300'}`
              }>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Round Result</div>
              {roundOver ? (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="text-lg font-semibold text-white">{roundResult}</div>
                  {winner && winner.id === player.id ? (
                    <p>You were the hero this round — great work!</p>
                  ) : current.winner === null ? (
                    <p>The hangman won. Better luck next round!</p>
                  ) : (
                    <p>{winner.username} captured the word first.</p>
                  )}
                  {current.solution && (
                    <p className="text-slate-400">Solution: <span className="text-white">{current.solution}</span></p>
                  )}
                </div>
              ) : (
                <p className="text-slate-400">Guess the word or set it if you're the hanger. Points are awarded for correct answers.</p>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[1.5rem] border border-slate-700 bg-slate-950/90 p-5 shadow-xl shadow-violet-500/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Scoreboard</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Top Players</h3>
                </div>
                <div className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">Live</div>
              </div>
              <div className="mt-5 space-y-3">
                {sortedPlayers.map(p => {
                  const barWidth = Math.min(100, (p.score||0) + 10) + '%'
                  return (
                    <div key={p.id} className={
                      `rounded-3xl border ${p.id===player.id ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-700 bg-slate-900/80'} p-4`
                    }>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-white">{p.username} {p.id===room.host && <span className="text-xs text-slate-400">(Host)</span>}</div>
                          <div className="text-xs text-slate-400">{p.status}</div>
                        </div>
                        <div className="rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold text-cyan-300">{p.score || 0}</div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{width: barWidth}} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-700 bg-slate-950/90 p-5 shadow-xl shadow-blue-600/5">
              <h3 className="text-xl font-semibold text-white">Hangman Progress</h3>
              <p className="mt-2 text-sm text-slate-400">Guessers have {current.attemptsLeft ?? 6} attempts remaining.</p>
              <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Gallows</div>
                <div className="mt-4">
                  <HangmanSVG attempts={current.attemptsLeft || 6} />
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-700 bg-slate-950/90 p-5 shadow-xl shadow-green-500/5">
              <h3 className="text-xl font-semibold text-white">Chat</h3>
              <div ref={chatRef} className="mt-4 max-h-64 overflow-y-auto space-y-2">
                {chat.map((msg, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-semibold text-cyan-300">{chatPlayers[msg.playerId]?.username || 'Unknown'}: </span>
                    <span className="text-slate-300">{msg.text}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <input value={chatText} onChange={e=>setChatText(e.target.value)} onKeyDown={e => e.key==='Enter' && sendChat()} placeholder="Type a message..." className="flex-1 rounded-3xl border border-slate-700 bg-slate-900/90 p-3 text-white" />
                <button onClick={sendChat} className="rounded-3xl bg-gradient-to-r from-green-500 to-blue-500 px-4 py-3 text-sm font-semibold text-slate-950">Send</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
