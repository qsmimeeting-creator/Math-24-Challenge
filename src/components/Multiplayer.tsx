/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { UserProfile, Room } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Users, Send, Play } from 'lucide-react';

interface Props {
  setView: (view: any) => void;
  profile: UserProfile | null;
}

export default function Multiplayer({ setView, profile }: Props) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [status, setStatus] = useState<'lobby' | 'room'>('lobby');

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('room_update', (updatedRoom: Room) => {
      setRoom(updatedRoom);
    });

    newSocket.on('game_start', (startedRoom: Room) => {
      setRoom(startedRoom);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const joinRoom = () => {
    if (socket && roomId && profile) {
      socket.emit('join_room', { roomId, user: { uid: profile.uid, username: profile.username } });
      setStatus('room');
    }
  };

  const setReady = () => {
    if (socket && room && profile) {
      socket.emit('player_ready', { roomId: room.id, uid: profile.uid });
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6">
      <header className="flex items-center gap-4 mb-8 bg-white p-4 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
        <button onClick={() => setView('menu')} className="p-2 bg-slate-100 rounded-xl text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]">
          <ChevronLeft size={20} className="stroke-[3px]" />
        </button>
        <h1 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">MULTIPLAYER</h1>
      </header>

      <AnimatePresence mode="wait">
        {status === 'lobby' ? (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex-1 flex flex-col justify-center"
          >
            <div className="text-center mb-10 bg-white border-4 border-slate-900 p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
              <div className="w-20 h-20 bg-emerald-400 border-4 border-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                <Users size={40} className="text-slate-900" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight italic">CREATE OR JOIN</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 leading-relaxed">Enter a room code to battle with your friends in real-time</p>
            </div>

            <div className="space-y-5">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ROOM CODE (E.G. MATH24)"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="w-full bg-white border-4 border-slate-900 p-5 rounded-2xl text-slate-900 font-black placeholder:text-slate-300 focus:outline-none focus:border-indigo-600 transition-colors shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] uppercase tracking-widest"
                />
              </div>
              <button
                onClick={joinRoom}
                className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all uppercase tracking-widest italic text-lg"
              >
                ENTER ARENA
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="room"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <div className="flex items-center justify-between mb-8 p-5 bg-white rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Room: <span className="text-indigo-600 italic">{room?.id}</span></div>
              <div className="px-3 py-1 bg-emerald-400 text-slate-900 text-[10px] font-black rounded-full border-2 border-slate-900 uppercase italic">
                {room?.status === 'waiting' ? 'WAITING...' : 'BATTLE ON'}
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-[0.2em] italic">PLAYERS IN LOBBY</h3>
              {room?.players.map((player) => (
                <div key={player.uid} className="flex items-center justify-between p-4 bg-white border-4 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-400 border-2 border-slate-900 rounded-full flex items-center justify-center font-black text-slate-900 text-xs italic">
                      {player.username[0]}
                    </div>
                    <span className="font-black text-slate-900 text-sm uppercase tracking-tight italic">{player.username}</span>
                  </div>
                  {player.isReady ? (
                    <span className="text-[9px] bg-emerald-400 text-slate-900 px-3 py-1 rounded-full border-2 border-slate-900 font-black uppercase italic">READY</span>
                  ) : (
                    <span className="text-[9px] bg-slate-100 text-slate-400 px-3 py-1 rounded-full border-2 border-slate-200 font-black uppercase italic">NOT READY</span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-auto pt-8">
              <button
                onClick={setReady}
                disabled={room?.players.find(p => p.uid === profile?.uid)?.isReady}
                className="w-full flex items-center justify-center gap-3 bg-rose-500 text-white font-black py-5 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all uppercase tracking-widest italic text-lg"
              >
                <Play size={20} fill="currentColor" className="stroke-[3px]" />
                I AM READY
              </button>
              <p className="text-center text-[10px] text-slate-500 mt-6 uppercase font-black tracking-widest opacity-40 italic">Battle starts when all players are ready</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
