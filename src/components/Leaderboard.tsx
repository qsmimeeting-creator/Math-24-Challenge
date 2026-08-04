/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { ScoreEntry } from '../types';
import { motion } from 'motion/react';
import { ChevronLeft, Trophy, Medal, RefreshCw } from 'lucide-react';

interface Props {
  setView: (view: any) => void;
}

export default function Leaderboard({ setView }: Props) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLeaderboard = async () => {
    setLoading(true);

    // 1. Read local storage
    let localList: ScoreEntry[] = [];
    try {
      const local = localStorage.getItem('math24_leaderboard');
      if (local) {
        localList = JSON.parse(local);
      }
    } catch (e) {
      console.error('Failed to parse local scores', e);
    }

    // 2. Read Firestore
    let fsScores: ScoreEntry[] = [];
    try {
      const snap = await getDocs(collection(db, 'leaderboard'));
      fsScores = snap.docs.map(docSnap => {
        const data = docSnap.data();
        let ts = Date.now();
        if (data.timestamp?.toMillis) {
          ts = data.timestamp.toMillis();
        } else if (typeof data.timestamp === 'number') {
          ts = data.timestamp;
        }
        return {
          id: docSnap.id,
          userId: data.userId || '',
          username: data.username || 'PLAYER',
          score: Number(data.score) || 0,
          time: data.time || 0,
          mode: data.mode || 'time',
          timestamp: ts
        } as ScoreEntry;
      });
    } catch (e) {
      console.warn('Firestore leaderboard query failed:', e);
    }

    // 3. Merge local & Firestore and deduplicate by username (keeping highest score per player)
    const playerBestMap = new Map<string, ScoreEntry>();

    [...fsScores, ...localList].forEach(item => {
      const rawName = (item.username || 'PLAYER').trim();
      const normKey = rawName.toUpperCase();

      const existing = playerBestMap.get(normKey);
      if (!existing) {
        playerBestMap.set(normKey, { ...item, username: rawName });
      } else {
        if (item.score > existing.score) {
          playerBestMap.set(normKey, { ...item, username: rawName });
        } else if (item.score === existing.score) {
          if ((item.timestamp || 0) > (existing.timestamp || 0)) {
            playerBestMap.set(normKey, { ...item, username: rawName });
          }
        }
      }
    });

    let combined = Array.from(playerBestMap.values());

    // 4. Sort descending by score
    combined.sort((a, b) => b.score - a.score);

    setScores(combined.slice(0, 50));
    setLoading(false);
  };

  useEffect(() => {
    loadLeaderboard();
  }, []);

  return (
    <div className="flex-1 flex flex-col p-6">
      <header className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setView('menu')} 
            className="p-2 bg-slate-100 rounded-xl text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
          >
            <ChevronLeft size={20} className="stroke-[3px]" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy size={22} className="text-amber-500 stroke-[3px]" />
            <h1 className="text-xl font-black text-slate-900 italic tracking-tighter uppercase">LEADERBOARD</h1>
          </div>
        </div>
        <button
          onClick={loadLeaderboard}
          className="p-2 bg-indigo-100 text-indigo-700 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
          title="รีเฟรชตารางคะแนน"
        >
          <RefreshCw size={18} className={`stroke-[3px] ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">กำลังโหลดตารางคะแนน...</span>
          </div>
        ) : scores.length === 0 ? (
          <div className="text-center py-16 bg-white border-4 border-slate-900 rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]">
            <Trophy size={48} className="text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-black text-slate-900 uppercase italic mb-1">ยังไม่มีข้อมูลคะแนน</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">มาร่วมเป็นคนแรกที่เล่นและบันทึกคะแนน!</p>
          </div>
        ) : (
          scores.map((score, index) => {
            const isTop3 = index < 3;
            const badgeBg = index === 0 ? 'bg-amber-400 text-slate-900' : index === 1 ? 'bg-slate-300 text-slate-900' : index === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-800';

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
                key={score.id || `${score.username}-${index}`}
                className={`flex items-center gap-3 p-3.5 bg-white border-4 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] ${isTop3 ? 'ring-2 ring-indigo-500/20' : ''}`}
              >
                <div className={`w-9 h-9 rounded-xl border-2 border-slate-900 flex items-center justify-center font-black text-sm italic ${badgeBg} shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]`}>
                  {index + 1}
                </div>

                <div className="flex-1 truncate">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight italic truncate">
                      {score.username}
                    </h3>
                    {isTop3 && <Medal size={16} className={index === 0 ? 'text-amber-500' : index === 1 ? 'text-slate-400' : 'text-amber-700'} />}
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    {score.timestamp ? new Date(score.timestamp).toLocaleDateString('th-TH') : 'วันนี้'}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-indigo-600 font-black text-lg italic leading-none">{score.score}</div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PTS</div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
