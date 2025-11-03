Search⌘K

Get started

[Overview](/docs/overview)

[Quickstart](/docs/quickstart)

[Models](/docs/models)

[Pricing](/docs/pricing)

[Libraries](/docs/libraries)

Core concepts

[Text generation](/docs/guides/text)

[Images and vision](/docs/guides/images-vision)

[Audio and speech](/docs/guides/audio)

[Structured output](/docs/guides/structured-outputs)

[Function calling](/docs/guides/function-calling)

[Using GPT-5](/docs/guides/latest-model)

[Migrate to Responses API](/docs/guides/migrate-to-responses)

Agents

[Overview](/docs/guides/agents)

Build agents

Deploy in your product

Optimize

[Voice agents](/docs/guides/voice-agents)

Tools

[Using tools](/docs/guides/tools)

[Connectors and MCP](/docs/guides/tools-connectors-mcp)

[Web search](/docs/guides/tools-web-search)

[Code interpreter](/docs/guides/tools-code-interpreter)

File search and retrieval

More tools

Run and scale

[Conversation state](/docs/guides/conversation-state)

[Background mode](/docs/guides/background)

[Streaming](/docs/guides/streaming-responses)

[Webhooks](/docs/guides/webhooks)

[File inputs](/docs/guides/pdf-files)

Prompting

Reasoning

Evaluation

[Getting started](/docs/guides/evaluation-getting-started)

[Working with evals](/docs/guides/evals)

[Prompt optimizer](/docs/guides/prompt-optimizer)

[External models](/docs/guides/external-models)

[Best practices](/docs/guides/evaluation-best-practices)

Realtime API

[Overview](/docs/guides/realtime)

Connect

Usage

Model optimization

[Optimization cycle](/docs/guides/model-optimization)

Fine-tuning

[Graders](/docs/guides/graders)

Specialized models

[Image generation](/docs/guides/image-generation)

[Video generation](/docs/guides/video-generation)

[Text to speech](/docs/guides/text-to-speech)

[Speech to text](/docs/guides/speech-to-text)

[Deep research](/docs/guides/deep-research)

[Embeddings](/docs/guides/embeddings)

[Moderation](/docs/guides/moderation)

Coding agents

[Codex cloud](https://developers.openai.com/codex/cloud)

[Agent internet access](https://developers.openai.com/codex/cloud/agent-internet)

[Local shell tool](/docs/guides/tools-local-shell)

[Codex CLI](https://developers.openai.com/codex/cli)

[Codex IDE](https://developers.openai.com/codex/ide)

[Codex changelog](https://developers.openai.com/codex/changelog)

Going live

[Production best practices](/docs/guides/production-best-practices)

Latency optimization

Cost optimization

[Accuracy optimization](/docs/guides/optimizing-llm-accuracy)

Safety

Specialized APIs

Assistants API

Resources

[Terms and policies](https://openai.com/policies)

[Changelog](/docs/changelog)

[Your data](/docs/guides/your-data)

[Rate limits](/docs/guides/rate-limits)

[Deprecations](/docs/deprecations)

[MCP for deep research](/docs/mcp)

[Developer mode](/docs/guides/developer-mode)

ChatGPT Actions

[Cookbook](https://cookbook.openai.com)[Forum](https://community.openai.com/categories)

[Models](/docs/models)

![gpt-5-codex](https://cdn.openai.com/API/docs/images/model-page/model-icons/gpt-5-codex.png)

GPT-5-Codex

Default

A version of GPT-5 optimized for agentic coding in Codex

A version of GPT-5 optimized for agentic coding in Codex

Compare

Reasoning

Higher

Speed

Medium

Price

$1.25•$10

Input•Output

Input

Text, image

Output

Text

GPT-5-Codex is a version of GPT-5 optimized for agentic coding tasks in [Codex](https://developers.openai.com/codex) or similar environments. It's available in the [Responses API](/docs/api-reference/responses) only and the underlying model snapshot will be regularly updated. If you want to learn more about prompting GPT-5-Codex, refer to our [dedicated guide](https://cookbook.openai.com/examples/gpt-5-codex_prompting_guide).

400,000 context window

128,000 max output tokens

Sep 30, 2024 knowledge cutoff

Reasoning token support

Pricing

Pricing is based on the number of tokens used, or other metrics based on the model type. For tool-specific models, like search and computer use, there's a fee per tool call. See details in the [pricing page](/docs/pricing).

Text tokens

Per 1M tokens

Input

$1.25

Cached input

$0.125

Output

$10.00

Quick comparison

Input

Cached input

Output

codex-mini-latest

$1.50

GPT-5-Codex

$1.25

GPT-5

$1.25

Modalities

Text

Input and output

Image

Input only

Audio

Not supported

Video

Not supported

Endpoints

Chat Completions

v1/chat/completions

Responses

v1/responses

Realtime

v1/realtime

Assistants

v1/assistants

Batch

v1/batch

Fine-tuning

v1/fine-tuning

Embeddings

v1/embeddings

Image generation

v1/images/generations

Videos

v1/videos

Image edit

v1/images/edits

Speech generation

v1/audio/speech

Transcription

v1/audio/transcriptions

Translation

v1/audio/translations

Moderation

v1/moderations

Completions (legacy)

v1/completions

Features

Streaming

Supported

Function calling

Supported

Structured outputs

Supported

Fine-tuning

Not supported

Distillation

Not supported

Predicted outputs

Not supported

Snapshots

Snapshots let you lock in a specific version of the model so that performance and behavior remain consistent. Below is a list of all available snapshots and aliases for GPT-5-Codex.

![gpt-5-codex](https://cdn.openai.com/API/docs/images/model-page/model-icons/gpt-5-codex.png)

gpt-5-codex

gpt-5-codex

gpt-5-codex

Rate limits

Rate limits ensure fair and reliable access to the API by placing specific caps on requests or tokens used within a given time period. Your usage tier determines how high these limits are set and automatically increases as you send more requests and spend more on the API.

Tier

RPM

TPM

Batch queue limit

Free

Not supported

Tier 1

500

500,000

1,500,000

Tier 2

5,000

1,000,000

3,000,000

Tier 3

5,000

2,000,000

100,000,000

Tier 4

10,000

4,000,000

200,000,000

Tier 5

15,000

10,000,000

15,000,000,000