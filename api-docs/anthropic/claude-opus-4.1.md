## Claude Opus 4.1 (Anthropic)

Claude Opus 4.1 is the highest-intelligence model in the Claude 4.x lineage. It targets the toughest reasoning, analysis, and creative problem-solving workloads where accuracy matters more than latency or cost.

### When to use Opus 4.1
- Complex decision-making or adjudication that demands the deepest Claude reasoning.
- Long-chain agent loops where intermediate tool calls require nuanced interpretation.
- Premium customer deliverables—portfolio culling narratives, creative briefs, shot recommendations—where output quality trumps runtime.

### Model identifiers
- Claude API model ID: `claude-opus-4-1-20250805`
- Stable alias: `claude-opus-4-1`
- AWS Bedrock ID: `anthropic.claude-opus-4-1-20250805-v1:0`
- Google Vertex AI ID: `claude-opus-4-1@20250805`

### Pricing (October 2025 schedule)
- Input: **$15.00 per million tokens**
- Output: **$75.00 per million tokens**
- Eligible for Anthropic’s batch pricing, prompt caching, and extended thinking programs (check pricing doc for latest multipliers).

### Limits & performance
- Context window: **200K tokens**
- Maximum output: **32K tokens**
- Knowledge cutoff (reliable): **January 2025**
- Training data cutoff: **March 2025**
- Comparative latency: moderate (slowest option in the Claude 4.5 line-up).

### Capabilities
- Multimodal (images + text) with full Messages API tool use.
- Supports extended thinking traces to expose reasoning steps.
- Ideal for cross-provider orchestration when you need a “highest confidence” judge in your agent ensemble.
