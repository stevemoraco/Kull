/**
 * COMPLETE INTEGRATION EXAMPLE
 *
 * This file shows exactly how to integrate the StreamingEventDisplay
 * into SupportChat.tsx to handle ALL Responses API events.
 *
 * Copy relevant sections into your actual SupportChat.tsx file.
 */

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  StreamingEventDisplay,
  useStreamingState,
  type StreamingEvent
} from './components/StreamingEventDisplay';

// ============================================================================
// SECTION 1: Component Setup
// ============================================================================

export function SupportChatWithStreaming() {
  // Your existing state...
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');

  // ADD THIS: Streaming event state
  const { state: streamingState, handleEvent } = useStreamingState();

  // Your existing refs and other hooks...
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // SECTION 2: Send Message Function (with SSE parsing)
  // ============================================================================

  const sendMessage = async (text: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text
    };
    setMessages(prev => [...prev, userMessage]);

    // Create assistant message placeholder
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '__THINKING__' // Initial placeholder
    };
    setMessages(prev => [...prev, assistantMessage]);

    // Fetch streaming response
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: 'current-session-id'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              // ============================================================================
              // SECTION 3: Event Handling - THIS IS THE KEY PART
              // ============================================================================

              // Pass EVERY event to streaming state manager
              handleEvent(data as StreamingEvent);

              // Handle different event types
              if (data.type === 'status' && data.message) {
                // Status updates (existing code)
                console.log('[STATUS]', data.message);
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: data.message + '\n' }
                      : msg
                  )
                );
              }

              else if (data.type === 'delta' && data.content) {
                // Text streaming (existing code)
                fullContent += data.content;

                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: fullContent }
                      : msg
                  )
                );
              }

              // NEW EVENT HANDLERS - Add these:

              else if (data.type === 'reasoning_delta' && data.content) {
                // Reasoning is automatically handled by StreamingEventDisplay
                console.log('[REASONING DELTA]', data.content);
              }

              else if (data.type === 'reasoning_done' && data.text) {
                console.log('[REASONING COMPLETE]', data.text.length, 'chars');
              }

              else if (data.type === 'web_search_in_progress') {
                console.log('[WEB SEARCH] Started');
              }

              else if (data.type === 'web_search_searching') {
                console.log('[WEB SEARCH] Searching...');
              }

              else if (data.type === 'web_search_completed') {
                console.log('[WEB SEARCH] Completed');
              }

              else if (data.type === 'file_search_in_progress') {
                console.log('[FILE SEARCH] Started');
              }

              else if (data.type === 'file_search_searching') {
                console.log('[FILE SEARCH] Searching...');
              }

              else if (data.type === 'file_search_completed') {
                console.log('[FILE SEARCH] Completed');
              }

              else if (data.type === 'function_call_delta' && data.delta) {
                console.log('[FUNCTION CALL] Streaming args:', data.delta);
              }

              else if (data.type === 'function_call_done') {
                console.log('[FUNCTION CALL] Complete:', data.name, data.arguments);
              }

              else if (data.type === 'code_interpreter_in_progress') {
                console.log('[CODE] Starting...');
              }

              else if (data.type === 'code_interpreter_interpreting') {
                console.log('[CODE] Interpreting...');
              }

              else if (data.type === 'code_interpreter_code_delta' && data.code) {
                console.log('[CODE] Streaming:', data.code);
              }

              else if (data.type === 'code_interpreter_code_done' && data.code) {
                console.log('[CODE] Complete:', data.code.length, 'chars');
              }

              else if (data.type === 'code_interpreter_completed') {
                console.log('[CODE] Execution finished');
              }

              else if (data.type === 'image_gen_in_progress') {
                console.log('[IMAGE GEN] Starting...');
              }

              else if (data.type === 'image_gen_generating') {
                console.log('[IMAGE GEN] Generating...');
              }

              else if (data.type === 'image_gen_partial_image' && data.image_data) {
                console.log('[IMAGE GEN] Partial image received', data.partial_index);
              }

              else if (data.type === 'image_gen_completed') {
                console.log('[IMAGE GEN] Complete');
              }

              else if (data.type === 'done') {
                // Response completed
                console.log('[STREAM] Complete');

                if (data.usage) {
                  console.log('[USAGE]', data.usage);
                }
              }

              else if (data.type === 'error') {
                console.error('[ERROR]', data.message);
                throw new Error(data.message);
              }

            } catch (parseError) {
              console.error('[SSE] Parse error:', parseError);
            }
          }
        }
      }

      console.log('[STREAM] Finished, final content:', fullContent.length, 'chars');

    } catch (error) {
      console.error('[CHAT] Error:', error);

      // Show error message
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: 'Sorry, an error occurred. Please try again.' }
            : msg
        )
      );
    }
  };

  // ============================================================================
  // SECTION 4: Render Messages with StreamingEventDisplay
  // ============================================================================

  return (
    <div className="support-chat">
      <div className="messages-container">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            {msg.role === 'user' ? (
              // User message (simple)
              <div className="message-content">
                {msg.content}
              </div>
            ) : (
              // Assistant message with streaming events
              <div className="message-content">
                {/* ADD THIS: Streaming events display */}
                <StreamingEventDisplay
                  state={streamingState}
                  className="mb-4"
                />

                {/* Existing markdown rendering */}
                {msg.content && msg.content !== '__THINKING__' && (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                )}
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="input-area">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && inputText.trim()) {
              sendMessage(inputText);
              setInputText('');
            }
          }}
          placeholder="Type your message..."
          className="message-input"
        />
        <button
          onClick={() => {
            if (inputText.trim()) {
              sendMessage(inputText);
              setInputText('');
            }
          }}
          className="send-button"
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SECTION 5: Type Definitions
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ============================================================================
// SECTION 6: CSS Styles (add to your CSS file)
// ============================================================================

/*
.support-chat {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 800px;
  margin: 0 auto;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message {
  margin-bottom: 16px;
}

.user-message {
  text-align: right;
}

.user-message .message-content {
  display: inline-block;
  background: #3b82f6;
  color: white;
  padding: 12px 16px;
  border-radius: 18px;
  max-width: 70%;
}

.assistant-message .message-content {
  display: inline-block;
  background: white;
  border: 1px solid #e5e7eb;
  padding: 12px 16px;
  border-radius: 18px;
  max-width: 85%;
}

.input-area {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #e5e7eb;
  background: white;
}

.message-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 24px;
  outline: none;
  font-size: 14px;
}

.message-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.send-button {
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 24px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.send-button:hover {
  background: #2563eb;
}

.send-button:active {
  background: #1d4ed8;
}
*/

// ============================================================================
// SECTION 7: Testing Each Event Type
// ============================================================================

export function TestStreamingEvents() {
  const { state, handleEvent } = useStreamingState();

  const testReasoningEvent = () => {
    // Simulate reasoning streaming
    handleEvent({
      type: 'reasoning_delta',
      content: 'Let me think about this problem. ',
      item_id: 'test-reasoning-1'
    } as StreamingEvent);

    setTimeout(() => {
      handleEvent({
        type: 'reasoning_delta',
        content: 'I need to analyze the requirements first. ',
        item_id: 'test-reasoning-1'
      } as StreamingEvent);
    }, 500);

    setTimeout(() => {
      handleEvent({
        type: 'reasoning_done',
        text: 'Let me think about this problem. I need to analyze the requirements first. Now I can provide a comprehensive answer.',
        item_id: 'test-reasoning-1'
      } as StreamingEvent);
    }, 1000);
  };

  const testWebSearchEvent = () => {
    handleEvent({
      type: 'web_search_in_progress',
      item_id: 'test-search-1'
    } as StreamingEvent);

    setTimeout(() => {
      handleEvent({
        type: 'web_search_searching',
        item_id: 'test-search-1'
      } as StreamingEvent);
    }, 500);

    setTimeout(() => {
      handleEvent({
        type: 'web_search_completed',
        item_id: 'test-search-1'
      } as StreamingEvent);
    }, 2000);
  };

  const testFunctionCallEvent = () => {
    handleEvent({
      type: 'function_call_delta',
      delta: '{ "user',
      item_id: 'test-fn-1'
    } as StreamingEvent);

    setTimeout(() => {
      handleEvent({
        type: 'function_call_delta',
        delta: 'Id": "123',
        item_id: 'test-fn-1'
      } as StreamingEvent);
    }, 100);

    setTimeout(() => {
      handleEvent({
        type: 'function_call_done',
        name: 'getUserData',
        arguments: '{ "userId": "12345", "includeHistory": true }',
        item_id: 'test-fn-1'
      } as StreamingEvent);
    }, 500);
  };

  const testCodeInterpreterEvent = () => {
    handleEvent({
      type: 'code_interpreter_in_progress',
      item_id: 'test-code-1'
    } as StreamingEvent);

    setTimeout(() => {
      handleEvent({
        type: 'code_interpreter_interpreting',
        item_id: 'test-code-1'
      } as StreamingEvent);
    }, 300);

    setTimeout(() => {
      handleEvent({
        type: 'code_interpreter_code_delta',
        code: 'import pandas as pd\n',
        item_id: 'test-code-1'
      } as StreamingEvent);
    }, 600);

    setTimeout(() => {
      handleEvent({
        type: 'code_interpreter_code_delta',
        code: 'df = pd.read_csv("data.csv")\n',
        item_id: 'test-code-1'
      } as StreamingEvent);
    }, 900);

    setTimeout(() => {
      handleEvent({
        type: 'code_interpreter_code_done',
        code: 'import pandas as pd\ndf = pd.read_csv("data.csv")\nprint(df.head())',
        item_id: 'test-code-1'
      } as StreamingEvent);
    }, 1500);

    setTimeout(() => {
      handleEvent({
        type: 'code_interpreter_completed',
        item_id: 'test-code-1'
      } as StreamingEvent);
    }, 2000);
  };

  const testImageGenEvent = () => {
    handleEvent({
      type: 'image_gen_in_progress',
      item_id: 'test-img-1'
    } as StreamingEvent);

    setTimeout(() => {
      handleEvent({
        type: 'image_gen_generating',
        item_id: 'test-img-1'
      } as StreamingEvent);
    }, 500);

    // Simulate partial images (you'd need actual base64 data)
    setTimeout(() => {
      handleEvent({
        type: 'image_gen_partial_image',
        image_data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // 1x1 red pixel
        item_id: 'test-img-1',
        partial_index: 0
      } as StreamingEvent);
    }, 1000);

    setTimeout(() => {
      handleEvent({
        type: 'image_gen_completed',
        item_id: 'test-img-1'
      } as StreamingEvent);
    }, 3000);
  };

  const testAllEvents = () => {
    testReasoningEvent();

    setTimeout(() => testWebSearchEvent(), 1200);
    setTimeout(() => testFunctionCallEvent(), 3500);
    setTimeout(() => testCodeInterpreterEvent(), 5000);
    setTimeout(() => testImageGenEvent(), 7500);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Streaming Events</h1>

      <div className="space-x-2 mb-8">
        <button onClick={testReasoningEvent} className="px-4 py-2 bg-purple-500 text-white rounded">
          Test Reasoning
        </button>
        <button onClick={testWebSearchEvent} className="px-4 py-2 bg-blue-500 text-white rounded">
          Test Web Search
        </button>
        <button onClick={testFunctionCallEvent} className="px-4 py-2 bg-orange-500 text-white rounded">
          Test Function Call
        </button>
        <button onClick={testCodeInterpreterEvent} className="px-4 py-2 bg-gray-700 text-white rounded">
          Test Code Interpreter
        </button>
        <button onClick={testImageGenEvent} className="px-4 py-2 bg-pink-500 text-white rounded">
          Test Image Gen
        </button>
        <button onClick={testAllEvents} className="px-4 py-2 bg-green-500 text-white rounded">
          Test All Events
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <StreamingEventDisplay state={state} />
      </div>
    </div>
  );
}

// ============================================================================
// SECTION 8: Summary
// ============================================================================

/*
KEY INTEGRATION POINTS:

1. Import useStreamingState hook
   const { state, handleEvent } = useStreamingState();

2. Call handleEvent for EVERY SSE event
   handleEvent(data as StreamingEvent);

3. Render StreamingEventDisplay above message content
   <StreamingEventDisplay state={streamingState} />

4. Add event handlers for logging/debugging (optional)
   console.log('[WEB SEARCH] Started');

5. Update server to pass through all event types
   See STREAMING_EVENT_DISPLAY_INTEGRATION.md

That's it! The system automatically handles:
- State management for all event types
- Beautiful animated UI
- Interactive components
- Type safety

No need to manually track reasoning text, search status, function calls, etc.
The useStreamingState hook and StreamingEventDisplay component handle everything.
*/

export default SupportChatWithStreaming;
