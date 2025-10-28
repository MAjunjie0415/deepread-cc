'use client';

import { Slider } from '@/components/ui/slider';
import { Interest } from '@/types';

interface InterestSliderProps {
  interests: Interest[];
  onInterestsChange: (interests: Interest[]) => void;
  language: 'en' | 'zh';
}

export function InterestSlider({ interests, onInterestsChange }: InterestSliderProps) {
  const updateWeight = (index: number, weight: number) => {
    const updated = [...interests];
    updated[index].weight = weight;
    onInterestsChange(updated);
  };

  const getScoreColor = (weight: number) => {
    if (weight >= 0.7) return 'text-green-600';
    if (weight >= 0.4) return 'text-yellow-600';
    return 'text-gray-500';
  };

  return (
    <div className="space-y-4">
      {interests.map((interest, index) => (
        <div key={interest.label} className="flex items-center gap-4">
          <label className="w-24 text-sm font-medium text-gray-700">
            {interest.label}
          </label>
          <div className="flex-1">
            <Slider
              value={[interest.weight]}
              onValueChange={([value]) => updateWeight(index, value)}
              min={0}
              max={1}
              step={0.05}
              className="w-full"
            />
          </div>
          <span className={`w-12 text-right text-sm font-mono ${getScoreColor(interest.weight)}`}>
            {interest.weight.toFixed(2)}
          </span>
        </div>
      ))}
      
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-600 mb-2">Weight Distribution:</div>
        <div className="flex flex-wrap gap-2">
          {interests.map((interest) => (
            <span
              key={interest.label}
              className="px-2 py-1 bg-white rounded text-xs border"
            >
              {interest.label}: {interest.weight.toFixed(2)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
