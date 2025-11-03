## Streaming Responses (Groq)

> ⚠️ Couldn’t grab a standalone streaming page from console.groq.com (likely embedded in the general Responses API docs). Capture the real instructions when you can authenticate through the console.

Things to document once available:
- How to enable SSE (`stream: true`) on `/openai/v1/chat/completions`-compatible endpoints.
- Event schema for Groq’s response deltas and_terminal events.
- Differences between streaming on reasoning models (e.g., flow-control headers) and standard text models.
- Error handling, retry guidance, and whether streaming is supported inside batch jobs or flex processing.
