import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import Marketplace from "@/pages/Marketplace";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const promptsPayload = [
  {
    slug: "standard-wedding-set",
    title: "Standard Wedding Set",
    summary: "Balanced stars, titles, descriptions, and tags for wedding workflows.",
    instructions: "Always respond with structured JSON...",
    shootTypes: ["wedding"],
    tags: ["wedding", "ceremony", "portrait"],
    aiScore: 8.7,
    humanScore: 9.2,
    ratingsCount: 128,
    updatedAt: new Date().toISOString(),
    style: {
      starMeaning: { 5: "Hero", 4: "Keeper", 3: "Cull", 2: "Reject", 1: "Reject", 0: "Reject" },
      includeTitle: true,
      includeDescription: true,
      includeTags: true,
      colorMeaning: null,
    },
    authorProfile: {
      id: "author-1",
      email: "photog@example.com",
      displayName: "Photog Pro",
      bio: "",
      avatarUrl: null,
    },
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
