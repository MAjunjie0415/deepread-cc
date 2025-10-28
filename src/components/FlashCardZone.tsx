'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FlashCard } from '@/types';

interface FlashCardZoneProps {
  flashCards: FlashCard[];
  language: 'en' | 'zh';
}

interface CardStats {
  correct: number;
  incorrect: number;
  skipped: number;
}

export function FlashCardZone({ flashCards, language }: FlashCardZoneProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [stats, setStats] = useState<CardStats>({ correct: 0, incorrect: 0, skipped: 0 });
  const [completedCards, setCompletedCards] = useState<Set<number>>(new Set());
  const [isShuffled, setIsShuffled] = useState(false);

  // Shuffle cards on mount
  useEffect(() => {
    if (flashCards.length > 0 && !isShuffled) {
      // Fisher-Yates shuffle
      const shuffled = [...flashCards];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setIsShuffled(true);
    }
  }, [flashCards, isShuffled]);

  const handleNext = (isCorrect: boolean) => {
    const newStats = { ...stats };
    if (isCorrect) {
      newStats.correct++;
    } else {
      newStats.incorrect++;
    }
    setStats(newStats);
    setCompletedCards(prev => new Set([...prev, currentIndex]));
    
    // Move to next card
    const nextIndex = (currentIndex + 1) % flashCards.length;
    setCurrentIndex(nextIndex);
    setShowAnswer(false);
  };

  const handleSkip = () => {
    setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
    setCompletedCards(prev => new Set([...prev, currentIndex]));
    
    const nextIndex = (currentIndex + 1) % flashCards.length;
    setCurrentIndex(nextIndex);
    setShowAnswer(false);
  };

  const resetSession = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setStats({ correct: 0, incorrect: 0, skipped: 0 });
    setCompletedCards(new Set());
    setIsShuffled(false);
  };

  if (flashCards.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No flashcards available. Analyze a transcript first.
      </div>
    );
  }

  const currentCard = flashCards[currentIndex];
  const progress = ((currentIndex + 1) / flashCards.length) * 100;
  const accuracy = stats.correct + stats.incorrect > 0 
    ? (stats.correct / (stats.correct + stats.incorrect)) * 100 
    : 0;

  return (
    <div className="space-y-4">
      {/* Progress and Stats */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          Card {currentIndex + 1} of {flashCards.length}
        </div>
        <div className="flex gap-4">
          <span className="text-green-600">✓ {stats.correct}</span>
          <span className="text-red-600">✗ {stats.incorrect}</span>
          <span className="text-gray-500">⏭ {stats.skipped}</span>
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Flashcard */}
      <Card className="min-h-[200px]">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-full">
            {!showAnswer ? (
              <div className="text-center space-y-4">
                <div className="text-lg font-medium text-gray-800">
                  {currentCard.q}
                </div>
                <Button onClick={() => setShowAnswer(true)}>
                  Show Answer
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleSkip}
                  className="ml-2"
                >
                  Skip
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="text-lg font-medium text-gray-800 mb-2">
                  {currentCard.q}
                </div>
                <div className="text-lg text-green-600 font-medium">
                  {currentCard.a}
                </div>
                <div className="text-xs text-gray-500">
                  Source: {currentCard.source_segment}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleNext(false)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Incorrect
                  </Button>
                  <Button 
                    onClick={() => handleNext(true)}
                    className="text-green-600 bg-green-50 hover:bg-green-100"
                  >
                    Correct
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session Stats */}
      {(stats.correct + stats.incorrect + stats.skipped) > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-2">Session Stats</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Accuracy</div>
              <div className="font-medium">{accuracy.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-gray-600">Completed</div>
              <div className="font-medium">{completedCards.size} / {flashCards.length}</div>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={resetSession}
            className="mt-3 w-full"
          >
            Reset Session
          </Button>
        </div>
      )}
    </div>
  );
}
