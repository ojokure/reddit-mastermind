'use client';

import React from 'react';
import { CalendarWeek, PlannedPost, PlannedComment } from '@/types';
import { formatDateTime } from '@/lib/planner';

interface CalendarTableProps {
  calendar: CalendarWeek;
  showComments?: boolean;
}

export function CalendarTable({ calendar, showComments = true }: CalendarTableProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getQualityColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50';
    if (score >= 7) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="overflow-x-auto">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Week of {formatDate(calendar.weekStart)} - {formatDate(calendar.weekEnd)}
          </h3>
          <p className="text-sm text-gray-500">
            {calendar.entries.length} posts scheduled
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Generated: {formatDateTime(new Date(calendar.generatedAt))}
        </div>
      </div>

      <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date & Time
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Persona
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Subreddit
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Post
            </th>
            {showComments && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Comments
              </th>
            )}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Quality
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {calendar.entries.map((post, index) => (
            <PostRow 
              key={post.id} 
              post={post} 
              index={index}
              showComments={showComments}
              getQualityColor={getQualityColor}
              formatDate={formatDate}
              formatTime={formatTime}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PostRowProps {
  post: PlannedPost;
  index: number;
  showComments: boolean;
  getQualityColor: (score: number) => string;
  formatDate: (date: Date) => string;
  formatTime: (date: Date) => string;
}

function PostRow({ 
  post, 
  index, 
  showComments, 
  getQualityColor,
  formatDate,
  formatTime,
}: PostRowProps) {
  const [commentsExpanded, setCommentsExpanded] = React.useState(false);
  const [contentExpanded, setContentExpanded] = React.useState(false);

  // Check if there's full content to show
  const hasFullBody = post.postBody && post.postBody.length > 0;
  const displayBody = hasFullBody ? post.postBody : post.bodyPreview;
  const isLongContent = displayBody && displayBody.length > 100;

  return (
    <>
      <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
        <td className="px-4 py-4 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900">
            {formatDate(post.day)}
          </div>
          <div className="text-sm text-gray-500">
            {formatTime(post.scheduledTime)}
          </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-xs font-medium text-indigo-600">
                {post.persona.username.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">
                {post.persona.username}
              </div>
              <div className="text-xs text-gray-500">
                {post.persona.role || 'Poster'}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {post.subreddit.name}
          </span>
        </td>
        <td className="px-4 py-4">
          <div className="max-w-md">
            <div className="text-sm font-medium text-gray-900 mb-1">
              {post.title}
            </div>
            <div className={`text-sm text-gray-500 ${!contentExpanded && isLongContent ? 'line-clamp-2' : ''}`}>
              {displayBody}
            </div>
            {isLongContent && (
              <button
                onClick={() => setContentExpanded(!contentExpanded)}
                className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {contentExpanded ? '← Show less' : 'Show full content →'}
              </button>
            )}
            {hasFullBody && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">
                Full content
              </span>
            )}
            <div className="mt-1 flex flex-wrap gap-1">
              {post.themeIds.map(id => (
                <span 
                  key={id}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                >
                  {id}
                </span>
              ))}
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                {post.postType}
              </span>
            </div>
          </div>
        </td>
        {showComments && (
          <td className="px-4 py-4">
            {post.comments.length > 0 ? (
              <button
                onClick={() => setCommentsExpanded(!commentsExpanded)}
                className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>{post.comments.length} comment{post.comments.length > 1 ? 's' : ''}</span>
                <svg 
                  className={`w-4 h-4 transition-transform ${commentsExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            ) : (
              <span className="text-sm text-gray-400">No comments</span>
            )}
          </td>
        )}
        <td className="px-4 py-4 whitespace-nowrap">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${getQualityColor(post.qualityScore)}`}>
            {post.qualityScore}/10
          </span>
        </td>
      </tr>
      
      {/* Expanded comments section */}
      {commentsExpanded && showComments && post.comments.length > 0 && (
        <tr>
          <td colSpan={6} className="px-4 py-4 bg-gray-50">
            <CommentsList comments={post.comments} postTime={post.scheduledTime} />
          </td>
        </tr>
      )}
    </>
  );
}

interface CommentsListProps {
  comments: PlannedComment[];
  postTime: Date;
}

function CommentsList({ comments, postTime }: CommentsListProps) {
  return (
    <div className="ml-8 space-y-3">
      <h4 className="text-sm font-medium text-gray-700">Planned Comments:</h4>
      {comments.map((comment, idx) => (
        <div 
          key={comment.id}
          className={`p-3 rounded-lg border ${
            comment.parentCommentId 
              ? 'ml-6 border-gray-200 bg-white' 
              : 'border-gray-300 bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-xs font-medium text-indigo-600">
                {comment.persona.username.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {comment.persona.username}
            </span>
            <span className="text-xs text-gray-500">
              +{comment.delayMinutes} min
            </span>
            {comment.parentCommentId && (
              <span className="text-xs text-gray-400">
                (reply)
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700">{comment.seedText}</p>
        </div>
      ))}
    </div>
  );
}

export default CalendarTable;
