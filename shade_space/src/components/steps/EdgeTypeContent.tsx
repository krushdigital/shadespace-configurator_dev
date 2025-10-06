import React from 'react';
import { Button } from '../ui/Button';

export function EdgeTypeContent({ config, updateConfig, onNext, onPrev, showBackButton }: any) {
  const edgeTypes = [
    {
      id: 'webbing',
      label: 'Webbing Reinforced',
      description: 'Heavy-duty webbing sewn around the perimeter for maximum strength'
    },
    {
      id: 'cabled',
      label: 'Cabled Edge',
      description: 'Stainless steel cable enclosed in the hem for structural support'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {edgeTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => updateConfig({ edgeType: type.id })}
              className={`p-6 border-2 rounded-lg text-left transition-all ${
                config.edgeType === type.id
                  ? 'border-[#BFF102] bg-[#BFF102]/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="font-semibold text-lg text-slate-900">{type.label}</div>
              <div className="text-sm text-slate-600 mt-2">{type.description}</div>
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
          disabled={!config.edgeType}
          className="ml-auto"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
