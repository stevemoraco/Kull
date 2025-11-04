// Marketplace types for prompt templates and community sharing

export type CullingProfile =
  | 'standard'
  | 'wedding'
  | 'corporate'
  | 'sports'
  | 'portrait'
  | 'product'
  | 'real-estate';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  profile: CullingProfile;
  systemPrompt: string;
  firstMessage?: string;
  sampleOutput?: string;
  qualityScore: number;
  voteCount: number;
  usageCount: number;
  authorId: string;
  authorName?: string; // populated from join
  tags: string[];
  isPublic: boolean;
  isFeatured: boolean;
  userVote?: number; // -1, 0, or +1 - populated for current user
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptSearchFilters {
  query?: string;
  profile?: CullingProfile;
  tags?: string[];
  sortBy?: 'recent' | 'popular' | 'quality' | 'usage';
  featured?: boolean;
  authorId?: string;
}

export interface PromptStats {
  totalPrompts: number;
  totalVotes: number;
  totalUsage: number;
  profileBreakdown: Record<CullingProfile, number>;
  topTags: Array<{ tag: string; count: number }>;
}

export interface CreatePromptData {
  name: string;
  description: string;
  profile: CullingProfile;
  systemPrompt: string;
  firstMessage?: string;
  sampleOutput?: string;
  tags: string[];
  isPublic: boolean;
}

export interface VotePromptData {
  promptId: string;
  value: 1 | -1; // upvote or downvote
}
