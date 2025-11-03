*   On this page
*   [Gemini 2.5 Pro](#gemini-2.5-pro)
*   [Gemini 2.5 Flash](#gemini-2.5-flash)
*   [Gemini 2.5 Flash-Lite](#gemini-2.5-flash-lite)
*   [Gemini 2.0 Flash](#gemini-2.0-flash)
*   [Gemini 2.0 Flash-Lite](#gemini-2.0-flash-lite)
*   [Model version name patterns](#model-versions)
    *   [Stable](#stable)
    *   [Preview](#preview)
    *   [Latest](#latest)
    *   [Experimental](#experimental)
*   [Model deprecations](#model_deprecations)

/\* Styles inlined from /site-assets/css/models.css \*/ :root { --gemini-api-table-font-color: #3c4043; --gemini-api-model-font: 'Google Sans Text', Roboto, sans-serif; --gemini-api-card-width: 17rem; --gemini-api-elevation-1dp: 0 1px 1px 0 rgba(0, 0, 0, 0.14), 0 2px 1px -1px rgba(0, 0, 0, 0.12), 0 1px 3px 0 rgba(0, 0, 0, 0.2); --gemini-api-elevation-3dp: 0 3px 4px 0 rgba(0, 0, 0, 0.14), 0 3px 3px -2px rgba(0, 0, 0, 0.12), 0 1px 8px 0 rgba(0, 0, 0, 0.2); } body\[theme="googledevai-theme"\] { --googledevai-button-gradient: var(--googledevai-button-gradient-light); } body\[theme="googledevai-theme"\].color-scheme--dark { --googledevai-button-gradient: var(--googledevai-button-gradient-dark); } .google-symbols { background: -webkit-linear-gradient(45deg, var(--googledevai-blue), var(--googledevai-purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; user-select: none; vertical-align: bottom; } /\* Cards \*/ @media only screen and (min-width: 625px) { .gemini-api-recommended { display: grid; grid-template-columns: repeat(3, 1fr); /\* Three equal-width columns \*/ grid-column-gap: 3rem; /\* Keep the gap between columns \*/ } } .gemini-api-recommended { width: 100%; /\* Take full width of parent \*/ margin: 0 auto; } .gemini-api-card { background: var(--devsite-background-1); border: 1px solid var(--googledevai-border-color); border-radius: 9px; box-shadow: var(--gemini-api-elevation-1dp); height: 23rem; margin: 1rem .5rem; padding: 1rem; transition: box-shadow 0.3s ease-in-out; width: var(--gemini-api-card-width); } .color-scheme--dark .gemini-api-card { background: #131314; border-color: #444746; } .gemini-api-card:hover { box-shadow: var(--gemini-api-elevation-3dp); } .gemini-api-card a:empty { display: block; position: relative; height: 23rem; width: var(--gemini-api-card-width); top: -22.8rem; left: -1rem; } .gemini-api-card a:empty:focus { border: 2px solid var(--devsite-primary-color); border-radius: 9px; } .gemini-api-card-title { font-family: "Google Sans", Roboto, sans-serif; font-size: 1.3rem; font-weight: 500; height: 1.5rem; margin-bottom: 2.5rem; line-height: 1.3rem; } .gemini-api-card-description { font-size: .9rem; height: 7.5rem; overflow: hidden; text-overflow: ellipsis; white-space: normal; } .gemini-api-card-bulletpoints { color: #757575; font-size: .8rem; height: 8.2rem; margin-left: 1rem; padding: 0; } .color-scheme--dark .gemini-api-card-bulletpoints { color: var(--devsite-primary-text-color); } .gemini-api-card-description, .gemini-api-card-bulletpoints { font-family: var(--gemini-api-model-font); } .gemini-api-card-bulletpoints li { line-height: 1rem; margin: .3rem 0; } /\* Tables \*/ .gemini-api-model-table, .gemini-api-model-table th { color: var(--gemini-api-table-font-color); font: .95rem var(--gemini-api-model-font); } .color-scheme--dark .gemini-api-model-table, .color-scheme--dark .gemini-api-model-table th { color: var(--devsite-primary-text-color); } .gemini-api-model-table th { font-weight: 500; } .gemini-api-model-table td:first-child { max-width: 0; } .gemini-api-model-table-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); grid-gap: 1rem .5rem; } .gemini-api-model-table section { display: inline-grid; } .gemini-api-model-table p { margin: 0 0 .5rem; } .gemini-api-model-table li { margin: 0; } .gemini-api-model-table ul { margin-top: .5rem; } .gemini-api-model-table .google-symbols { margin-right: .7rem; vertical-align: middle; } .gemini-api-supported, .gemini-api-not-supported, .gemini-api-experimental { border-radius: 8px; display: inline-block; font-size: .9rem; font-weight: 500; line-height: 1rem; padding: .3rem 0.5em; } .gemini-api-supported { background: #e6f4ea; /\* GM3 Green 50 \*/ color: #177d37; /\* GM3 Green 700 \*/ } .gemini-api-not-supported { background: #fce8e6; /\* GM3 Red 50 \*/ color: #c5221f; /\* GM3 Red 700 \*/ } .gemini-api-experimental { background: #e8def8; color: #4a4458; } .color-scheme--dark .gemini-api-supported { background: #177d37; /\* GM3 Green 700 \*/ color: #e6f4ea; /\* GM3 Green 50 \*/ } .color-scheme--dark .gemini-api-not-supported { background: #c5221f; /\* GM3 Red 700 \*/ color: #fce8e6; /\* GM3 Red 50 \*/ } /\* Buttons \*/ .gemini-api-model-button { background: var(--googledevai-button-gradient); background-size: 300% 300%; border-radius: 20rem; color: #001d35; font-family: var(--gemini-api-model-font); font-size: .9rem; font-weight: 500; padding: .6rem 1rem; text-align: center; text-decoration: none; transition: filter .2s ease-in-out, box-shadow .2s ease-in-out; } .gemini-api-model-button:hover{ animation: gradient 5s ease infinite; filter: brightness(.98); box-shadow: var(--gemini-api-elevation-1dp); } .gemini-api-model-button:focus { filter: brightness(.95); outline: #00639b solid 3px; outline-offset: 2px; text-decoration: none; } .gemini-api-model-button::before { content: 'spark'; font-family: 'Google Symbols'; padding-right: 0.5rem; vertical-align: middle; } @keyframes gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } } .model-card { display: flex; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; margin-bottom: 1.5rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); transition: box-shadow 0.3s ease; } .color-scheme--dark .model-card { background-color: #3c4043; } .model-card:hover { box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1); } .card-content { padding: 2.5rem; flex: 1; } .sub-heading-model { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 0.5rem 0; } .color-scheme--dark .sub-heading-model { color: var(--devsite-primary-text-color); } .card-content h2 { font-size: 2rem; font-weight: 500; margin: 0 0 1rem 0; } .description { font-size: 1rem; line-height: 1.6; color: #3c4043; margin: 0 0 1.5rem 0; } .color-scheme--dark .description { color: var(--devsite-primary-text-color); } .card-content a:not(.gemini-api-model-button) { color: #1a73e8; text-decoration: none; font-weight: 600; } .card-content a:hover { text-decoration: underline; } @media (max-width: 768px) { .model-card { flex-direction: column; } .card-image { flex-basis: 180px; width: 100%; } .card-content { padding: 1.5rem; } h1 { font-size: 2rem; } .card-content h2 { font-size: 1.5rem; } }

Veo 3.1 is here! Read about the new model and its features in the [blog post](https://developers.googleblog.com/en/introducing-veo-3-1-and-new-creative-controls-in-the-gemini-api/) and [documentation](https://ai.google.dev/gemini-api/docs/video).

*   [Home](https://ai.google.dev/)
*   [Gemini API](https://ai.google.dev/gemini-api)
*   [Gemini API Docs](https://ai.google.dev/gemini-api/docs)

Send feedback

# Gemini Models

content\_copy

*   On this page
*   [Gemini 2.5 Pro](#gemini-2.5-pro)
*   [Gemini 2.5 Flash](#gemini-2.5-flash)
*   [Gemini 2.5 Flash-Lite](#gemini-2.5-flash-lite)
*   [Gemini 2.0 Flash](#gemini-2.0-flash)
*   [Gemini 2.0 Flash-Lite](#gemini-2.0-flash-lite)
*   [Model version name patterns](#model-versions)
    *   [Stable](#stable)
    *   [Preview](#preview)
    *   [Latest](#latest)
    *   [Experimental](#experimental)
*   [Model deprecations](#model_deprecations)

OUR MOST ADVANCED MODEL

## Gemini 2.5 Pro

Our state-of-the-art thinking model, capable of reasoning over complex problems in code, math, and STEM, as well as analyzing large datasets, codebases, and documents using long context.

### Expand to learn more

[Try in Google AI Studio](https://aistudio.google.com?model=gemini-2.5-pro)

#### Model details

[Gemini 2.5 Pro](#gemini-2.5-pro)[Gemini 2.5 Pro TTS](#gemini-2.5-pro-tts) More

Property

Description

id\_cardModel code

`gemini-2.5-pro`

saveSupported data types

**Inputs**

Audio, images, video, text, and PDF

**Output**

Text

token\_autoToken limits[\[\*\]](/gemini-api/docs/tokens)

**Input token limit**

1,048,576

**Output token limit**

65,536

handymanCapabilities

**Audio generation**

Not supported

**Batch API**

Supported

**Caching**

Supported

**Code execution**

Supported

**Function calling**

Supported

**Grounding with Google Maps**

Supported

**Image generation**

Not supported

**Live API**

Not supported

**Search grounding**

Supported

**Structured outputs**

Supported

**Thinking**

Supported

**URL context**

Supported

123Versions

Read the [model version patterns](/gemini-api/docs/models/gemini#model-versions) for more details.

*   `Stable: gemini-2.5-pro`

calendar\_monthLatest update

June 2025

cognition\_2Knowledge cutoff

January 2025

Property

Description

id\_cardModel code

`gemini-2.5-pro-preview-tts`

saveSupported data types

**Inputs**

Text

**Output**

Audio

token\_autoToken limits[\[\*\]](/gemini-api/docs/tokens)

**Input token limit**

8,192

**Output token limit**

16,384

handymanCapabilities

**Audio generation**

Supported

**Batch API**

Not Supported

**Caching**

Not supported

**Code execution**

Not supported

**Function calling**

Not supported

**Grounding with Google Maps**

Not supported

**Image generation**

Not supported

**Live API**

Not supported

**Search grounding**

Not supported

**Structured outputs**

Not supported

**Thinking**

Not supported

**URL context**

Not supported

123Versions

Read the [model version patterns](/gemini-api/docs/models/gemini#model-versions) for more details.

*   `gemini-2.5-pro-preview-tts`

calendar\_monthLatest update

May 2025

FAST AND INTELLIGENT

## Gemini 2.5 Flash

Our best model in terms of price-performance, offering well-rounded capabilities. 2.5 Flash is best for large scale processing, low-latency, high volume tasks that require thinking, and agentic use cases.

### Expand to learn more

[Try in Google AI Studio](https://aistudio.google.com?model=gemini-2.5-flash)

#### Model details

[Gemini 2.5 Flash](#gemini-2.5-flash)[Gemini 2.5 Flash Preview](#gemini-2.5-flash-preview)[Gemini 2.5 Flash Image](#gemini-2.5-flash-image)[Gemini 2.5 Flash Live](#gemini-2.5-flash-live)[Gemini 2.5 Flash TTS](#gemini-2.5-flash-tts) More

Property

Description

id\_cardModel code

`gemini-2.5-flash`

saveSupported data types

**Inputs**

Text, images, video, audio

**Output**

Text

token\_autoToken limits[\[\*\]](/gemini-api/docs/tokens)

**Input token limit**

1,048,576

**Output token limit**

65,536

handymanCapabilities

**Audio generation**

Not supported

**Batch API**

Supported

**Caching**

Supported

**Code execution**

Supported

**Function calling**

Supported

**Grounding with Google Maps**

Supported

**Image generation**

Not supported

**Live API**

Not supported

**Search grounding**

Supported

**Structured outputs**

Supported

**Thinking**

Supported

**URL context**

Supported

123Versions

Read the [model version patterns](/gemini-api/docs/models/gemini#model-versions) for more details.

*   Stable: `gemini-2.5-flash`

calendar\_monthLatest update

June 2025

cognition\_2Knowledge cutoff

January 2025

Property

Description

id\_cardModel code

`gemini-2.5-flash-preview-09-2025`

saveSupported data types

**Inputs**

Text, images, video, audio

**Output**

Text

token\_autoToken limits[\[\*\]](/gemini-api/docs/tokens)

**Input token limit**

1,048,576

**Output token limit**

65,536

handymanCapabilities

**Audio generation**

Not supported

**Batch API**

Supported

**Caching**

Supported

**Code execution**

Supported

**Function calling**

Supported

**Grounding with Google Maps**

Not supported

**Image generation**

Not supported

**Live API**

Not supported

**Search grounding**

Supported

**Structured outputs**

Supported

**Thinking**

Supported

**URL Context**

Supported

123Versions

Read the [model version patterns](/gemini-api/docs/models/gemini#model-versions) for more details.

*   Preview: `gemini-2.5-flash-preview-09-2025`

calendar\_monthLatest update

September 2025

cognition\_2Knowledge cutoff

January 2025

Property

Description

id\_cardModel code

`gemini-2.5-flash-image`

saveSupported data types

**Inputs**

Images and text

**Output**

Images and text

token\_autoToken limits[\[\*\]](/gemini-api/docs/tokens)

**Input token limit**

65,536

**Output token limit**

32,768

handymanCapabilities

**Audio generation**

Not supported

**Batch API**

Supported

**Caching**

Supported

**Code execution**

Not Supported

**Function calling**

Not supported

**Grounding with Google Maps**

Not supported

**Image generation**

Supported

**Live API**

Not Supported

**Search grounding**

Not Supported

**Structured outputs**

Supported

**Thinking**

Not Supported

**URL context**

Not supported

123Versions

Read the [model version patterns](/gemini-api/docs/models/gemini#model-versions) for more details.

*   Stable: `gemini-2.5-flash-image`
*   Preview: `gemini-2.5-flash-image-preview`

calendar\_monthLatest update

October 2025

cognition\_2Knowledge cutoff

June 2025

Property

Description

id\_cardModel code

`gemini-2.5-flash-native-audio-preview-09-2025`

saveSupported data types

**Inputs**

Audio, video, text

**Output**

Audio and text

token\_autoToken limits[\[\*\]](/gemini-api/docs/tokens)

**Input token limit**

131,072

**Output token limit**

8,192

handymanCapabilities

**Audio generation**

Supported

**Batch API**

Not supported

**Caching**

Not supported

**Code execution**

Not supported

**Function calling**

Supported

**Grounding with Google Maps**

Not supported

**Image generation**

Not supported

**Live API**

Supported

**Search grounding**

Supported

**Structured outputs**

Not supported

**Thinking**

Supported

**URL context**

Not supported

123Versions

Read the [model version patterns](/gemini-api/docs/models/gemini#model-versions) for more details.

*   Preview: `gemini-2.5-flash-native-audio-preview-09-2025`
*   Preview: `gemini-live-2.5-flash-preview`

gemini-live-2.5-flash-preview will be deprecated on December 09, 2025

calendar\_monthLatest update

September 2025

cognition\_2Knowledge cutoff

January 2025

Property

Description

id\_cardModel code

`gemini-2.5-flash-preview-tts`

saveSupported data types

**Inputs**

Text

**Output**

Audio

token\_autoToken limits[\[\*\]](/gemini-api/docs/tokens)

**Input token limit**

8,192

**Output token limit**

16,384

handymanCapabilities

**Audio generation**

Supported

**Batch API**

Supported

**Caching**

Not supported

**Code execution**

Not supported

**Function calling**

Not supported

**Grounding with Google Maps**

Not supported

**Image generation**

Not supported

**Live API**

Not supported

**Search grounding**

Not supported

**Structured outputs**

Not supported

**Thinking**

Not supported

**URL context**

Not supported

123Versions

Read the [model version patterns](/gemini-api/docs/models/gemini#model-versions) for more details.

*   `gemini-2.5-flash-preview-tts`

calendar\_monthLatest update

May 2025

ULTRA FAST

## Gemini 2.5 Flash-Lite

Our fastest flash model optimized for cost-efficiency and high throughput.

### Expand to learn more

[Try in Google AI Studio](https://aistudio.google.com?model=gemini-2.5-flash-lite)

#### Model details

[Gemini 2.5 Flash-Lite](#gemini-2.5-flash-lite)[Gemini 2.5 Flash-Lite Preview](#gemini-2.5-flash-lite-preview) More

Property

Description

id\_cardModel code

`gemini-2.5-flash-lite`

saveSupported data types

**Inputs**

Text, image, video, audio, PDF

**Output**

Text

token\_autoToken limits[\[\*\]](/gemini-api/docs/tokens)

**Input token limit**

1,048,576

**Output token limit**

65,536

handymanCapabilities

**Audio generation**

Not supported

**Batch API**

Supported

**Caching**

Supported

**Code execution**

Supported

**Function calling**

Supported

**Grounding with Google Maps**

Supported

**Image generation**

Not supported

**Live API**

Not supported

**Search grounding**

Supported

**Structured outputs**

Supported

**Thinking**

Supported

**URL context**

Supported

123Versions

Read the [model version patterns](/gemini-api/docs/models/gemini#model-versions) for more details.

*   Stable: `gemini-2.5-flash-lite`

calendar\_monthLatest update

July 2025

cognition\_2Knowledge cutoff

January 2025

Property

Description

id\_cardModel code

`gemini-2.5-flash-lite-preview-09-2025`

saveSupported data types

**Inputs**

Text, image, video, audio, PDF

**Output**

Text

token\_autoToken limits[\[\*\]](/gemini-api/docs/tokens)

**Input token limit**

1,048,576

**Output token limit**

65,536

handymanCapabilities

**Audio generation**

Not supported

**Batch API**

Supported

**Caching**

Supported

**Code execution**

Supported

**Function calling**

Supported

**Grounding with Google Maps**

Not supported

**Image generation**

Not supported

**Live API**

Not supported

**Search grounding**

Supported

**Structured outputs**

Supported

**Thinking**

Supported

**URL context**

Supported

123Versions

Read the [model version patterns](/gemini-api/docs/models/gemini#model-versions) for more details.

*   Preview: `gemini-2.5-flash-lite-preview-09-2025`

calendar\_monthLatest update

September 2025

cognition\_2Knowledge cutoff

January 2025

  

## Previous Gemini Models

OUR SECOND GENERATION WORKHORSE MODEL

## Gemini 2.0 Flash

Our second generation workhorse model, with a 1 million token context window.

### Expand to learn more

Gemini 2.0 Flash delivers next-gen features and improved capabilities, including superior speed, native tool use, and a 1M token context window.

[Try in Google AI Studio](https://aistudio.google.com?model=gemini-2.0-flash)

#### Model details

[Gemini 2.0 Flash](#gemini-2.0-flash)[Gemini 2.0 Flash Image](#gemini-2.0-flash-image)[Gemini 2.0 Flash Live](#gemini-2.0-flash-live) More

Property

Description

id\_cardModel code

`gemini-2.0-flash`

saveSupported data types

**Inputs**

Audio, images, video, and text

**Output**

Text

token\_autoToken limits[\[\*\]](/gemini-api/docs/tokens)

**Input token limit**

1,048,576

**Output token limit**

8,192

handymanCapabilities

**Audio generation**

Not supported

**Batch API**

Supported

**Caching**

Supported

**Code execution**

Supported

**Function calling**

Supported

**Grounding with Google Maps**

Supported

**Image generation**

Not supported

**Live API**

Supported

**Search grounding**

Supported

**Structured outputs**

Supported

**Thinking**

Experimental

**URL context**

Not supported

123Versions

Read the [model version patterns](/gemini-api/docs/models/gemini#model-versions) for more details.

*   Latest: `gemini-2.0-flash`
*   Stable: `gemini-2.0-flash-001`
*   Experimental: `gemini-2.0-flash-exp`

calendar\_monthLatest update

February 2025

cognition\_2Knowledge cutoff

August 2024

Property

Description

id\_cardModel code

`gemini-2.0-flash-preview-image-generation`

saveSupported data types

**Inputs**

Audio, images, video, and text

**Output**

Text and images

token\_autoToken limits[\[\*\]](/gemini-api/docs/tokens)

**Input token limit**

32,768

**Output token limit**

8,192

handymanCapabilities

**Audio generation**

Not supported

**Batch API**

Supported

**Caching**

Supported

**Code execution**

Not Supported

**Function calling**

Not supported

**Grounding with Google Maps**

Not supported

**Image generation**

Supported

**Live API**

Not Supported

**Search grounding**

Not Supported

**Structured outputs**

Supported

**Thinking**

Not Supported

**URL context**

Not supported

123Versions

Read the [model version patterns](/gemini-api/docs/models/gemini#model-versions) for more details.

*   Preview: `gemini-2.0-flash-preview-image-generation`

gemini-2.0-flash-preview-image-generation is not currently supported in a number of countries in Europe, Middle East & Africa

calendar\_monthLatest update

May 2025

cognition\_2Knowledge cutoff

August 2024

Property

Description

id\_cardModel code

`gemini-2.0-flash-live-001`

gemini-2.0-flash-live-001 will be deprecated on December 09, 2025

saveSupported data types

**Inputs**

Audio, video, and text

**Output**

Text, and audio

token\_autoToken limits[\[\*\]](/gemini-api/docs/tokens)

**Input token limit**

1,048,576

**Output token limit**

8,192

handymanCapabilities

**Audio generation**

Supported

**Batch API**

Not supported

**Caching**

Not supported

**Code execution**

Supported

**Function calling**

Supported

**Grounding with Google Maps**

Not supported

**Image generation**

Not supported

**Live API**

Supported

**Search grounding**

Supported

**Structured outputs**

Supported

**Thinking**

Not supported

**URL context**

Supported

123Versions

Read the [model version patterns](/gemini-api/docs/models/gemini#model-versions) for more details.

*   Preview: `gemini-2.0-flash-live-001`

calendar\_monthLatest update

April 2025

cognition\_2Knowledge cutoff

August 2024

OUR SECOND GENERATION FAST MODEL

## Gemini 2.0 Flash-Lite

Our second generation small workhorse model, with a 1 million token context window.

### Expand to learn more

A Gemini 2.0 Flash model optimized for cost efficiency and low latency.

[Try in Google AI Studio](https://aistudio.google.com?model=gemini-2.0-flash-lite)

#### Model details

Property

Description

id\_cardModel code

`gemini-2.0-flash-lite`

saveSupported data types

**Inputs**

Audio, images, video, and text

**Output**

Text

token\_autoToken limits[\[\*\]](/gemini-api/docs/tokens)

**Input token limit**

1,048,576

**Output token limit**

8,192

handymanCapabilities

**Audio generation**

Not supported

**Batch API**

Supported

**Caching**

Supported

**Code execution**

Not supported

**Function calling**

Supported

**Grounding with Google Maps**

Not supported

**Image generation**

Not supported

**Live API**

Not supported

**Search grounding**

Not supported

**Structured outputs**

Supported

**Thinking**

Not Supported

**URL context**

Not supported

123Versions

Read the [model version patterns](/gemini-api/docs/models/gemini#model-versions) for more details.

*   Latest: `gemini-2.0-flash-lite`
*   Stable: `gemini-2.0-flash-lite-001`

calendar\_monthLatest update

February 2025

cognition\_2Knowledge cutoff

August 2024

  

## Model version name patterns

Gemini models are available in either _stable_, _preview_, _latest_, or _experimental_ versions.

**Note:** The following list refers to the model string naming convention as of September, 2025. Models released prior to that may have different naming conventions. Refer to the exact model string if you are using an older model.

### Stable

Points to a specific stable model. Stable models usually don't change. Most production apps should use a specific stable model.

For example: `gemini-2.5-flash`.

### Preview

Points to a preview model which may be used for production. Preview models will typically have billing enabled, might come with more restrictive rate limits and will be deprecated with at least 2 weeks notice.

For example: `gemini-2.5-flash-preview-09-2025`.

### Latest

Points to the latest release for a specific model variation. This can be a stable, preview or experimental release. This alias will get hot-swapped with every new release of a specific model variation. A **2-week notice** will be provided through email before the version behind latest is changed.

For example: `gemini-flash-latest`.

### Experimental

Points to an experimental model which will typically be not be suitable for production use and come with more restrictive rate limits. We release experimental models to gather feedback and get our latest updates into the hands of developers quickly.

Experimental models are not stable and availability of model endpoints is subject to change.

## Model deprecations

For information about model deprecations, visit the [Gemini deprecations](/gemini-api/docs/deprecations) page.

Send feedback

Except as otherwise noted, the content of this page is licensed under the [Creative Commons Attribution 4.0 License](https://creativecommons.org/licenses/by/4.0/), and code samples are licensed under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0). For details, see the [Google Developers Site Policies](https://developers.google.com/site-policies). Java is a registered trademark of Oracle and/or its affiliates.

Last updated 2025-10-30 UTC.