/\* Styles inlined from /site-assets/css/models.css \*/ :root { --gemini-api-table-font-color: #3c4043; --gemini-api-model-font: 'Google Sans Text', Roboto, sans-serif; --gemini-api-card-width: 17rem; --gemini-api-elevation-1dp: 0 1px 1px 0 rgba(0, 0, 0, 0.14), 0 2px 1px -1px rgba(0, 0, 0, 0.12), 0 1px 3px 0 rgba(0, 0, 0, 0.2); --gemini-api-elevation-3dp: 0 3px 4px 0 rgba(0, 0, 0, 0.14), 0 3px 3px -2px rgba(0, 0, 0, 0.12), 0 1px 8px 0 rgba(0, 0, 0, 0.2); } body\[theme="googledevai-theme"\] { --googledevai-button-gradient: var(--googledevai-button-gradient-light); } body\[theme="googledevai-theme"\].color-scheme--dark { --googledevai-button-gradient: var(--googledevai-button-gradient-dark); } .google-symbols { background: -webkit-linear-gradient(45deg, var(--googledevai-blue), var(--googledevai-purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; user-select: none; vertical-align: bottom; } /\* Cards \*/ @media only screen and (min-width: 625px) { .gemini-api-recommended { display: grid; grid-template-columns: repeat(3, 1fr); /\* Three equal-width columns \*/ grid-column-gap: 3rem; /\* Keep the gap between columns \*/ } } .gemini-api-recommended { width: 100%; /\* Take full width of parent \*/ margin: 0 auto; } .gemini-api-card { background: var(--devsite-background-1); border: 1px solid var(--googledevai-border-color); border-radius: 9px; box-shadow: var(--gemini-api-elevation-1dp); height: 23rem; margin: 1rem .5rem; padding: 1rem; transition: box-shadow 0.3s ease-in-out; width: var(--gemini-api-card-width); } .color-scheme--dark .gemini-api-card { background: #131314; border-color: #444746; } .gemini-api-card:hover { box-shadow: var(--gemini-api-elevation-3dp); } .gemini-api-card a:empty { display: block; position: relative; height: 23rem; width: var(--gemini-api-card-width); top: -22.8rem; left: -1rem; } .gemini-api-card a:empty:focus { border: 2px solid var(--devsite-primary-color); border-radius: 9px; } .gemini-api-card-title { font-family: "Google Sans", Roboto, sans-serif; font-size: 1.3rem; font-weight: 500; height: 1.5rem; margin-bottom: 2.5rem; line-height: 1.3rem; } .gemini-api-card-description { font-size: .9rem; height: 7.5rem; overflow: hidden; text-overflow: ellipsis; white-space: normal; } .gemini-api-card-bulletpoints { color: #757575; font-size: .8rem; height: 8.2rem; margin-left: 1rem; padding: 0; } .color-scheme--dark .gemini-api-card-bulletpoints { color: var(--devsite-primary-text-color); } .gemini-api-card-description, .gemini-api-card-bulletpoints { font-family: var(--gemini-api-model-font); } .gemini-api-card-bulletpoints li { line-height: 1rem; margin: .3rem 0; } /\* Tables \*/ .gemini-api-model-table, .gemini-api-model-table th { color: var(--gemini-api-table-font-color); font: .95rem var(--gemini-api-model-font); } .color-scheme--dark .gemini-api-model-table, .color-scheme--dark .gemini-api-model-table th { color: var(--devsite-primary-text-color); } .gemini-api-model-table th { font-weight: 500; } .gemini-api-model-table td:first-child { max-width: 0; } .gemini-api-model-table-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); grid-gap: 1rem .5rem; } .gemini-api-model-table section { display: inline-grid; } .gemini-api-model-table p { margin: 0 0 .5rem; } .gemini-api-model-table li { margin: 0; } .gemini-api-model-table ul { margin-top: .5rem; } .gemini-api-model-table .google-symbols { margin-right: .7rem; vertical-align: middle; } .gemini-api-supported, .gemini-api-not-supported, .gemini-api-experimental { border-radius: 8px; display: inline-block; font-size: .9rem; font-weight: 500; line-height: 1rem; padding: .3rem 0.5em; } .gemini-api-supported { background: #e6f4ea; /\* GM3 Green 50 \*/ color: #177d37; /\* GM3 Green 700 \*/ } .gemini-api-not-supported { background: #fce8e6; /\* GM3 Red 50 \*/ color: #c5221f; /\* GM3 Red 700 \*/ } .gemini-api-experimental { background: #e8def8; color: #4a4458; } .color-scheme--dark .gemini-api-supported { background: #177d37; /\* GM3 Green 700 \*/ color: #e6f4ea; /\* GM3 Green 50 \*/ } .color-scheme--dark .gemini-api-not-supported { background: #c5221f; /\* GM3 Red 700 \*/ color: #fce8e6; /\* GM3 Red 50 \*/ } /\* Buttons \*/ .gemini-api-model-button { background: var(--googledevai-button-gradient); background-size: 300% 300%; border-radius: 20rem; color: #001d35; font-family: var(--gemini-api-model-font); font-size: .9rem; font-weight: 500; padding: .6rem 1rem; text-align: center; text-decoration: none; transition: filter .2s ease-in-out, box-shadow .2s ease-in-out; } .gemini-api-model-button:hover{ animation: gradient 5s ease infinite; filter: brightness(.98); box-shadow: var(--gemini-api-elevation-1dp); } .gemini-api-model-button:focus { filter: brightness(.95); outline: #00639b solid 3px; outline-offset: 2px; text-decoration: none; } .gemini-api-model-button::before { content: 'spark'; font-family: 'Google Symbols'; padding-right: 0.5rem; vertical-align: middle; } @keyframes gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } } .model-card { display: flex; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; margin-bottom: 1.5rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); transition: box-shadow 0.3s ease; } .color-scheme--dark .model-card { background-color: #3c4043; } .model-card:hover { box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1); } .card-content { padding: 2.5rem; flex: 1; } .sub-heading-model { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 0.5rem 0; } .color-scheme--dark .sub-heading-model { color: var(--devsite-primary-text-color); } .card-content h2 { font-size: 2rem; font-weight: 500; margin: 0 0 1rem 0; } .description { font-size: 1rem; line-height: 1.6; color: #3c4043; margin: 0 0 1.5rem 0; } .color-scheme--dark .description { color: var(--devsite-primary-text-color); } .card-content a:not(.gemini-api-model-button) { color: #1a73e8; text-decoration: none; font-weight: 600; } .card-content a:hover { text-decoration: underline; } @media (max-width: 768px) { .model-card { flex-direction: column; } .card-image { flex-basis: 180px; width: 100%; } .card-content { padding: 1.5rem; } h1 { font-size: 2rem; } .card-content h2 { font-size: 1.5rem; } } /\* Styles inlined from /site-assets/css/overview.css \*/ .code-snippet { background-color: #f5f5f5; padding: 1rem; border-radius: 4px; overflow: auto; } .code-snippet code { font-family: monospace; } .card { background-color: #f1f3f4; border-radius: 8px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); padding: 1.5rem; margin-bottom: 1.5rem; position: relative; cursor: pointer; display: flex; align-items: center; } .color-scheme--dark .card { background-color: var(--devsite-ref-palette--grey800); } .card > img { width: 40%; height: auto; margin-right: 1rem; object-fit: cover; } .card > h3, .card > p{ margin-left: 0; } .card-text-content { display: flex; flex-direction: column; } .gemini-api-card-overview { background: var(--devsite-background-1); border: 1px solid var(--googledevai-border-color); border-radius: 8px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); height: 14rem; padding: 1rem; transition: box-shadow 0.3s ease-in-out; width: 100%; } .gemini-api-card-overview:hover { box-shadow: var(--gemini-api-elevation-3dp); } .gemini-api-card-overview a:empty { display: block; position: relative; height: 14rem; width: 115%; top: -14.5rem; left: -1rem; } .gemini-api-card-overview a:empty:focus { border: 2px solid var(--devsite-primary-color); border-radius: 9px; } @media only screen and (min-width: 625px) { .gemini-api-recommended { display: grid; grid-template-columns: repeat(3, 1fr); grid-column-gap: 3rem; margin-bottom: 3rem; } } .card a { display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; text-decoration: none; color: inherit; } .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; } .cta-button { background-color: #4285f4; color: #fff; padding: 1rem 2rem; border-radius: 4px; text-decoration: none; display: inline-block; transition: background-color 0.2s; } .cta-button:hover { background-color: #357ae8; } .capabilities-list li { list-style-type: disc; margin-left: 20px; margin-bottom: 0.5rem; } .models-section { display: flex; justify-content: space-between; align-items: end; } .gemini-api-model-button { background-color: #4285f4; color: white; padding: 0.8rem 1.5rem; border-radius: 4px; text-decoration: none; font-size: 1rem; } .card-image { width: 50px; height: 50px; margin-right: 1rem; object-fit: cover; } .card-overview-bottom { padding: 3rem 2rem; border-radius: 12px; text-align: center; background-image: linear-gradient(to right, #217BFE, #078EFB); color: white; margin-top: 60px; position: relative; overflow: hidden; width: 100%; max-width: 1200px; box-sizing: border-box; } .card-overview-bottom::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px); background-size: 30px 30px; z-index: 0; } .card-overview-bottom h3 { position: relative; z-index: 1; } .card-overview-bottom a { position: relative; z-index: 1; cursor: pointer; } @media only screen and (max-width: 625px) { .gemini-api-card-overview { margin-bottom: 1.5rem; height: 10rem; } .gemini-api-card-overview a:empty { height: 10rem; top: -12.1rem; } .gemini-api-card-title { margin: 0rem; } .card { display: block; } .card > img { width: 100%; } .models-section { display: block; } .ais { width: 100%; } } @media (max-width: 768px) { #meet-the-models { margin: 0rem; } }

Veo 3.1 is here! Read about the new model and its features in the [blog post](https://developers.googleblog.com/en/introducing-veo-3-1-and-new-creative-controls-in-the-gemini-api/) and [documentation](https://ai.google.dev/gemini-api/docs/video).

*   [Home](https://ai.google.dev/)
*   [Gemini API](https://ai.google.dev/gemini-api)
*   [Gemini API Docs](https://ai.google.dev/gemini-api/docs)

# Gemini Developer API

content\_copy

[Get a Gemini API Key](https://aistudio.google.com/apikey)

Get a Gemini API key and make your first API request in minutes.

[Python](#python)[JavaScript](#javascript)[Go](#go)[Java](#java)[REST](#rest) More

```
from google import genai

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Explain how AI works in a few words",
)

print(response.text)
```

```
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Explain how AI works in a few words",
  });
  console.log(response.text);
}

await main();
```

```
package main

import (
    "context"
    "fmt"
    "log"
    "google.golang.org/genai"
)

func main() {
    ctx := context.Background()
    client, err := genai.NewClient(ctx, nil)
    if err != nil {
        log.Fatal(err)
    }

    result, err := client.Models.GenerateContent(
        ctx,
        "gemini-2.5-flash",
        genai.Text("Explain how AI works in a few words"),
        nil,
    )
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println(result.Text())
}
```

```
package com.example;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;

public class GenerateTextFromTextInput {
  public static void main(String[] args) {
    Client client = new Client();

    GenerateContentResponse response =
        client.models.generateContent(
            "gemini-2.5-flash",
            "Explain how AI works in a few words",
            null);

    System.out.println(response.text());
  }
}
```

```
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Explain how AI works in a few words"
          }
        ]
      }
    ]
  }'
```

## Meet the models

[Start building with Gemini](https://aistudio.google.com/apps)

2.5 Pro spark

Our most powerful thinking model with features for complex reasoning and much more

[](/gemini-api/docs/models#gemini-2.5-pro)

2.5 Flash spark

Our most balanced model, with a 1 million token context window and more

[](/gemini-api/docs/models/gemini#gemini-2.5-flash)

2.5 Flash-Lite spark

Our fastest and most cost-efficient multimodal model with great performance for high-frequency tasks

[](/gemini-api/docs/models/gemini#gemini-2.5-flash-lite)

Veo 3.1 video\_library

Our state of the art video generation model, with native audio

[](/gemini-api/docs/video)

Gemini 2.5 Flash Image imagesmode

(Nano Banana), our highly effective and precise image generation model

[](/gemini-api/docs/image-generation)

Gemini Embeddings data\_array

Our first Gemini embedding model, designed for production RAG workflows

[](/gemini-api/docs/embeddings)

## Explore the API

![](/static/site-assets/images/image-generation-index.png)

### Native Image Generation (aka Nano Banana)

Generate and edit highly contextual images natively with Gemini 2.5 Flash Image.

[](/gemini-api/docs/image-generation)

![](/static/site-assets/images/long-context-overview.png)

### Explore long context

Input millions of tokens to Gemini models and derive understanding from unstructured images, videos, and documents.

[](/gemini-api/docs/long-context)

![](/static/site-assets/images/structured-outputs-index.png)

### Generate structured outputs

Constrain Gemini to respond with JSON, a structured data format suitable for automated processing.

[](/gemini-api/docs/structured-output)

### Start building with the Gemini API

[Get started](/gemini-api/docs/quickstart)

Except as otherwise noted, the content of this page is licensed under the [Creative Commons Attribution 4.0 License](https://creativecommons.org/licenses/by/4.0/), and code samples are licensed under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0). For details, see the [Google Developers Site Policies](https://developers.google.com/site-policies). Java is a registered trademark of Oracle and/or its affiliates.

Last updated 2025-10-17 UTC.