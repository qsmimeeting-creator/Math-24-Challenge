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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<View>('menu');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for guest profile in localStorage
    const savedGuest = localStorage.getItem('math24_guest_profile');
    if (savedGuest) {
      try {
        const profile = JSON.parse(savedGuest);
        setProfile(profile);
        setLoading(false);
      } catch (e) {
        localStorage.removeItem('math24_guest_profile');
      }
    }

    // Safety timeout to prevent getting stuck on loading screen
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('Auth state change timed out, forcing loading to false');
        setLoading(false);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        if (user) {
          // If we have a Firebase user, clear the guest profile to avoid confusion
          localStorage.removeItem('math24_guest_profile');
          
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const existingProfile = docSnap.data() as UserProfile;
            // Update username if we now have a displayName that is different from stored username
            // or if stored username is 'Player' and we have something better
            const currentDisplayName = user.displayName || 'Player';
            if (existingProfile.username !== currentDisplayName && currentDisplayName !== 'Player') {
              const updatedProfile = { ...existingProfile, username: currentDisplayName };
              await setDoc(docRef, updatedProfile);
              setProfile(updatedProfile);
            } else {
              setProfile(existingProfile);
            }
          } else {
            // Wait a moment for displayName to potentially propagate if we just signed in
            // though user.reload() in Auth.tsx should handle this
            const newProfile: UserProfile = {
              uid: user.uid,
              username: user.displayName || 'Player',
              avatar: user.photoURL || '',
              bestScore: 0,
              bestTime: 0,
              createdAt: Date.now()
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } else if (!savedGuest) {
          setProfile(null);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
        clearTimeout(timeoutId);
      }
    });
    
    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

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

  if (!user) {
    return <Auth />;
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
          {view === 'menu' && <Menu setView={setView} profile={profile} />}
          {view === 'game' && <Game setView={setView} profile={profile} />}
          {view === 'leaderboard' && <Leaderboard setView={setView} />}
          {view === 'multiplayer' && <Multiplayer setView={setView} profile={profile} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
