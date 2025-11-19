import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check, Circle, ChevronRight } from 'lucide-react';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(false);

  const progressPercentage = Math.round((questionsAnswered.length / totalSteps) * 100);
  const upcomingCount = totalSteps - questionsAnswered.length - 1; // -1 for current question

  // Find current question
  const currentQuestion = questionsAsked.find(q => q.step === currentStep);

  // Get next 2 upcoming questions
  const upcomingQuestions = questionsAsked
    .filter(q => q.step > currentStep)
    .slice(0, 2);

  // Remaining questions after showing 2
  const remainingCount = Math.max(0, upcomingCount - upcomingQuestions.length);

  return (
    <div className="transition-all duration-300">
      {/* Header - Compact collapsed state */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-2 py-1 flex items-center justify-between bg-blue-500/90 backdrop-blur-sm hover:bg-blue-600/90 transition-colors duration-200 rounded-md shadow-sm"
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            {/* Circular progress indicator - smaller */}
            <svg className="w-4 h-4 transform -rotate-90">
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                className="text-white/30"
              />
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 6}`}
                strokeDashoffset={`${2 * Math.PI * 6 * (1 - progressPercentage / 100)}`}
                className="text-white transition-all duration-500"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="text-left">
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
              Progress: {questionsAnswered.length}/{totalSteps}
              {isExpanded ? (
                <ChevronUp className="w-3 h-3 text-white/80" />
              ) : (
                <ChevronDown className="w-3 h-3 text-white/80" />
              )}
            </h3>
          </div>
        </div>
      </button>

      {/* Expandable content */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="px-6 pb-6 pt-3 space-y-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-b-xl shadow-sm border-x border-b border-gray-200">
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

          {/* Next 2 upcoming questions */}
          {upcomingQuestions.length > 0 && (
            <div className="space-y-2">
              {upcomingQuestions.map((q, index) => (
                <div
                  key={`preview-${q.step}`}
                  className="bg-white/50 rounded-lg p-3 border border-gray-200/60 opacity-60"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 border-l-2 border-gray-300 pl-2">
                        {index === 0 ? 'Next: ' : 'Coming soon: '}
                        {q.question}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Remaining questions (collapsible) */}
          {remainingCount > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowUpcoming(!showUpcoming)}
                className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Circle className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">
                    {remainingCount} more question{remainingCount !== 1 ? 's' : ''}...
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
                    .slice(2) // Skip the first 2 (already shown above)
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
