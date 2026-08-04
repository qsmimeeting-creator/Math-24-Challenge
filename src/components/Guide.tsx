/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, BookOpen, HelpCircle, Target, Users, Zap, Lightbulb, CheckCircle2, Calculator, Play, Award } from 'lucide-react';

interface Props {
  setView: (view: any) => void;
}

export default function Guide({ setView }: Props) {
  const [activeTab, setActiveTab] = useState<'rules' | 'modes' | 'tips'>('rules');

  return (
    <div className="flex-1 flex flex-col p-6 max-w-md mx-auto w-full">
      {/* Header */}
      <header className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
        <button
          onClick={() => setView('menu')}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
        >
          <ArrowLeft size={20} className="stroke-[3px]" />
        </button>
        <div className="text-center flex-1">
          <h1 className="font-black text-slate-900 text-xl italic uppercase tracking-wider flex items-center justify-center gap-2">
            <BookOpen className="text-indigo-600 stroke-[3px]" size={22} />
            คู่มือการเล่น
          </h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">HOW TO PLAY MATH24</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => setActiveTab('rules')}
          className={`py-2.5 px-2 rounded-xl font-black text-xs border-3 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all italic uppercase flex items-center justify-center gap-1 ${
            activeTab === 'rules'
              ? 'bg-indigo-600 text-white shadow-none translate-x-[1px] translate-y-[1px]'
              : 'bg-white text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Target size={14} className="stroke-[3px]" />
          กติกา
        </button>
        <button
          onClick={() => setActiveTab('modes')}
          className={`py-2.5 px-2 rounded-xl font-black text-xs border-3 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all italic uppercase flex items-center justify-center gap-1 ${
            activeTab === 'modes'
              ? 'bg-indigo-600 text-white shadow-none translate-x-[1px] translate-y-[1px]'
              : 'bg-white text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Play size={14} className="stroke-[3px]" />
          โหมดการเล่น
        </button>
        <button
          onClick={() => setActiveTab('tips')}
          className={`py-2.5 px-2 rounded-xl font-black text-xs border-3 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all italic uppercase flex items-center justify-center gap-1 ${
            activeTab === 'tips'
              ? 'bg-indigo-600 text-white shadow-none translate-x-[1px] translate-y-[1px]'
              : 'bg-white text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Lightbulb size={14} className="stroke-[3px]" />
          เทคนิค
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 pb-6">
        {activeTab === 'rules' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Goal Card */}
            <div className="bg-white p-5 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <div className="flex items-center gap-2 mb-3 text-indigo-600">
                <Target size={22} className="stroke-[3px]" />
                <h2 className="font-black text-slate-900 text-lg uppercase italic">เป้าหมายของเกม</h2>
              </div>
              <p className="text-sm font-bold text-slate-700 leading-relaxed">
                นำตัวเลขทั้ง <span className="bg-yellow-300 text-slate-900 px-1.5 py-0.5 rounded border border-slate-900 font-black">4 ตัว</span> ที่กำหนดให้ มาคำนวณด้วยเครื่องหมายคณิตศาสตร์ เพื่อให้ได้ผลลัพธ์เท่ากับ <span className="text-indigo-600 font-black text-base">24</span> พอดี!
              </p>
            </div>

            {/* Basic Rules */}
            <div className="bg-white p-5 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <h3 className="font-black text-slate-900 text-base uppercase italic mb-3 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500 stroke-[3px]" />
                กฎเหล็ก 3 ข้อ
              </h3>
              <ul className="space-y-3 text-xs font-bold text-slate-700">
                <li className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border-2 border-slate-900">
                  <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">1</span>
                  <span><strong>ต้องใช้เลขครบทั้ง 4 ตัว:</strong> ห้ามละเว้นตัวเลขใดตัวหนึ่งเด็ดขาด</span>
                </li>
                <li className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border-2 border-slate-900">
                  <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">2</span>
                  <span><strong>ใช้ตัวเลขได้ตัวละ 1 ครั้ง:</strong> ห้ามนำตัวเลขเดิมมาซ้ำ เว้นแต่โจทย์จะให้ตัวเลขนั้นมาหลายตัว</span>
                </li>
                <li className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border-2 border-slate-900">
                  <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">3</span>
                  <span><strong>ใช้เครื่องหมายพื้นฐานได้อิสระ:</strong> บวก (+), ลบ (-), คูณ (×), หาร (÷) และสามารถใช้วงเล็บจัดกลุ่มได้</span>
                </li>
              </ul>
            </div>

            {/* Example */}
            <div className="bg-emerald-50 p-5 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <h3 className="font-black text-slate-900 text-sm uppercase italic mb-2 flex items-center gap-1.5">
                <Calculator size={16} className="text-emerald-700 stroke-[3px]" />
                ตัวอย่างการแก้โจทย์
              </h3>
              <div className="bg-white p-3 rounded-xl border-2 border-slate-900 mb-2">
                <p className="text-xs font-bold text-slate-500 mb-1">โจทย์ตัวเลข:</p>
                <div className="flex gap-2 justify-center font-black text-lg text-slate-900">
                  <span className="px-2.5 py-1 bg-yellow-200 rounded-lg border border-slate-900">1</span>
                  <span className="px-2.5 py-1 bg-yellow-200 rounded-lg border border-slate-900">3</span>
                  <span className="px-2.5 py-1 bg-yellow-200 rounded-lg border border-slate-900">4</span>
                  <span className="px-2.5 py-1 bg-yellow-200 rounded-lg border border-slate-900">6</span>
                </div>
              </div>
              <div className="bg-emerald-100 p-3 rounded-xl border-2 border-slate-900 text-xs font-black text-slate-900 space-y-1">
                <p className="text-emerald-800">วิธีคิดตัวอย่าง:</p>
                <p className="text-sm italic">6 ÷ (1 - (3 ÷ 4)) = 24</p>
                <p className="text-slate-600 font-bold text-[11px]">หรือ (1 + 3) × (6 - 4) ... โอ๊ะ คิดได้อีกหลายวิธี!</p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'modes' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Solo Play */}
            <div className="bg-white p-5 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center border-2 border-slate-900 font-black">
                  <Play size={16} fill="currentColor" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base uppercase italic">PLAY SOLO (เล่นคนเดียว)</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">ฝึกฝนทักษะ & ความไว</p>
                </div>
              </div>
              <ul className="text-xs font-bold text-slate-700 space-y-1.5 list-disc list-inside mt-3">
                <li>มีเวลานับถอยหลัง 60 วินาทีต่อข้อ</li>
                <li>เมื่อตอบถูก เวลานับถอยหลังจะ<strong>รีเซ็ตใหม่ 60 วินาที</strong>ทันทีสำหรับโจทย์ข้อถัดไป</li>
                <li>สะสมคะแนนและความต่อเนื่อง (Streak) เพื่อชิงอันดับใน Leaderboard</li>
                <li>มีปุ่ม <strong>HINT</strong> (คำใบ้) และ <strong>SKIP</strong> (ข้าม) หากติดขัด</li>
              </ul>
            </div>

            {/* Multiplayer */}
            <div className="bg-white p-5 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-emerald-400 text-slate-900 rounded-lg flex items-center justify-center border-2 border-slate-900 font-black">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base uppercase italic">MULTIPLAYER (เล่นกับเพื่อน)</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">ประลองความไวแบบเรียลไทม์</p>
                </div>
              </div>
              <ul className="text-xs font-bold text-slate-700 space-y-1.5 list-disc list-inside mt-3">
                <li>สร้างห้องแข่งหรือกรอกรหัสห้องเพื่อเข้าร่วม</li>
                <li><strong>ระบบสถานะพร้อม:</strong> ผู้เล่นทุกคนต้องกด <span className="text-emerald-700 font-black">"พร้อมเล่นแล้ว" (READY)</span> ก่อน หัวหน้าห้องจึงจะกดเริ่มเกมส์ได้</li>
                <li>แข่งกันตอบโจทย์ข้อเดียวกัน ใครคิดคำตอบได้เร็วที่สุดจะได้รับคะแนน!</li>
              </ul>
            </div>

            {/* Custom Mode */}
            <div className="bg-white p-5 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-amber-400 text-slate-900 rounded-lg flex items-center justify-center border-2 border-slate-900 font-black">
                  <Zap size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base uppercase italic">CUSTOM (กำหนดโจทย์เอง)</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">ป้อนตัวเลขที่ต้องการ</p>
                </div>
              </div>
              <p className="text-xs font-bold text-slate-700 mt-2">
                ป้อนตัวเลข 4 ตัวตามต้องการ ระบบจะตรวจสอบให้ทันทีว่าตัวเลขชุดนั้นสามารถถอดเป็น 24 ได้หรือไม่ พร้อมแสดงแนวทางเฉลย
              </p>
            </div>
          </motion.div>
        )}

        {activeTab === 'tips' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="bg-amber-50 p-5 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <h3 className="font-black text-slate-900 text-base uppercase italic mb-3 flex items-center gap-2">
                <Lightbulb size={20} className="text-amber-600 stroke-[3px]" />
                สูตรเด็ดเคล็ดลับถอด 24
              </h3>
              
              <div className="space-y-3 text-xs font-bold text-slate-800">
                <div className="bg-white p-3 rounded-xl border-2 border-slate-900">
                  <p className="text-indigo-600 font-black text-sm mb-1">1. จำคู่ผลคูณ 24 ให้ขึ้นใจ</p>
                  <p className="text-slate-600">พยายามรวมเลขบางส่วนให้ได้ตัวเลขคู่เหล่านี้ แล้วนำไปคูณกัน:</p>
                  <div className="grid grid-cols-2 gap-1.5 mt-2 text-center font-black">
                    <span className="bg-slate-100 py-1 rounded border border-slate-300">3 × 8 = 24</span>
                    <span className="bg-slate-100 py-1 rounded border border-slate-300">4 × 6 = 24</span>
                    <span className="bg-slate-100 py-1 rounded border border-slate-300">2 × 12 = 24</span>
                    <span className="bg-slate-100 py-1 rounded border border-slate-300">1 × 24 = 24</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border-2 border-slate-900">
                  <p className="text-indigo-600 font-black text-sm mb-1">2. มองหาตัวเลข "1" หรือ "0"</p>
                  <p className="text-slate-600">
                    เลข 1 มีประโยชน์มากในการนำไปบวก/ลบ เพื่อเปลี่ยนเลข 7 ให้เป็น 8 หรือเปลี่ยนเลข 5 ให้เป็น 6 แล้วคูณเข้าหา 24
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border-2 border-slate-900">
                  <p className="text-indigo-600 font-black text-sm mb-1">3. การหารเศษส่วนกรณีเลขยาก</p>
                  <p className="text-slate-600">
                    หากมีเลข 3, 3, 7, 7 ลองใช้สูตร <span className="bg-yellow-200 px-1 rounded text-slate-900 font-black">24 = 3 ÷ (1 - 3/7)</span> เพื่อสร้างตัวหารเศษส่วน!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Start Button at Bottom */}
      <button
        onClick={() => setView('game')}
        className="w-full flex items-center justify-center gap-2 font-black py-3.5 rounded-2xl border-4 border-slate-900 bg-indigo-600 text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] uppercase tracking-wider italic text-base transition-all mt-auto"
      >
        <Play size={20} fill="currentColor" className="stroke-[3px]" />
        เริ่มเล่นเลย!
      </button>
    </div>
  );
}
