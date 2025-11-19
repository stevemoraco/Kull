import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check, Circle, ChevronRight } from 'lucide-react';
import { SALES_SCRIPT_QUESTIONS } from '@/../../shared/salesScript';

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

  // Get ALL upcoming questions from the sales script (not just the ones asked)
  const allUpcomingQuestions = SALES_SCRIPT_QUESTIONS
    .filter(q => q.step > currentStep)
    .map(q => ({ step: q.step, question: q.question }));

  // Get next 2 upcoming questions
  const upcomingQuestions = allUpcomingQuestions.slice(0, 2);

  // Remaining questions after showing 2
  const remainingQuestions = allUpcomingQuestions.slice(2);
  const remainingCount = remainingQuestions.length;

  return (
    <div className="transition-all duration-300 bg-transparent">
      <div className="m-5 border-2 border-cyan-500 rounded-lg shadow-xl bg-white overflow-hidden">
      {/* Header - Compact collapsed state */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 transition-all duration-200 shadow-sm"
      >
        {!isExpanded && (
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
              </h3>
            </div>
          </div>
        )}
        <div className={isExpanded ? 'w-full flex justify-end' : ''}>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-white" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white" />
          )}
        </div>
      </button>

      {/* Expandable content */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-y-auto overflow-x-hidden bg-gray-100`}
      >
        <div className="px-4 pb-4 pt-2 space-y-1.5">
          {/* Answered questions */}
          {questionsAnswered.length > 0 && (
            <div className="space-y-1.5">
              {questionsAnswered.map((qa, index) => (
                <div
                  key={`answered-${qa.step}`}
                  className="group bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg p-2.5 transition-all duration-300 hover:shadow-md animate-slideIn"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white mb-1">
                        {qa.question}
                      </p>
                      <p className="text-xs text-white/90 bg-white/10 rounded px-2 py-1 border-l-2 border-white/40">
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
            <div className="relative bg-gradient-to-r from-amber-400 to-yellow-500 rounded-lg p-2.5 animate-pulse-subtle">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-5 h-5 rounded-full bg-amber-900/20 flex items-center justify-center animate-pulse">
                    <Circle className="w-2.5 h-2.5 text-amber-900 fill-current" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                      You are here
                    </span>
                    <div className="flex-1 h-px bg-amber-900/40" />
                  </div>
                  <p className="text-xs font-semibold text-amber-900">
                    {currentQuestion.question}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Next 2 upcoming questions */}
          {upcomingQuestions.length > 0 && (
            <div className="space-y-1.5">
              {upcomingQuestions.map((q, index) => (
                <div
                  key={`preview-${q.step}`}
                  className="bg-gradient-to-r from-gray-400 to-gray-500 rounded-lg p-2.5 opacity-70"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      <ChevronRight className="w-4 h-4 text-white/70" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-white border-l-2 border-white/40 pl-2">
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
            <div className="mt-2">
              <button
                onClick={() => setShowUpcoming(!showUpcoming)}
                className="w-full flex items-center justify-between p-2 bg-white rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Circle className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-medium">
                    {remainingCount} more question{remainingCount !== 1 ? 's' : ''}...
                  </span>
                </div>
                {showUpcoming ? (
                  <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                )}
              </button>

              {showUpcoming && remainingQuestions.length > 0 && (
                <div className="mt-1.5 space-y-1.5 max-h-48 overflow-y-auto overflow-x-hidden bg-white border border-gray-200 rounded-lg p-2">
                  {remainingQuestions.map((q, index) => (
                    <div
                      key={`upcoming-${q.step}`}
                      className="bg-gradient-to-r from-gray-300 to-gray-400 rounded-lg p-2.5"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-4 h-4 rounded-full border-2 border-white/60 flex items-center justify-center">
                            <span className="text-xs text-white font-semibold">{q.step}</span>
                          </div>
                        </div>
                        <p className="text-xs text-white">{q.question}</p>
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
            box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.1);
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
