/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc, 
  writeBatch 
} from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  ShieldAlert, 
  Trash2, 
  Edit2, 
  RefreshCw, 
  Users, 
  Trophy, 
  DoorOpen, 
  AlertTriangle, 
  Check, 
  Lock, 
  KeyRound,
  Search
} from 'lucide-react';

interface Props {
  setView: (view: any) => void;
}

export default function Admin({ setView }: Props) {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passError, setPassError] = useState(false);

  const [activeTab, setActiveTab] = useState<'users' | 'leaderboard' | 'rooms' | 'system'>('users');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [usersList, setUsersList] = useState<any[]>([]);
  const [lbList, setLbList] = useState<any[]>([]);
  const [roomsList, setRoomsList] = useState<any[]>([]);

  // Editing modal
  const [editingItem, setEditingItem] = useState<{ type: 'user' | 'leaderboard'; item: any } | null>(null);
  const [editName, setEditName] = useState('');
  const [editScore, setEditScore] = useState(0);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (passwordInput === '1234' || passwordInput === 'admin' || passwordInput === 'admin24') {
      setAuthenticated(true);
      setPassError(false);
    } else {
      setPassError(true);
    }
  };

  useEffect(() => {
    if (authenticated) {
      loadData();
    }
  }, [authenticated, activeTab]);

  const loadData = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      if (activeTab === 'users') {
        const snap = await getDocs(collection(db, 'users'));
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        
        // Also merge local
        const localProf = localStorage.getItem('math24_user_profile');
        if (localProf) {
          try {
            const p = JSON.parse(localProf);
            if (!list.some(u => u.uid === p.uid || u.id === p.uid)) {
              list.push({ id: p.uid, ...p, isLocalOnly: true });
            }
          } catch (e) {}
        }
        setUsersList(list);
      } else if (activeTab === 'leaderboard') {
        const snap = await getDocs(collection(db, 'leaderboard'));
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));

        // Merge local storage leaderboard
        try {
          const localLb = JSON.parse(localStorage.getItem('math24_leaderboard') || '[]');
          localLb.forEach((item: any) => {
            if (!list.some(l => l.id === item.id)) {
              list.push({ ...item, isLocalOnly: true });
            }
          });
        } catch (e) {}

        list.sort((a, b) => (b.score || 0) - (a.score || 0));
        setLbList(list);
      } else if (activeTab === 'rooms') {
        const snap = await getDocs(collection(db, 'rooms'));
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setRoomsList(list);
      }
    } catch (e) {
      console.error('Error loading admin data:', e);
      setStatusMsg('โหลดข้อมูลขัดข้อง (ใช้อินเทอร์เน็ตหรือ Firestore rules)');
    } finally {
      setLoading(false);
    }
  };

  // User CRUD
  const handleDeleteUser = async (id: string) => {
    if (!confirm('ยืนยันลบผู้เล่นนี้?')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (e) {}
    
    // Also remove from local
    const localProf = localStorage.getItem('math24_user_profile');
    if (localProf) {
      try {
        const p = JSON.parse(localProf);
        if (p.uid === id) localStorage.removeItem('math24_user_profile');
      } catch (e) {}
    }

    setUsersList(prev => prev.filter(u => u.id !== id && u.uid !== id));
    setStatusMsg('ลบผู้เล่นเรียบร้อย');
  };

  // Leaderboard CRUD
  const handleDeleteLb = async (id: string) => {
    if (!confirm('ยืนยันลบคะแนนนี้?')) return;
    try {
      await deleteDoc(doc(db, 'leaderboard', id));
    } catch (e) {}

    // Update local storage
    try {
      const local = JSON.parse(localStorage.getItem('math24_leaderboard') || '[]');
      const filtered = local.filter((item: any) => item.id !== id);
      localStorage.setItem('math24_leaderboard', JSON.stringify(filtered));
    } catch (e) {}

    setLbList(prev => prev.filter(l => l.id !== id));
    setStatusMsg('ลบคะแนนเรียบร้อย');
  };

  const handleClearAllLeaderboard = async () => {
    if (!confirm('⚠️ คำเตือน: ยืนยันล้างข้อมูลตารางคะแนนทั้งหมด?')) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'leaderboard'));
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (e) {}

    localStorage.removeItem('math24_leaderboard');
    setLbList([]);
    setLoading(false);
    setStatusMsg('ล้างตารางคะแนนทั้งหมดเรียบร้อยแล้ว');
  };

  // Rooms CRUD
  const handleDeleteRoom = async (id: string) => {
    if (!confirm(`ยืนยันปิด/ลบห้อง "${id}"?`)) return;
    try {
      await deleteDoc(doc(db, 'rooms', id));
    } catch (e) {}

    setRoomsList(prev => prev.filter(r => r.id !== id));
    setStatusMsg(`ลบห้อง ${id} เรียบร้อย`);
  };

  const handleClearAllRooms = async () => {
    if (!confirm('⚠️ คำเตือน: ยืนยันลบห้องเล่นทั้งหมด?')) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'rooms'));
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (e) {}

    setRoomsList([]);
    setLoading(false);
    setStatusMsg('ล้างห้องเล่นทั้งหมดเรียบร้อยแล้ว');
  };

  // Full System Reset
  const handleFullSystemReset = async () => {
    if (!confirm('🚨 ยืนยันล้างข้อมูลระบบทั้งหมด (ผู้เล่น, คะแนน, และห้อง)? Action นี้ไม่สามารถย้อนกลับได้!')) return;
    setLoading(true);
    try {
      // Clear Firestore collections
      const collections = ['users', 'leaderboard', 'rooms'];
      for (const colName of collections) {
        const snap = await getDocs(collection(db, colName));
        const batch = writeBatch(db);
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) {
      console.error('Error clearing Firestore:', e);
    }

    // Clear local storage
    localStorage.removeItem('math24_user_profile');
    localStorage.removeItem('math24_guest_profile');
    localStorage.removeItem('math24_leaderboard');

    setUsersList([]);
    setLbList([]);
    setRoomsList([]);
    setLoading(false);
    setStatusMsg('✅ ล้างข้อมูลระบบทั้งหมดเรียบร้อยแล้ว!');
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const { type, item } = editingItem;
    const cleanName = editName.trim().toUpperCase();

    try {
      if (type === 'user') {
        if (item.id && !item.isLocalOnly) {
          await updateDoc(doc(db, 'users', item.id), { username: cleanName });
        }
        setUsersList(prev => prev.map(u => u.id === item.id ? { ...u, username: cleanName } : u));
      } else if (type === 'leaderboard') {
        if (item.id && !item.isLocalOnly) {
          await updateDoc(doc(db, 'leaderboard', item.id), { 
            username: cleanName, 
            score: Number(editScore) 
          });
        }
        setLbList(prev => prev.map(l => l.id === item.id ? { ...l, username: cleanName, score: Number(editScore) } : l));
      }
      setStatusMsg('บันทึกการแก้ไขเรียบร้อยแล้ว');
    } catch (e) {
      console.error('Save edit failed:', e);
      setStatusMsg('แก้ไขไม่สำเร็จ');
    } finally {
      setEditingItem(null);
    }
  };

  // Password Lock Screen
  if (!authenticated) {
    return (
      <div className="flex-1 flex flex-col p-6 items-center justify-center">
        <div className="w-full max-w-sm bg-white border-4 border-slate-900 p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] text-center">
          <div className="w-16 h-16 bg-rose-500 text-white rounded-2xl border-4 border-slate-900 flex items-center justify-center mx-auto mb-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
            <Lock size={32} className="stroke-[3px]" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-6 italic uppercase">ADMIN PANEL</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="ENTER ADMIN PIN"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-slate-50 border-4 border-slate-900 p-4 rounded-2xl font-black text-slate-900 text-center tracking-widest shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] focus:outline-none focus:border-indigo-600"
              autoFocus
            />

            {passError && (
              <p className="text-xs font-black text-rose-600 uppercase italic">⚠️ รหัสผ่านไม่ถูกต้อง</p>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] uppercase tracking-widest italic"
            >
              UNLOCK ADMIN
            </button>
          </form>

          <button
            onClick={() => setView('menu')}
            className="mt-6 text-xs font-black text-slate-500 hover:text-slate-900 uppercase tracking-widest underline"
          >
            ← กลับสู่เมนูหลัก
          </button>
        </div>
      </div>
    );
  }

  const filteredUsers = usersList.filter(u => 
    (u.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLb = lbList.filter(l => 
    (l.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col p-6 max-w-lg mx-auto w-full">
      {/* Header */}
      <header className="flex items-center justify-between mb-4 bg-white p-4 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
        <button 
          onClick={() => setView('menu')} 
          className="p-2 bg-slate-100 rounded-xl text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
        >
          <ChevronLeft size={20} className="stroke-[3px]" />
        </button>
        <div className="flex items-center gap-2">
          <ShieldAlert size={20} className="text-rose-500 stroke-[3px]" />
          <h1 className="text-xl font-black text-slate-900 italic tracking-tighter uppercase">ADMIN MANAGEMENT</h1>
        </div>
        <button onClick={loadData} className="p-2 bg-indigo-100 text-indigo-700 rounded-xl border-2 border-slate-900">
          <RefreshCw size={18} className={`stroke-[3px] ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {statusMsg && (
        <div className="mb-4 p-3 bg-amber-400 border-4 border-slate-900 rounded-2xl text-slate-900 font-black text-xs uppercase tracking-wider italic text-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          {statusMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 mb-4 bg-white p-1.5 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-2 text-[10px] font-black uppercase rounded-xl border-2 transition-all ${
            activeTab === 'users' ? 'bg-indigo-600 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]' : 'border-transparent text-slate-500'
          }`}
        >
          ผู้เล่น
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`py-2 text-[10px] font-black uppercase rounded-xl border-2 transition-all ${
            activeTab === 'leaderboard' ? 'bg-amber-400 text-slate-900 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]' : 'border-transparent text-slate-500'
          }`}
        >
          คะแนน
        </button>
        <button
          onClick={() => setActiveTab('rooms')}
          className={`py-2 text-[10px] font-black uppercase rounded-xl border-2 transition-all ${
            activeTab === 'rooms' ? 'bg-emerald-400 text-slate-900 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]' : 'border-transparent text-slate-500'
          }`}
        >
          ห้อง
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`py-2 text-[10px] font-black uppercase rounded-xl border-2 transition-all ${
            activeTab === 'system' ? 'bg-rose-500 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]' : 'border-transparent text-slate-500'
          }`}
        >
          รีเซ็ต
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 flex flex-col bg-white border-4 border-slate-900 p-4 rounded-3xl shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
        {/* Search bar for Users and Leaderboard */}
        {(activeTab === 'users' || activeTab === 'leaderboard') && (
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="ค้นหาชื่อผู้เล่น..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-900 p-2.5 pl-9 rounded-xl font-black text-xs text-slate-900 placeholder:text-slate-400 uppercase"
            />
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          </div>
        )}

        {/* Tab 1: Users */}
        {activeTab === 'users' && (
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              ผู้เล่นทั้งหมด ({filteredUsers.length})
            </div>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-slate-400 font-black text-xs uppercase">ไม่พบข้อมูลผู้เล่น</div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 border-2 border-slate-900 rounded-xl">
                    <div className="truncate mr-2">
                      <div className="font-black text-slate-900 text-sm uppercase italic">{user.username}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase truncate">UID: {user.uid || user.id}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingItem({ type: 'user', item: user });
                          setEditName(user.username || '');
                        }}
                        className="p-2 bg-amber-300 text-slate-900 border border-slate-900 rounded-lg text-xs font-black"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 bg-rose-500 text-white border border-slate-900 rounded-lg text-xs font-black"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Leaderboard */}
        {activeTab === 'leaderboard' && (
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                ตารางคะแนน ({filteredLb.length})
              </span>
              <button
                onClick={handleClearAllLeaderboard}
                className="text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-1 rounded-lg border border-rose-900 uppercase italic"
              >
                ล้างคะแนนทั้งหมด
              </button>
            </div>
            {filteredLb.length === 0 ? (
              <div className="text-center py-8 text-slate-400 font-black text-xs uppercase">ไม่มีตารางคะแนน</div>
            ) : (
              <div className="space-y-2">
                {filteredLb.map((lb) => (
                  <div key={lb.id} className="flex items-center justify-between p-3 bg-slate-50 border-2 border-slate-900 rounded-xl">
                    <div>
                      <span className="font-black text-slate-900 text-sm uppercase italic mr-2">{lb.username}</span>
                      <span className="text-xs font-black text-indigo-600 italic bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                        {lb.score} คะแนน
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingItem({ type: 'leaderboard', item: lb });
                          setEditName(lb.username || '');
                          setEditScore(lb.score || 0);
                        }}
                        className="p-2 bg-amber-300 text-slate-900 border border-slate-900 rounded-lg text-xs font-black"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteLb(lb.id)}
                        className="p-2 bg-rose-500 text-white border border-slate-900 rounded-lg text-xs font-black"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Rooms */}
        {activeTab === 'rooms' && (
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                ห้องเล่นทั้งหมด ({roomsList.length})
              </span>
              <button
                onClick={handleClearAllRooms}
                className="text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-1 rounded-lg border border-rose-900 uppercase italic"
              >
                ปิดห้องทั้งหมด
              </button>
            </div>
            {roomsList.length === 0 ? (
              <div className="text-center py-8 text-slate-400 font-black text-xs uppercase">ไม่มีห้องที่เปิดอยู่</div>
            ) : (
              <div className="space-y-2">
                {roomsList.map((room) => (
                  <div key={room.id} className="flex items-center justify-between p-3 bg-slate-50 border-2 border-slate-900 rounded-xl">
                    <div>
                      <div className="font-black text-slate-900 text-sm uppercase italic">ห้อง: {room.id}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">
                        ผู้เล่น: {room.players?.length || 0} คน | สถานะ: {room.status}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteRoom(room.id)}
                      className="p-2 bg-rose-500 text-white border border-slate-900 rounded-lg text-xs font-black"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: System Reset */}
        {activeTab === 'system' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <AlertTriangle size={48} className="text-rose-500 mb-2 stroke-[3px]" />
            <h3 className="text-xl font-black text-slate-900 uppercase italic">SYSTEM DATA RESET</h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">
              การล้างข้อมูลจะลบผู้เล่น ตารางคะแนน และห้องเล่นทั้งหมดบน Firestore และเครื่อง
            </p>

            <button
              onClick={handleFullSystemReset}
              disabled={loading}
              className="w-full bg-rose-600 text-white font-black py-4 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] uppercase tracking-widest italic text-sm"
            >
              🚨 ล้างข้อมูลระบบทั้งหมด (RESET ALL DATA)
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white border-8 border-slate-900 p-6 rounded-3xl w-full max-w-sm text-left shadow-[12px_12px_0px_0px_rgba(15,23,42,1)]">
            <h3 className="text-xl font-black text-slate-900 uppercase italic mb-4">
              แก้ไขข้อมูล ({editingItem.type === 'user' ? 'ผู้เล่น' : 'คะแนน'})
            </h3>

            <div className="space-y-3 mb-6">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase">ชื่อผู้เล่น (Username)</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border-2 border-slate-900 p-3 rounded-xl font-black text-slate-900 uppercase mt-1"
                />
              </div>

              {editingItem.type === 'leaderboard' && (
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase">คะแนน (Score)</label>
                  <input
                    type="number"
                    value={editScore}
                    onChange={e => setEditScore(Number(e.target.value))}
                    className="w-full bg-slate-50 border-2 border-slate-900 p-3 rounded-xl font-black text-slate-900 mt-1"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEditingItem(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-black rounded-xl border-2 border-slate-900 uppercase text-xs"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl border-2 border-slate-900 uppercase text-xs"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
