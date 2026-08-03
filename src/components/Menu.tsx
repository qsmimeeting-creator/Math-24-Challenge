/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { Play, Trophy, Users, LogOut, Settings, Hash, ShieldAlert } from 'lucide-react';
import { auth } from '../lib/firebase';
import AppLogo from './AppLogo';

interface Props {
  setView: (view: any) => void;
  profile: UserProfile | null;
  onLogout?: () => void;
}

export default function Menu({ setView, profile, onLogout }: Props) {
  return (
    <div className="flex-1 flex flex-col p-6">
      <header className="flex items-center justify-between mb-8 bg-white p-4 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
        <div className="flex items-center gap-3">
          <AppLogo 
            size="sm" 
            onClick={() => setView('admin')} 
            title="คลิกไอคอนนี้เพื่อเข้าหน้า Admin" 
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-slate-900 text-lg italic uppercase leading-none">MATH24</h1>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{profile?.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              if (onLogout) {
                onLogout();
              } else {
                auth.signOut();
              }
            }}
            className="p-2 bg-rose-500 text-white rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
            title="ออกจากระบบ / เปลี่ยนชื่อ"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="space-y-5">
        <MenuButton 
          icon={<Play fill="currentColor" />} 
          title="PLAY SOLO" 
          description="Classic & Timer Challenge"
          color="bg-indigo-600"
          onClick={() => setView('game')}
        />
        <MenuButton 
          icon={<Users />} 
          title="MULTIPLAYER" 
          description="Real-time with Friends"
          color="bg-emerald-400"
          onClick={() => setView('multiplayer')}
        />
        <MenuButton 
          icon={<Trophy />} 
          title="LEADERBOARD" 
          description="Top Worldwide Ranking"
          color="bg-rose-500"
          onClick={() => setView('leaderboard')}
        />
        <MenuButton 
          icon={<Hash />} 
          title="CUSTOM" 
          description="Practice Your Own Numbers"
          color="bg-white"
          onClick={() => setView('game')}
        />
      </div>

      <footer className="mt-auto text-center py-6">
        <p className="text-[10px] text-slate-900 uppercase tracking-[0.2em] font-black italic opacity-40">The Ultimate Calculation Challenge</p>
      </footer>
    </div>
  );
}

function MenuButton({ icon, title, description, color, onClick }: any) {
  return (
    <motion.button
      whileTap={{ scale: 0.98, x: 2, y: 2 }}
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-white border-4 border-slate-900 rounded-2xl text-left shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:shadow-none transition-all"
    >
      <div className={`w-12 h-12 ${color} ${color === 'bg-white' ? 'text-slate-900' : 'text-white'} rounded-xl flex items-center justify-center border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]`}>
        {icon}
      </div>
      <div>
        <h3 className="font-black text-slate-900 uppercase tracking-tight">{title}</h3>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{description}</p>
      </div>
    </motion.button>
  );
}
