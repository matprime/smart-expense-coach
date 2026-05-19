import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, TrendingDown, Clock, MessageSquare } from 'lucide-react';
import type { Recommendation } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { trackEvent } from '@/lib/analytics';

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const [question, setQuestion] = React.useState('');
  const [response, setResponse] = React.useState('');
  const [isAsking, setIsAsking] = React.useState(false);

  const handleAskQuestion = () => {
    if (!question.trim()) return;

    setIsAsking(true);
    trackEvent('Ask Recommendation Question', 'recommendation', { 
      recommendationId: recommendation.id,
      question: question.trim() 
    });
    // Simulate AI response based on question content
    setTimeout(() => {
      const lowerQuestion = question.toLowerCase();
      let answer = '';

      // Generate contextual responses based on question keywords
      if (lowerQuestion.includes('time') || lowerQuestion.includes('long') || lowerQuestion.includes('commute')) {
        answer = `Regarding time considerations for "${recommendation.title}": ${
          recommendation.category === 'Transport'
            ? 'Public transit typically adds 15-20 minutes to your commute compared to rideshare services. However, this time can be used productively for reading, work, or relaxation. Consider trying it during non-peak hours first.'
            : 'The time investment varies, but most alternatives save you 10-15 minutes compared to delivery services. You can use this time for a quick walk or to prepare other meals.'
        }`;
      } else if (lowerQuestion.includes('save') || lowerQuestion.includes('money') || lowerQuestion.includes('cost')) {
        answer = `About cost savings for "${recommendation.title}": Based on your spending pattern, you could save approximately $${recommendation.monthlySavings.toFixed(2)} per month. This adds up to $${(recommendation.monthlySavings * 12).toFixed(2)} annually. Start with implementing this change 2-3 times per week to see immediate savings.`;
      } else if (lowerQuestion.includes('quality') || lowerQuestion.includes('same') || lowerQuestion.includes('difference')) {
        answer = `Regarding quality for "${recommendation.title}": ${
          recommendation.category === 'Food'
            ? 'The food quality remains identical - you\'re getting the same items from the same restaurant. The only difference is eliminating delivery markup and fees. Many restaurants even offer pickup discounts or loyalty rewards.'
            : 'The quality and experience remain comparable. You\'re making a strategic choice to optimize spending without sacrificing the core value you receive.'
        }`;
      } else if (lowerQuestion.includes('how') || lowerQuestion.includes('start') || lowerQuestion.includes('implement')) {
        answer = `To implement "${recommendation.title}": Start gradually by trying this alternative once or twice per week. Track your savings and experience. Most people find it easier than expected once they establish a routine. Consider setting a specific day each week to try this change.`;
      } else if (lowerQuestion.includes('alternative') || lowerQuestion.includes('other') || lowerQuestion.includes('option')) {
        answer = `Other options related to "${recommendation.title}": ${
          recommendation.category === 'Transport'
            ? 'You could also consider carpooling, biking for shorter distances, or a monthly parking pass if driving yourself. Each has different trade-offs in terms of cost, time, and convenience.'
            : recommendation.category === 'Food'
            ? 'You could also try meal prepping on weekends, using grocery delivery instead of restaurant delivery, or cooking in batches to reduce the temptation to order out.'
            : 'Consider combining multiple cost-saving strategies for maximum impact. Small changes across different categories add up significantly over time.'
        }`;
      } else {
        answer = `Regarding your question about "${recommendation.title}": This recommendation is based on your actual spending patterns over the past period. The suggested savings of $${recommendation.monthlySavings.toFixed(2)}/month is calculated from your transaction history. ${recommendation.tradeoffs} is the main consideration, but many users find the savings worthwhile. Would you like specific tips on getting started?`;
      }

      setResponse(answer);
      setIsAsking(false);
    }, 1200);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base text-balance">{recommendation.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 text-pretty">{recommendation.description}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Pattern Detected</p>
            <p className="text-sm text-pretty">{recommendation.pattern}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Suggestion</p>
            <p className="text-sm text-pretty">{recommendation.suggestion}</p>
          </div>
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-success" />
              <div>
                <p className="text-xs text-muted-foreground">Monthly Savings</p>
                <p className="text-sm font-semibold text-success">${recommendation.monthlySavings.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Trade-offs</p>
                <p className="text-sm">{recommendation.tradeoffs}</p>
              </div>
            </div>
          </div>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full mt-auto" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Ask Follow-up Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <DialogHeader>
              <DialogTitle>Ask About This Recommendation</DialogTitle>
              <DialogDescription className="text-pretty">
                Have questions about this suggestion? Ask for more details or clarification.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Textarea
                  placeholder="e.g., How much time would this add to my commute?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={3}
                  className="px-3"
                />
              </div>
              <Button onClick={handleAskQuestion} disabled={isAsking || !question.trim()} className="w-full">
                {isAsking ? 'Thinking...' : 'Get Answer'}
              </Button>
              {response && (
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-pretty">{response}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
