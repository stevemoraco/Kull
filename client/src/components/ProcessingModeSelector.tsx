import { useState } from 'react';

export interface ProcessingMode {
  id: 'fast' | 'economy' | 'local';
  name: string;
  description: string;
  costMultiplier: number; // 1.0 = full price, 0.5 = 50% off
  estimatedTime: string;
  available: boolean;
}

interface ProcessingModeSelectorProps {
  imageCount: number;
  onSelect: (mode: ProcessingMode) => void;
  baselineCostPerImage?: number; // Default: 0.0008 (gpt-5-nano)
}

export function ProcessingModeSelector({
  imageCount,
  onSelect,
  baselineCostPerImage = 0.0008 // gpt-5-nano default cost
}: ProcessingModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<ProcessingMode['id']>('fast');

  const modes: ProcessingMode[] = [
    {
      id: 'fast',
      name: 'Fast (Default)',
      description: 'All images processed concurrently with ultra-high speed',
      costMultiplier: 1.0,
      estimatedTime: imageCount < 500 ? '30 seconds - 1 minute' : '1-2 minutes',
      available: true
    },
    {
      id: 'economy',
      name: 'Economy (Batch)',
      description: 'Queued batch processing with 50% discount',
      costMultiplier: 0.5,
      estimatedTime: '10-30 minutes',
      available: true
    },
    {
      id: 'local',
      name: 'Local (On-Device)',
      description: 'Free processing on your device (macOS 15+ only)',
      costMultiplier: 0,
      estimatedTime: imageCount < 100 ? '30 minutes - 1 hour' : '1-2 hours',
      available: false // Will be enabled by macOS app
    }
  ];

  const calculateCost = (mode: ProcessingMode): string => {
    const totalCost = imageCount * baselineCostPerImage * mode.costMultiplier;
    return totalCost.toFixed(2);
  };

  const handleSelect = () => {
    const mode = modes.find(m => m.id === selectedMode);
    if (mode) {
      onSelect(mode);
    }
  };

  return (
    <div className="processing-mode-selector">
      <h3 className="text-2xl font-bold mb-4">Processing Mode</h3>
      <p className="text-gray-600 mb-6">
        Processing {imageCount.toLocaleString()} images
      </p>

      <div className="space-y-4">
        {modes.map(mode => (
          <div
            key={mode.id}
            className={`
              mode-card border-2 rounded-lg p-4 cursor-pointer transition-all
              ${selectedMode === mode.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
              }
              ${!mode.available ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onClick={() => mode.available && setSelectedMode(mode.id)}
          >
            <div className="flex items-start">
              <input
                type="radio"
                checked={selectedMode === mode.id}
                disabled={!mode.available}
                onChange={() => mode.available && setSelectedMode(mode.id)}
                className="mt-1 mr-4"
              />
              <div className="flex-1">
                <h4 className="text-lg font-semibold mb-1">
                  {mode.name}
                  {!mode.available && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      (Unavailable)
                    </span>
                  )}
                </h4>
                <p className="text-gray-600 text-sm mb-2">{mode.description}</p>

                <div className="flex items-center justify-between mt-3">
                  <div>
                    <span className="text-sm text-gray-500">Time: </span>
                    <span className="text-sm font-medium">{mode.estimatedTime}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-sm text-gray-500">Cost: </span>
                    {mode.costMultiplier === 0 ? (
                      <span className="text-lg font-bold text-green-600">FREE</span>
                    ) : (
                      <span className="text-lg font-bold">
                        ${calculateCost(mode)}
                      </span>
                    )}
                    {mode.costMultiplier === 0.5 && (
                      <span className="ml-2 text-sm text-green-600 font-semibold">
                        (Save 50%!)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>Selected:</strong> {modes.find(m => m.id === selectedMode)?.name}
        </p>
        <p className="text-sm text-gray-700 mt-1">
          <strong>Total Cost:</strong>{' '}
          {selectedMode === 'local' ? (
            <span className="text-green-600 font-bold">FREE</span>
          ) : (
            `$${calculateCost(modes.find(m => m.id === selectedMode)!)}`
          )}
          {' '}
          for {imageCount.toLocaleString()} images
        </p>
        {selectedMode === 'economy' && (
          <p className="text-xs text-gray-600 mt-2">
            Economy mode uses provider batch APIs for 50% discount. Processing time may vary.
          </p>
        )}
      </div>

      <button
        onClick={handleSelect}
        className="w-full mt-6 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Continue with {modes.find(m => m.id === selectedMode)?.name}
      </button>
    </div>
  );
}
