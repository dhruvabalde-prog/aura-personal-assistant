import React, { useState, useEffect } from 'react';
import { RoutineItem } from '../views/MyDayView';
import { X, Play, Pause, SkipBack, SkipForward, CheckCircle2, Flame, Sparkles } from 'lucide-react';

interface RoutinePlayerModalProps {
  routine: RoutineItem;
  onClose: () => void;
  onComplete: () => void;
}

export const RoutinePlayerModal: React.FC<RoutinePlayerModalProps> = ({
  routine,
  onClose,
  onComplete,
}) => {
  const steps = routine.steps && routine.steps.length > 0 ? routine.steps : [
    { id: 'step-1', title: 'Preparation & Mindset', durationSeconds: 60 },
    { id: 'step-2', title: 'Core Execution', durationSeconds: 180 },
    { id: 'step-3', title: 'Cool Down & Review', durationSeconds: 60 },
  ];

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [stepRemaining, setStepRemaining] = useState(steps[0]?.durationSeconds || 60);

  const activeStep = steps[currentStepIdx] || steps[0];

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setTotalElapsed((prev) => prev + 1);

      setStepRemaining((prev) => {
        if (prev <= 1) {
          if (currentStepIdx < steps.length - 1) {
            setCurrentStepIdx((idx) => idx + 1);
            return steps[currentStepIdx + 1]?.durationSeconds || 60;
          } else {
            setIsPlaying(false);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, currentStepIdx, steps]);

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      const prevIdx = currentStepIdx - 1;
      setCurrentStepIdx(prevIdx);
      setStepRemaining(steps[prevIdx].durationSeconds);
    }
  };

  const handleNext = () => {
    if (currentStepIdx < steps.length - 1) {
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      setStepRemaining(steps[nextIdx].durationSeconds);
    } else {
      onComplete();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const stepProgress = Math.round(
    (((activeStep?.durationSeconds || 60) - stepRemaining) / ((activeStep?.durationSeconds || 60) || 1)) * 100
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#08090d] text-slate-100 flex flex-col justify-between p-6 max-w-md mx-auto select-none animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest truncate max-w-[220px]">
            {routine.title}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Center: Overall Timer & Step Counter */}
      <div className="my-auto flex flex-col items-center text-center">
        <span className="text-xs font-mono text-indigo-400 tracking-wider uppercase mb-2">
          Step {currentStepIdx + 1} of {steps.length}
        </span>

        <h2 className="text-2xl font-black text-white font-display mb-8 max-w-xs leading-snug">
          {activeStep?.title}
        </h2>

        {/* Step Circular Countdown Display */}
        <div className="relative w-48 h-48 rounded-full border-4 border-slate-900 flex flex-col items-center justify-center p-4 shadow-[0_0_50px_rgba(99,102,241,0.2)] bg-slate-950">
          <span className="text-4xl font-extrabold font-mono text-white tabular-nums">
            {formatTime(stepRemaining)}
          </span>
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mt-1">
            Step Timer
          </span>
        </div>

        {/* Step progress bar */}
        <div className="w-64 h-1.5 bg-slate-900 rounded-full mt-8 overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${stepProgress}%` }}
          />
        </div>

        {/* Overall Routine Timer Display */}
        <div className="mt-6 flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-slate-800">
          <span>Overall Time Elapsed:</span>
          <span className="text-white font-bold tabular-nums">{formatTime(totalElapsed)}</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="pb-6">
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={handlePrev}
            disabled={currentStepIdx === 0}
            className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 hover:text-white active:scale-95 transition-all cursor-pointer"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-5 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-600/40 hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer"
          >
            {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 fill-white" />}
          </button>

          <button
            onClick={handleNext}
            className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white active:scale-95 transition-all cursor-pointer"
          >
            {currentStepIdx === steps.length - 1 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <SkipForward className="w-5 h-5" />
            )}
          </button>
        </div>

        {currentStepIdx === steps.length - 1 && stepRemaining === 0 && (
          <button
            onClick={onComplete}
            className="w-full mt-4 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
          >
            Complete Routine & Log Streak
          </button>
        )}
      </div>
    </div>
  );
};
