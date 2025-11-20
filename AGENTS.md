# AGENTS.md

**Critical instructions for AI agents working on this codebase**

---

# 🚨 STOP AND READ THIS FIRST 🚨

## THIS PROJECT USES OPENAI'S RESPONSES API

### The Basics

**API:** OpenAI Responses API (NOT Chat Completions)
**Default Model:** gpt-5-nano (NOT gpt-4o, gpt-4o-mini, or any gpt-4 model)
**API Endpoint:** `openai.responses.create()` (NOT `openai.chat.completions.create()`)

### Why This Matters

The Responses API was introduced in 2025 as OpenAI's new recommended API. It replaces Chat Completions with:
- Better performance (3% improvement on SWE-bench)
- Lower costs (40-80% better cache utilization)
- Built-in tools (web_search, file_search, code_interpreter, etc.)
- Native reasoning support
- Stateful context with `store: true`

**Chat Completions is deprecated. Do not use it.**

---

## Common Mistakes (DO NOT MAKE THESE)

### ❌ MISTAKE #1: "gpt-5-nano doesn't exist"

**Wrong thinking:** "GPT-5 hasn't been released yet, so I'll change it to gpt-4o-mini"

**Correct thinking:** gpt-5-nano EXISTS as of 2025. It is a real model. Use it.

### ❌ MISTAKE #2: "I'll use Chat Completions because I'm familiar with it"

**Wrong code:**
```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  stream: true
});
```

**Correct code:**
```typescript
const response = await openai.responses.create({
  model: 'gpt-5-nano',
  input: [...],
  text: { format: { type: 'text' }, verbosity: 'low' },
  reasoning: { effort: 'minimal', summary: 'auto' },
  stream: true,
  store: true,
  include: ['reasoning.encrypted_content']
});
```

### ❌ MISTAKE #3: "The streaming format is the same"

**Wrong:** Assuming chunks have `choices[0].delta.content`

**Correct:** Responses API chunks have a `type` field:
- `response.output_text.delta` - text content chunks
- `response.completed` - response finished
- `response.content_part.done` - reasoning blocks complete

---

## Required Reading

Before making ANY changes to AI-related code:

1. Read `/home/runner/workspace/CLAUDE.md` lines 7-61
2. Read `/home/runner/workspace/server/chatService.ts` lines 1093-1320
3. Review OpenAI docs: https://platform.openai.com/docs/guides/responses

---

## Verification Checklist

Before submitting changes, verify:

- [ ] Using `openai.responses.create()` (not `openai.chat.completions.create()`)
- [ ] Using `gpt-5-nano` as default model (not gpt-4o or gpt-4o-mini)
- [ ] Using `input` parameter (not `messages`)
- [ ] Using `text.format` for structured outputs (not `response_format`)
- [ ] Handling Responses API streaming format (not Chat Completions format)
- [ ] Setting `store: true` for prompt caching
- [ ] Including `reasoning.encrypted_content` in the `include` array

---

## When In Doubt

**ASK THE USER BEFORE CHANGING:**
- Model names
- API endpoints
- Streaming parsers
- Request/response formats

**The user knows this codebase uses Responses API. If you think it's wrong, you're probably mistaken.**

---

## Emergency Recovery

If you accidentally changed the code to use Chat Completions:

1. Revert to using `openai.responses.create()`
2. Change `messages` back to `input`
3. Change `response_format` back to `text.format`
4. Restore streaming parser to handle `response.output_text.delta` chunks
5. Apologize profusely to the user
6. Read this file again

---

Last updated: 2025-01-20
