'use client';

import { useState, useCallback, useEffect } from 'react';
import { CalendarWeek, PlannerInput, GuardrailViolation } from '@/types';
import {
  generateCalendar,
  generateNextWeekCalendar,
  regenerateCalendar,
  CalendarGenerationResult,
  GenerationOptions,
  DEFAULT_GENERATION_OPTIONS,
} from '@/lib/planner';
import {
  getHistory,
  getSavedCalendars,
  getLatestCalendar,
  clearHistory,
} from '@/lib/storage/historyStorage';
import { ContentGenerationMode } from '@/lib/llm';

export interface UseCalendarPlannerReturn {
  // State
  currentCalendar: CalendarWeek | null;
  previousCalendars: CalendarWeek[];
  isGenerating: boolean;
  error: string | null;
  warnings: string[];
  violations: GuardrailViolation[];
  stats: {
    postsGenerated: number;
    postsRejected: number;
    averageQualityScore: number;
    llmTokensUsed?: number;
  } | null;
  generationMode: ContentGenerationMode;
  
  // Generation options state
  options: GenerationOptions;
  setOptions: (options: Partial<GenerationOptions>) => void;
  
  // Actions
  generate: (input: PlannerInput, weekStart?: Date) => Promise<void>;
  generateNext: (input: PlannerInput) => Promise<void>;
  regenerate: (input: PlannerInput, weekStart: Date) => Promise<void>;
  reset: () => void;
  loadSavedCalendars: () => void;
}

export function useCalendarPlanner(): UseCalendarPlannerReturn {
  const [currentCalendar, setCurrentCalendar] = useState<CalendarWeek | null>(null);
  const [previousCalendars, setPreviousCalendars] = useState<CalendarWeek[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [violations, setViolations] = useState<GuardrailViolation[]>([]);
  const [stats, setStats] = useState<{
    postsGenerated: number;
    postsRejected: number;
    averageQualityScore: number;
    llmTokensUsed?: number;
  } | null>(null);
  const [generationMode, setGenerationMode] = useState<ContentGenerationMode>('titles-only');
  
  // Generation options
  const [options, setOptionsState] = useState<GenerationOptions>(DEFAULT_GENERATION_OPTIONS);
  
  const setOptions = useCallback((newOptions: Partial<GenerationOptions>) => {
    setOptionsState(prev => ({ ...prev, ...newOptions }));
  }, []);

  // Load saved calendars on mount
  const loadSavedCalendars = useCallback(() => {
    const saved = getSavedCalendars();
    if (saved.length > 0) {
      setCurrentCalendar(saved[saved.length - 1]);
      setPreviousCalendars(saved.slice(0, -1));
    }
  }, []);

  useEffect(() => {
    loadSavedCalendars();
  }, [loadSavedCalendars]);

  // Generate a new calendar
  const generate = useCallback(async (input: PlannerInput, weekStart?: Date) => {
    setIsGenerating(true);
    setError(null);
    setWarnings([]);
    setViolations([]);
    setStats(null);

    try {
      const result = await generateCalendar(input, weekStart, options);
      
      if (result.success && result.calendar) {
        // Move current to previous if exists
        if (currentCalendar) {
          setPreviousCalendars(prev => [...prev, currentCalendar]);
        }
        setCurrentCalendar(result.calendar);
        setGenerationMode(result.generationMode);
      } else {
        setError(result.error || 'Failed to generate calendar');
      }
      
      setWarnings(result.warnings);
      setViolations(result.guardrailViolations);
      setStats(result.stats);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  }, [currentCalendar, options]);

  // Generate next week's calendar
  const generateNext = useCallback(async (input: PlannerInput) => {
    setIsGenerating(true);
    setError(null);
    setWarnings([]);
    setViolations([]);
    setStats(null);

    try {
      const result = await generateNextWeekCalendar(input, options);
      
      if (result.success && result.calendar) {
        if (currentCalendar) {
          setPreviousCalendars(prev => [...prev, currentCalendar]);
        }
        setCurrentCalendar(result.calendar);
        setGenerationMode(result.generationMode);
      } else {
        setError(result.error || 'Failed to generate calendar');
      }
      
      setWarnings(result.warnings);
      setViolations(result.guardrailViolations);
      setStats(result.stats);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  }, [currentCalendar, options]);

  // Regenerate a calendar for a specific week
  const regenerate = useCallback(async (input: PlannerInput, weekStart: Date) => {
    setIsGenerating(true);
    setError(null);
    setWarnings([]);
    setViolations([]);
    setStats(null);

    try {
      const result = await regenerateCalendar(input, weekStart, options);
      
      if (result.success && result.calendar) {
        setCurrentCalendar(result.calendar);
        setGenerationMode(result.generationMode);
        // Remove the old calendar from previous if it was there
        setPreviousCalendars(prev => 
          prev.filter(c => new Date(c.weekStart).getTime() !== weekStart.getTime())
        );
      } else {
        setError(result.error || 'Failed to regenerate calendar');
      }
      
      setWarnings(result.warnings);
      setViolations(result.guardrailViolations);
      setStats(result.stats);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  }, [options]);

  // Reset all state and clear history
  const reset = useCallback(() => {
    clearHistory();
    setCurrentCalendar(null);
    setPreviousCalendars([]);
    setError(null);
    setWarnings([]);
    setViolations([]);
    setStats(null);
    setGenerationMode('titles-only');
  }, []);

  return {
    currentCalendar,
    previousCalendars,
    isGenerating,
    error,
    warnings,
    violations,
    stats,
    generationMode,
    options,
    setOptions,
    generate,
    generateNext,
    regenerate,
    reset,
    loadSavedCalendars,
  };
}
