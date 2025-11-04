import type { PromptTemplate, CreatePromptData, PromptSearchFilters } from "@shared/types/marketplace";

const API_BASE = "/api/prompts";

export async function getPrompts(filters?: PromptSearchFilters): Promise<PromptTemplate[]> {
  const params = new URLSearchParams();

  if (filters?.query) params.append('query', filters.query);
  if (filters?.profile) params.append('profile', filters.profile);
  if (filters?.tags) filters.tags.forEach(tag => params.append('tags', tag));
  if (filters?.sortBy) params.append('sortBy', filters.sortBy);
  if (filters?.featured !== undefined) params.append('featured', String(filters.featured));
  if (filters?.authorId) params.append('authorId', filters.authorId);

  const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch prompts: ${res.statusText}`);
  }

  return res.json();
}

export async function getPrompt(id: string): Promise<PromptTemplate> {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch prompt: ${res.statusText}`);
  }
  return res.json();
}

export async function createPrompt(data: CreatePromptData): Promise<PromptTemplate> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create prompt');
  }

  return res.json();
}

export async function updatePrompt(id: string, data: Partial<CreatePromptData>): Promise<PromptTemplate> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update prompt');
  }

  return res.json();
}

export async function deletePrompt(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to delete prompt');
  }
}

export async function votePrompt(id: string, vote: 1 | -1): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value: vote }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to vote on prompt');
  }
}

export async function incrementPromptUsage(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}/use`, {
    method: 'POST',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to increment usage');
  }
}

export async function getPromptVotes(id: string): Promise<{ upvotes: number; downvotes: number; total: number; score: number }> {
  const res = await fetch(`${API_BASE}/${id}/votes`);
  if (!res.ok) {
    throw new Error(`Failed to fetch vote stats: ${res.statusText}`);
  }
  return res.json();
}
