'use client';

import React, { useState, useEffect } from 'react';
import { InputForm } from '@/components/InputForm';
import { CalendarTable } from '@/components/CalendarTable';
import { useCalendarPlanner } from '@/hooks/useCalendarPlanner';
import { PlannerInput } from '@/types';
import { hasEnvApiKey } from '@/lib/llm';

export default function Home() {
  const {
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
    reset,
  } = useCalendarPlanner();

  const [lastInput, setLastInput] = useState<PlannerInput | null>(null);
  const [showPreviousWeeks, setShowPreviousWeeks] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const handleGenerate = async (input: PlannerInput) => {
    setLastInput(input);
    await generate(input);
  };

  const handleGenerateNext = async () => {
    if (lastInput) {
      await generateNext(lastInput);
    }
  };

  const handleReset = () => {
    reset();
    setLastInput(null);
  };

  const handleExportJSON = () => {
    if (!currentCalendar) return;
    
    const dataStr = JSON.stringify(currentCalendar, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calendar-week-${currentCalendar.weekNumber}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Reddit Mastermind
              </h1>
              <p className="text-sm text-gray-500">
                AI-Powered Content Calendar Planner
              </p>
            </div>
            {currentCalendar && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportJSON}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Export JSON
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-2 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50"
                >
                  Reset All
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Generation Mode Options */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Generation Mode
              </h2>
              
              {/* Mode Toggle */}
              <div className={`space-y-3 ${isGenerating ? 'opacity-60 pointer-events-none' : ''}`}>
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    checked={options.mode === 'titles-only'}
                    onChange={() => setOptions({ mode: 'titles-only' })}
                    disabled={isGenerating}
                    className="mt-1 w-4 h-4 text-indigo-600"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Titles Only</div>
                    <div className="text-sm text-gray-500">
                      Generate post titles, topics, and comment strategies. Fast, no API key needed.
                    </div>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    checked={options.mode === 'full-content'}
                    onChange={() => setOptions({ mode: 'full-content' })}
                    disabled={isGenerating}
                    className="mt-1 w-4 h-4 text-indigo-600"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Full Content</div>
                    <div className="text-sm text-gray-500">
                      Generate complete post bodies and natural comment threads using AI. Requires OpenAI API key.
                    </div>
                  </div>
                </label>
              </div>

              {/* API Key Input (shown when full-content mode selected and no env key) */}
              {options.mode === 'full-content' && (
                <div className={`mt-4 p-4 bg-indigo-50 rounded-lg ${isGenerating ? 'opacity-60' : ''}`}>
                  {hasEnvApiKey() ? (
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>OpenAI API key configured via environment</span>
                    </div>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-indigo-900 mb-2">
                        OpenAI API Key
                      </label>
                      <input
                        type="password"
                        value={options.openAIApiKey || ''}
                        onChange={(e) => setOptions({ openAIApiKey: e.target.value })}
                        placeholder="sk-..."
                        disabled={isGenerating}
                        className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <p className="mt-2 text-xs text-indigo-700">
                        Your key is stored locally and never sent to our servers.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Advanced Options Toggle */}
              <button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                disabled={isGenerating}
                className={`mt-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 ${isGenerating ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Advanced Options
              </button>

              {showAdvancedOptions && (
                <div className={`mt-4 space-y-4 pt-4 border-t ${isGenerating ? 'opacity-60 pointer-events-none' : ''}`}>
                  {/* Auto-Improvement Toggle (Full Content Mode Only) */}
                  {options.mode === 'full-content' && (
                    <label className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Auto-Improvement</div>
                        <div className="text-xs text-gray-500">Regenerate low-scoring posts (up to 2 retries)</div>
                      </div>
                      <button
                        onClick={() => setOptions({ autoImprove: !options.autoImprove })}
                        disabled={isGenerating}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          options.autoImprove ? 'bg-green-600' : 'bg-gray-200'
                        } ${isGenerating ? 'cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            options.autoImprove ? 'translate-x-5' : ''
                          }`}
                        />
                      </button>
                    </label>
                  )}

                  {/* LLM Quality Scoring Toggle */}
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">LLM Quality Scoring</div>
                      <div className="text-xs text-gray-500">Use AI to evaluate content quality</div>
                    </div>
                    <button
                      onClick={() => setOptions({ useLLMScoring: !options.useLLMScoring })}
                      disabled={isGenerating}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        options.useLLMScoring ? 'bg-indigo-600' : 'bg-gray-200'
                      } ${isGenerating ? 'cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          options.useLLMScoring ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </label>

                  {/* LLM Weight Slider */}
                  {options.useLLMScoring && (
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        LLM Score Weight: {Math.round((options.llmWeight || 0.3) * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={(options.llmWeight || 0.3) * 100}
                        onChange={(e) => setOptions({ llmWeight: parseInt(e.target.value) / 100 })}
                        disabled={isGenerating}
                        className="w-full disabled:cursor-not-allowed"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Rules Only</span>
                        <span>LLM Only</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Planning Configuration */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Planning Configuration
              </h2>
              <InputForm onSubmit={handleGenerate} isLoading={isGenerating} />
            </div>
          </div>

          {/* Calendar Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats and Actions */}
            {currentCalendar && stats && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Generation Results
                    </h2>
                    <p className="text-sm text-gray-500">
                      Mode: <span className="font-medium">{generationMode === 'full-content' ? 'Full Content (AI)' : 'Titles Only'}</span>
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateNext}
                    disabled={isGenerating || !lastInput}
                    className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                      isGenerating || !lastInput
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    Generate Next Week →
                  </button>
                </div>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {stats.postsGenerated}
                    </div>
                    <div className="text-sm text-gray-500">Posts Generated</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {stats.averageQualityScore}/10
                    </div>
                    <div className="text-sm text-gray-500">Avg Quality</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {stats.postsRejected}
                    </div>
                    <div className="text-sm text-gray-500">Rejected</div>
                  </div>
                </div>

                {/* Warnings */}
                {warnings.length > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="text-sm font-medium text-yellow-800 mb-2">
                      ⚠️ Warnings
                    </h3>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {warnings.map((w, i) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Violations */}
                {violations.length > 0 && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="text-sm font-medium text-red-800 mb-2">
                      🚨 Guardrail Violations
                    </h3>
                    <ul className="text-sm text-red-700 space-y-1">
                      {violations.slice(0, 5).map((v, i) => (
                        <li key={i}>
                          <span className={`font-medium ${v.severity === 'error' ? 'text-red-800' : 'text-yellow-700'}`}>
                            [{v.severity.toUpperCase()}]
                          </span>{' '}
                          {v.message}
                        </li>
                      ))}
                      {violations.length > 5 && (
                        <li className="text-gray-500">
                          ...and {violations.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h3 className="text-lg font-medium text-red-800 mb-2">
                  Generation Failed
                </h3>
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Current Calendar */}
            {currentCalendar && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <CalendarTable calendar={currentCalendar} showComments={true} />
              </div>
            )}

            {/* Previous Weeks */}
            {previousCalendars.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <button
                  onClick={() => setShowPreviousWeeks(!showPreviousWeeks)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <h2 className="text-lg font-semibold text-gray-900">
                    Previous Weeks ({previousCalendars.length})
                  </h2>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${showPreviousWeeks ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showPreviousWeeks && (
                  <div className="mt-4 space-y-6">
                    {previousCalendars.map((calendar) => (
                      <div key={calendar.id} className="border-t pt-6">
                        <CalendarTable calendar={calendar} showComments={false} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!currentCalendar && !error && !isGenerating && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Calendar Generated Yet
                </h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  Configure your company info, personas, subreddits, and target keywords, then click &quot;Generate Content Calendar&quot; to create your weekly plan.
                </p>
              </div>
            )}

            {/* Loading State */}
            {isGenerating && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {options.mode === 'full-content' ? 'Generating Full Content...' : 'Generating Calendar...'}
                </h3>
                <p className="text-gray-500">
                  {options.mode === 'full-content' 
                    ? 'Creating posts, comments, and evaluating quality with AI...'
                    : 'Analyzing personas, selecting topics, and scheduling posts...'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            Reddit Mastermind — Quality-first content planning for authentic Reddit engagement
          </p>
        </div>
      </footer>
    </div>
  );
}
