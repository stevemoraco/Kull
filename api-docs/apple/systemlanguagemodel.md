*   [Foundation Models](/documentation/foundationmodels)
*   SystemLanguageModel

Class

# SystemLanguageModel

An on-device large language model capable of text generation tasks.

iOS 26.0+iPadOS 26.0+Mac Catalyst 26.0+macOS 26.0+visionOS 26.0+

```
final class SystemLanguageModel
```

## [Mentioned in](/documentation/foundationmodels/systemlanguagemodel#mentions)

[

Improving the safety of generative model output](/documentation/foundationmodels/improving-the-safety-of-generative-model-output)

[

Generating content and performing tasks with Foundation Models](/documentation/foundationmodels/generating-content-and-performing-tasks-with-foundation-models)

[

Loading and using a custom adapter with Foundation Models](/documentation/foundationmodels/loading-and-using-a-custom-adapter-with-foundation-models)

## [Overview](/documentation/foundationmodels/systemlanguagemodel#overview)

The `SystemLanguageModel` refers to the on-device text foundation model that powers Apple Intelligence. Use [`default`](/documentation/foundationmodels/systemlanguagemodel/default) to access the base version of the model and perform general-purpose text generation tasks. To access a specialized version of the model, initialize the model with [`SystemLanguageModel.UseCase`](/documentation/foundationmodels/systemlanguagemodel/usecase) to perform tasks like [`contentTagging`](/documentation/foundationmodels/systemlanguagemodel/usecase/contenttagging).

Verify the model availability before you use the model. Model availability depends on device factors like:

*   The device must support Apple Intelligence.
    
*   Apple Intelligence must be turned on in Settings.
    

Use [`SystemLanguageModel.Availability`](/documentation/foundationmodels/systemlanguagemodel/availability-swift.enum) to change what your app shows to people based on the availability condition:

```
struct GenerativeView: View {
    // Create a reference to the system language model.
    private var model = SystemLanguageModel.default


    var body: some View {
        switch model.availability {
        case .available:
            // Show your intelligence UI.
        case .unavailable(.deviceNotEligible):
            // Show an alternative UI.
        case .unavailable(.appleIntelligenceNotEnabled):
            // Ask the person to turn on Apple Intelligence.
        case .unavailable(.modelNotReady):
            // The model isn't ready because it's downloading or because
            // of other system reasons.
        case .unavailable(let other):
            // The model is unavailable for an unknown reason.
        }
    }
}
```

## [Topics](/documentation/foundationmodels/systemlanguagemodel#topics)

### [Loading the model with a use case](/documentation/foundationmodels/systemlanguagemodel#Loading-the-model-with-a-use-case)

[`convenience init(useCase: SystemLanguageModel.UseCase, guardrails: SystemLanguageModel.Guardrails)`](/documentation/foundationmodels/systemlanguagemodel/init\(usecase:guardrails:\))

Creates a system language model for a specific use case.

[`struct UseCase`](/documentation/foundationmodels/systemlanguagemodel/usecase)

A type that represents the use case for prompting.

[`struct Guardrails`](/documentation/foundationmodels/systemlanguagemodel/guardrails)

Guardrails flag sensitive content from model input and output.

### [Loading the model with an adapter](/documentation/foundationmodels/systemlanguagemodel#Loading-the-model-with-an-adapter)

[

Loading and using a custom adapter with Foundation Models](/documentation/foundationmodels/loading-and-using-a-custom-adapter-with-foundation-models)

Specialize the behavior of the system language model by using a custom adapter you train.

[`com.apple.developer.foundation-model-adapter`](/documentation/BundleResources/Entitlements/com.apple.developer.foundation-model-adapter)

A Boolean value that indicates whether the app can enable custom adapters for the Foundation Models framework.

[`convenience init(adapter: SystemLanguageModel.Adapter, guardrails: SystemLanguageModel.Guardrails)`](/documentation/foundationmodels/systemlanguagemodel/init\(adapter:guardrails:\))

Creates the base version of the model with an adapter.

[`struct Adapter`](/documentation/foundationmodels/systemlanguagemodel/adapter)

Specializes the system language model for custom use cases.

### [Checking model availability](/documentation/foundationmodels/systemlanguagemodel#Checking-model-availability)

[`var isAvailable: Bool`](/documentation/foundationmodels/systemlanguagemodel/isavailable)

A convenience getter to check if the system is entirely ready.

[`var availability: SystemLanguageModel.Availability`](/documentation/foundationmodels/systemlanguagemodel/availability-swift.property)

The availability of the language model.

[`enum Availability`](/documentation/foundationmodels/systemlanguagemodel/availability-swift.enum)

The availability status for a specific system language model.

### [Retrieving the supported languages](/documentation/foundationmodels/systemlanguagemodel#Retrieving-the-supported-languages)

[`var supportedLanguages: Set<Locale.Language>`](/documentation/foundationmodels/systemlanguagemodel/supportedlanguages)

Languages that the model supports.

### [Determining whether the model supports a locale](/documentation/foundationmodels/systemlanguagemodel#Determining-whether-the-model-supports-a-locale)

[`func supportsLocale(Locale) -> Bool`](/documentation/foundationmodels/systemlanguagemodel/supportslocale\(_:\))

Returns a Boolean indicating whether the given locale is supported by the model.

### [Getting the default model](/documentation/foundationmodels/systemlanguagemodel#Getting-the-default-model)

[``static let `default`: SystemLanguageModel``](/documentation/foundationmodels/systemlanguagemodel/default)

The base version of the model.

## [Relationships](/documentation/foundationmodels/systemlanguagemodel#relationships)

### [Conforms To](/documentation/foundationmodels/systemlanguagemodel#conforms-to)

*   [`Copyable`](/documentation/Swift/Copyable)
*   [`Observable`](/documentation/Observation/Observable)
*   [`Sendable`](/documentation/Swift/Sendable)
*   [`SendableMetatype`](/documentation/Swift/SendableMetatype)

## [See Also](/documentation/foundationmodels/systemlanguagemodel#see-also)

### [Essentials](/documentation/foundationmodels/systemlanguagemodel#Essentials)

[

Generating content and performing tasks with Foundation Models](/documentation/foundationmodels/generating-content-and-performing-tasks-with-foundation-models)

Enhance the experience in your app by prompting an on-device large language model.

[

Improving the safety of generative model output](/documentation/foundationmodels/improving-the-safety-of-generative-model-output)

Create generative experiences that appropriately handle sensitive inputs and respect people.

[

Support languages and locales with Foundation Models](/documentation/foundationmodels/support-languages-and-locales-with-foundation-models)

Generate content in the language people prefer when they interact with your app.

[

Adding intelligent app features with generative models](/documentation/foundationmodels/adding-intelligent-app-features-with-generative-models)

Build robust apps with guided generation and tool calling by adopting the Foundation Models framework.

[`struct UseCase`](/documentation/foundationmodels/systemlanguagemodel/usecase)

A type that represents the use case for prompting.