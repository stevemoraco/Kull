## Claude Sonnet 4.5 (Anthropic)

Claude Sonnet 4.5 is the balanced, general-purpose flagship in the Claude 4.5 release. It pairs near-opus reasoning with latency and price that make it the default recommendation for new Anthropic deployments.

### Why pick Sonnet 4.5
- Best blend of intelligence, reasoning depth, and cost in the Claude portfolio.
- Excellent for complex agent loops, planning, and high-precision coding help.
- Handles image + text inputs with consistent output formatting for downstream automation.

### Model identifiers
- Claude API model ID: `claude-sonnet-4-5-20250929`
- Stable alias: `claude-sonnet-4-5`
- AWS Bedrock ID: `anthropic.claude-sonnet-4-5-20250929-v1:0`
- Google Vertex AI ID: `claude-sonnet-4-5@20250929`

### Pricing (October 2025 schedule)
- Input: **$3.00 per million tokens**
- Output: **$15.00 per million tokens**
- Eligible for Anthropic batch pricing, prompt caching discounts, extended thinking add-ons, and vision surcharges (see pricing doc for details).

### Limits & performance
- Base context window: **200K tokens**
- Optional 1M-token context (beta) via the `context-1m-2025-08-07` header.
- Maximum output: **64K tokens**
- Knowledge cutoff (reliable): **January 2025**
- Training data cutoff: **July 2025**
- Comparative latency: fast (slightly slower than Haiku, faster than Opus).

### Capabilities
- Full tool use / function calling with Messages API.
- Vision enabled (image + document inputs).
- Supports extended thinking traces for deeper reasoning steps.
- Available in the Anthropic Batch API, AWS Bedrock (global & regional endpoints), and Google Vertex AI.
