export type SwapnokuthirSectorId =
  | 'sector-content'
  | 'sector-catalog'
  | 'sector-seo'
  | 'sector-sales'
  | 'sector-support'
  | 'sector-ops';

export type AgentOperationMode = 'autonomous' | 'supervised' | 'paused';

export interface SwapnokuthirSectorAgent {
  id: SwapnokuthirSectorId;
  name: string;
  bnName: string;
  sector: 'content' | 'catalog' | 'seo' | 'sales' | 'support' | 'ops';
  masterAgent: string;
  mode: AgentOperationMode;
  directive: string;
  lastAction: string;
  lastSyncedAt: string;
  tasksCompleted: number;
}

export type PostStatus = 'published' | 'draft' | 'scheduled';
export type PostCategory = 'Collection' | 'Story' | 'Campaign' | 'Announcement' | 'Guide';

export interface SwapnokuthirPost {
  id: string;
  title: string;
  slug: string;
  category: PostCategory;
  status: PostStatus;
  excerpt: string;
  content: string;
  authorAgent: string;
  featured: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface SwapnokuthirContentBlock {
  id: string;
  sectionKey: 'hero' | 'announcement' | 'featured_collections' | 'brand_story' | 'contact_cta';
  label: string;
  headline: string;
  subheadline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  seoTitle: string;
  seoDescription: string;
  isLive: boolean;
  controlledByAgent: string;
  updatedAt: string;
}

export interface SwapnokuthirSalesRep {
  id: string;
  name: string;
  role: string;
  type: 'ai-agent' | 'human-rep';
  territory: string;
  status: 'active' | 'busy' | 'offline';
  handledLeads: number;
  conversionRate: number;
  pitchScript: string;
  integratedWithAstra: boolean;
  updatedAt: string;
}

export type LeadStage = 'new' | 'contacted' | 'quoted' | 'won';

export interface SwapnokuthirSalesLead {
  id: string;
  customerName: string;
  contact: string;
  channel: 'Website Chat' | 'WhatsApp' | 'Facebook' | 'Direct';
  inquiry: string;
  assignedRepId: string;
  assignedRepName: string;
  stage: LeadStage;
  aiSuggestedReply: string;
  createdAt: string;
  updatedAt: string;
}

export interface SwapnokuthirStateSnapshot {
  agents: SwapnokuthirSectorAgent[];
  posts: SwapnokuthirPost[];
  contents: SwapnokuthirContentBlock[];
  salesReps: SwapnokuthirSalesRep[];
  leads: SwapnokuthirSalesLead[];
  lastMasterSync: string;
}
