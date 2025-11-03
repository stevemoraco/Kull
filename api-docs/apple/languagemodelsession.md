*   [Foundation Models](/documentation/foundationmodels)
*   LanguageModelSession

Class

# LanguageModelSession

An object that represents a session that interacts with a language model.

iOS 26.0+iPadOS 26.0+Mac Catalyst 26.0+macOS 26.0+visionOS 26.0+

```
final class LanguageModelSession
```

## [Mentioned in](/documentation/foundationmodels/languagemodelsession#mentions)

[

Generating content and performing tasks with Foundation Models](/documentation/foundationmodels/generating-content-and-performing-tasks-with-foundation-models)

[

Categorizing and organizing data with content tags](/documentation/foundationmodels/categorizing-and-organizing-data-with-content-tags)

[

Generating Swift data structures with guided generation](/documentation/foundationmodels/generating-swift-data-structures-with-guided-generation)

[

Improving the safety of generative model output](/documentation/foundationmodels/improving-the-safety-of-generative-model-output)

[

Support languages and locales with Foundation Models](/documentation/foundationmodels/support-languages-and-locales-with-foundation-models)

## [Overview](/documentation/foundationmodels/languagemodelsession#overview)

A session is a single context that you use to generate content with, and maintains state between requests. You can reuse the existing instance or create a new one each time you call the model. When creating a session, provide instructions that tells the model what its role is and provide guidance on how to respond.

```
let session = LanguageModelSession(instructions: """
    You are a motivational workout coach that provides quotes to inspire \
    and motivate athletes.
    """
)
let prompt = "Generate a motivational quote for my next workout."
let response = try await session.respond(to: prompt)
```

The framework records each call to the model in a [`Transcript`](/documentation/foundationmodels/transcript) that includes all prompts and responses. If your session exceeds the available context size, it throws [`LanguageModelSession.GenerationError.exceededContextWindowSize(_:)`](/documentation/foundationmodels/languagemodelsession/generationerror/exceededcontextwindowsize\(_:\)).

When you perform a task that needs a larger context size, split the task into smaller steps and run each of them in a new [`LanguageModelSession`](/documentation/foundationmodels/languagemodelsession). For example, to generate a summary for a long article on device:

1.  Separate the article into smaller sections.
    
2.  Summarize each section with a new session instance.
    
3.  Combine the sections.
    
4.  Repeat the steps until you get a summary with the size you want, and consider adding the summary to the prompt so it conveys the contextual information.
    

Use Instruments to analyze token consumption while your app is running and to look for opportunities to improve performance, like with [`prewarm(promptPrefix:)`](/documentation/foundationmodels/languagemodelsession/prewarm\(promptprefix:\)). To profile your app with Instruments:

1.  Open your Xcode project and choose Product > Profile to launch Instruments.
    
2.  Select the Blank template, then click Choose.
    
3.  In Instruments, click “+ Instrument” to open the instruments library.
    
4.  Choose the Foundation Models instrument from the list.
    
5.  Choose File > Record Trace. This launches your app and starts a recording session to observe token usage from your app’s model interactions.
    

Because some generation tasks can be resource intensive, consider profiling your app with other instruments — like Activity Monitor and Power Profiler — to identify where your app might be using more system resources than expected.

For more information on managing the context window size, see [TN3193: Managing the on-device foundation model’s context window](/documentation/Technotes/tn3193-managing-the-on-device-foundation-model-s-context-window).

## [Topics](/documentation/foundationmodels/languagemodelsession#topics)

### [Creating a session](/documentation/foundationmodels/languagemodelsession#Creating-a-session)

[`convenience(model:tools:instructions:)`](/documentation/foundationmodels/languagemodelsession/init\(model:tools:instructions:\))

Start a new session in blank slate state with instructions builder.

[`class SystemLanguageModel`](/documentation/foundationmodels/systemlanguagemodel)

An on-device large language model capable of text generation tasks.

[`protocol Tool`](/documentation/foundationmodels/tool)

A tool that a model can call to gather information at runtime or perform side effects.

[`struct Instructions`](/documentation/foundationmodels/instructions)

Details you provide that define the model’s intended behavior on prompts.

### [Creating a session from a transcript](/documentation/foundationmodels/languagemodelsession#Creating-a-session-from-a-transcript)

[`convenience init(model: SystemLanguageModel, tools: [any Tool], transcript: Transcript)`](/documentation/foundationmodels/languagemodelsession/init\(model:tools:transcript:\))

Start a session by rehydrating from a transcript.

[`struct Transcript`](/documentation/foundationmodels/transcript)

A linear history of entries that reflect an interaction with a session.

### [Preloading the model](/documentation/foundationmodels/languagemodelsession#Preloading-the-model)

[`func prewarm(promptPrefix: Prompt?)`](/documentation/foundationmodels/languagemodelsession/prewarm\(promptprefix:\))

Loads the resources required for this session into memory, and optionally caches a prefix of your prompt to reduce request latency.

### [Inspecting session properties](/documentation/foundationmodels/languagemodelsession#Inspecting-session-properties)

[`var isResponding: Bool`](/documentation/foundationmodels/languagemodelsession/isresponding)

A Boolean value that indicates a response is being generated.

[`var transcript: Transcript`](/documentation/foundationmodels/languagemodelsession/transcript)

A full history of interactions, including user inputs and model responses.

### [Generating a request](/documentation/foundationmodels/languagemodelsession#Generating-a-request)

[`func respond(options: GenerationOptions, prompt: () throws -> Prompt) async throws -> LanguageModelSession.Response<String>`](/documentation/foundationmodels/languagemodelsession/respond\(options:prompt:\))

Produces a response to a prompt.

[`func respond<Content>(generating: Content.Type, includeSchemaInPrompt: Bool, options: GenerationOptions, prompt: () throws -> Prompt) async throws -> LanguageModelSession.Response<Content>`](/documentation/foundationmodels/languagemodelsession/respond\(generating:includeschemainprompt:options:prompt:\))

Produces a generable object as a response to a prompt.

[`func respond(schema: GenerationSchema, includeSchemaInPrompt: Bool, options: GenerationOptions, prompt: () throws -> Prompt) async throws -> LanguageModelSession.Response<GeneratedContent>`](/documentation/foundationmodels/languagemodelsession/respond\(schema:includeschemainprompt:options:prompt:\))

Produces a generated content type as a response to a prompt and schema.

[`func respond(to:options:)`](/documentation/foundationmodels/languagemodelsession/respond\(to:options:\))

Produces a response to a prompt.

[`func respond(to:generating:includeSchemaInPrompt:options:)`](/documentation/foundationmodels/languagemodelsession/respond\(to:generating:includeschemainprompt:options:\))

Produces a generable object as a response to a prompt.

[`func respond(to:schema:includeSchemaInPrompt:options:)`](/documentation/foundationmodels/languagemodelsession/respond\(to:schema:includeschemainprompt:options:\))

Produces a generated content type as a response to a prompt and schema.

[`struct Prompt`](/documentation/foundationmodels/prompt)

A prompt from a person to the model.

[`struct Response`](/documentation/foundationmodels/languagemodelsession/response)

A structure that stores the output of a response call.

[`struct GenerationOptions`](/documentation/foundationmodels/generationoptions)

Options that control how the model generates its response to a prompt.

### [Streaming a response](/documentation/foundationmodels/languagemodelsession#Streaming-a-response)

[`func streamResponse(to:options:)`](/documentation/foundationmodels/languagemodelsession/streamresponse\(to:options:\))

Produces a response stream to a prompt.

[`func streamResponse(to:generating:includeSchemaInPrompt:options:)`](/documentation/foundationmodels/languagemodelsession/streamresponse\(to:generating:includeschemainprompt:options:\))

Produces a response stream to a prompt and schema.

[`func streamResponse(to:schema:includeSchemaInPrompt:options:)`](/documentation/foundationmodels/languagemodelsession/streamresponse\(to:schema:includeschemainprompt:options:\))

Produces a response stream to a prompt and schema.

[`func streamResponse(options: GenerationOptions, prompt: () throws -> Prompt) rethrows -> sending LanguageModelSession.ResponseStream<String>`](/documentation/foundationmodels/languagemodelsession/streamresponse\(options:prompt:\))

Produces a response stream to a prompt.

[`func streamResponse<Content>(generating: Content.Type, includeSchemaInPrompt: Bool, options: GenerationOptions, prompt: () throws -> Prompt) rethrows -> sending LanguageModelSession.ResponseStream<Content>`](/documentation/foundationmodels/languagemodelsession/streamresponse\(generating:includeschemainprompt:options:prompt:\))

Produces a response stream for a type.

[`func streamResponse(schema: GenerationSchema, includeSchemaInPrompt: Bool, options: GenerationOptions, prompt: () throws -> Prompt) rethrows -> sending LanguageModelSession.ResponseStream<GeneratedContent>`](/documentation/foundationmodels/languagemodelsession/streamresponse\(schema:includeschemainprompt:options:prompt:\))

Produces a response stream to a prompt and schema.

[`struct ResponseStream`](/documentation/foundationmodels/languagemodelsession/responsestream)

An async sequence of snapshots of partially generated content.

[`struct GeneratedContent`](/documentation/foundationmodels/generatedcontent)

A type that represents structured, generated content.

[`protocol ConvertibleFromGeneratedContent`](/documentation/foundationmodels/convertiblefromgeneratedcontent)

A type that can be initialized from generated content.

[`protocol ConvertibleToGeneratedContent`](/documentation/foundationmodels/convertibletogeneratedcontent)

A type that can be converted to generated content.

### [Generating feedback](/documentation/foundationmodels/languagemodelsession#Generating-feedback)

[`func logFeedbackAttachment(sentiment: LanguageModelFeedback.Sentiment?, issues: [LanguageModelFeedback.Issue], desiredOutput: Transcript.Entry?) -> Data`](/documentation/foundationmodels/languagemodelsession/logfeedbackattachment\(sentiment:issues:desiredoutput:\))

Logs and serializes data that includes session information that you attach when reporting feedback to Apple.

[`func logFeedbackAttachment(sentiment: LanguageModelFeedback.Sentiment?, issues: [LanguageModelFeedback.Issue], desiredResponseContent: (any ConvertibleToGeneratedContent)?) -> Data`](/documentation/foundationmodels/languagemodelsession/logfeedbackattachment\(sentiment:issues:desiredresponsecontent:\))

[`func logFeedbackAttachment(sentiment: LanguageModelFeedback.Sentiment?, issues: [LanguageModelFeedback.Issue], desiredResponseText: String?) -> Data`](/documentation/foundationmodels/languagemodelsession/logfeedbackattachment\(sentiment:issues:desiredresponsetext:\))

### [Getting the error types](/documentation/foundationmodels/languagemodelsession#Getting-the-error-types)

[`enum GenerationError`](/documentation/foundationmodels/languagemodelsession/generationerror)

An error that may occur while generating a response.

[`struct ToolCallError`](/documentation/foundationmodels/languagemodelsession/toolcallerror)

An error that occurs while a system language model is calling a tool.

## [Relationships](/documentation/foundationmodels/languagemodelsession#relationships)

### [Conforms To](/documentation/foundationmodels/languagemodelsession#conforms-to)

*   [`Copyable`](/documentation/Swift/Copyable)
*   [`Observable`](/documentation/Observation/Observable)
*   [`Sendable`](/documentation/Swift/Sendable)
*   [`SendableMetatype`](/documentation/Swift/SendableMetatype)

## [See Also](/documentation/foundationmodels/languagemodelsession#see-also)

### [Prompting](/documentation/foundationmodels/languagemodelsession#Prompting)

[`struct Instructions`](/documentation/foundationmodels/instructions)

Details you provide that define the model’s intended behavior on prompts.

[`struct Prompt`](/documentation/foundationmodels/prompt)

A prompt from a person to the model.

[`struct Transcript`](/documentation/foundationmodels/transcript)

A linear history of entries that reflect an interaction with a session.

[`struct GenerationOptions`](/documentation/foundationmodels/generationoptions)

Options that control how the model generates its response to a prompt.