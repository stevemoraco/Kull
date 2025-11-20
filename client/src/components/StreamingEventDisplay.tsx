/**
 * STREAMING EVENT DISPLAY - Comprehensive UI for ALL Responses API Events
 *
 * This component handles and beautifully displays ALL OpenAI Responses API streaming events:
 * - Text streaming (response.output_text.delta)
 * - Reasoning summaries (response.reasoning_summary_text.delta)
 * - Web search (response.web_search_call.*)
 * - File search (response.file_search_call.*)
 * - Function calls (response.function_call_arguments.*)
 * - Code interpreter (response.code_interpreter_call.*)
 * - Image generation (response.image_generation_call.*)
 * - Audio (response.audio.*)
 * - And more...
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type StreamingEvent =
  | TextDeltaEvent
  | TextDoneEvent
  | ReasoningDeltaEvent
  | ReasoningDoneEvent
  | WebSearchEvent
  | FileSearchEvent
  | FunctionCallEvent
  | CodeInterpreterEvent
  | ImageGenEvent
  | AudioEvent
  | LifecycleEvent
  | ErrorEvent;

export interface TextDeltaEvent {
  type: 'text.delta' | 'delta';
  content: string;
  output_index?: number;
}

export interface TextDoneEvent {
  type: 'text.done' | 'done';
  text?: string;
  finish_reason?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    prompt_tokens_details?: {
      cached_tokens: number;
    };
  };
}

export interface ReasoningDeltaEvent {
  type: 'reasoning.delta' | 'reasoning_delta';
  content: string;
  item_id: string;
}

export interface ReasoningDoneEvent {
  type: 'reasoning.done' | 'reasoning_done';
  text: string;
  item_id: string;
}

export interface WebSearchEvent {
  type: 'web_search.in_progress' | 'web_search.searching' | 'web_search.completed'
    | 'web_search_in_progress' | 'web_search_searching' | 'web_search_completed';
  item_id: string;
  output_index?: number;
}

export interface FileSearchEvent {
  type: 'file_search.in_progress' | 'file_search.searching' | 'file_search.completed'
    | 'file_search_in_progress' | 'file_search_searching' | 'file_search_completed';
  item_id: string;
}

export interface FunctionCallEvent {
  type: 'function_call.delta' | 'function_call.done'
    | 'function_call_delta' | 'function_call_done';
  item_id: string;
  delta?: string;
  arguments?: string;
  name?: string;
}

export interface CodeInterpreterEvent {
  type: 'code_interpreter.in_progress' | 'code_interpreter.interpreting'
    | 'code_interpreter.code_delta' | 'code_interpreter.code_done' | 'code_interpreter.completed'
    | 'code_interpreter_in_progress' | 'code_interpreter_interpreting'
    | 'code_interpreter_code_delta' | 'code_interpreter_code_done' | 'code_interpreter_completed';
  item_id: string;
  code?: string;
  delta?: string;
}

export interface ImageGenEvent {
  type: 'image_gen.in_progress' | 'image_gen.generating' | 'image_gen.partial_image' | 'image_gen.completed'
    | 'image_gen_in_progress' | 'image_gen_generating' | 'image_gen_partial_image' | 'image_gen_completed';
  item_id: string;
  image_data?: string; // Base64
  partial_index?: number;
}

export interface AudioEvent {
  type: 'audio.delta' | 'audio.done' | 'audio.transcript.delta' | 'audio.transcript.done';
  delta?: string;
  item_id?: string;
}

export interface LifecycleEvent {
  type: 'response.created' | 'response.in_progress' | 'response.completed'
    | 'response_created' | 'response_in_progress';
  response_id?: string;
}

export interface ErrorEvent {
  type: 'error';
  message: string;
  code?: string;
}

// ============================================================================
// STREAMING EVENT STATE MANAGER
// ============================================================================

export interface StreamingState {
  isReasoningVisible: boolean;
  reasoningText: string;
  webSearchActive: boolean;
  fileSearchActive: boolean;
  functionCalls: Map<string, { name: string; args: string; complete: boolean }>;
  codeInterpreter: Map<string, { code: string; complete: boolean }>;
  images: Map<string, { data: string; partialCount: number }>;
}

export function useStreamingState() {
  const [state, setState] = useState<StreamingState>({
    isReasoningVisible: false,
    reasoningText: '',
    webSearchActive: false,
    fileSearchActive: false,
    functionCalls: new Map(),
    codeInterpreter: new Map(),
    images: new Map(),
  });

  const handleEvent = (event: StreamingEvent) => {
    setState(prev => {
      const next = { ...prev };

      // Handle reasoning
      if (event.type === 'reasoning.delta' || event.type === 'reasoning_delta') {
        next.reasoningText += event.content;
        next.isReasoningVisible = true;
      } else if (event.type === 'reasoning.done' || event.type === 'reasoning_done') {
        next.reasoningText = event.text;
      }

      // Handle web search
      if (event.type.includes('web_search')) {
        if (event.type.includes('in_progress') || event.type.includes('searching')) {
          next.webSearchActive = true;
        } else if (event.type.includes('completed')) {
          next.webSearchActive = false;
        }
      }

      // Handle file search
      if (event.type.includes('file_search')) {
        if (event.type.includes('in_progress') || event.type.includes('searching')) {
          next.fileSearchActive = true;
        } else if (event.type.includes('completed')) {
          next.fileSearchActive = false;
        }
      }

      // Handle function calls
      if (event.type.includes('function_call')) {
        const fnEvent = event as FunctionCallEvent;
        const existing = next.functionCalls.get(fnEvent.item_id) || { name: '', args: '', complete: false };

        if (event.type.includes('delta')) {
          existing.args += fnEvent.delta || '';
        } else if (event.type.includes('done')) {
          existing.name = fnEvent.name || '';
          existing.args = fnEvent.arguments || existing.args;
          existing.complete = true;
        }

        next.functionCalls = new Map(next.functionCalls);
        next.functionCalls.set(fnEvent.item_id, existing);
      }

      // Handle code interpreter
      if (event.type.includes('code_interpreter')) {
        const codeEvent = event as CodeInterpreterEvent;
        const existing = next.codeInterpreter.get(codeEvent.item_id) || { code: '', complete: false };

        if (event.type.includes('code_delta')) {
          existing.code += codeEvent.delta || '';
        } else if (event.type.includes('code_done')) {
          existing.code = codeEvent.code || existing.code;
        } else if (event.type.includes('completed')) {
          existing.complete = true;
        }

        next.codeInterpreter = new Map(next.codeInterpreter);
        next.codeInterpreter.set(codeEvent.item_id, existing);
      }

      // Handle image generation
      if (event.type.includes('image_gen')) {
        const imgEvent = event as ImageGenEvent;

        if (event.type.includes('partial_image')) {
          const existing = next.images.get(imgEvent.item_id) || { data: '', partialCount: 0 };
          existing.data = imgEvent.image_data || existing.data;
          existing.partialCount += 1;

          next.images = new Map(next.images);
          next.images.set(imgEvent.item_id, existing);
        }
      }

      return next;
    });
  };

  return { state, handleEvent };
}

// ============================================================================
// UI COMPONENTS FOR EACH EVENT TYPE
// ============================================================================

export const ReasoningDisplay: React.FC<{ text: string; isExpanded: boolean; onToggle: () => void }> = ({
  text,
  isExpanded,
  onToggle
}) => {
  if (!text) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-4 border border-purple-200 rounded-lg overflow-hidden bg-purple-50"
    >
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-purple-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧠</span>
          <span className="font-semibold text-purple-900">AI Thinking</span>
        </div>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-3 text-sm text-purple-800 border-t border-purple-200 bg-white"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const WebSearchIndicator: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="mb-4 flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg"
    >
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="text-2xl"
      >
        🔍
      </motion.span>
      <div>
        <div className="font-semibold text-blue-900">Searching the web...</div>
        <div className="text-sm text-blue-700">Finding relevant information</div>
      </div>
    </motion.div>
  );
};

export const FileSearchIndicator: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="mb-4 flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg"
    >
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="text-2xl"
      >
        📁
      </motion.span>
      <div>
        <div className="font-semibold text-green-900">Searching files...</div>
        <div className="text-sm text-green-700">Looking through documents</div>
      </div>
    </motion.div>
  );
};

export const FunctionCallDisplay: React.FC<{
  calls: Map<string, { name: string; args: string; complete: boolean }>
}> = ({ calls }) => {
  if (calls.size === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {Array.from(calls.entries()).map(([id, call]) => (
        <motion.div
          key={id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{call.complete ? '✅' : '⚡'}</span>
            <span className="font-semibold text-orange-900">
              Calling function: {call.name || 'Unknown'}
            </span>
          </div>
          {call.args && (
            <pre className="text-xs bg-white p-2 rounded border border-orange-100 overflow-x-auto text-orange-800 font-mono">
              {call.args}
            </pre>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export const CodeInterpreterDisplay: React.FC<{
  code: Map<string, { code: string; complete: boolean }>
}> = ({ code }) => {
  if (code.size === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {Array.from(code.entries()).map(([id, codeBlock]) => (
        <motion.div
          key={id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          <div className="px-4 py-2 bg-gray-100 flex items-center gap-2">
            <span className="text-xl">{codeBlock.complete ? '✅' : '⚙️'}</span>
            <span className="font-semibold text-gray-900">Code Execution</span>
          </div>
          <pre className="p-4 bg-gray-900 text-green-400 text-sm overflow-x-auto font-mono">
            {codeBlock.code}
          </pre>
        </motion.div>
      ))}
    </div>
  );
};

export const ImageGenerationDisplay: React.FC<{
  images: Map<string, { data: string; partialCount: number }>
}> = ({ images }) => {
  if (images.size === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {Array.from(images.entries()).map(([id, img]) => (
        <motion.div
          key={id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border border-pink-200 rounded-lg overflow-hidden bg-pink-50 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🎨</span>
            <span className="font-semibold text-pink-900">Generating image...</span>
            <span className="text-sm text-pink-600">({img.partialCount} updates)</span>
          </div>
          {img.data && (
            <motion.img
              key={img.partialCount}
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.3 }}
              src={`data:image/png;base64,${img.data}`}
              alt="Generated image"
              className="w-full rounded-lg"
            />
          )}
        </motion.div>
      ))}
    </div>
  );
};

// ============================================================================
// MAIN STREAMING EVENT DISPLAY COMPONENT
// ============================================================================

export interface StreamingEventDisplayProps {
  /** Current streaming state */
  state: StreamingState;

  /** Optional: Control reasoning visibility externally */
  reasoningExpanded?: boolean;
  onReasoningToggle?: () => void;

  /** Optional: Custom styling */
  className?: string;
}

export const StreamingEventDisplay: React.FC<StreamingEventDisplayProps> = ({
  state,
  reasoningExpanded = false,
  onReasoningToggle,
  className = ''
}) => {
  const [internalReasoningExpanded, setInternalReasoningExpanded] = useState(false);

  const isReasoningExpanded = onReasoningToggle !== undefined ? reasoningExpanded : internalReasoningExpanded;
  const handleReasoningToggle = onReasoningToggle || (() => setInternalReasoningExpanded(!internalReasoningExpanded));

  return (
    <div className={`streaming-events ${className}`}>
      <AnimatePresence>
        {/* Reasoning Summary */}
        {state.reasoningText && (
          <ReasoningDisplay
            key="reasoning"
            text={state.reasoningText}
            isExpanded={isReasoningExpanded}
            onToggle={handleReasoningToggle}
          />
        )}

        {/* Web Search */}
        {state.webSearchActive && <WebSearchIndicator key="web-search" active={true} />}

        {/* File Search */}
        {state.fileSearchActive && <FileSearchIndicator key="file-search" active={true} />}

        {/* Function Calls */}
        {state.functionCalls.size > 0 && (
          <FunctionCallDisplay key="function-calls" calls={state.functionCalls} />
        )}

        {/* Code Interpreter */}
        {state.codeInterpreter.size > 0 && (
          <CodeInterpreterDisplay key="code-interpreter" code={state.codeInterpreter} />
        )}

        {/* Image Generation */}
        {state.images.size > 0 && (
          <ImageGenerationDisplay key="images" images={state.images} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StreamingEventDisplay;
