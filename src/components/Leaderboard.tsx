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
    const fetchScores = async () => {
      try {
        const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(20));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScoreEntry));
        setScores(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
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
