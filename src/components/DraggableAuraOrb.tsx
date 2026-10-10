import React, { useState, useRef, useEffect } from 'react';
import { VoiceSphere, AssistantState } from './VoiceSphere';

interface DraggableAuraOrbProps {
  state: AssistantState;
  volume: number;
  isRecording: boolean;
  onToggleRecording: () => void;
  onOpenVoiceView: () => void;
}

export const DraggableAuraOrb: React.FC<DraggableAuraOrbProps> = ({
  state,
  volume,
  isRecording,
  onToggleRecording,
  onOpenVoiceView,
}) => {
  // Initial position docked near bottom-right
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: typeof window !== 'undefined' ? window.innerWidth - 72 : 300,
    y: typeof window !== 'undefined' ? window.innerHeight - 150 : 500,
  });

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number }>({
    x: 0,
    y: 0,
    posX: 0,
    posY: 0,
  });
  const hasMovedRef = useRef(false);

  // Keep within viewport on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.min(Math.max(12, prev.x), window.innerWidth - 72),
        y: Math.min(Math.max(60, prev.y), window.innerHeight - 120),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartRef.current.x;
    const dy = touch.clientY - dragStartRef.current.y;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasMovedRef.current = true;
    }

    const newX = Math.min(Math.max(12, dragStartRef.current.posX + dx), window.innerWidth - 72);
    const newY = Math.min(Math.max(60, dragStartRef.current.posY + dy), window.innerHeight - 120);

    setPosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  // Mouse event handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEvent.clientX - dragStartRef.current.x;
      const dy = moveEvent.clientY - dragStartRef.current.y;

      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        hasMovedRef.current = true;
      }

      const newX = Math.min(Math.max(12, dragStartRef.current.posX + dx), window.innerWidth - 72);
      const newY = Math.min(Math.max(60, dragStartRef.current.posY + dy), window.innerHeight - 120);

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleClick = (e: React.MouseEvent) => {
    // If the user was dragging, don't trigger the click action
    if (hasMovedRef.current) {
      e.stopPropagation();
      return;
    }
    // Single tap toggles recording or opens voice
    onToggleRecording();
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className="z-50 cursor-grab active:cursor-grabbing select-none"
    >
      <div className="relative flex items-center justify-center p-1.5 rounded-full bg-[#0a0c14]/90 backdrop-blur-xl border border-indigo-500/40 shadow-2xl shadow-indigo-950/60 transition-transform active:scale-95">
        <VoiceSphere
          state={state}
          volume={volume}
          size="compact"
          onClick={() => {}}
        />
        {isRecording && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 animate-ping" />
        )}
      </div>
    </div>
  );
};
