import React from 'react'

export default function HangmanSVG({attempts=6}){
  const wrong = 6 - attempts
  return (
    <div className="w-full flex items-center justify-center p-2">
      <svg viewBox="0 0 120 140" width="160" height="180">
        <g stroke="#9ca3af" strokeWidth="2" fill="none">
          <line x1="10" y1="130" x2="110" y2="130" />
          <line x1="30" y1="130" x2="30" y2="10" />
          <line x1="30" y1="10" x2="80" y2="10" />
          <line x1="80" y1="10" x2="80" y2="25" />
        </g>
        <g stroke="#fff" strokeWidth="2" fill="none">
          {wrong>0 && <circle cx="80" cy="35" r="10" stroke="#fff" />}
          {wrong>1 && <line x1="80" y1="45" x2="80" y2="75" />}
          {wrong>2 && <line x1="80" y1="55" x2="65" y2="70" />}
          {wrong>3 && <line x1="80" y1="55" x2="95" y2="70" />}
          {wrong>4 && <line x1="80" y1="75" x2="65" y2="95" />}
          {wrong>5 && <line x1="80" y1="75" x2="95" y2="95" />}
        </g>
      </svg>
    </div>
  )
}
