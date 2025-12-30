import React, { useState, useRef, useEffect } from 'react';
import { ToggleSwitch } from './ToggleSwitch';
import { Tooltip } from './Tooltip';
import { Zap, PenTool, ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleToggleControlProps {
  isAutoMode: boolean;
  onToggle: (isAuto: boolean) => void;
  isMobile?: boolean;
  className?: string;
}

export const CollapsibleToggleControl: React.FC<CollapsibleToggleControlProps> = ({
  isAutoMode,
  onToggle,
  isMobile = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside as any);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as any);
    };
  }, [isExpanded]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
    if (e.key === 'Escape') {
      setIsExpanded(false);
    }
  };

  const modeBgColor = isAutoMode ? 'bg-green-500' : 'bg-blue-500';
  const modeTextColor = isAutoMode ? 'text-green-600' : 'text-blue-600';
  const modeLabel = isAutoMode ? 'Auto' : 'Manual';
  const ModeIcon = isAutoMode ? Zap : PenTool;

  return (
    <div ref={panelRef} className={`${className}`}>
      {!isExpanded ? (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          onKeyDown={handleKeyDown}
          aria-expanded={false}
          aria-label={`Shape mode control. Currently ${modeLabel} mode. Click to expand options.`}
          aria-controls="toggle-control-panel"
          className={`
            ${isMobile ? 'w-8 h-8' : 'w-14 h-14'}
            ${modeBgColor}
            ${isMobile ? 'opacity-75' : 'opacity-100'}
            rounded-full shadow-md hover:shadow-lg
            flex items-center justify-center
            transition-all duration-300 ease-out
            active:scale-95 hover:scale-105 hover:opacity-100
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            group cursor-pointer
            touch-manipulation
          `}
        >
          <div className="relative flex items-center justify-center">
            <ModeIcon className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'} text-white transition-transform group-hover:scale-110`} />
            <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5">
              <ChevronUp className={`${isMobile ? 'w-2 h-2' : 'w-3 h-3'} text-slate-600`} />
            </div>
          </div>
        </button>
      ) : (
        <div
          id="toggle-control-panel"
          role="region"
          aria-label="Shape mode control panel"
          className={`
            bg-white rounded-lg shadow-lg border border-slate-200
            ${isMobile ? 'p-2' : 'p-3'}
            transform transition-all duration-300 ease-out
            animate-in slide-in-from-bottom-4 fade-in
            ${isMobile ? 'min-w-[140px]' : ''}
          `}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`${isMobile ? 'text-[10px] sm:text-xs' : 'text-xs'} font-semibold text-slate-700`}>
              Shape Mode
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsExpanded(false);
                }
              }}
              aria-label="Collapse control panel"
              className={`
                ${isMobile ? 'p-0.5' : 'p-1'}
                rounded hover:bg-slate-100 active:bg-slate-200
                focus:outline-none focus:ring-2 focus:ring-blue-500
                transition-colors
                touch-manipulation
              `}
            >
              <ChevronDown className={`${isMobile ? 'w-3 h-3 sm:w-4 sm:h-4' : 'w-4 h-4'} text-slate-600`} />
            </button>
          </div>

          <div className={`flex items-center ${isMobile ? 'gap-1.5 sm:gap-2' : 'gap-3'}`}>
            <Tooltip content="Automatic mode fits the shape to your measurements. Manual mode lets you customize by dragging corners.">
              <div className="flex items-center gap-1.5">
                <Zap className={`${isMobile ? 'w-3 h-3 sm:w-4 sm:h-4' : 'w-4 h-4'} ${isAutoMode ? 'text-green-600' : 'text-slate-400'}`} />
                <span className={`${isMobile ? 'text-[10px] sm:text-xs' : 'text-xs'} font-medium ${isAutoMode ? 'text-slate-900' : 'text-slate-500'}`}>
                  Auto
                </span>
              </div>
            </Tooltip>

            <ToggleSwitch
              enabled={isAutoMode}
              onChange={(isAuto) => onToggle(isAuto)}
              onLabel="Automatic"
              offLabel="Manual"
              className={isMobile ? 'scale-90 sm:scale-100' : ''}
            />

            <Tooltip content="Manual mode preserves your custom shape. Toggle back to Auto to fit measurements again.">
              <div className="flex items-center gap-1.5">
                <span className={`${isMobile ? 'text-[10px] sm:text-xs' : 'text-xs'} font-medium ${!isAutoMode ? 'text-slate-900' : 'text-slate-500'}`}>
                  Manual
                </span>
                <PenTool className={`${isMobile ? 'w-3 h-3 sm:w-4 sm:h-4' : 'w-4 h-4'} ${!isAutoMode ? 'text-blue-600' : 'text-slate-400'}`} />
              </div>
            </Tooltip>
          </div>

          <div className={`${isMobile ? 'mt-1.5 pt-1.5' : 'mt-2 pt-2'} border-t border-slate-100`}>
            <p className={`${isMobile ? 'text-[10px] sm:text-xs' : 'text-xs'} text-slate-600`}>
              {!isAutoMode
                ? 'Custom shape - drag corners to adjust'
                : 'Auto-fitted to measurements'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
