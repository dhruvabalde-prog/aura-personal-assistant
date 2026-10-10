import React from 'react';

export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface VoiceSphereProps {
  state: AssistantState;
  volume: number; // 0 to 1
  onClick: () => void;
  size?: 'normal' | 'compact';
}

export const VoiceSphere: React.FC<VoiceSphereProps> = ({ state, volume, onClick, size = 'normal' }) => {
  // Compute dynamic scale and glow based on volume
  const scale = 1 + Math.min(0.4, volume * 0.8);
  const glowOpacity = 0.5 + Math.min(0.5, volume * 1.2);

  const getColors = () => {
    switch (state) {
      case 'listening':
        return {
          core: 'from-blue-400 via-indigo-500 to-indigo-700',
          glow: 'rgba(99, 102, 241, 0.65)',
          outerRing: 'border-blue-400/40',
        };
      case 'thinking':
        return {
          core: 'from-purple-400 via-fuchsia-500 to-indigo-600',
          glow: 'rgba(168, 85, 247, 0.7)',
          outerRing: 'border-purple-400/50',
        };
      case 'speaking':
        return {
          core: 'from-emerald-400 via-teal-500 to-cyan-600',
          glow: 'rgba(20, 184, 166, 0.75)',
          outerRing: 'border-emerald-400/60',
        };
      case 'idle':
      default:
        return {
          core: 'from-indigo-400 via-indigo-600 to-slate-900',
          glow: 'rgba(99, 102, 241, 0.4)',
          outerRing: 'border-indigo-500/20',
        };
    }
  };

  const colors = getColors();

  const isCompact = size === 'compact';

  return (
    <div
      onClick={onClick}
      className={`relative flex items-center justify-center cursor-pointer select-none transition-all duration-300 mx-auto ${
        isCompact ? 'w-14 h-14' : 'w-64 h-64'
      }`}
      title="Tap to speak or interrupt"
    >
      {/* Outer ambient glow */}
      <div
        className="absolute inset-0 rounded-full blur-3xl transition-all duration-300 pointer-events-none"
        style={{
          backgroundColor: colors.glow,
          transform: `scale(${scale * (isCompact ? 1.05 : 1.2)})`,
          opacity: glowOpacity,
        }}
      />

      {/* Ripple ring 1 */}
      {!isCompact && (
        <div
          className={`absolute inset-4 rounded-full border ${colors.outerRing} transition-transform duration-200 pointer-events-none ${
            state === 'listening' ? 'animate-ping opacity-25' : 'opacity-40'
          }`}
          style={{ transform: `scale(${scale * 1.1})` }}
        />
      )}

      {/* Ripple ring 2 */}
      {!isCompact && (
        <div
          className={`absolute inset-8 rounded-full border border-white/10 transition-transform duration-300 pointer-events-none ${
            state === 'thinking' ? 'animate-spin' : ''
          }`}
        />
      )}

      {/* Core Glowing Sphere */}
      <div
        className={`relative rounded-full bg-gradient-to-tr ${colors.core} shadow-2xl flex items-center justify-center transition-transform duration-150 animate-float-orb ${
          isCompact ? 'w-12 h-12 shadow-md' : 'w-40 h-40'
        }`}
        style={{
          transform: `scale(${scale})`,
          boxShadow: `0 0 ${isCompact ? '15px' : '50px'} ${colors.glow}`,
        }}
      >
        {/* Inner specular highlight */}
        <div className={`absolute top-1 left-2 ${isCompact ? 'w-4 h-2' : 'w-12 h-6'} bg-white/40 rounded-full blur-[1px] transform -rotate-25`} />
        <div className="absolute top-5 left-8 w-4 h-2 bg-white/70 rounded-full blur-[1px]" />

        {/* Center state indicator icon / pulse */}
        <div className="flex flex-col items-center justify-center text-white/90">
          {state === 'listening' && (
            <div className="flex gap-1 items-center h-6">
              <span className="w-1 bg-white rounded-full animate-bounce h-4" />
              <span className="w-1 bg-white rounded-full animate-bounce h-6 delay-75" />
              <span className="w-1 bg-white rounded-full animate-bounce h-3 delay-150" />
            </div>
          )}
          {state === 'thinking' && (
            <div className="w-5 h-5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
          )}
          {state === 'speaking' && (
            <div className="flex gap-1 items-center h-6">
              <span className="w-1.5 bg-white rounded-full animate-pulse h-5" />
              <span className="w-1.5 bg-white rounded-full animate-pulse h-7 delay-100" />
              <span className="w-1.5 bg-white rounded-full animate-pulse h-4 delay-200" />
            </div>
          )}
          {state === 'idle' && (
            <div className="w-3.5 h-3.5 bg-white/70 rounded-full animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};
