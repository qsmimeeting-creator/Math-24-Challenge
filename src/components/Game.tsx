/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, RotateCcw, Lightbulb, SkipForward, Clock, Trophy, Flame, Hash } from 'lucide-react';
import { Math24Solver } from '../utils/math24';
import { UserProfile } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface Props {
  setView: (view: any) => void;
  profile: UserProfile | null;
}

interface Card {
  id: string;
  val: number;
  expr: string;
}

export default function Game({ setView, profile }: Props) {
  const [initialNums, setInitialNums] = useState<number[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [history, setHistory] = useState<Card[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOp, setSelectedOp] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isGameOver, setIsGameOver] = useState(false);
  const [message, setMessage] = useState('FIRST NUMBER');
  const [solution, setSolution] = useState<string | null>(null);

  useEffect(() => {
    startNewPuzzle();
  }, []);

  useEffect(() => {
    if (timerEnabled && timeLeft > 0 && !isGameOver) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timerEnabled && timeLeft === 0 && !isGameOver) {
      handleGameOver();
    }
  }, [timeLeft, isGameOver, timerEnabled]);

  const startNewPuzzle = () => {
    setIsGameOver(false);
    const { numbers, solutions } = Math24Solver.generateSolvable();
    setInitialNums(numbers);
    setSolution(solutions[0]);
    resetBoard(numbers);
  };

  const setupCustomPuzzle = () => {
    const input = window.prompt('Enter 4 numbers (e.g. 3,8,3,1)');
    if (input) {
      const nums = input.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 9);
      if (nums.length === 4) {
        const solutions = Math24Solver.solve(nums);
        if (solutions.length > 0) {
          setInitialNums(nums);
          setSolution(solutions[0]);
          resetBoard(nums);
        } else {
          alert('No solution found for these numbers.');
        }
      } else {
        alert('Please enter 4 numbers between 1-9.');
      }
    }
  };

  const resetBoard = (nums: number[]) => {
    const newCards = nums.map((n, i) => ({
      id: `card-${Date.now()}-${i}`,
      val: n,
      expr: `${n}`
    }));
    setCards(newCards);
    setHistory([]);
    setSelectedId(null);
    setSelectedOp(null);
    setMessage('FIRST NUMBER');
  };

  const onCardClick = (id: string) => {
    if (selectedId === null) {
      setSelectedId(id);
      setMessage('SELECT OPERATOR');
    } else if (selectedId === id && !selectedOp) {
      setSelectedId(null);
      setMessage('FIRST NUMBER');
    } else if (selectedId && selectedOp && selectedId !== id) {
      combine(selectedId, id, selectedOp);
    } else if (selectedId && !selectedOp && selectedId !== id) {
      setSelectedId(id);
    }
  };

  const combine = (id1: string, id2: string, op: string) => {
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
      id: `card-${Date.now()}-res`,
      val: res,
      expr: `(${c1.expr} ${op} ${c2.expr})`
    };

    const nextCards = cards.filter(c => c.id !== id1 && c.id !== id2);
    nextCards.push(newCard);
    
    setCards(nextCards);
    setSelectedId(null);
    setSelectedOp(null);
    setMessage('NEXT MOVE');

    if (nextCards.length === 1) {
      if (Math.abs(nextCards[0].val - 24) < 1e-6) {
        handleSuccess();
      } else {
        setMessage('NOT 24! UNDO?');
      }
    }
  };

  const handleSuccess = async () => {
    setScore(prev => prev + 100 + streak * 10);
    setStreak(prev => prev + 1);
    if (timerEnabled) {
      setTimeLeft(prev => prev + 15);
    }
    setMessage('SOLVED! PERFECT');
    
    setTimeout(() => {
      startNewPuzzle();
    }, 1000);
  };

  const handleGameOver = async () => {
    setIsGameOver(true);
    const finalScore = score;
    const currentUsername = profile?.username || 'PLAYER';
    const currentUid = profile?.uid || 'guest';

    const newScoreEntry = {
      id: `score_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUid,
      username: currentUsername,
      score: finalScore,
      time: timerEnabled ? Math.max(0, 60 - timeLeft) : 0,
      mode: timerEnabled ? 'time' : 'untimed',
      timestamp: Date.now()
    };

    // Save to local storage
    try {
      const existing = JSON.parse(localStorage.getItem('math24_leaderboard') || '[]');
      existing.push(newScoreEntry);
      existing.sort((a: any, b: any) => b.score - a.score);
      localStorage.setItem('math24_leaderboard', JSON.stringify(existing.slice(0, 50)));
    } catch (e) {
      console.error('Failed to save to local storage', e);
    }

    // Also attempt Firestore save
    if (profile && finalScore > 0) {
      try {
        await addDoc(collection(db, 'leaderboard'), {
          userId: currentUid,
          username: currentUsername,
          score: finalScore,
          time: timerEnabled ? Math.max(0, 60 - timeLeft) : 0,
          mode: timerEnabled ? 'time' : 'untimed',
          timestamp: serverTimestamp()
        });
      } catch (err) {
        console.warn('Firestore write failed, saved locally:', err);
      }
    }
  };

  const undo = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setCards(prev);
      setHistory(history.slice(0, -1));
      setSelectedId(null);
      setSelectedOp(null);
      setMessage('FIRST NUMBER');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6">
      <header className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
        <button onClick={() => setView('menu')} className="p-2 bg-slate-100 rounded-xl text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]">
          <ChevronLeft size={20} className="stroke-[3px]" />
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTimerEnabled(!timerEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-900 font-black text-xs uppercase transition-all shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] ${
              timerEnabled ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-700'
            }`}
            title="Toggle Timer ON/OFF"
          >
            <Clock size={16} className="stroke-[3px]" />
            <span>{timerEnabled ? `${timeLeft}s` : 'TIMER: OFF'}</span>
          </button>
          <Stat icon={<Trophy size={16} className="text-amber-500 stroke-[3px]" />} label="Score" value={score} />
        </div>
      </header>

      <div className="mb-8">
        <div className="flex justify-center mb-6">
          <div className="px-6 py-2 bg-white border-4 border-slate-900 rounded-full font-black text-xs uppercase italic tracking-widest shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] text-slate-900">
            {message}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-5 max-w-sm mx-auto">
          {cards.map(card => (
            <motion.button
              key={card.id}
              layoutId={card.id}
              onClick={() => onCardClick(card.id)}
              className={`h-32 rounded-3xl flex flex-col items-center justify-center transition-all border-4 border-slate-900 ${
                selectedId === card.id 
                ? 'bg-indigo-600 text-white shadow-none translate-x-[6px] translate-y-[6px]' 
                : 'bg-white text-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]'
              }`}
            >
              <span className="text-5xl font-black italic">{Number.isInteger(card.val) ? card.val : card.val.toFixed(1)}</span>
              {card.expr !== `${card.val}` && (
                <span className="text-[9px] font-bold uppercase tracking-tighter opacity-50 mt-1 max-w-[120px] truncate">{card.expr}</span>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-3 mb-10">
        {['+', '-', '*', '/'].map(op => (
          <button
            key={op}
            onClick={() => { if (selectedId) { setSelectedOp(op); setMessage('SECOND NUMBER'); } }}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black border-4 border-slate-900 transition-all ${
              selectedOp === op 
              ? 'bg-blue-400 text-slate-900 shadow-none translate-x-[4px] translate-y-[4px]' 
              : 'bg-white text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]'
            }`}
          >
            {op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : op}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-auto">
        <ActionButton icon={<RotateCcw size={18} className="stroke-[3px]" />} label="UNDO" onClick={undo} disabled={history.length === 0} color="bg-white" />
        <ActionButton icon={<Lightbulb size={18} className="stroke-[3px]" />} label="HINT" onClick={() => alert(`Hint: ${solution}`)} color="bg-white" />
        <ActionButton icon={<SkipForward size={18} className="stroke-[3px]" />} label="SKIP" onClick={startNewPuzzle} color="bg-white" />
        {score > 0 ? (
          <ActionButton icon={<Trophy size={18} className="stroke-[3px] text-amber-500" />} label="FINISH" onClick={handleGameOver} color="bg-amber-100 text-amber-900 border-amber-900" />
        ) : (
          <ActionButton icon={<Hash size={18} className="stroke-[3px]" />} label="CUSTOM" onClick={setupCustomPuzzle} color="bg-white" />
        )}
      </div>

      {isGameOver && (
        <div className="fixed inset-0 bg-yellow-400/90 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <div className="bg-white border-8 border-slate-900 p-8 rounded-[40px] w-full text-center shadow-[16px_16px_0px_0px_rgba(15,23,42,1)]">
            <Trophy size={80} className="text-amber-500 mx-auto mb-4 drop-shadow-[4px_4px_0px_rgba(15,23,42,1)]" />
            <h2 className="text-4xl font-black text-slate-900 mb-2 italic tracking-tighter uppercase">
              {timerEnabled ? 'TIME OVER!' : 'GAME FINISHED!'}
            </h2>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-8">
              FINAL SCORE: <span className="text-indigo-600 font-black text-xl">{score}</span>
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => { setIsGameOver(false); setScore(0); setTimeLeft(60); startNewPuzzle(); }}
                className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] text-lg uppercase tracking-widest italic"
              >
                PLAY AGAIN
              </button>
              <button 
                onClick={() => setView('leaderboard')}
                className="w-full bg-amber-400 text-slate-900 font-black py-4 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] text-lg uppercase tracking-widest"
              >
                VIEW LEADERBOARD
              </button>
              <button 
                onClick={() => setView('menu')}
                className="w-full bg-white text-slate-900 font-black py-4 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] text-base uppercase tracking-widest"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: any) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{label}</span>
      </div>
      <span className="text-xl font-black text-slate-900 italic font-mono">{value}</span>
    </div>
  );
}

function ActionButton({ icon, label, onClick, disabled, color }: any) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center justify-center gap-2 py-4 px-4 ${color} border-4 border-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all active:shadow-none active:translate-x-[4px] active:translate-y-[4px] disabled:opacity-30 disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-none text-slate-900`}
    >
      {icon}
      {label}
    </button>
  );
}
