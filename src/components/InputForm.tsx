'use client';

import React, { useState } from 'react';
import { Company, Persona, Subreddit, Theme, PlannerInput } from '@/types';
import { samplePlannerInput } from '@/data/sampleData';

interface InputFormProps {
  onSubmit: (input: PlannerInput) => void;
  isLoading?: boolean;
}

export function InputForm({ onSubmit, isLoading = false }: InputFormProps) {
  const [useSampleData, setUseSampleData] = useState(true);
  const [company, setCompany] = useState<Company>(samplePlannerInput.company);
  const [personas, setPersonas] = useState<Persona[]>(samplePlannerInput.personas);
  const [subreddits, setSubreddits] = useState<Subreddit[]>(samplePlannerInput.subreddits);
  const [themes, setThemes] = useState<Theme[]>(samplePlannerInput.themes);
  const [postsPerWeek, setPostsPerWeek] = useState(samplePlannerInput.postsPerWeek);

  // Simplified state for manual entry
  const [manualCompanyName, setManualCompanyName] = useState('');
  const [manualCompanyDesc, setManualCompanyDesc] = useState('');
  const [manualPersonasText, setManualPersonasText] = useState('');
  const [manualSubredditsText, setManualSubredditsText] = useState('');
  const [manualThemesText, setManualThemesText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (useSampleData) {
      onSubmit({
        company,
        personas,
        subreddits,
        themes,
        postsPerWeek,
      });
    } else {
      // Parse manual input
      const parsedPersonas = parsePersonas(manualPersonasText);
      const parsedSubreddits = parseSubreddits(manualSubredditsText);
      const parsedThemes = parseThemes(manualThemesText);
      
      onSubmit({
        company: {
          name: manualCompanyName,
          description: manualCompanyDesc,
        },
        personas: parsedPersonas,
        subreddits: parsedSubreddits,
        themes: parsedThemes,
        postsPerWeek,
      });
    }
  };

  const parsePersonas = (text: string): Persona[] => {
    return text.split('\n').filter(line => line.trim()).map((line, idx) => {
      const [username, ...infoParts] = line.split(':');
      return {
        id: username?.trim() || `persona_${idx}`,
        username: username?.trim() || `user_${idx}`,
        info: infoParts.join(':').trim() || 'A helpful community member',
        maxPostsPerWeek: 2,
      };
    });
  };

  const parseSubreddits = (text: string): Subreddit[] => {
    return text.split('\n').filter(line => line.trim()).map(line => ({
      name: line.trim().startsWith('r/') ? line.trim() : `r/${line.trim()}`,
      maxPostsPerWeek: 1,
    }));
  };

  const parseThemes = (text: string): Theme[] => {
    return text.split('\n').filter(line => line.trim()).map((line, idx) => ({
      id: `K${idx + 1}`,
      keyword: line.trim(),
      category: 'question' as const,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mode Toggle */}
      <div className={`flex items-center gap-4 p-4 bg-gray-50 rounded-lg ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={useSampleData}
            onChange={() => setUseSampleData(true)}
            disabled={isLoading}
            className="w-4 h-4 text-indigo-600"
          />
          <span className="text-sm font-medium text-gray-700">Use SlideForge Sample Data</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={!useSampleData}
            onChange={() => setUseSampleData(false)}
            disabled={isLoading}
            className="w-4 h-4 text-indigo-600"
          />
          <span className="text-sm font-medium text-gray-700">Enter Custom Data</span>
        </label>
      </div>

      {useSampleData ? (
        // Sample Data Preview
        <div className="space-y-4">
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Company: {company.name}</h3>
            <p className="text-sm text-gray-600">{company.description}</p>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Personas ({personas.length})</h3>
            <div className="flex flex-wrap gap-2">
              {personas.map(p => (
                <span key={p.id} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-sm">
                  {p.username}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Subreddits ({subreddits.length})</h3>
            <div className="flex flex-wrap gap-2">
              {subreddits.map(s => (
                <span key={s.name} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                  {s.name}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Themes/Keywords ({themes.length})</h3>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {themes.map(t => (
                <span key={t.id} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                  {t.keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Manual Entry Form
        <div className={`space-y-4 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              type="text"
              value={manualCompanyName}
              onChange={(e) => setManualCompanyName(e.target.value)}
              placeholder="e.g., Slideforge"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              required={!useSampleData}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Description
            </label>
            <textarea
              value={manualCompanyDesc}
              onChange={(e) => setManualCompanyDesc(e.target.value)}
              placeholder="Describe what your company does..."
              rows={2}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              required={!useSampleData}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Personas (one per line: username: description)
            </label>
            <textarea
              value={manualPersonasText}
              onChange={(e) => setManualPersonasText(e.target.value)}
              placeholder={`riley_ops: Head of operations at a SaaS startup
jordan_consults: Independent consultant working with startups`}
              rows={4}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              required={!useSampleData}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subreddits (one per line)
            </label>
            <textarea
              value={manualSubredditsText}
              onChange={(e) => setManualSubredditsText(e.target.value)}
              placeholder={`r/PowerPoint
r/startups
r/SaaS`}
              rows={3}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              required={!useSampleData}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Keywords/Themes (one per line)
            </label>
            <textarea
              value={manualThemesText}
              onChange={(e) => setManualThemesText(e.target.value)}
              placeholder={`best ai presentation maker
pitch deck generator
alternatives to PowerPoint`}
              rows={4}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              required={!useSampleData}
            />
          </div>
        </div>
      )}

      {/* Posts per week */}
      <div className={isLoading ? 'opacity-60' : ''}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Posts per Week
        </label>
        <select
          value={postsPerWeek}
          onChange={(e) => setPostsPerWeek(parseInt(e.target.value))}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {[1, 2, 3, 4, 5, 6, 7].map(n => (
            <option key={n} value={n}>{n} post{n > 1 ? 's' : ''} per week</option>
          ))}
        </select>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
          isLoading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-indigo-600 hover:bg-indigo-700'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
                fill="none"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Generating Calendar...
          </span>
        ) : (
          'Generate Content Calendar'
        )}
      </button>
    </form>
  );
}

export default InputForm;
