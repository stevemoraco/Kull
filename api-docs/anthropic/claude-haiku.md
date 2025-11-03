## Claude Haiku 4.5 (Anthropic)

Claude Haiku 4.5 is the speed-focused member of Anthropic’s Claude 4.5 family. It delivers near-frontier reasoning while keeping latency and price low enough for interactive agent loops, batched image reviews, and other throughput-heavy workflows.

### What it’s for
- High-volume image and text analysis where quick turnaround is critical.
- Autonomous or semi-autonomous workflows that need Claude 4.5 level judgement at the lowest per-token cost.
- Multi-modal prompts that combine Lightroom previews, contact sheets, or capture notes with textual instructions.

### Model identifiers
- Claude API model ID: `claude-haiku-4-5-20251001`
- Stable alias: `claude-haiku-4-5`
- AWS Bedrock ID: `anthropic.claude-haiku-4-5-20251001-v1:0`
- Google Vertex AI ID: `claude-haiku-4-5@20251001`

### Pricing (October 2025 schedule)
- Input: **$1.00 per million tokens**
- Output: **$5.00 per million tokens**
- Eligible for Anthropic batch discounts, prompt caching, and extended thinking surcharges (see pricing doc for exact tiers).

### Limits & performance
- Context window: **200K tokens**
- Maximum output: **64K tokens**
- Knowledge cutoff (reliable): **February 2025**
- Training data cutoff: **July 2025**
- Comparative latency: fastest option in the Claude 4.5 lineup.

### Capabilities
- Text + image inputs, text outputs (vision enabled).
- Full Messages API tool use, function calling, and conversation state features.
- Supports Anthropic’s extended thinking traces for deeper reasoning when needed.
- Works on Anthropic’s batch API as well as AWS Bedrock and Vertex AI routing.
