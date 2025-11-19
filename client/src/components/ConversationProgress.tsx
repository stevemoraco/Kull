import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check, Circle } from 'lucide-react';

interface ConversationProgressProps {
  questionsAsked: Array<{ step: number; question: string }>;
  questionsAnswered: Array<{ step: number; question: string; answer: string }>;
  currentStep: number;
  totalSteps: number;
}

export const ConversationProgress: React.FC<ConversationProgressProps> = ({
  questionsAsked,
  questionsAnswered,
  currentStep,
  totalSteps,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(false);

  const progressPercentage = Math.round((questionsAnswered.length / totalSteps) * 100);
  const upcomingCount = totalSteps - questionsAnswered.length - 1; // -1 for current question

  // Find current question
  const currentQuestion = questionsAsked.find(q => q.step === currentStep);

  return (
    <div className="mb-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/50 transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* Circular progress indicator */}
            <svg className="w-10 h-10 transform -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - progressPercentage / 100)}`}
                className="text-green-500 transition-all duration-500"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
              {progressPercentage}%
            </span>
          </div>

          <div className="text-left">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              Conversation Progress
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </h3>
            <p className="text-sm text-gray-600">
              {questionsAnswered.length} of {totalSteps} questions answered
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
          <span>{progressPercentage}% complete</span>
        </div>
      </button>

      {/* Expandable content */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="px-6 pb-6 space-y-3">
          {/* Answered questions */}
          {questionsAnswered.length > 0 && (
            <div className="space-y-2">
              {questionsAnswered.map((qa, index) => (
                <div
                  key={`answered-${qa.step}`}
                  className="group bg-white rounded-lg p-4 border border-green-200 transition-all duration-300 hover:shadow-md animate-slideIn"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {qa.question}
                      </p>
                      <p className="text-sm text-gray-600 bg-gray-50 rounded px-3 py-2 border-l-2 border-green-500">
                        → {qa.answer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Current question */}
          {currentQuestion && (
            <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-400 animate-pulse-subtle">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                    <Circle className="w-3 h-3 text-white fill-current" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                      You are here
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-blue-400 to-transparent" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {currentQuestion.question}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming questions */}
          {upcomingCount > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowUpcoming(!showUpcoming)}
                className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Circle className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">
                    {upcomingCount} more question{upcomingCount !== 1 ? 's' : ''}...
                  </span>
                </div>
                {showUpcoming ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {showUpcoming && (
                <div className="mt-2 space-y-2 animate-slideDown">
                  {questionsAsked
                    .filter(q => q.step > currentStep)
                    .map((q, index) => (
                      <div
                        key={`upcoming-${q.step}`}
                        className="bg-white rounded-lg p-3 border border-gray-200 opacity-60"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
                              <span className="text-xs text-gray-400">{q.step}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">{q.question}</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {questionsAnswered.length === 0 && !currentQuestion && (
            <div className="text-center py-6 text-gray-500">
              <Circle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No questions answered yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulseSubtle {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
          }
        }

        .animate-slideIn {
          animation: slideIn 0.3s ease-out forwards;
        }

        .animate-slideDown {
          animation: slideDown 0.2s ease-out forwards;
        }

        .animate-pulse-subtle {
          animation: pulseSubtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
