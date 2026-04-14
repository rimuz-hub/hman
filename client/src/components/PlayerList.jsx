import React from 'react'

export default function PlayerList({players=[], hostId}){
  const sortedPlayers = [...players].sort((a,b)=> (b.score||0) - (a.score||0));
  return (
    <div className="mt-2">
      <h4 className="text-sm mb-2">Players</h4>
      <div className="space-y-2">
        {sortedPlayers.map(p => (
          <div key={p.id} className="flex items-center gap-3 p-2 rounded bg-[#061124]">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">{(p.username||'U')[0]}</div>
            <div className="flex-1">
              <div className="text-sm font-medium">{p.username} {p.id===hostId && <span className="text-xs text-sky-300">(Host)</span>}</div>
              <div className="text-xs text-muted">{p.score || 0} pts</div>
            </div>
            <div className="text-xs text-muted">{p.status}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
