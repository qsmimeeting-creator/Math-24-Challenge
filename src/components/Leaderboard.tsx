/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { ScoreEntry } from '../types';
import { motion } from 'motion/react';
import { ChevronLeft, Trophy, Medal } from 'lucide-react';

interface Props {
  setView: (view: any) => void;
}

export default function Leaderboard({ setView }: Props) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Load local scores immediately
    let initialList: ScoreEntry[] = [];
    try {
      const local = localStorage.getItem('math24_leaderboard');
      if (local) {
        initialList = JSON.parse(local);
      }
    } catch (e) {
      console.error('Failed to parse local scores', e);
    }

    if (initialList.length > 0) {
      initialList.sort((a, b) => b.score - a.score);
      setScores(initialList.slice(0, 20));
      setLoading(false);
    }

    // Safety timeout to turn off loading after 2 seconds
    const timeoutTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 2000);

    const fetchScores = async () => {
      let list = [...initialList];

      try {
        const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(20));
        const querySnapshot = await getDocs(q);
        const fsScores = querySnapshot.docs.map(doc => {
          const data = doc.data();
          let ts = Date.now();
          if (data.timestamp?.toMillis) {
            ts = data.timestamp.toMillis();
          } else if (typeof data.timestamp === 'number') {
            ts = data.timestamp;
          }
          return {
            id: doc.id,
            userId: data.userId || '',
            username: data.username || 'PLAYER',
            score: data.score || 0,
            time: data.time || 0,
            mode: data.mode || 'time',
            timestamp: ts
          } as ScoreEntry;
        });

        // Merge local & firestore
        const mergedMap = new Map<string, ScoreEntry>();
        [...list, ...fsScores].forEach(item => {
          const key = item.id || `${item.username}-${item.score}-${item.timestamp}`;
          if (!mergedMap.has(key)) {
            mergedMap.set(key, item);
          }
        });
        list = Array.from(mergedMap.values());
      } catch (e) {
        console.warn('Firestore leaderboard query failed, using local fallback:', e);
      }

      if (list.length === 0) {
        list = [
          { id: 'def-1', userId: 'd1', username: 'MATH_GENIUS', score: 25, time: 45, mode: 'time', timestamp: Date.now() - 86400000 },
          { id: 'def-2', userId: 'd2', username: 'SPEED_CALC', score: 18, time: 50, mode: 'time', timestamp: Date.now() - 43200000 },
          { id: 'def-3', userId: 'd3', username: 'NUMBER_PRO', score: 12, time: 60, mode: 'time', timestamp: Date.now() - 3600000 },
        ];
      }

      list.sort((a, b) => b.score - a.score);
      if (isMounted) {
        setScores(list.slice(0, 20));
        setLoading(false);
      }
    };

    fetchScores();

    return () => {
      isMounted = false;
      clearTimeout(timeoutTimer);
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col p-6">
      <header className="flex items-center gap-4 mb-8 bg-white p-4 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
        <button onClick={() => setView('menu')} className="p-2 bg-slate-100 rounded-xl text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]">
          <ChevronLeft size={20} className="stroke-[3px]" />
        </button>
        <h1 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">LEADERBOARD</h1>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : scores.length === 0 ? (
          <div className="text-center py-10 text-slate-500 font-bold uppercase tracking-widest italic">No Records Found</div>
        ) : (
          scores.map((score, index) => (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              key={score.id}
              className="flex items-center gap-4 p-4 bg-white border-4 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
            >
              <div className="w-10 h-10 rounded-full border-2 border-slate-900 flex items-center justify-center font-black text-slate-900 italic bg-yellow-400">
                {index + 1}
              </div>
              <div className="flex-1">
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight italic">{score.username}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(score.timestamp).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <div className="text-indigo-600 font-black text-lg italic leading-none">{score.score}</div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PTS</div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
