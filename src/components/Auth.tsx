/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { signInAnonymously, updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import { useState, FormEvent } from 'react';
import { UserProfile } from '../types';

interface Props {
  onLogin?: (profile: UserProfile) => void;
}

export default function Auth({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStart = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = username.trim().toUpperCase();
    if (!trimmedName || loading) return;

    setLoading(true);

    const newProfile: UserProfile = {
      uid: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: trimmedName,
      avatar: '',
      bestScore: 0,
      bestTime: 0,
      createdAt: Date.now()
    };

    // Save locally
    localStorage.setItem('math24_user_profile', JSON.stringify(newProfile));

    // Try background Firebase anonymous sign-in if supported
    try {
      const userCredential = await signInAnonymously(auth);
      if (userCredential.user) {
        newProfile.uid = userCredential.user.uid;
        await updateProfile(userCredential.user, { displayName: trimmedName });
        localStorage.setItem('math24_user_profile', JSON.stringify(newProfile));
      }
    } catch (err) {
      console.log('Firebase Auth not available, proceeding with local profile:', err);
    }

    setLoading(false);
    if (onLogin) {
      onLogin(newProfile);
    }
  };

  return (
    <div className="min-h-screen bg-yellow-400 flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <div className="w-24 h-24 bg-white border-4 border-slate-900 rounded-[32px] flex items-center justify-center text-5xl font-black mb-8 mx-auto shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] text-indigo-600 italic">
          24
        </div>
        <h1 className="text-5xl font-black text-slate-900 mb-2 tracking-tighter italic uppercase leading-none">
          MATH<span className="text-rose-500">24</span>
        </h1>
        <p className="text-slate-800 font-bold uppercase tracking-widest text-xs mb-10">The Ultimate Calculation Challenge</p>

        <form onSubmit={handleStart} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="ENTER YOUR NAME"
              value={username}
              onChange={(e) => setUsername(e.target.value.toUpperCase())}
              className="w-full bg-white border-4 border-slate-900 p-5 rounded-2xl text-slate-900 font-black placeholder:text-slate-300 focus:outline-none focus:border-indigo-600 transition-colors shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] uppercase tracking-widest"
              maxLength={12}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white font-black py-5 px-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none uppercase tracking-widest italic text-xl disabled:opacity-50"
          >
            {loading ? (
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Play size={24} fill="currentColor" className="stroke-[2px]" />
                START GAME
              </>
            )}
          </button>
        </form>
        
        <div className="mt-16 text-[10px] text-slate-900 uppercase font-black tracking-widest opacity-30 max-w-[280px] mx-auto">
          No Registration Required
        </div>
      </motion.div>
    </div>
  );
}
