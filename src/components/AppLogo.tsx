/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  title?: string;
}

export default function AppLogo({ size = 'md', onClick, className = '', title }: AppLogoProps) {
  const containerSizes = {
    sm: 'w-10 h-10 p-1 rounded-2xl border-2',
    md: 'w-14 h-14 p-1.5 rounded-2xl border-3',
    lg: 'w-24 h-24 p-2.5 rounded-[32px] border-4'
  };

  const innerSizes = {
    sm: 'w-full h-full rounded-xl text-lg border-2',
    md: 'w-full h-full rounded-xl text-2xl border-2',
    lg: 'w-full h-full rounded-[22px] text-5xl border-3'
  };

  const shadowSizes = {
    sm: 'shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]',
    md: 'shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]',
    lg: 'shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]'
  };

  return (
    <div
      onClick={onClick}
      title={title}
      className={`bg-amber-400 border-slate-900 ${containerSizes[size]} ${shadowSizes[size]} ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''} ${className}`}
    >
      <div className={`bg-white border-slate-900 ${innerSizes[size]} flex items-center justify-center font-black text-indigo-600 italic tracking-tighter select-none`}>
        24
      </div>
    </div>
  );
}
