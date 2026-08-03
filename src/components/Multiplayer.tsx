/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, updateDoc, onSnapshot, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { UserProfile, Room, Player } from '../types';
import { Math24Solver } from '../utils/math24';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Users, Play, Trophy, RefreshCw, CheckCircle, RotateCcw, Lightbulb } from 'lucide-react';

interface Props {
  setView: (view: any) => void;
  profile: UserProfile | null;
}

interface Card {
  id: string;
  val: number;
  expr: string;
}

export default function Multiplayer({ setView, profile }: Props) {
  const [roomIdInput, setRoomIdInput] = useState('');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [status, setStatus] = useState<'lobby' | 'room'>('lobby');
  const [activeRooms, setActiveRooms] = useState<{ id: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // In-game board state
  const [cards, setCards] = useState<Card[]>([]);
  const [history, setHistory] = useState<Card[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOp, setSelectedOp] = useState<string | null>(null);
  const [gameMessage, setGameMessage] = useState('FIRST NUMBER');
  const [solvedNotice, setSolvedNotice] = useState<string | null>(null);

  const username = profile?.username || 'PLAYER';
  const userId = profile?.uid || `guest_${Math.random().toString(36).substring(2, 8)}`;

  // Fetch active rooms on lobby mount
  useEffect(() => {
    if (status !== 'lobby') return;
    fetchPublicRooms();
  }, [status]);

  const fetchPublicRooms = async () => {
    try {
      const q = query(collection(db, 'rooms'), limit(10));
      const snapshot = await getDocs(q);
      const roomsList: { id: string; count: number }[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        if (data.status === 'waiting' && Array.isArray(data.players)) {
          roomsList.push({ id: d.id, count: data.players.length });
        }
      });
      setActiveRooms(roomsList);
    } catch (e) {
      console.warn('Failed to fetch active rooms list:', e);
    }
  };

  // Realtime subscription when joined to a room
  useEffect(() => {
    if (!currentRoomId) return;

    const roomRef = doc(db, 'rooms', currentRoomId);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Room;
        setRoom(data);

        // Sync board cards if puzzle changed
        if (data.currentPuzzle && data.currentPuzzle.numbers) {
          const newNums = data.currentPuzzle.numbers;
          setCards(newNums.map((n, i) => ({
            id: `card-${i}`,
            val: n,
            expr: `${n}`
          })));
          setHistory([]);
          setSelectedId(null);
          setSelectedOp(null);
          setGameMessage('FIRST NUMBER');
        }
      } else {
        setErrorMsg('Room was closed or does not exist.');
        setStatus('lobby');
        setCurrentRoomId(null);
      }
    }, (err) => {
      console.error('Room snapshot error:', err);
    });

    return () => unsubscribe();
  }, [currentRoomId]);

  const [copiedCode, setCopiedCode] = useState(false);

  const copyRoomCode = () => {
    if (room?.id) {
      navigator.clipboard.writeText(room.id);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const createRoom = async () => {
    setLoading(true);
    setErrorMsg(null);
    const code = roomIdInput.trim() 
      ? roomIdInput.trim().toUpperCase() 
      : `M24-${Math.floor(1000 + Math.random() * 9000)}`;
    const puzzle = Math24Solver.generateSolvable();

    const newRoom: Room = {
      id: code,
      hostId: userId,
      players: [{
        uid: userId,
        username,
        score: 0,
        isReady: true,
        isFinished: false
      }],
      status: 'waiting',
      currentPuzzle: {
        numbers: puzzle.numbers,
        solutions: puzzle.solutions
      },
      createdAt: Date.now()
    };

    // Optimistically transition to room view immediately
    setRoom(newRoom);
    setCurrentRoomId(code);
    setStatus('room');
    setLoading(false);

    // Save room in Firestore asynchronously
    try {
      await setDoc(doc(db, 'rooms', code), newRoom);
    } catch (e: any) {
      console.error('Error creating room on Firestore:', e);
      setErrorMsg('ไม่สามารถบันทึกห้องบนเซิร์ฟเวอร์ได้ (ลองตรวจสอบอินเทอร์เน็ต)');
    }
  };

  const joinRoom = async (codeToJoin?: string) => {
    const code = (codeToJoin || roomIdInput).trim().toUpperCase();
    if (!code) {
      setErrorMsg('กรุณากรอกรหัสห้อง (Room Code)');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const roomRef = doc(db, 'rooms', code);
      const docSnap = await getDoc(roomRef);

      if (!docSnap.exists()) {
        setErrorMsg(`ไม่พบห้องรหัส "${code}" กรุณาตรวจสอบรหัสห้องอีกครั้ง`);
        setLoading(false);
        return;
      }

      const existingRoom = docSnap.data() as Room;
      const players = existingRoom.players || [];
      const meInRoom = players.find(p => p.uid === userId);

      if (!meInRoom) {
        const updatedPlayers: Player[] = [...players, {
          uid: userId,
          username,
          score: 0,
          isReady: false,
          isFinished: false
        }];
        await updateDoc(roomRef, { players: updatedPlayers });
      }

      setRoom(existingRoom);
      setCurrentRoomId(code);
      setStatus('room');
    } catch (e: any) {
      console.error('Error joining room:', e);
      setErrorMsg('ไม่สามารถเข้าร่วมห้องได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const toggleReady = async () => {
    if (!currentRoomId || !room) return;

    const updatedPlayers = room.players.map(p => {
      if (p.uid === userId) {
        return { ...p, isReady: !p.isReady };
      }
      return p;
    });

    const hasMinPlayers = updatedPlayers.length >= 2;
    const allReady = hasMinPlayers && updatedPlayers.every(p => p.isReady);
    const newStatus = allReady ? 'playing' : 'waiting';

    try {
      await updateDoc(doc(db, 'rooms', currentRoomId), {
        players: updatedPlayers,
        status: newStatus
      });
    } catch (e) {
      console.error('Failed to update ready state:', e);
    }
  };

  // Game logic in multiplayer
  const onCardClick = (id: string) => {
    if (selectedId === null) {
      setSelectedId(id);
      setGameMessage('SELECT OPERATOR');
    } else if (selectedId === id && !selectedOp) {
      setSelectedId(null);
      setGameMessage('FIRST NUMBER');
    } else if (selectedId && selectedOp && selectedId !== id) {
      combineCards(selectedId, id, selectedOp);
    } else if (selectedId && !selectedOp && selectedId !== id) {
      setSelectedId(id);
    }
  };

  const combineCards = (id1: string, id2: string, op: string) => {
    const c1 = cards.find(c => c.id === id1)!;
    const c2 = cards.find(c => c.id === id2)!;
    let res = 0;

    if (op === '+') res = c1.val + c2.val;
    if (op === '-') res = c1.val - c2.val;
    if (op === '*') res = c1.val * c2.val;
    if (op === '/') {
      if (c2.val === 0) return;
      res = c1.val / c2.val;
    }

    setHistory([...history, [...cards]]);

    const newCard: Card = {
      id: `card-${Date.now()}`,
      val: res,
      expr: `(${c1.expr} ${op} ${c2.expr})`
    };

    const nextCards = cards.filter(c => c.id !== id1 && c.id !== id2);
    nextCards.push(newCard);

    setCards(nextCards);
    setSelectedId(null);
    setSelectedOp(null);
    setGameMessage('NEXT MOVE');

    if (nextCards.length === 1) {
      if (Math.abs(nextCards[0].val - 24) < 1e-6) {
        handlePlayerSolve();
      } else {
        setGameMessage('NOT 24! UNDO?');
      }
    }
  };

  const handlePlayerSolve = async () => {
    if (!currentRoomId || !room) return;

    setSolvedNotice('🎉 PERFECT 24! (+1 POINT)');

    // Update player score in Firestore and generate new puzzle
    const nextPuzzle = Math24Solver.generateSolvable();
    const updatedPlayers = room.players.map(p => {
      if (p.uid === userId) {
        return { ...p, score: p.score + 1 };
      }
      return p;
    });

    try {
      await updateDoc(doc(db, 'rooms', currentRoomId), {
        players: updatedPlayers,
        currentPuzzle: {
          numbers: nextPuzzle.numbers,
          solutions: nextPuzzle.solutions
        }
      });
    } catch (e) {
      console.error('Failed to submit score:', e);
    }

    setTimeout(() => {
      setSolvedNotice(null);
    }, 1800);
  };

  const leaveRoom = () => {
    setStatus('lobby');
    setCurrentRoomId(null);
    setRoom(null);
  };

  const myPlayerState = room?.players.find(p => p.uid === userId);

  return (
    <div className="flex-1 flex flex-col p-6">
      <header className="flex items-center gap-4 mb-6 bg-white p-4 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
        <button 
          onClick={() => {
            if (status === 'room') {
              leaveRoom();
            } else {
              setView('menu');
            }
          }} 
          className="p-2 bg-slate-100 rounded-xl text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
        >
          <ChevronLeft size={20} className="stroke-[3px]" />
        </button>
        <h1 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">MULTIPLAYER</h1>
      </header>

      {errorMsg && (
        <div className="mb-4 p-4 bg-rose-100 border-4 border-rose-500 rounded-2xl text-rose-700 text-xs font-black uppercase tracking-widest italic">
          {errorMsg}
        </div>
      )}

      <AnimatePresence mode="wait">
        {status === 'lobby' ? (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex-1 flex flex-col justify-between"
          >
            <div className="text-center bg-white border-4 border-slate-900 p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] mb-6">
              <div className="w-16 h-16 bg-emerald-400 border-4 border-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                <Users size={32} className="text-slate-900" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-1 uppercase tracking-tight italic">CREATE OR JOIN</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 leading-relaxed">Enter a room code to battle in real-time online</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ROOM CODE (E.G. MATH24)"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                  className="w-full bg-white border-4 border-slate-900 p-4 rounded-2xl text-slate-900 font-black placeholder:text-slate-300 focus:outline-none focus:border-indigo-600 transition-colors shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] uppercase tracking-widest text-center text-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={createRoom}
                  disabled={loading}
                  className="bg-indigo-600 text-white font-black py-4 px-4 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] uppercase tracking-widest italic text-sm disabled:opacity-50"
                >
                  CREATE ROOM
                </button>
                <button
                  onClick={() => joinRoom()}
                  disabled={loading}
                  className="bg-amber-400 text-slate-900 font-black py-4 px-4 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] uppercase tracking-widest italic text-sm disabled:opacity-50"
                >
                  JOIN ROOM
                </button>
              </div>
            </div>

            {/* Active Public Rooms */}
            {activeRooms.length > 0 && (
              <div className="bg-white border-4 border-slate-900 p-4 rounded-3xl shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">ACTIVE ROOMS</span>
                  <button onClick={fetchPublicRooms} className="text-indigo-600">
                    <RefreshCw size={14} className="stroke-[3px]" />
                  </button>
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {activeRooms.map(r => (
                    <div 
                      key={r.id} 
                      onClick={() => joinRoom(r.id)}
                      className="flex items-center justify-between p-3 bg-slate-50 border-2 border-slate-900 rounded-xl hover:bg-yellow-100 cursor-pointer transition-colors"
                    >
                      <span className="font-black text-slate-900 text-sm uppercase italic">{r.id}</span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full font-black border border-indigo-900">
                        {r.count} PLAYER{r.count > 1 ? 'S' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="room"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col justify-between"
          >
            {/* Header info */}
            <div className="flex items-center justify-between mb-4 p-4 bg-white rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest">CODE:</div>
                  <div className="text-xl font-black text-indigo-600 italic tracking-wider">{room?.id}</div>
                </div>
                <button 
                  onClick={copyRoomCode} 
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-900 rounded-lg text-[10px] font-black uppercase transition-all"
                  title="Copy Room Code"
                >
                  {copiedCode ? 'คัดลอกแล้ว!' : 'คัดลอก'}
                </button>
              </div>
              <div className={`px-4 py-1.5 text-xs font-black rounded-full border-2 border-slate-900 uppercase italic ${
                room?.status === 'playing' ? 'bg-rose-500 text-white' : 'bg-emerald-400 text-slate-900'
              }`}>
                {room?.status === 'playing' ? '⚔️ BATTLE ON' : 'LOBBY WAITING'}
              </div>
            </div>

            {/* Players scoreboard */}
            <div className="bg-white border-4 border-slate-900 p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">PLAYERS ({room?.players.length || 0})</span>
                <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-900 uppercase">ต้องการ 2+ คน</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {room?.players.map((p) => (
                  <div key={p.uid} className="flex items-center justify-between p-2.5 bg-slate-50 border-2 border-slate-900 rounded-xl">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-7 h-7 bg-yellow-400 border-2 border-slate-900 rounded-full flex items-center justify-center font-black text-slate-900 text-[10px] italic flex-shrink-0">
                        {p.username[0]}
                      </div>
                      <span className="font-black text-slate-900 text-xs uppercase italic truncate">{p.username}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="font-black text-indigo-600 text-sm italic">{p.score} pt</span>
                      {p.isReady && <CheckCircle size={14} className="text-emerald-500 stroke-[3px]" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Main view: waiting vs playing */}
            {room?.status === 'waiting' ? (
              <div className="flex-1 flex flex-col items-center justify-center my-6 bg-white border-4 border-slate-900 p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] text-center">
                <Users size={48} className="text-indigo-600 mb-3" />
                <h3 className="text-xl font-black text-slate-900 mb-1 uppercase tracking-tight italic">WAITING FOR PLAYERS</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">แชร์รหัสห้อง <span className="text-indigo-600 font-black">{room?.id}</span> ให้เพื่อนเข้าร่วม</p>

                {(room?.players.length || 0) < 2 && (
                  <p className="text-xs font-black text-amber-600 bg-amber-50 border-2 border-amber-300 px-4 py-2 rounded-xl mb-4 animate-pulse">
                    ⚠️ ต้องมีผู้เล่นอย่างน้อย 2 คนขึ้นไปเพื่อเริ่มเกม
                  </p>
                )}

                <button
                  onClick={toggleReady}
                  className={`w-full flex items-center justify-center gap-3 font-black py-4 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] uppercase tracking-widest italic text-lg ${
                    myPlayerState?.isReady ? 'bg-emerald-400 text-slate-900' : 'bg-rose-500 text-white'
                  }`}
                >
                  <Play size={20} fill="currentColor" className="stroke-[3px]" />
                  {myPlayerState?.isReady ? 'พร้อมแล้ว! (รอผู้เล่นครบและพร้อม)' : 'กดพร้อมเล่น (READY)'}
                </button>
              </div>
            ) : (
              /* Playing view */
              <div className="flex-1 flex flex-col justify-between">
                {solvedNotice && (
                  <div className="mb-3 p-3 bg-emerald-400 border-4 border-slate-900 rounded-2xl text-slate-900 font-black text-center text-sm uppercase italic shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] animate-bounce">
                    {solvedNotice}
                  </div>
                )}

                <div className="flex justify-center mb-4">
                  <div className="px-5 py-1.5 bg-white border-4 border-slate-900 rounded-full font-black text-xs uppercase italic tracking-widest shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] text-slate-900">
                    {gameMessage}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto w-full mb-4">
                  {cards.map(card => (
                    <button
                      key={card.id}
                      onClick={() => onCardClick(card.id)}
                      className={`h-28 rounded-3xl flex flex-col items-center justify-center transition-all border-4 border-slate-900 ${
                        selectedId === card.id 
                        ? 'bg-indigo-600 text-white shadow-none translate-x-[4px] translate-y-[4px]' 
                        : 'bg-white text-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]'
                      }`}
                    >
                      <span className="text-4xl font-black italic">{Number.isInteger(card.val) ? card.val : card.val.toFixed(1)}</span>
                    </button>
                  ))}
                </div>

                <div className="flex justify-center gap-2 mb-4">
                  {['+', '-', '*', '/'].map(op => (
                    <button
                      key={op}
                      onClick={() => { if (selectedId) { setSelectedOp(op); setGameMessage('SECOND NUMBER'); } }}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black border-4 border-slate-900 transition-all ${
                        selectedOp === op 
                        ? 'bg-blue-400 text-slate-900 shadow-none translate-x-[2px] translate-y-[2px]' 
                        : 'bg-white text-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]'
                      }`}
                    >
                      {op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : op}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (history.length > 0) {
                        setCards(history[history.length - 1]);
                        setHistory(history.slice(0, -1));
                        setSelectedId(null);
                        setSelectedOp(null);
                      }
                    }}
                    disabled={history.length === 0}
                    className="flex-1 py-3 bg-white border-4 border-slate-900 rounded-xl font-black text-xs uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] disabled:opacity-30"
                  >
                    <RotateCcw size={16} className="inline mr-1 stroke-[3px]" /> UNDO
                  </button>
                  <button
                    onClick={() => alert(`Hint: ${room?.currentPuzzle?.solutions?.[0]}`)}
                    className="flex-1 py-3 bg-white border-4 border-slate-900 rounded-xl font-black text-xs uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
                  >
                    <Lightbulb size={16} className="inline mr-1 stroke-[3px]" /> HINT
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

