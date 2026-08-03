/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Multiplayer Room State
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', ({ roomId, user }) => {
    socket.join(roomId);
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        players: [],
        status: 'waiting',
        puzzle: null
      });
    }
    const room = rooms.get(roomId);
    const existingPlayer = room.players.find(p => p.uid === user.uid);
    if (!existingPlayer) {
      room.players.push({ ...user, score: 0, isReady: false, isFinished: false });
    }
    io.to(roomId).emit('room_update', room);
  });

  socket.on('player_ready', ({ roomId, uid }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.uid === uid);
    if (player) {
      player.isReady = true;
    }
    
    // Start game if everyone is ready
    if (room.players.length >= 2 && room.players.every(p => p.isReady)) {
      room.status = 'playing';
      // Puzzle logic would go here
      io.to(roomId).emit('game_start', room);
    } else {
      io.to(roomId).emit('room_update', room);
    }
  });

  socket.on('submit_puzzle', ({ roomId, uid, time, success }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.uid === uid);
    if (player) {
      player.isFinished = true;
      player.time = time;
      player.score = success ? 1 : 0;
    }

    if (room.players.every(p => p.isFinished)) {
      room.status = 'finished';
      io.to(roomId).emit('game_over', room);
    } else {
      io.to(roomId).emit('room_update', room);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
