*   On this page
*   [Gemini 2.5 Pro](#gemini-2.5-pro)
*   [Gemini 2.5 Flash](#gemini-2.5-flash)
*   [Gemini 2.5 Flash Preview](#gemini-2.5-flash-preview)
*   [Gemini 2.5 Flash-Lite](#gemini-2.5-flash-lite)
*   [Gemini 2.5 Flash-Lite Preview](#gemini-2.5-flash-lite-preview)
*   [Gemini 2.5 Flash Native Audio (Live API)](#gemini-2.5-flash-native-audio)
*   [Gemini 2.5 Flash Image](#gemini-2.5-flash-image)
*   [Gemini 2.5 Flash Preview TTS](#gemini-2.5-flash-preview-tts)
*   [Gemini 2.5 Pro Preview TTS](#gemini-2.5-pro-preview-tts)
*   [Gemini 2.0 Flash](#gemini-2.0-flash)
*   [Gemini 2.0 Flash-Lite](#gemini-2.0-flash-lite)
*   [Imagen 4](#imagen-4)
*   [Imagen 3](#imagen-3)
*   [Veo 3.1](#veo-3.1)
*   [Veo 3](#veo-3)
*   [Veo 2](#veo-2)
*   [Gemini Embedding](#gemini-embedding)
*   [Gemini Robotics-ER 1.5 Preview](#gemini-robotics-er)
*   [Gemini 2.5 Computer Use Preview](#gemini-2.5-computer-use-preview-10-2025)
*   [Gemma 3](#gemma-3)
*   [Gemma 3n](#gemma-3n)

/\* Styles inlined from /site-assets/css/overview.css \*/ .code-snippet { background-color: #f5f5f5; padding: 1rem; border-radius: 4px; overflow: auto; } .code-snippet code { font-family: monospace; } .card { background-color: #f1f3f4; border-radius: 8px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); padding: 1.5rem; margin-bottom: 1.5rem; position: relative; cursor: pointer; display: flex; align-items: center; } .color-scheme--dark .card { background-color: var(--devsite-ref-palette--grey800); } .card > img { width: 40%; height: auto; margin-right: 1rem; object-fit: cover; } .card > h3, .card > p{ margin-left: 0; } .card-text-content { display: flex; flex-direction: column; } .gemini-api-card-overview { background: var(--devsite-background-1); border: 1px solid var(--googledevai-border-color); border-radius: 8px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); height: 14rem; padding: 1rem; transition: box-shadow 0.3s ease-in-out; width: 100%; } .gemini-api-card-overview:hover { box-shadow: var(--gemini-api-elevation-3dp); } .gemini-api-card-overview a:empty { display: block; position: relative; height: 14rem; width: 115%; top: -14.5rem; left: -1rem; } .gemini-api-card-overview a:empty:focus { border: 2px solid var(--devsite-primary-color); border-radius: 9px; } @media only screen and (min-width: 625px) { .gemini-api-recommended { display: grid; grid-template-columns: repeat(3, 1fr); grid-column-gap: 3rem; margin-bottom: 3rem; } } .card a { display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; text-decoration: none; color: inherit; } .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; } .cta-button { background-color: #4285f4; color: #fff; padding: 1rem 2rem; border-radius: 4px; text-decoration: none; display: inline-block; transition: background-color 0.2s; } .cta-button:hover { background-color: #357ae8; } .capabilities-list li { list-style-type: disc; margin-left: 20px; margin-bottom: 0.5rem; } .models-section { display: flex; justify-content: space-between; align-items: end; } .gemini-api-model-button { background-color: #4285f4; color: white; padding: 0.8rem 1.5rem; border-radius: 4px; text-decoration: none; font-size: 1rem; } .card-image { width: 50px; height: 50px; margin-right: 1rem; object-fit: cover; } .card-overview-bottom { padding: 3rem 2rem; border-radius: 12px; text-align: center; background-image: linear-gradient(to right, #217BFE, #078EFB); color: white; margin-top: 60px; position: relative; overflow: hidden; width: 100%; max-width: 1200px; box-sizing: border-box; } .card-overview-bottom::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px); background-size: 30px 30px; z-index: 0; } .card-overview-bottom h3 { position: relative; z-index: 1; } .card-overview-bottom a { position: relative; z-index: 1; cursor: pointer; } @media only screen and (max-width: 625px) { .gemini-api-card-overview { margin-bottom: 1.5rem; height: 10rem; } .gemini-api-card-overview a:empty { height: 10rem; top: -12.1rem; } .gemini-api-card-title { margin: 0rem; } .card { display: block; } .card > img { width: 100%; } .models-section { display: block; } .ais { width: 100%; } } @media (max-width: 768px) { #meet-the-models { margin: 0rem; } } /\* Styles inlined from /site-assets/css/models.css \*/ :root { --gemini-api-table-font-color: #3c4043; --gemini-api-model-font: 'Google Sans Text', Roboto, sans-serif; --gemini-api-card-width: 17rem; --gemini-api-elevation-1dp: 0 1px 1px 0 rgba(0, 0, 0, 0.14), 0 2px 1px -1px rgba(0, 0, 0, 0.12), 0 1px 3px 0 rgba(0, 0, 0, 0.2); --gemini-api-elevation-3dp: 0 3px 4px 0 rgba(0, 0, 0, 0.14), 0 3px 3px -2px rgba(0, 0, 0, 0.12), 0 1px 8px 0 rgba(0, 0, 0, 0.2); } body\[theme="googledevai-theme"\] { --googledevai-button-gradient: var(--googledevai-button-gradient-light); } body\[theme="googledevai-theme"\].color-scheme--dark { --googledevai-button-gradient: var(--googledevai-button-gradient-dark); } .google-symbols { background: -webkit-linear-gradient(45deg, var(--googledevai-blue), var(--googledevai-purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; user-select: none; vertical-align: bottom; } /\* Cards \*/ @media only screen and (min-width: 625px) { .gemini-api-recommended { display: grid; grid-template-columns: repeat(3, 1fr); /\* Three equal-width columns \*/ grid-column-gap: 3rem; /\* Keep the gap between columns \*/ } } .gemini-api-recommended { width: 100%; /\* Take full width of parent \*/ margin: 0 auto; } .gemini-api-card { background: var(--devsite-background-1); border: 1px solid var(--googledevai-border-color); border-radius: 9px; box-shadow: var(--gemini-api-elevation-1dp); height: 23rem; margin: 1rem .5rem; padding: 1rem; transition: box-shadow 0.3s ease-in-out; width: var(--gemini-api-card-width); } .color-scheme--dark .gemini-api-card { background: #131314; border-color: #444746; } .gemini-api-card:hover { box-shadow: var(--gemini-api-elevation-3dp); } .gemini-api-card a:empty { display: block; position: relative; height: 23rem; width: var(--gemini-api-card-width); top: -22.8rem; left: -1rem; } .gemini-api-card a:empty:focus { border: 2px solid var(--devsite-primary-color); border-radius: 9px; } .gemini-api-card-title { font-family: "Google Sans", Roboto, sans-serif; font-size: 1.3rem; font-weight: 500; height: 1.5rem; margin-bottom: 2.5rem; line-height: 1.3rem; } .gemini-api-card-description { font-size: .9rem; height: 7.5rem; overflow: hidden; text-overflow: ellipsis; white-space: normal; } .gemini-api-card-bulletpoints { color: #757575; font-size: .8rem; height: 8.2rem; margin-left: 1rem; padding: 0; } .color-scheme--dark .gemini-api-card-bulletpoints { color: var(--devsite-primary-text-color); } .gemini-api-card-description, .gemini-api-card-bulletpoints { font-family: var(--gemini-api-model-font); } .gemini-api-card-bulletpoints li { line-height: 1rem; margin: .3rem 0; } /\* Tables \*/ .gemini-api-model-table, .gemini-api-model-table th { color: var(--gemini-api-table-font-color); font: .95rem var(--gemini-api-model-font); } .color-scheme--dark .gemini-api-model-table, .color-scheme--dark .gemini-api-model-table th { color: var(--devsite-primary-text-color); } .gemini-api-model-table th { font-weight: 500; } .gemini-api-model-table td:first-child { max-width: 0; } .gemini-api-model-table-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); grid-gap: 1rem .5rem; } .gemini-api-model-table section { display: inline-grid; } .gemini-api-model-table p { margin: 0 0 .5rem; } .gemini-api-model-table li { margin: 0; } .gemini-api-model-table ul { margin-top: .5rem; } .gemini-api-model-table .google-symbols { margin-right: .7rem; vertical-align: middle; } .gemini-api-supported, .gemini-api-not-supported, .gemini-api-experimental { border-radius: 8px; display: inline-block; font-size: .9rem; font-weight: 500; line-height: 1rem; padding: .3rem 0.5em; } .gemini-api-supported { background: #e6f4ea; /\* GM3 Green 50 \*/ color: #177d37; /\* GM3 Green 700 \*/ } .gemini-api-not-supported { background: #fce8e6; /\* GM3 Red 50 \*/ color: #c5221f; /\* GM3 Red 700 \*/ } .gemini-api-experimental { background: #e8def8; color: #4a4458; } .color-scheme--dark .gemini-api-supported { background: #177d37; /\* GM3 Green 700 \*/ color: #e6f4ea; /\* GM3 Green 50 \*/ } .color-scheme--dark .gemini-api-not-supported { background: #c5221f; /\* GM3 Red 700 \*/ color: #fce8e6; /\* GM3 Red 50 \*/ } /\* Buttons \*/ .gemini-api-model-button { background: var(--googledevai-button-gradient); background-size: 300% 300%; border-radius: 20rem; color: #001d35; font-family: var(--gemini-api-model-font); font-size: .9rem; font-weight: 500; padding: .6rem 1rem; text-align: center; text-decoration: none; transition: filter .2s ease-in-out, box-shadow .2s ease-in-out; } .gemini-api-model-button:hover{ animation: gradient 5s ease infinite; filter: brightness(.98); box-shadow: var(--gemini-api-elevation-1dp); } .gemini-api-model-button:focus { filter: brightness(.95); outline: #00639b solid 3px; outline-offset: 2px; text-decoration: none; } .gemini-api-model-button::before { content: 'spark'; font-family: 'Google Symbols'; padding-right: 0.5rem; vertical-align: middle; } @keyframes gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } } .model-card { display: flex; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; margin-bottom: 1.5rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); transition: box-shadow 0.3s ease; } .color-scheme--dark .model-card { background-color: #3c4043; } .model-card:hover { box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1); } .card-content { padding: 2.5rem; flex: 1; } .sub-heading-model { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 0.5rem 0; } .color-scheme--dark .sub-heading-model { color: var(--devsite-primary-text-color); } .card-content h2 { font-size: 2rem; font-weight: 500; margin: 0 0 1rem 0; } .description { font-size: 1rem; line-height: 1.6; color: #3c4043; margin: 0 0 1.5rem 0; } .color-scheme--dark .description { color: var(--devsite-primary-text-color); } .card-content a:not(.gemini-api-model-button) { color: #1a73e8; text-decoration: none; font-weight: 600; } .card-content a:hover { text-decoration: underline; } @media (max-width: 768px) { .model-card { flex-direction: column; } .card-image { flex-basis: 180px; width: 100%; } .card-content { padding: 1.5rem; } h1 { font-size: 2rem; } .card-content h2 { font-size: 1.5rem; } } /\* Styles inlined from /site-assets/css/pricing.css \*/ /\* Pricing table styles \*/ .pricing-table { border-collapse: separate; border-spacing: 0; border-radius: 8px; overflow: hidden; } .pricing-table th { background-color: #f2f2f2; text-align: left; padding: 8px; } /\* Set the second and after (of three total) columns to 35% width. \*/ .pricing-table th:nth-child(n+2) { width: 35%; } /\* These should use theme colours for light too, so we don't \* need an override. \*/ .color-scheme--dark .pricing-table th { background-color: var(--devsite-ref-palette--grey800); } .pricing-table td { padding: 8px; } .free-tier { background-color: none; } .paid-tier { background-color: #eff5ff; } .color-scheme--dark .paid-tier { background-color: var(--devsite-background-5); } .pricing-table th:first-child { border-top-left-radius: 8px; } .pricing-table th:last-child { border-top-right-radius: 8px; } .pricing-table tr:last-child td:first-child { border-bottom-left-radius: 8px; } .pricing-table tr:last-child td:last-child { border-bottom-right-radius: 8px; } .pricing-container { max-width: 1100px; width: 100%; } .pricing-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; justify-content: center; } .pricing-card { background-color: #ffffff; border-radius: 16px; border: 1px solid #dadce0; padding: 2.5rem; display: flex; flex-direction: column; transition: all 0.3s ease; position: relative; } .color-scheme--dark .pricing-card { background-color: var(--devsite-ref-palette--grey800); } .plan-name { font-size: 1.75rem; font-weight: 700; margin: 0 0 0.5rem 0; } .plan-description { font-size: 1rem; color: #5f6368; margin: 0 0 2.5rem 0; line-height: 1.5; min-height: 80px; } .color-scheme--dark .plan-description { color: var(--devsite-primary-text-color); } .plan-description a { color: #1a73e8; text-decoration: none; } .plan-description a:hover { text-decoration: underline; } .features { list-style: none; padding: 0; margin: 0 0 2rem 0; } .features li { display: flex; align-items: flex-start; margin-bottom: 1.25rem; font-size: 1rem; line-height: 1.5; color: #3c4043; } .features li.feature-description { display: block; color: #5f6368; } .features li a { color: #1a73e8; text-decoration: none; margin-left: 4px; } .features li .material-symbols-outlined { font-size: 24px; margin-right: 0.75rem; color: #3c4043; margin-top: 2px; } .color-scheme--dark .features li, .features li .material-symbols-outlined { color: var(--devsite-primary-text-color); } .cta-button { display: inline-block; text-align: center; text-decoration: none; width: 100%; padding: 0.75rem 1rem; border-radius: 8px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: background-color 0.2s ease; box-sizing: border-box; border: 1px solid #dadce0; background-color: #fff; color: #1a73e8; margin-top: auto; } .cta-button:hover { background-color: rgba(66, 133, 244, 0.05); } .pricing-card.recommended { border: 2px solid #1a73e8; overflow: hidden; } .pricing-card.recommended::before { position: absolute; top: 22px; right: -32px; width: 120px; height: 30px; background-color: #1a73e8; color: white; display: flex; justify-content: center; align-items: center; font-size: 0.8rem; font-weight: 600; transform: rotate(45deg); z-index: 1; } .heading-group { display: flex; flex-direction: column; } .heading-group h2 { margin-bottom: 0; } .heading-group em { margin-top: 0; }

Veo 3.1 is here! Read about the new model and its features in the [blog post](https://developers.googleblog.com/en/introducing-veo-3-1-and-new-creative-controls-in-the-gemini-api/) and [documentation](https://ai.google.dev/gemini-api/docs/video).

*   [Home](https://ai.google.dev/)
*   [Gemini API](https://ai.google.dev/gemini-api)
*   [Gemini API Docs](https://ai.google.dev/gemini-api/docs)

# Gemini Developer API Pricing

content\_copy

*   On this page
*   [Gemini 2.5 Pro](#gemini-2.5-pro)
*   [Gemini 2.5 Flash](#gemini-2.5-flash)
*   [Gemini 2.5 Flash Preview](#gemini-2.5-flash-preview)
*   [Gemini 2.5 Flash-Lite](#gemini-2.5-flash-lite)
*   [Gemini 2.5 Flash-Lite Preview](#gemini-2.5-flash-lite-preview)
*   [Gemini 2.5 Flash Native Audio (Live API)](#gemini-2.5-flash-native-audio)
*   [Gemini 2.5 Flash Image](#gemini-2.5-flash-image)
*   [Gemini 2.5 Flash Preview TTS](#gemini-2.5-flash-preview-tts)
*   [Gemini 2.5 Pro Preview TTS](#gemini-2.5-pro-preview-tts)
*   [Gemini 2.0 Flash](#gemini-2.0-flash)
*   [Gemini 2.0 Flash-Lite](#gemini-2.0-flash-lite)
*   [Imagen 4](#imagen-4)
*   [Imagen 3](#imagen-3)
*   [Veo 3.1](#veo-3.1)
*   [Veo 3](#veo-3)
*   [Veo 2](#veo-2)
*   [Gemini Embedding](#gemini-embedding)
*   [Gemini Robotics-ER 1.5 Preview](#gemini-robotics-er)
*   [Gemini 2.5 Computer Use Preview](#gemini-2.5-computer-use-preview-10-2025)
*   [Gemma 3](#gemma-3)
*   [Gemma 3n](#gemma-3n)

Start building free of charge with generous limits, then scale up with pay-as-you-go pricing for your production ready applications.

### Free

For developers and small projects getting started with the Gemini API.

*   check\_circleLimited access to certain models
*   check\_circleFree input & output tokens
*   check\_circleGoogle AI Studio access
*   check\_circleContent used to improve our products[\*](https://ai.google.dev/gemini-api/terms)

[Get started for Free](https://aistudio.google.com)

### Paid

For production applications that require higher volumes and advanced features.

*   check\_circleHigher rate limits for production deployments
*   check\_circleAccess to Context Caching
*   check\_circleBatch API (50% cost reduction)
*   check\_circleAccess to Google's most advanced models
*   check\_circleContent \*not\* used to improve our products[\*](https://ai.google.dev/gemini-api/terms)

[Upgrade to Paid](https://aistudio.google.com/api-keys)

### Enterprise

For large-scale deployments with custom needs for security, support, and compliance, powered by [Vertex AI](https://cloud.google.com/vertex-ai).

*   check\_circleAll features in Paid, plus optional access to:
*   check\_circleDedicated support channels
*   check\_circleAdvanced security & compliance
*   check\_circleProvisioned throughput
*   check\_circleVolume-based discounts (based on usage)
*   check\_circleML Ops, Model garden and more

[Contact Sales](https://cloud.google.com/contact)

## Gemini 2.5 Pro

_`gemini-2.5-pro`_

[Try it in Google AI Studio](https://aistudio.google.com?model=gemini-2.5-pro)

Our state-of-the-art multipurpose model, which excels at coding and complex reasoning tasks.

[Standard](#standard)[Batch](#batch) More

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Free of charge

$1.25, prompts <= 200k tokens  
$2.50, prompts > 200k tokens

Output price (including thinking tokens)

Free of charge

$10.00, prompts <= 200k tokens  
$15.00, prompts > 200k

Context caching price

Not available

$0.125, prompts <= 200k tokens  
$0.25, prompts > 200k  
$4.50 / 1,000,000 tokens per hour (storage price)

Grounding with Google Search

Not available

1,500 RPD (free), then $35 / 1,000 grounded prompts

Grounding with Google Maps

Not available

10,000 RPD (free), then $25 / 1,000 grounded prompts

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Not available

$0.625, prompts <= 200k tokens  
$1.25, prompts > 200k tokens

Output price (including thinking tokens)

Not available

$5.00, prompts <= 200k tokens  
$7.50, prompts > 200k

Context caching price

Not available

$0.125, prompts <= 200k tokens  
$0.25, prompts > 200k  
$4.50 / 1,000,000 tokens per hour (storage price)

Grounding with Google Search

Not available

1,500 RPD (free), then $35 / 1,000 grounded prompts

Grounding with Google Maps

Not available

Not available

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

## Gemini 2.5 Flash

_`gemini-2.5-flash`_

[Try it in Google AI Studio](https://aistudio.google.com?model=gemini-2.5-flash)

Our first hybrid reasoning model which supports a 1M token context window and has thinking budgets.

[Standard](#standard)[Batch](#batch) More

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Free of charge

$0.30 (text / image / video)  
$1.00 (audio)

Output price (including thinking tokens)

Free of charge

$2.50

Context caching price

Not available

$0.03 (text / image / video)  
$0.1 (audio)  
$1.00 / 1,000,000 tokens per hour (storage price)

Grounding with Google Search

Free of charge, up to 500 RPD (limit shared with Flash-Lite RPD)

1,500 RPD (free, limit shared with Flash-Lite RPD), then $35 / 1,000 grounded prompts

Grounding with Google Maps

500 RPD

1,500 RPD (free), then $25 / 1,000 grounded prompts

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Not available

$0.15 (text / image / video)  
$0.50 (audio)

Output price (including thinking tokens)

Not available

$1.25

Context caching price

Not available

$0.03 (text / image / video)  
$0.1 (audio)  
$1.00 / 1,000,000 tokens per hour (storage price)

Grounding with Google Search

Not available

1,500 RPD (free, limit shared with Flash-Lite RPD), then $35 / 1,000 grounded prompts

Grounding with Google Maps

Not available

Not available

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

## Gemini 2.5 Flash Preview

_`gemini-2.5-flash-preview-09-2025`_

[Try it in Google AI Studio](https://aistudio.google.com?model=gemini-2.5-flash-preview-09-2025)

The latest model based on the 2.5 Flash model. 2.5 Flash Preview is best for large scale processing, low-latency, high volume tasks that require thinking, and agentic use cases.

[Standard](#standard)[Batch](#batch) More

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Free of charge

$0.30 (text / image / video)  
$1.00 (audio)

Output price (including thinking tokens)

Free of charge

$2.50

Context caching price

Not available

$0.03 (text / image / video)  
$0.1 (audio)  
$1.00 / 1,000,000 tokens per hour (storage price)

Grounding with Google Search

Free of charge, up to 500 RPD (limit shared with Flash-Lite RPD)

1,500 RPD (free, limit shared with Flash-Lite RPD), then $35 / 1,000 grounded prompts

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Not available

$0.15 (text / image / video)  
$0.50 (audio)

Output price (including thinking tokens)

Not available

$1.25

Context caching price

Not available

$0.03 (text / image / video)  
$0.1 (audio)  
$1.00 / 1,000,000 tokens per hour (storage price)

Grounding with Google Search

Not available

1,500 RPD (free, limit shared with Flash-Lite RPD), then $35 / 1,000 grounded prompts

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

## Gemini 2.5 Flash-Lite

_`gemini-2.5-flash-lite`_

[Try it in Google AI Studio](https://aistudio.google.com?model=gemini-2.5-flash-lite)

Our smallest and most cost effective model, built for at scale usage.

[Standard](#standard)[Batch](#batch) More

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price (text, image, video)

Free of charge

$0.10 (text / image / video)  
$0.30 (audio)

Output price (including thinking tokens)

Free of charge

$0.40

Context caching price

Not available

$0.01 (text / image / video)  
$0.03 (audio)  
$1.00 / 1,000,000 tokens per hour (storage price)

Grounding with Google Search

Free of charge, up to 500 RPD (limit shared with Flash RPD)

1,500 RPD (free, limit shared with Flash RPD), then $35 / 1,000 grounded prompts

Grounding with Google Maps

500 RPD

1,500 RPD (free), then $25 / 1,000 grounded prompts

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price (text, image, video)

Not available

$0.05 (text / image / video)  
$0.15 (audio)

Output price (including thinking tokens)

Not available

$0.20

Context caching price

Not available

$0.01 (text / image / video)  
$0.03 (audio)  
$1.00 / 1,000,000 tokens per hour (storage price)

Grounding with Google Search

Not available

1,500 RPD (free, limit shared with Flash RPD), then $35 / 1,000 grounded prompts

Grounding with Google Maps

Not available

Not available

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

## Gemini 2.5 Flash-Lite Preview

_`gemini-2.5-flash-lite-preview-09-2025`_

[Try it in Google AI Studio](https://aistudio.google.com?model=gemini-2.5-flash-lite-preview-09-2025)

The latest model based on Gemini 2.5 Flash lite optimized for cost-efficiency, high throughput and high quality.

[Standard](#standard)[Batch](#batch) More

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price (text, image, video)

Free of charge

$0.10 (text / image / video)  
$0.30 (audio)

Output price (including thinking tokens)

Free of charge

$0.40

Context caching price

Not available

$0.01 (text / image / video)  
$0.03 (audio)  
$1.00 / 1,000,000 tokens per hour (storage price)

Grounding with Google Search

Free of charge, up to 500 RPD (limit shared with Flash RPD)

1,500 RPD (free, limit shared with Flash RPD), then $35 / 1,000 grounded prompts

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price (text, image, video)

Not available

$0.05 (text / image / video)  
$0.15 (audio)

Output price (including thinking tokens)

Not available

$0.20

Context caching price

Not available

$0.01 (text / image / video)  
$0.03 (audio)  
$1.00 / 1,000,000 tokens per hour (storage price)

Grounding with Google Search

Not available

1,500 RPD (free, limit shared with Flash RPD), then $35 / 1,000 grounded prompts

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

## Gemini 2.5 Flash Native Audio (Live API)

_`gemini-2.5-flash-native-audio-preview-09-2025`_

[Try it in Google AI Studio](https://aistudio.google.com/app/live#gemini-2.5-flash-native-audio-preview-09-2025)

Our [Live API](/gemini-api/docs/live) native audio models optimized for higher quality audio outputs with better pacing, voice naturalness, verbosity, and mood.

Preview models may change before becoming stable and have more restrictive rate limits.

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Free of charge

$0.50 (text)  
$3.00 (audio / video)

Output price (including thinking tokens)

Free of charge

$2.00 (text)  
$12.00 (audio)

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

The Live API also includes half-cascade audio generation models:

*   `gemini-live-2.5-flash-preview`: Same price as the native audio model.
*   `gemini-2.0-flash-live-001`: Input $0.35 (text), $2.10 (audio / image / video), Output: $1.50 (text), $8.50 (audio)

These models will be deprecated soon.

## Gemini 2.5 Flash Image

_`gemini-2.5-flash-image`_

[Try it in Google AI Studio](https://aistudio.google.com?model=gemini-2.5-flash-image)

Our native image generation model, optimized for speed, flexibility, and contextual understanding. Text input and output is priced the same as [2.5 Flash](#gemini-2.5-flash).

Preview models may change before becoming stable and have more restrictive rate limits.

[Standard](#standard)[Batch](#batch) More

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Not available

$0.30 (text / image)

Output price

Not available

$0.039 per image\*

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Not available

$0.15 (text / image)

Output price

Not available

$0.0195 per image\*

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

\[\*\] Image output is priced at $30 per 1,000,000 tokens. Output images up to 1024x1024px consume 1290 tokens and are equivalent to $0.039 per image.

## Gemini 2.5 Flash Preview TTS

_`gemini-2.5-flash-preview-tts`_

[Try it in Google AI Studio](https://aistudio.google.com/generate-speech)

Our 2.5 Flash text-to-speech audio model optimized for price-performant, low-latency, controllable speech generation.

Preview models may change before becoming stable and have more restrictive rate limits.

[Standard](#standard)[Batch](#batch) More

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Free of charge

$0.50 (text)

Output price

Free of charge

$10.00 (audio)

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Not available

$0.25 (text)

Output price

Not available

$5.00 (audio)

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

## Gemini 2.5 Pro Preview TTS

_`gemini-2.5-pro-preview-tts`_

[Try it in Google AI Studio](https://aistudio.google.com/generate-speech)

Our 2.5 Pro text-to-speech audio model optimized for powerful, low-latency speech generation for more natural outputs and easier to steer prompts.

Preview models may change before becoming stable and have more restrictive rate limits.

[Standard](#standard)[Batch](#batch) More

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Not available

$1.00 (text)

Output price

Not available

$20.00 (audio)

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Not available

$0.50 (text)

Output price

Not available

$10.00 (audio)

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

## Gemini 2.0 Flash

_`gemini-2.0-flash`_

[Try it in Google AI Studio](https://aistudio.google.com?model=gemini-2.0-flash)

Our most balanced multimodal model with great performance across all tasks, with a 1 million token context window, and built for the era of Agents.

[Standard](#standard)[Batch](#batch) More

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Free of charge

$0.10 (text / image / video)  
$0.70 (audio)

Output price

Free of charge

$0.40

Context caching price

Free of charge

$0.025 / 1,000,000 tokens (text/image/video)  
$0.175 / 1,000,000 tokens (audio)

Context caching (storage)

Not available

$1.00 / 1,000,000 tokens per hour

Image generation pricing

Free of charge

$0.039 per image\*

Tuning price

Not available

Not available

Grounding with Google Search

Free of charge, up to 500 RPD

1,500 RPD (free), then $35 / 1,000 grounded prompts

Grounding with Google Maps

500 RPD

1,500 RPD (free), then $25 / 1,000 grounded prompts

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Not available

$0.05 (text / image / video)  
$0.35 (audio)

Output price

Not available

$0.20

Context caching price

Not available

$0.025 / 1,000,000 tokens (text/image/video)  
$0.175 / 1,000,000 tokens (audio)

Context caching (storage)

Not available

$1.00 / 1,000,000 tokens per hour

Image generation pricing

Not available

$0.0195 per image\*

Tuning price

Not available

Not available

Grounding with Google Search

Not available

1,500 RPD (free), then $35 / 1,000 grounded prompts

Grounding with Google Maps

Not available

Not available

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

\[\*\] Image output is priced at $30 per 1,000,000 tokens. Output images up to 1024x1024px consume 1290 tokens and are equivalent to $0.039 per image.

## Gemini 2.0 Flash-Lite

_`gemini-2.0-flash-lite`_

[Try it in Google AI Studio](https://aistudio.google.com?model=gemini-2.0-flash-lite)

Our smallest and most cost effective model, built for at scale usage.

[Standard](#standard)[Batch](#batch) More

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Free of charge

$0.075

Output price

Free of charge

$0.30

Context caching price

Not available

Not available

Context caching (storage)

Not available

Not available

Tuning price

Not available

Not available

Grounding with Google Search

Not available

Not available

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Not available

$0.0375

Output price

Not available

$0.15

Context caching price

Not available

Not available

Context caching (storage)

Not available

Not available

Tuning price

Not available

Not available

Grounding with Google Search

Not available

Not available

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

## Imagen 4

_`imagen-4.0-generate-001`, `imagen-4.0-ultra-generate-001`, `imagen-4.0-fast-generate-001`_

[Try it in Google AI Studio](https://aistudio.google.com/generate-image)

Our latest image generation model, with significantly better text rendering and better overall image quality.

Preview models may change before becoming stable and have more restrictive rate limits.

  

Free Tier

Paid Tier, per Image in USD

Imagen 4 Fast image price

Not available

$0.02

Imagen 4 Standard image price

Not available

$0.04

Imagen 4 Ultra image price

Not available

$0.06

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

## Imagen 3

_`imagen-3.0-generate-002`_

[Try it in Google AI Studio](https://aistudio.google.com/generate-image)

Our state-of-the-art image generation model, available to developers on the paid tier of the Gemini API.

  

Free Tier

Paid Tier, per Image in USD

Image price

Not available

$0.03

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

## Veo 3.1

_`veo-3.1-generate-preview`, `veo-3.1-fast-generate-preview`_

[Try Veo 3.1](https://deepmind.google/models/veo/)

Our latest video generation model, available to developers on the paid tier of the Gemini API.

Preview models may change before becoming stable and have more restrictive rate limits.

  

Free Tier

Paid Tier, per second in USD

Veo 3.1 Standard video with audio price (default)

Not available

$0.40

Veo 3.1 Fast video with audio price (default)

Not available

$0.15

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

**Note:** In some cases, an audio processing issue may prevent a video from being generated. You will only be charged if your video is successfully generated.

## Veo 3

_`veo-3.0-generate-001`, `veo-3.0-fast-generate-001`_

[Try Veo 3](https://deepmind.google/models/veo/)

Our stable video generation model, available to developers on the paid tier of the Gemini API.

  

Free Tier

Paid Tier, per second in USD

Veo 3 Standard video with audio price (default)

Not available

$0.40

Veo 3 Fast video with audio price (default)

Not available

$0.15

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

**Note:** In some cases, an audio processing issue may prevent a video from being generated. You will only be charged if your video is successfully generated.

## Veo 2

_`veo-2.0-generate-001`_

[Try the API](/gemini-api/docs/video)

Our state-of-the-art video generation model, available to developers on the paid tier of the Gemini API.

  

Free Tier

Paid Tier, per second in USD

Video price

Not available

$0.35

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

## Gemini Embedding

_`gemini-embedding-001`_

[Try the API](/gemini-api/docs/embeddings)

Our newest embeddings model, more stable and with higher rate limits than previous versions, available to developers on the free and paid tiers of the Gemini API.

[Standard](#standard)[Batch](#batch) More

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Free of charge

$0.15

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Not available

$0.075

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

## Gemini Robotics-ER 1.5 Preview

_`gemini-robotics-er-1.5-preview`_

[Try it in Google AI Studio](https://aistudio.google.com?model=gemini-robotics-er-1.5-preview)

Gemini Robotics-ER, short for Gemini Robotics-Embodied Reasoning, is a thinking model that enhances robots' abilities to understand and interact with the physical world.

[Standard](#standard)[Batch](#batch) More

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Free of charge

$0.30 (text / image / video)  
$1.00 (audio)

Output price (including thinking tokens)

Free of charge

$2.50

Grounding with Google Search

Free of charge, up to 500 RPD (limit shared with Flash-Lite RPD)

1,500 RPD (free, limit shared with Flash-Lite RPD), then $35 / 1,000 grounded prompts

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Not available

Not available

Output price (including thinking tokens)

Not available

Not available

Grounding with Google Search

Not available

Not available

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

## Gemini 2.5 Computer Use Preview

_`gemini-2.5-computer-use-preview-10-2025`_

Our Computer Use model optimized for building browser control agents that automate tasks.

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Not available

$1.25, prompts <= 200k tokens  
$2.50, prompts > 200k token

Output price

Not available

$10.00, prompts <= 200k tokens  
$15.00, prompts > 200k

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

## Gemma 3

[Try Gemma 3](https://aistudio.google.com/prompts/new_chat?model=gemma-3-27b-it)

Our lightweight, state-of the art, open model built from the same technology that powers our Gemini models.

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Free of charge

Not available

Output price

Free of charge

Not available

Context caching price

Free of charge

Not available

Context caching (storage)

Free of charge

Not available

Tuning price

Not available

Not available

Grounding with Google Search

Not available

Not available

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

## Gemma 3n

[Try Gemma 3n](https://aistudio.google.com/prompts/new_chat?model=gemma-3n-e4b-it)

Our open model built for efficient performance on everyday devices like mobile phones, laptops, and tablets.

  

Free Tier

Paid Tier, per 1M tokens in USD

Input price

Free of charge

Not available

Output price

Free of charge

Not available

Context caching price

Free of charge

Not available

Context caching (storage)

Free of charge

Not available

Tuning price

Not available

Not available

Grounding with Google Search

Not available

Not available

Used to improve our products

[Yes](/gemini-api/terms)

[No](/gemini-api/terms)

\[\*\] Google AI Studio usage is free of charge in all [available regions](/gemini-api/docs/available-regions). See [Billing FAQs](/gemini-api/docs/billing) for details.

\[\*\*\] Prices may differ from the prices listed here and the prices offered on Vertex AI. For Vertex prices, see the [Vertex AI pricing page](https://cloud.google.com/vertex-ai/generative-ai/pricing).

\[\*\*\*\] If you are using [dynamic retrieval](/gemini-api/docs/grounding) to optimize costs, only requests that contain at least one grounding support URL from the web in their response are charged for Grounding with Google Search. Costs for Gemini always apply. Rate limits are subject to change.

Except as otherwise noted, the content of this page is licensed under the [Creative Commons Attribution 4.0 License](https://creativecommons.org/licenses/by/4.0/), and code samples are licensed under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0). For details, see the [Google Developers Site Policies](https://developers.google.com/site-policies). Java is a registered trademark of Oracle and/or its affiliates.

Last updated 2025-10-31 UTC.