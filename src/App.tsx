/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from './types';
import Auth from './components/Auth';
import Menu from './components/Menu';
import Game from './components/Game';
import Leaderboard from './components/Leaderboard';
import Multiplayer from './components/Multiplayer';
import { motion, AnimatePresence } from 'motion/react';

type View = 'menu' | 'game' | 'leaderboard' | 'multiplayer' | 'settings';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<View>('menu');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved user or guest profile in localStorage
    const saved = localStorage.getItem('math24_user_profile') || localStorage.getItem('math24_guest_profile');
    if (saved) {
      try {
        const loadedProfile = JSON.parse(saved);
        setProfile(loadedProfile);
      } catch (e) {
        localStorage.removeItem('math24_user_profile');
        localStorage.removeItem('math24_guest_profile');
      }
    }
    setLoading(false);

    // Optional Firebase listener if user is logged in via Auth
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: user.uid,
              username: user.displayName || 'Player',
              avatar: user.photoURL || '',
              bestScore: 0,
              bestTime: 0,
              createdAt: Date.now()
            };
            await setDoc(docRef, newProfile).catch(() => {});
            setProfile(newProfile);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem('math24_user_profile', JSON.stringify(newProfile));
  };

  const handleLogout = () => {
    localStorage.removeItem('math24_user_profile');
    localStorage.removeItem('math24_guest_profile');
    setProfile(null);
    auth.signOut().catch(() => {});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-yellow-400 flex flex-col items-center justify-center p-8">
        <div className="relative">
          <div className="w-24 h-24 border-8 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-black italic">24</span>
          </div>
        </div>
        <p className="mt-8 text-slate-900 font-black uppercase tracking-[0.3em] italic animate-pulse">
          Loading...
        </p>
      </div>
    );
  }

  if (!profile) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-yellow-400 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white">
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.2 }}
          className="max-w-md mx-auto min-h-screen flex flex-col"
        >
          {view === 'menu' && <Menu setView={setView} profile={profile} onLogout={handleLogout} />}
          {view === 'game' && <Game setView={setView} profile={profile} />}
          {view === 'leaderboard' && <Leaderboard setView={setView} />}
          {view === 'multiplayer' && <Multiplayer setView={setView} profile={profile} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
