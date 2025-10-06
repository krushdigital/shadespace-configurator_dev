import React from 'react';
import { Button } from '../ui/Button';

export function CornersContent({ config, updateConfig, onNext, onPrev, showBackButton }: any) {
  const cornerOptions = [3, 4, 5, 6];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Select the number of fixing points (corners) for your shade sail
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cornerOptions.map((num) => (
            <button
              key={num}
              onClick={() => updateConfig({ corners: num })}
              className={`p-6 border-2 rounded-lg text-center transition-all ${
                config.corners === num
                  ? 'border-[#BFF102] bg-[#BFF102]/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-3xl font-bold text-slate-900">{num}</div>
              <div className="text-sm text-slate-600 mt-2">
                {num === 3 ? 'Triangle' : num === 4 ? 'Square' : num === 5 ? 'Pentagon' : 'Hexagon'}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        {showBackButton && (
          <Button variant="outline" onClick={onPrev}>Back</Button>
        )}
        <Button
          variant="primary"
          onClick={onNext}
          disabled={!config.corners || config.corners < 3 || config.corners > 6}
          className="ml-auto"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
