# OpenAI Responses API - Streaming Events Documentation

## Overview
When you create a Response with `stream: true`, the server will emit server-sent events to the client as the Response is generated.

## Event Types

### Response Lifecycle Events

#### `response.created`
Emitted when a response is created.
- `response`: object - The response that was created
- `sequence_number`: integer - The sequence number for this event
- `type`: string - Always "response.created"

#### `response.queued`
Emitted when a response is queued and waiting to be processed.
- `response`: object - The full response object that is queued
- `sequence_number`: integer - The sequence number for this event
- `type`: string - Always "response.queued"

#### `response.in_progress`
Emitted when the response is in progress.
- `response`: object - The response that is in progress
- `sequence_number`: integer - The sequence number of this event
- `type`: string - Always "response.in_progress"

#### `response.completed`
Emitted when the model response is complete.
- `response`: object - Properties of the completed response
- `sequence_number`: integer - The sequence number for this event
- `type`: string - Always "response.completed"

#### `response.failed`
Emitted when a response fails.
- `response`: object - The response that failed
- `sequence_number`: integer - The sequence number of this event
- `type`: string - Always "response.failed"

#### `response.incomplete`
Emitted when a response finishes as incomplete.
- `response`: object - The response that was incomplete
- `sequence_number`: integer - The sequence number of this event
- `type`: string - Always "response.incomplete"

### Output Item Events

#### `response.output_item.added`
Emitted when a new output item is added.
- `item`: object - The output item that was added
- `output_index`: integer - The index of the output item that was added
- `sequence_number`: integer - The sequence number of this event
- `type`: string - Always "response.output_item.added"

#### `response.output_item.done`
Emitted when an output item is marked done.
- `item`: object - The output item that was marked done
- `output_index`: integer - The index of the output item that was marked done
- `sequence_number`: integer - The sequence number of this event
- `type`: string - Always "response.output_item.done"

### Content Part Events

#### `response.content_part.added`
Emitted when a new content part is added.
- `content_index`: integer - The index of the content part that was added
- `item_id`: string - The ID of the output item that the content part was added to
- `output_index`: integer - The index of the output item that the content part was added to
- `part`: object - The content part that was added
- `sequence_number`: integer - The sequence number of this event
- `type`: string - Always "response.content_part.added"

#### `response.content_part.done`
Emitted when a content part is done.
- `content_index`: integer - The index of the content part that is done
- `item_id`: string - The ID of the output item that the content part was added to
- `output_index`: integer - The index of the output item that the content part was added to
- `part`: object - The content part that is done
- `sequence_number`: integer - The sequence number of this event
- `type`: string - Always "response.content_part.done"

### Text Streaming Events

#### `response.output_text.delta`
Emitted when there is an additional text delta.
- `content_index`: integer - The index of the content part that the text delta was added to
- `delta`: string - The text delta that was added
- `item_id`: string - The ID of the output item that the text delta was added to
- `logprobs`: array - The log probabilities of the tokens in the delta (optional)
- `output_index`: integer - The index of the output item that the text delta was added to
- `sequence_number`: integer - The sequence number for this event
- `type`: string - Always "response.output_text.delta"

#### `response.output_text.done`
Emitted when text content is finalized.
- `content_index`: integer - The index of the content part that the text content is finalized
- `item_id`: string - The ID of the output item that the text content is finalized
- `logprobs`: array - The log probabilities of the tokens (optional)
- `output_index`: integer - The index of the output item that the text content is finalized
- `sequence_number`: integer - The sequence number for this event
- `text`: string - The text content that is finalized
- `type`: string - Always "response.output_text.done"

#### `response.output_text.annotation.added`
Emitted when an annotation is added to output text content.
- `annotation`: object - The annotation object being added
- `annotation_index`: integer - The index of the annotation within the content part
- `content_index`: integer - The index of the content part within the output item
- `item_id`: string - The unique identifier of the item to which the annotation is being added
- `output_index`: integer - The index of the output item in the response's output array
- `sequence_number`: integer - The sequence number of this event
- `type`: string - Always "response.output_text.annotation.added"

### Refusal Events

#### `response.refusal.delta`
Emitted when there is a partial refusal text.
- `content_index`: integer - The index of the content part that the refusal text is added to
- `delta`: string - The refusal text that is added
- `item_id`: string - The ID of the output item that the refusal text is added to
- `output_index`: integer - The index of the output item that the refusal text is added to
- `sequence_number`: integer - The sequence number of this event
- `type`: string - Always "response.refusal.delta"

#### `response.refusal.done`
Emitted when refusal text is finalized.
- `content_index`: integer - The index of the content part that the refusal text is finalized
- `item_id`: string - The ID of the output item that the refusal text is finalized
- `output_index`: integer - The index of the output item that the refusal text is finalized
- `refusal`: string - The refusal text that is finalized
- `sequence_number`: integer - The sequence number of this event
- `type`: string - Always "response.refusal.done"

### Function Call Events

#### `response.function_call_arguments.delta`
Emitted when there is a partial function-call arguments delta.
- `delta`: string - The function-call arguments delta that is added
- `item_id`: string - The ID of the output item that the function-call arguments delta is added to
- `output_index`: integer - The index of the output item that the function-call arguments delta is added to
- `sequence_number`: integer - The sequence number of this event
- `type`: string - Always "response.function_call_arguments.delta"

#### `response.function_call_arguments.done`
Emitted when function-call arguments are finalized.
- `arguments`: string - The function-call arguments
- `item_id`: string - The ID of the item
- `name`: string - The name of the function that was called
- `output_index`: integer - The index of the output item
- `sequence_number`: integer - The sequence number of this event
- `type`: string - Always "response.function_call_arguments.done"

### Tool Call Events

#### File Search

##### `response.file_search_call.in_progress`
Emitted when a file search call is initiated.
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.file_search_call.in_progress"

##### `response.file_search_call.searching`
Emitted when a file search is currently searching.
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.file_search_call.searching"

##### `response.file_search_call.completed`
Emitted when a file search call is completed.
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.file_search_call.completed"

#### Web Search

##### `response.web_search_call.in_progress`
Emitted when a web search call is initiated.
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.web_search_call.in_progress"

##### `response.web_search_call.searching`
Emitted when a web search call is executing.
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.web_search_call.searching"

##### `response.web_search_call.completed`
Emitted when a web search call is completed.
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.web_search_call.completed"

#### Code Interpreter

##### `response.code_interpreter_call.in_progress`
Emitted when a code interpreter call is in progress.
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.code_interpreter_call.in_progress"

##### `response.code_interpreter_call.interpreting`
Emitted when the code interpreter is actively interpreting code.
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.code_interpreter_call.interpreting"

##### `response.code_interpreter_call.completed`
Emitted when the code interpreter call is completed.
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.code_interpreter_call.completed"

##### `response.code_interpreter_call_code.delta`
Emitted when a partial code snippet is streamed.
- `delta`: string
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.code_interpreter_call_code.delta"

##### `response.code_interpreter_call_code.done`
Emitted when the code snippet is finalized.
- `code`: string
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.code_interpreter_call_code.done"

#### Image Generation

##### `response.image_generation_call.in_progress`
Emitted when an image generation tool call is in progress.
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.image_generation_call.in_progress"

##### `response.image_generation_call.generating`
Emitted when actively generating an image.
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.image_generation_call.generating"

##### `response.image_generation_call.completed`
Emitted when image generation is complete.
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.image_generation_call.completed"

##### `response.image_generation_call.partial_image`
Emitted when a partial image is available.
- `item_id`: string
- `output_index`: integer
- `partial_image_b64`: string - Base64-encoded partial image
- `partial_image_index`: integer - 0-based index
- `sequence_number`: integer
- `type`: string - Always "response.image_generation_call.partial_image"

#### MCP (Model Context Protocol)

##### `response.mcp_call.in_progress`
Emitted when an MCP tool call is in progress.
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.mcp_call.in_progress"

##### `response.mcp_call.completed`
Emitted when an MCP tool call has completed.
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.mcp_call.completed"

##### `response.mcp_call.failed`
Emitted when an MCP tool call has failed.
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.mcp_call.failed"

##### `response.mcp_call_arguments.delta`
Emitted when there is a delta to MCP tool call arguments.
- `delta`: string - JSON string with partial update
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.mcp_call_arguments.delta"

##### `response.mcp_call_arguments.done`
Emitted when MCP tool call arguments are finalized.
- `arguments`: string - JSON string with finalized arguments
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.mcp_call_arguments.done"

##### `response.mcp_list_tools.in_progress`
Emitted when retrieving list of available MCP tools.
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.mcp_list_tools.in_progress"

##### `response.mcp_list_tools.completed`
Emitted when list of MCP tools successfully retrieved.
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.mcp_list_tools.completed"

##### `response.mcp_list_tools.failed`
Emitted when attempt to list MCP tools failed.
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.mcp_list_tools.failed"

#### Custom Tool Calls

##### `response.custom_tool_call_input.delta`
Event representing a delta to custom tool call input.
- `delta`: string - Incremental input data
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.custom_tool_call_input.delta"

##### `response.custom_tool_call_input.done`
Event indicating custom tool call input is complete.
- `input`: string - Complete input data
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.custom_tool_call_input.done"

### Reasoning Events

#### `response.reasoning_summary_part.added`
Emitted when a new reasoning summary part is added.
- `item_id`: string
- `output_index`: integer
- `part`: object - The summary part that was added
- `sequence_number`: integer
- `summary_index`: integer
- `type`: string - Always "response.reasoning_summary_part.added"

#### `response.reasoning_summary_part.done`
Emitted when a reasoning summary part is completed.
- `item_id`: string
- `output_index`: integer
- `part`: object - The completed summary part
- `sequence_number`: integer
- `summary_index`: integer
- `type`: string - Always "response.reasoning_summary_part.done"

#### `response.reasoning_summary_text.delta`
Emitted when a delta is added to reasoning summary text.
- `delta`: string
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `summary_index`: integer
- `type`: string - Always "response.reasoning_summary_text.delta"

#### `response.reasoning_summary_text.done`
Emitted when reasoning summary text is completed.
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `summary_index`: integer
- `text`: string - Full text of completed reasoning summary
- `type`: string - Always "response.reasoning_summary_text.done"

#### `response.reasoning_text.delta`
Emitted when a delta is added to reasoning text.
- `content_index`: integer
- `delta`: string
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `type`: string - Always "response.reasoning_text.delta"

#### `response.reasoning_text.done`
Emitted when reasoning text is completed.
- `content_index`: integer
- `item_id`: string
- `output_index`: integer
- `sequence_number`: integer
- `text`: string - Full text of completed reasoning content
- `type`: string - Always "response.reasoning_text.done"

### Error Events

#### `error`
Emitted when an error occurs.
- `code`: string - The error code
- `message`: string - The error message
- `param`: string - The error parameter
- `sequence_number`: integer
- `type`: string - Always "error"

## Implementation Notes

### Key Points for Streaming
1. **Token-by-token streaming**: Use `response.output_text.delta` events to display text as it arrives
2. **Sequence numbers**: Events have sequence numbers to ensure proper ordering
3. **Multiple content types**: The output array can contain multiple items (messages, tool calls, reasoning)
4. **Safety**: Do not assume `output[0].content[0].text` - use the streaming events or SDK helpers
5. **Event ordering**: Process events in sequence_number order

### Example Streaming Flow
```
1. response.created
2. response.in_progress
3. response.output_item.added
4. response.content_part.added
5. response.output_text.delta (many times)
6. response.output_text.done
7. response.content_part.done
8. response.output_item.done
9. response.completed
```

### Best Practices
- Always handle `error` events
- Buffer deltas and render incrementally
- Handle both `completed` and `incomplete` final states
- Consider failed responses with appropriate error handling
- For reasoning models, capture reasoning tokens separately from output tokens
