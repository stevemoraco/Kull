import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import Marketplace from "@/pages/Marketplace";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const promptsPayload = [
  {
    id: "prompt-1",
    name: "Standard Wedding Set",
    description: "Balanced stars, titles, descriptions, and tags for wedding workflows.",
    profile: "wedding",
    systemPrompt: "Always respond with structured JSON...",
    firstMessage: "",
    sampleOutput: "",
    qualityScore: 0.9,
    voteCount: 128,
    usageCount: 42,
    authorId: "author-1",
    authorName: "Photog Pro",
    tags: ["wedding", "ceremony", "portrait"],
    isPublic: true,
    isFeatured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const myPromptsPayload = { created: [], saved: [] };

describe("Marketplace page", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes("/api/prompts/my")) {
        return Promise.resolve(new Response(JSON.stringify(myPromptsPayload), { status: 200 }));
      }
      if (url.includes("/api/prompts")) {
        return Promise.resolve(new Response(JSON.stringify(promptsPayload), { status: 200 }));
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("renders marketplace prompts", async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Marketplace />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText(/Standard Wedding Set/)).toBeInTheDocument());
    expect(screen.getByText(/Balanced stars/)).toBeInTheDocument();
    expect(screen.getByText(/wedding/)).toBeInTheDocument();
  });
});
