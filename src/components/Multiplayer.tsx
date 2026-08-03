/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, updateDoc, onSnapshot, collection, getDocs, query, limit } from 'firebase/firestore';
import { UserProfile, Room, Player } from '../types';
import { Math24Solver } from '../utils/math24';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Users, Play, Trophy, RefreshCw, CheckCircle, RotateCcw, Clock, Crown, Medal, Award, SkipForward } from 'lucide-react';

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
  const [selectedTimeLimit, setSelectedTimeLimit] = useState<number>(60);

  // In-game board state
  const [cards, setCards] = useState<Card[]>([]);
  const [history, setHistory] = useState<Card[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOp, setSelectedOp] = useState<string | null>(null);
  const [gameMessage, setGameMessage] = useState('FIRST NUMBER');
  const [solvedNotice, setSolvedNotice] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const username = profile?.username || 'PLAYER';
  const userId = profile?.uid || `guest_${Math.random().toString(36).substring(2, 8)}`;

  const isHost = room 
    ? (room.hostId ? room.hostId === userId : room.players?.[0]?.uid === userId) 
    : false;

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

        if (data.timeLimit) {
          setSelectedTimeLimit(data.timeLimit);
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

  // Sync initial board cards when game starts
  useEffect(() => {
    if (room?.status === 'playing' && room.currentPuzzle?.numbers && room.gameStartTime) {
      const newNums = room.currentPuzzle.numbers;
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
  }, [room?.status, room?.gameStartTime]);

  // Countdown timer effect during 'playing' state
  useEffect(() => {
    if (room?.status !== 'playing' || !room.gameStartTime || !currentRoomId) return;

    const limitSecs = room.timeLimit || selectedTimeLimit || 60;
    const storageKey = `game_start_time_${currentRoomId}_${room.gameStartTime}`;

    let localStartMs = sessionStorage.getItem(storageKey);
    if (!localStartMs) {
      localStartMs = Date.now().toString();
      sessionStorage.setItem(storageKey, localStartMs);
    }
    const localStart = Number(localStartMs);

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - localStart) / 1000);
      const remaining = Math.max(0, limitSecs - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0 && room.status === 'playing' && isHost) {
        // Host marks room as finished
        updateDoc(doc(db, 'rooms', currentRoomId), {
          status: 'finished'
        }).catch(console.error);
      }
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 200);

    return () => clearInterval(timerInterval);
  }, [room?.status, room?.gameStartTime, room?.timeLimit, currentRoomId, selectedTimeLimit, isHost]);

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
      timeLimit: selectedTimeLimit,
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

  const changeTimeLimit = async (newLimit: number) => {
    setSelectedTimeLimit(newLimit);
    if (currentRoomId && room) {
      try {
        await updateDoc(doc(db, 'rooms', currentRoomId), {
          timeLimit: newLimit
        });
      } catch (e) {
        console.error('Failed to update time limit:', e);
      }
    }
  };

  const startGameByHost = async () => {
    if (!currentRoomId || !room) return;
    if (room.players.length < 2) {
      setErrorMsg('ต้องมีผู้เล่นอย่างน้อย 2 คนเพื่อเริ่มเกม');
      return;
    }

    const allReady = room.players.every(p => p.isReady);
    if (!allReady) {
      setErrorMsg('ผู้เล่นทุกคนต้องกดพร้อมเล่น (READY) ก่อนเริ่มเกม');
      return;
    }

    const effectiveTimeLimit = room.timeLimit || selectedTimeLimit || 60;

    try {
      await updateDoc(doc(db, 'rooms', currentRoomId), {
        status: 'playing',
        gameStartTime: Date.now(),
        timeLimit: effectiveTimeLimit
      });
      setTimeLeft(effectiveTimeLimit);
    } catch (e) {
      console.error('Failed to start game:', e);
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

    try {
      await updateDoc(doc(db, 'rooms', currentRoomId), {
        players: updatedPlayers
      });
    } catch (e) {
      console.error('Failed to update ready state:', e);
    }
  };

  const resetMatchToLobby = async () => {
    if (!currentRoomId || !room) return;
    const puzzle = Math24Solver.generateSolvable();
    const resetPlayers = room.players.map(p => ({
      ...p,
      score: 0,
      isReady: false
    }));

    try {
      await updateDoc(doc(db, 'rooms', currentRoomId), {
        status: 'waiting',
        players: resetPlayers,
        currentPuzzle: {
          numbers: puzzle.numbers,
          solutions: puzzle.solutions
        },
        gameStartTime: null
      });
    } catch (e) {
      console.error('Failed to reset room:', e);
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

    setSolvedNotice('🎉 PERFECT 24! (+10 POINTS)');

    const updatedPlayers = room.players.map(p => {
      if (p.uid === userId) {
        return { ...p, score: p.score + 10 };
      }
      return p;
    });

    try {
      await updateDoc(doc(db, 'rooms', currentRoomId), {
        players: updatedPlayers
      });
    } catch (e) {
      console.error('Failed to submit score:', e);
    }

    // Generate new puzzle for this player locally
    const nextPuzzle = Math24Solver.generateSolvable();
    setCards(nextPuzzle.numbers.map((n, i) => ({
      id: `card-${i}`,
      val: n,
      expr: `${n}`
    })));
    setHistory([]);
    setSelectedId(null);
    setSelectedOp(null);
    setGameMessage('FIRST NUMBER');

    setTimeout(() => {
      setSolvedNotice(null);
    }, 1800);
  };

  const handleSkip = () => {
    // Generate new puzzle specifically for the player who pressed SKIP
    const nextPuzzle = Math24Solver.generateSolvable();
    setCards(nextPuzzle.numbers.map((n, i) => ({
      id: `card-${i}`,
      val: n,
      expr: `${n}`
    })));
    setHistory([]);
    setSelectedId(null);
    setSelectedOp(null);
    setGameMessage('FIRST NUMBER');

    setSolvedNotice('⏩ ข้ามโจทย์แล้ว (SKIPPED)');
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
  const sortedPlayers = room?.players ? [...room.players].sort((a, b) => b.score - a.score) : [];

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
            <div className="text-center bg-white border-4 border-slate-900 p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] mb-4">
              <div className="w-16 h-16 bg-emerald-400 border-4 border-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                <Users size={32} className="text-slate-900" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-1 uppercase tracking-tight italic">CREATE OR JOIN</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 leading-relaxed">Enter a room code to battle in real-time online</p>
            </div>

            {/* Time Selection Before Room Creation */}
            <div className="bg-white border-4 border-slate-900 p-4 rounded-3xl shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-indigo-600 stroke-[3px]" />
                <span className="text-xs font-black text-slate-900 uppercase italic">กำหนดเวลาการแข่งขัน (TIME LIMIT)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[60, 120, 180].map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSelectedTimeLimit(sec)}
                    className={`py-2.5 rounded-xl border-3 border-slate-900 font-black text-xs uppercase tracking-wider transition-all italic ${
                      selectedTimeLimit === sec 
                        ? 'bg-indigo-600 text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] translate-x-[-1px] translate-y-[-1px]' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {sec} วินาที
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 mb-4">
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
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
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
            <div className="flex items-center justify-between mb-3 p-3 bg-white rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest">CODE:</div>
                  <div className="text-lg font-black text-indigo-600 italic tracking-wider leading-none">{room?.id}</div>
                </div>
                <button 
                  onClick={copyRoomCode} 
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-900 rounded-lg text-[10px] font-black uppercase transition-all"
                  title="Copy Room Code"
                >
                  {copiedCode ? 'คัดลอกแล้ว!' : 'คัดลอก'}
                </button>
              </div>

              {room?.status === 'playing' ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500 text-white font-black rounded-full border-2 border-slate-900 text-xs italic shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                  <Clock size={14} className="stroke-[3px] animate-pulse" />
                  <span>{timeLeft}s</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-3 py-1 bg-emerald-400 text-slate-900 font-black rounded-full border-2 border-slate-900 text-xs italic">
                  <Clock size={12} className="stroke-[3px]" />
                  <span>{room?.timeLimit || 60}s</span>
                </div>
              )}
            </div>

            {/* Players scoreboard */}
            <div className="bg-white border-4 border-slate-900 p-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">PLAYERS ({room?.players.length || 0})</span>
                <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-900 uppercase">เวลา {room?.timeLimit || 60} วินาที</span>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto">
                {room?.players.map((p) => (
                  <div key={p.uid} className="flex items-center justify-between p-2 bg-slate-50 border-2 border-slate-900 rounded-xl">
                    <div className="flex items-center gap-1.5 truncate">
                      <div className="w-6 h-6 bg-yellow-400 border-2 border-slate-900 rounded-full flex items-center justify-center font-black text-slate-900 text-[9px] italic flex-shrink-0">
                        {p.username[0]}
                      </div>
                      <span className="font-black text-slate-900 text-xs uppercase italic truncate">{p.username}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="font-black text-indigo-600 text-xs italic">{p.score} pt</span>
                      {p.isReady && <CheckCircle size={13} className="text-emerald-500 stroke-[3px]" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Main view: waiting vs playing vs finished */}
            {room?.status === 'finished' ? (
              /* Finished / Ranking Results View */
              <div className="flex-1 flex flex-col justify-between my-2 bg-white border-4 border-slate-900 p-5 rounded-3xl shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] text-center overflow-y-auto">
                <div>
                  <div className="w-16 h-16 bg-amber-400 border-4 border-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                    <Crown size={38} className="text-slate-900 stroke-[2.5px]" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-1 italic tracking-tighter uppercase">จบการแข่งขัน!</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">สรุปคะแนนและลำดับผู้ชนะ</p>

                  {/* Top Winner Card */}
                  {sortedPlayers.length > 0 && (
                    <div className="bg-amber-100 border-4 border-slate-900 p-4 rounded-2xl mb-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center gap-3">
                      <div className="w-12 h-12 bg-amber-400 border-3 border-slate-900 rounded-xl flex items-center justify-center font-black text-2xl text-slate-900 italic shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                        🏆
                      </div>
                      <div className="text-left truncate">
                        <div className="text-[10px] font-black text-amber-800 uppercase tracking-widest">ผู้ชนะเลิศ (WINNER)</div>
                        <div className="text-lg font-black text-slate-900 uppercase italic truncate">{sortedPlayers[0].username}</div>
                        <div className="text-sm font-black text-indigo-600 italic">{sortedPlayers[0].score} PTS</div>
                      </div>
                    </div>
                  )}

                  {/* All players list */}
                  <div className="space-y-2 mb-4">
                    {sortedPlayers.map((p, idx) => {
                      const badgeBg = idx === 0 ? 'bg-amber-400 text-slate-900' : idx === 1 ? 'bg-slate-300 text-slate-900' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-800';
                      return (
                        <div key={p.uid} className="flex items-center justify-between p-2.5 bg-slate-50 border-2 border-slate-900 rounded-xl">
                          <div className="flex items-center gap-2 truncate">
                            <span className={`w-7 h-7 rounded-lg border-2 border-slate-900 flex items-center justify-center font-black text-xs italic ${badgeBg}`}>
                              #{idx + 1}
                            </span>
                            <span className="font-black text-slate-900 text-sm uppercase italic truncate">
                              {p.username} {p.uid === userId ? '(คุณ)' : ''}
                            </span>
                          </div>
                          <div className="text-right font-black text-indigo-600 italic text-base">
                            {p.score} PTS
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={leaveRoom}
                    className="w-full bg-slate-200 text-slate-800 font-black py-3.5 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] text-xs uppercase tracking-wider"
                  >
                    ออกจากห้อง
                  </button>
                  <button
                    onClick={resetMatchToLobby}
                    className="w-full bg-indigo-600 text-white font-black py-3.5 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] text-xs uppercase tracking-wider italic"
                  >
                    เล่นอีกรอบ
                  </button>
                </div>
              </div>
            ) : room?.status === 'waiting' ? (
              <div className="flex-1 flex flex-col justify-between my-2 bg-white border-4 border-slate-900 p-5 rounded-3xl shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] text-center overflow-y-auto">
                <div>
                  <div className="w-14 h-14 bg-indigo-100 border-4 border-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                    <Users size={32} className="text-indigo-600 stroke-[2.5px]" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-1 uppercase tracking-tight italic">ห้องรอผู้เล่น (LOBBY)</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    แชร์รหัสห้อง <span className="text-indigo-600 font-black">{room?.id}</span> ให้เพื่อนเข้าร่วม
                  </p>

                  {/* Players list with ready status */}
                  <div className="bg-slate-50 border-3 border-slate-900 p-3 rounded-2xl mb-3 text-left">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-900 uppercase italic flex items-center gap-1.5">
                        <Users size={14} className="text-indigo-600 stroke-[3px]" />
                        รายชื่อผู้เล่น ({room?.players.length || 0}):
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {room?.players.map((p) => (
                        <div key={p.uid} className="flex items-center justify-between bg-white border-2 border-slate-900 px-3 py-1.5 rounded-xl">
                          <span className="text-xs font-black text-slate-900 truncate flex items-center gap-1">
                            {p.username} {p.uid === room.hostId ? '👑' : ''} {p.uid === userId ? '(คุณ)' : ''}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border italic ${
                            p.isReady
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                              : 'bg-amber-50 text-amber-700 border-amber-300'
                          }`}>
                            {p.isReady ? 'พร้อมแล้ว ✓' : 'ยังไม่พร้อม ⏳'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Time Limit Settings in Waiting Room */}
                  <div className="bg-slate-50 border-3 border-slate-900 p-3 rounded-2xl mb-3 text-left">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-slate-900 uppercase italic flex items-center gap-1.5">
                        <Clock size={14} className="text-indigo-600 stroke-[3px]" />
                        เวลาการแข่งขัน:
                      </span>
                      <span className="text-xs font-black text-indigo-600 italic bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                        {room?.timeLimit || selectedTimeLimit || 60} วินาที
                      </span>
                    </div>
                    {isHost ? (
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        {[60, 120, 180].map(sec => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => changeTimeLimit(sec)}
                            className={`py-1.5 rounded-lg border-2 border-slate-900 font-black text-[11px] uppercase tracking-wider transition-all italic ${
                              (room?.timeLimit || selectedTimeLimit) === sec
                                ? 'bg-indigo-600 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                                : 'bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {sec}s
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 font-bold">
                        (ผู้สร้างห้องกำหนดเวลาการแข่งขัน)
                      </p>
                    )}
                  </div>

                  {(room?.players.length || 0) < 2 ? (
                    <div className="text-xs font-black text-amber-800 bg-amber-50 border-2 border-amber-400 p-2.5 rounded-xl mb-3 animate-pulse">
                      ⚠️ ต้องมีผู้เล่นอย่างน้อย 2 คนขึ้นไปเพื่อเริ่มเกม
                    </div>
                  ) : !room?.players.every(p => p.isReady) ? (
                    <div className="text-xs font-black text-amber-800 bg-amber-50 border-2 border-amber-400 p-2.5 rounded-xl mb-3">
                      ⏳ รอผู้เล่นทุกคนกด "พร้อมเล่นแล้ว" (READY) ก่อนเริ่มเกม
                    </div>
                  ) : (
                    <div className="text-xs font-black text-emerald-800 bg-emerald-50 border-2 border-emerald-400 p-2.5 rounded-xl mb-3">
                      ✅ ทุกคนพร้อมเล่นแล้ว! กดเริ่มเกมส์ได้เลย
                    </div>
                  )}
                </div>

                <div className="w-full space-y-2.5 pt-2">
                  {/* Ready Toggle */}
                  <button
                    onClick={toggleReady}
                    className={`w-full flex items-center justify-center gap-2 font-black py-3 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] uppercase tracking-wider italic text-sm ${
                      myPlayerState?.isReady ? 'bg-emerald-400 text-slate-900' : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    <CheckCircle size={18} className="stroke-[3px]" />
                    {myPlayerState?.isReady ? 'สถานะ: พร้อมเล่นแล้ว ✓' : 'กดปุ่มเพื่อเตรียมพร้อม (READY)'}
                  </button>

                  {/* Start Game Button (Host Only) */}
                  {isHost ? (
                    <button
                      onClick={startGameByHost}
                      disabled={(room?.players.length || 0) < 2 || !room?.players.every(p => p.isReady)}
                      className="w-full flex items-center justify-center gap-2 font-black py-3.5 rounded-2xl border-4 border-slate-900 bg-indigo-600 text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] uppercase tracking-wider italic text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Play size={20} fill="currentColor" className="stroke-[3px]" />
                      🚀 เริ่มเกมส์ (START GAME)
                    </button>
                  ) : (
                    <div className="p-3 bg-amber-50 border-2 border-slate-900 rounded-xl text-xs font-black text-slate-700 italic">
                      ⏳ รอผู้สร้างห้องกด "เริ่มเกมส์"
                    </div>
                  )}
                </div>
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
                    onClick={handleSkip}
                    className="flex-1 py-3 bg-white border-4 border-slate-900 rounded-xl font-black text-xs uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                  >
                    <SkipForward size={16} className="inline mr-1 stroke-[3px]" /> SKIP (ข้าม)
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


