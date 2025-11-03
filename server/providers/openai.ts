import fetch from "node-fetch";

export async function submitOpenAIBatch(args: {
  apiKey: string;
  model: string;
  images: { id: string; url?: string; b64?: string }[];
  prompt: string;
}) {
  try {
    const items = args.images.map((img) => ({
      role: "user",
      content: [
        { type: "input_text", text: args.prompt },
        ...(img.url
          ? [{ type: "input_image", image_url: img.url }]
          : img.b64
          ? [{ type: "input_image", image_base64: img.b64 }]
          : []),
      ],
    }));

    const body = {
      model: args.model,
      input: items,
      response_format: { type: "json_schema", schema: { ratings: [] } },
    } as any;

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (resp.status === 429) {
      const retryAfter = Number(resp.headers.get("retry-after")) * 1000 || 2000;
      return { ok: false as const, retryAfterMs: retryAfter };
    }
    if (!resp.ok) {
      return { ok: false as const };
    }
    return { ok: true as const };
  } catch {
    return { ok: false as const };
  }
}

