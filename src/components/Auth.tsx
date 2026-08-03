/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { signInAnonymously, updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import { useState, FormEvent } from 'react';

export default function Auth() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || loading) return;

    setLoading(true);
    setError(null);
    try {
      // Try to sign in anonymously
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;
      
      await updateProfile(user, {
        displayName: username.trim()
      });

      await user.reload();
      // App.tsx will pick up the auth state change
    } catch (err: any) {
      console.error('Firebase Auth failed, entering Guest Mode:', err);
      
      // Fallback to Guest Mode if Auth fails
      const guestId = `guest-${Math.random().toString(36).substring(2, 11)}`;
      const guestProfile = {
        uid: guestId,
        username: username.trim(),
        isGuest: true,
        avatar: '',
        bestScore: 0,
        bestTime: 0,
        createdAt: Date.now()
      };
      
      // Store in localStorage for persistence
      localStorage.setItem('math24_guest_profile', JSON.stringify(guestProfile));
      
      // We need a way to tell App.tsx to use this guest profile
      // We'll use a custom event or just window reload if needed, 
      // but better to use a global state or just a simple callback if Auth.tsx had one.
      // Since Auth.tsx is rendered by App.tsx when profile is null, we can't easily pass it back 
      // without changing App.tsx props.
      
      // Let's trigger a page reload to let App.tsx pick up the localStorage guest profile
      window.location.reload();
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
        
        {error && (
          <div className="mb-6 p-4 bg-rose-100 border-4 border-rose-500 rounded-2xl text-rose-700 text-[10px] font-black uppercase tracking-widest italic leading-relaxed">
            {error}
          </div>
        )}

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
