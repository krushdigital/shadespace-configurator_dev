import React from 'react';
import { ConfiguratorState } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Tooltip } from '../ui/Tooltip';

interface EdgeTypeContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  validationErrors?: {[key: string]: string};
  onNext: () => void;
  onPrev: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
}

const EDGE_OPTIONS = [
  {
    id: 'cabled',
    label: 'Cabled Edge',
    description: 'Premium cable edge reinforecment.',
    longDescription: 'Experience superior durability and a sleek finish with our Cabled Edge reinforcement. A marine-grade stainless steel cable is expertly integrated along the entire perimeter of the shade sail, allowing for precise tensioning during installation. Each corner features uniquely styled stainless steel D-rings, which not only securely house the cable but also contribute to an exceptionally professional appearance and enormous structural strength.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Wire_Edging.webp?v=1755478397'
  },
  {
    id: 'webbing',
    label: 'Webbing Reinforced',
    description: 'Robust reinforcement with webbing tape. Easiest to install.',
    longDescription: 'Our webbing-reinforced design incorporates a unique method, utilizing an exceptionally strong 48mm (2-inch) polyester webbing expertly integrated within the hemline. This webbing is meticulously pre-set and pre-sewn, ensuring optimal tension is achieved effortlessly once the sail is fully stretched into position. This innovative approach guarantees a hassle-free on-site installation: simply tension from each fixing point and enjoy your perfectly taut shade sail.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Webbed_Edging.webp?v=1755478397'
  }
];

export function EdgeTypeContent({ config, updateConfig, onNext, onPrev, nextStepTitle = '', showBackButton = false, validationErrors = {} }: EdgeTypeContentProps) {
  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-slate-900 mb-4">
          Select Edge Reinforcement Type
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EDGE_OPTIONS.map((edge) => {
            const hasError = validationErrors.edgeType && !config.edgeType;
            
            return (
            <Card
              key={edge.id}
              className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                config.edgeType === edge.id
                 ? '!ring-2 !ring-[#01312D] !border-2 !border-[#01312D]'
                 : hasError
                 ? 'border-2 !border-red-500 bg-red-50 hover:!border-red-600'
                 : 'hover:border-slate-300'
              }`}
              onClick={() => updateConfig({ edgeType: edge.id })}
            >
              <div className="flex justify-between items-start mb-2">
                <h5 className="font-semibold text-slate-900">
                  {edge.label}
                </h5>
                <div className="flex items-center gap-2">
                  <Tooltip
                    content={
                      <div>
                        <img 
                          src={edge.imageUrl} 
                          alt={`${edge.label} example`}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                        <p className="text-sm text-slate-600 font-medium mb-1">
                          {edge.label}
                        </p>
                        <p className="text-sm text-slate-500">
                          {edge.longDescription}
                        </p>
                        <p className="mt-3 text-sm">
                          <a 
                            href="https://shadespace.com/pages/styles" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-semibold text-[#307C31] hover:text-[#01312D] hover:underline transition-colors"
                          >
                            Learn more about our styles →
                          </a>
                        </p>
                      </div>
                    }
                  >
                    <span className="w-4 h-4 inline-flex items-center justify-center text-xs bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31]">
                      ?
                    </span>
                  </Tooltip>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                {edge.description}
              </p>
            </Card>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 pt-4 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {showBackButton && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onPrev}
              className="sm:w-auto"
            >
              Back
            </Button>
          )}
          <Button 
            onClick={onNext} 
            size="md"
            className={`flex-1 ${!config.edgeType ? 'opacity-50' : ''}`}
          >
            Continue to {nextStepTitle}
          </Button>
        </div>
      </div>
    </div>
  );
}