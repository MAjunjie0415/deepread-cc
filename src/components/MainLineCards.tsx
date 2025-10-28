'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MainLine } from '@/types';

interface MainLineCardsProps {
  mainLines: MainLine[];
  onDrillDown: (id: string) => void;
  language: 'en' | 'zh';
}

export function MainLineCards({ 
  mainLines, 
  onDrillDown, 
  language
}: MainLineCardsProps) {
  const getScoreVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'outline';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-gray-500';
  };

  return (
    <div className="space-y-4">
      {mainLines.map((line) => (
        <Card key={line.id} className="transition-all hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                {line.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={getScoreVariant(line.score.total)}
                  className={getScoreColor(line.score.total)}
                >
                  {line.score.total.toFixed(2)}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {line.definition}
            </p>
            
            {/* Score Breakdown */}
            <div className="flex gap-4 text-xs text-gray-600">
              <span>相关性: {line.score.breakdown.relevance.toFixed(1)}</span>
              <span>新颖性: {line.score.breakdown.novelty.toFixed(1)}</span>
              <span>可操作性: {line.score.breakdown.actionability.toFixed(1)}</span>
              <span>可信度: {line.score.breakdown.credibility.toFixed(1)}</span>
            </div>
          </CardHeader>
          
          <CardContent>
            <Accordion type="single" collapsible>
              <AccordionItem value={`points-${line.id}`}>
                <AccordionTrigger>
                  Key Points ({line.key_points.length})
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {line.key_points.map((point, idx) => (
                      <div key={idx} className="border-l-2 border-blue-200 pl-3">
                        <p className="font-medium text-sm mb-1">
                          {point.point}
                        </p>
                        <blockquote className="text-xs text-gray-600 italic bg-gray-50 p-2 rounded">
                          "{point.evidence.quote}"
                          <a 
                            href={`#${point.evidence.segment_id}`} 
                            className="ml-2 text-blue-600 hover:underline"
                          >
                            ({point.evidence.timestamp})
                          </a>
                        </blockquote>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {line.unsupported.length > 0 && (
                <AccordionItem value={`unsupported-${line.id}`}>
                  <AccordionTrigger>
                    Unsupported Claims ({line.unsupported.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {line.unsupported.map((claim, idx) => (
                        <div key={idx} className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                          ⚠️ {claim}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </CardContent>
          
          <CardFooter>
            <Button 
              onClick={() => onDrillDown(line.id.toString())}
              className="w-full"
            >
              {language === 'zh' ? '深挖这条主线' : 'Deep Dive This Line'}
            </Button>
          </CardFooter>
        </Card>
      ))}
      
      {mainLines.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No main lines found. Try analyzing a transcript first.
        </div>
      )}
    </div>
  );
}
