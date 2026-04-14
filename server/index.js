require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const Filter = require('bad-words');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../client/dist')));

// Catch-all handler: send back index.html for any request that doesn't match a static file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

const PORT = process.env.PORT || 4000;

// In-memory store (for demo/prototyping). Replace with DB for persistence.
const rooms = new Map();

function createRoom(hostPlayer, settings = {}){
  const code = Math.random().toString(36).slice(2,8).toUpperCase();
  const room = {
    code,
    host: hostPlayer.id,
    players: new Map([[hostPlayer.id, hostPlayer]]),
    spectatorIds: new Set(),
    state: 'lobby',
    settings: Object.assign({maxPlayers:8, timer:60, private:false}, settings),
    round: 0,
    current: null, // current round state
    chat: []
  };
  rooms.set(code, room);
  return room;
}

function pickNextHanger(room){
  const ids = Array.from(room.players.keys());
  if(ids.length===0) return null;
  room.round = (room.round||0)+1;
  if(ids.length === 1) return ids[0];
  const lastHanger = room.current?.hangerId;
  let next = lastHanger;
  while(next === lastHanger){
    next = ids[Math.floor(Math.random()*ids.length)];
  }
  return next;
}

io.on('connection', (socket) => {
  const filter = new Filter();
  socket.on('createRoom', ({player, settings}, cb) => {
    const playerObj = Object.assign({}, player, {id: player.id || uuidv4(), socketId: socket.id});
    const room = createRoom(playerObj, settings);
    socket.join(room.code);
    cb({ok:true, roomCode: room.code, player: playerObj, room: serializeRoom(room)});
    io.to(room.code).emit('roomUpdate', serializeRoom(room));
  });

  socket.on('joinRoom', ({player, roomCode}, cb) => {
    const code = (roomCode||'').trim().toUpperCase();
    const room = rooms.get(code);
    if(!room) return cb({ok:false, error:'Room not found'});
    if(room.players.size >= room.settings.maxPlayers) return cb({ok:false, error:'Room full'});
    const cleanName = filter.clean(player.username || 'Guest');
    const existing = Array.from(room.players.values()).find(p => p.username.toLowerCase() === cleanName.toLowerCase() && p.id !== player.id);
    if(existing) return cb({ok:false, error:'Username already taken in this room'});
    const playerObj = {id: player.id||uuidv4(), username: cleanName, avatar: player.avatar, socketId: socket.id, status:'ready', score:0};
    room.players.set(playerObj.id, playerObj);
    socket.join(code);
    cb({ok:true, room:serializeRoom(room), player:playerObj});
    io.to(code).emit('roomUpdate', serializeRoom(room));
  });

  socket.on('startGame', ({roomCode, playerId}, cb) => {
    const room = rooms.get(roomCode);
    if(!room) return cb({ok:false, error:'Room not found'});
    if(room.host !== playerId) return cb({ok:false, error:'Only the room host can start the game'});
    room.state = 'playing';
    room.players.forEach((p) => {
      p.status = 'guessing';
    });
    const hangerId = pickNextHanger(room);
    startRound(room, hangerId);
    room.players.forEach((p, id) => {
      if(id === hangerId) p.status = 'hanger';
    });
    io.to(roomCode).emit('gameStarted', serializeRoom(room));
    cb({ok:true});
  });

  socket.on('nextRound', ({roomCode, playerId}, cb) => {
    const room = rooms.get(roomCode);
    if(!room) return cb({ok:false, error:'Room not found'});
    if(room.host !== playerId) return cb({ok:false, error:'Only the room host can start the next round'});
    if(!room.current || !room.current.ended) return cb({ok:false, error:'Current round is not finished'});
    room.state = 'playing';
    room.players.forEach((p) => {
      p.status = 'guessing';
    });
    const hangerId = pickNextHanger(room);
    startRound(room, hangerId);
    room.players.forEach((p, id) => {
      if(id === hangerId) p.status = 'hanger';
    });
    io.to(roomCode).emit('roundUpdated', serializeRoom(room));
    cb({ok:true});
  });

  socket.on('setWord', ({roomCode, playerId, word, hint}, cb) => {
    const room = rooms.get(roomCode);
    if(!room) return cb({ok:false});
    if(!room.current) return cb({ok:false});
    if(room.current.hangerId !== playerId) return cb({ok:false});
    // validate word
    const clean = (word||'').trim().toLowerCase();
    if(!/^[a-z]{2,20}$/.test(clean)) return cb({ok:false, error:'Invalid word'});
    room.current.word = clean;
    room.current.mask = Array.from(clean).map(()=>'_');
    room.current.hint = hint||'';
    room.current.startedAt = Date.now();
    io.to(roomCode).emit('roundUpdated', stripWordForRoom(room));
    cb({ok:true});
  });

  socket.on('guessLetter', ({roomCode, playerId, letter}, cb) => {
    const room = rooms.get(roomCode);
    if(!room || !room.current) return cb({ok:false});
    if(!room.current.word) return cb({ok:false, error:'Word not set yet'});
    const p = room.players.get(playerId);
    if(!p) return cb({ok:false});
    letter = (letter||'').toLowerCase();
    if(!/^[a-z]$/.test(letter)) return cb({ok:false});
    if(room.current.guessedLetters.has(letter) || room.current.wrongLetters.has(letter)) return cb({ok:false, error:'Already guessed'});
    if(room.current.word.includes(letter)){
      room.current.word.split('').forEach((c,i)=>{ if(c===letter) room.current.mask[i]=c; });
      p.score += 10;
      room.current.guessedLetters.add(letter);
    } else {
      room.current.wrongLetters.add(letter);
      room.current.attemptsLeft -= 1;
      p.score = Math.max(0, p.score - 2);
    }
    // check win/lose
    if(room.current.mask.join('') === room.current.word){
      room.current.ended = true;
      room.current.winner = playerId;
      scheduleNextRound(room);
    } else if(room.current.attemptsLeft <= 0){
      room.current.ended = true;
      room.current.winner = null;
      scheduleNextRound(room);
    }
    io.to(roomCode).emit('roundUpdated', stripWordForRoom(room));
    cb({ok:true});
  });

  socket.on('guessWord', ({roomCode, playerId, guess}, cb) => {
    const room = rooms.get(roomCode);
    if(!room || !room.current) return cb({ok:false});
    if(!room.current.word) return cb({ok:false, error:'Word not set yet'});
    const p = room.players.get(playerId);
    if(!p) return cb({ok:false});
    guess = (guess||'').trim().toLowerCase();
    if(!/^[a-z]{2,20}$/.test(guess)) return cb({ok:false});
    if(guess === room.current.word){
      room.current.mask = room.current.word.split('');
      room.current.ended = true;
      room.current.winner = playerId;
      p.score += 50;
      scheduleNextRound(room);
    } else {
      room.current.attemptsLeft -= 2;
      p.score = Math.max(0, p.score - 5);
      room.current.wrongWords = room.current.wrongWords || [];
      room.current.wrongWords.push({playerId, guess});
      if(room.current.attemptsLeft <=0){
        room.current.ended = true;
        room.current.winner = null;
        const hanger = room.players.get(room.current.hangerId);
        if(hanger) hanger.score += 30;
        scheduleNextRound(room);
      }
    }
    io.to(roomCode).emit('roundUpdated', stripWordForRoom(room));
    cb({ok:true});
  });

  socket.on('chat', ({roomCode, playerId, text}, cb) => {
    const room = rooms.get(roomCode);
    if(!room) return cb({ok:false});
    const clean = filter.clean(text||'');
    const msg = {id:uuidv4(), playerId, text:clean, ts:Date.now()};
    room.chat.push(msg);
    io.to(roomCode).emit('chat', msg);
    cb({ok:true});
  });

  socket.on('leaveRoom', ({roomCode, playerId}, cb) => {
    const room = rooms.get(roomCode);
    if(!room) return cb({ok:false});
    room.players.delete(playerId);
    socket.leave(roomCode);
    io.to(roomCode).emit('roomUpdate', serializeRoom(room));
    cb({ok:true});
  });

  socket.on('disconnecting', () => {
    const roomsJoined = Array.from(socket.rooms);
    roomsJoined.forEach(code => {
      const room = rooms.get(code);
      if(room){
        for(const [id,pl] of room.players.entries()){
          if(pl.socketId === socket.id){
            pl.status = 'disconnected';
            pl.socketId = null;
            io.to(code).emit('roomUpdate', serializeRoom(room));
            break;
          }
        }
      }
    });
  });

  socket.on('reconnectPlayer', ({roomCode, playerId, socketId}, cb) => {
    const room = rooms.get(roomCode);
    if(!room) return cb({ok:false});
    const p = room.players.get(playerId);
    if(!p) return cb({ok:false});
    p.socketId = socket.id;
    p.status = 'ready';
    socket.join(roomCode);
    io.to(roomCode).emit('roomUpdate', serializeRoom(room));
    cb({ok:true, room:serializeRoom(room)});
  });
});

function startRound(room, hangerId){
  if(room.nextRoundTimer){
    clearTimeout(room.nextRoundTimer);
    room.nextRoundTimer = null;
  }
  room.current = {
    hangerId,
    word: null,
    mask: null,
    hint: '',
    guessedLetters: new Set(),
    wrongLetters: new Set(),
    attemptsLeft: 6,
    startedAt: null,
    ended: false,
    winner: null,
    nextRoundAt: null
  };
}

function scheduleNextRound(room){
  if(!room.current || room.current.nextRoundAt) return;
  room.current.nextRoundAt = Date.now() + 10000;
  room.nextRoundTimer = setTimeout(() => {
    if(!room.current || !room.current.ended) return;
    startNextRound(room);
    io.to(room.code).emit('roundUpdated', serializeRoom(room));
  }, 10000);
}

function startNextRound(room){
  room.current.nextRoundAt = null;
  room.state = 'playing';
  room.players.forEach((p) => {
    p.status = 'guessing';
  });
  const hangerId = pickNextHanger(room);
  startRound(room, hangerId);
  room.players.forEach((p,id)=>{
    if(id === hangerId) p.status = 'hanger';
  });
}

function stripWordForRoom(room){
  const copy = Object.assign({}, room);
  const cur = Object.assign({}, room.current || {});
  if(cur.word){
    cur.mask = cur.mask;
  }
  if(cur.ended){
    cur.solution = cur.word;
  }
  if(cur.nextRoundAt){
    cur.nextRoundAt = cur.nextRoundAt;
  }
  // convert sets to arrays
  cur.guessedLetters = Array.from(cur.guessedLetters || []);
  cur.wrongLetters = Array.from(cur.wrongLetters || []);
  copy.current = cur;
  return serializeRoom(copy);
}

function serializeRoom(room){
  return {
    code: room.code,
    host: room.host,
    state: room.state,
    settings: room.settings,
    round: room.round,
    players: Array.from(room.players.values()).map(p => ({id:p.id, username:p.username, avatar:p.avatar, status:p.status, score:p.score})),
    current: room.current ? {
      hangerId: room.current.hangerId,
      mask: room.current.mask,
      hint: room.current.hint,
      attemptsLeft: room.current.attemptsLeft,
      guessedLetters: Array.from(room.current.guessedLetters||[]),
      wrongLetters: Array.from(room.current.wrongLetters||[]),
      startedAt: room.current.startedAt,
      ended: room.current.ended,
      winner: room.current.winner,
      solution: room.current.solution,
      nextRoundAt: room.current.nextRoundAt
    } : null,
    chat: room.chat
  };
}

app.get('/', (req,res)=>res.json({ok:true}));

server.listen(PORT, ()=> console.log('Server listening on', PORT));
