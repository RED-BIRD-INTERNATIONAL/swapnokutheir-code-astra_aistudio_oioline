import {
  SwapnokuthirContentBlock,
  SwapnokuthirPost,
  SwapnokuthirSalesLead,
  SwapnokuthirSalesRep,
  SwapnokuthirSectorAgent,
  SwapnokuthirStateSnapshot,
} from '../types/swapnokuthir';

export const DEFAULT_SWAPNOKUTHIR_AGENTS: SwapnokuthirSectorAgent[] = [
  {
    id: 'sector-content',
    name: 'Content & Editorial Agent',
    bnName: 'কন্টেন্ট ও পোস্ট এজেন্ট',
    sector: 'content',
    masterAgent: 'Astra-Gravity',
    mode: 'autonomous',
    directive:
      'Publish bilingual Bengali-first stories, seasonal home-living campaigns, and brand announcements for swapnokuthir.com.',
    lastAction: 'Published winter handcrafted terracotta collection story',
    lastSyncedAt: '2026-11-19T10:30:00.000Z',
    tasksCompleted: 48,
  },
  {
    id: 'sector-catalog',
    name: 'Catalog & Merchandising Agent',
    bnName: 'ক্যাটালগ ও পণ্য এজেন্ট',
    sector: 'catalog',
    masterAgent: 'Astra-Gravity',
    mode: 'autonomous',
    directive:
      'Maintain curated home decor collections, stock badges, BDT pricing tiers, and gift hamper bundles.',
    lastAction: 'Updated Monsoon Cane & Brassware bundle inventory',
    lastSyncedAt: '2026-11-19T09:45:00.000Z',
    tasksCompleted: 36,
  },
  {
    id: 'sector-seo',
    name: 'SEO & Social Distribution Agent',
    bnName: 'এসইও ও সোশ্যাল এজেন্ট',
    sector: 'seo',
    masterAgent: 'Astra-Gravity',
    mode: 'supervised',
    directive:
      'Optimize Bengali and English OpenGraph titles, meta descriptions, and structured tags across every post.',
    lastAction: 'Tuned homepage meta tags for Dhaka Artisan Decor searches',
    lastSyncedAt: '2026-11-19T08:15:00.000Z',
    tasksCompleted: 29,
  },
  {
    id: 'sector-sales',
    name: 'Sales Representative Agent',
    bnName: 'সেলস রিপ্রেজেন্টেটিভ এজেন্ট',
    sector: 'sales',
    masterAgent: 'Astra-Gravity',
    mode: 'autonomous',
    directive:
      'Respond instantly to visitor inquiries, qualify corporate & residential orders, draft custom quotes, and sync with human reps.',
    lastAction: 'Prepared Gulshan corporate gifting quote for 45 sets',
    lastSyncedAt: '2026-11-19T11:20:00.000Z',
    tasksCompleted: 64,
  },
  {
    id: 'sector-support',
    name: 'Customer Support & Order Agent',
    bnName: 'কাস্টমার সাপোর্ট ও অর্ডার এজেন্ট',
    sector: 'support',
    masterAgent: 'Astra-Gravity',
    mode: 'autonomous',
    directive:
      'Handle inside-Dhaka & nationwide courier status, fragile packaging assurance, and return/exchange guidance.',
    lastAction: 'Resolved 3 Dhaka express delivery schedule confirmations',
    lastSyncedAt: '2026-11-19T11:05:00.000Z',
    tasksCompleted: 53,
  },
  {
    id: 'sector-ops',
    name: 'Site Publishing & Sync Agent',
    bnName: 'সাইট আপডেট ও সিঙ্ক এজেন্ট',
    sector: 'ops',
    masterAgent: 'Astra-Gravity',
    mode: 'autonomous',
    directive:
      'Synchronize approved content blocks, post deployments, and Astra Master Agent commands to swapnokuthir.com live views.',
    lastAction: 'Verified edge cache sync and Firestore cloud snapshot',
    lastSyncedAt: '2026-11-19T11:40:00.000Z',
    tasksCompleted: 71,
  },
];

export const DEFAULT_SWAPNOKUTHIR_POSTS: SwapnokuthirPost[] = [
  {
    id: 'post-winter-terracotta',
    title: 'শীতকালীন অন্দরসজ্জা: মাটির ও বেতের হস্তশিল্পের নতুন সংগ্রহ',
    slug: 'winter-artisan-terracotta-cane-collection',
    category: 'Collection',
    status: 'published',
    excerpt:
      'স্বপ্নকুঠিরের নতুন শীতকালীন কালেকশনে থাকছে সম্পূর্ণ হাতে তৈরি পোড়ামাটির ফুলদানি, নকশিকাঁথা কুশন কভার ও প্রাকৃতিক বেতের ল্যাম্পশেড।',
    content: `স্বপ্নকুঠির (swapnokuthir.com) বিশ্বাস করে প্রতিটি ঘর হওয়া উচিত শান্তি, আভিজাত্য ও নিজস্ব গল্পের প্রতিচ্ছবি।

আমাদের ২০২৬ শীতকালীন সংগ্রহে যুক্ত হয়েছে:
১. হাতে গড়া টেরাকোটা ও ব্রাস ইনলে ফুলদানি — বসার ঘরের কোণায় উষ্ণ আভা নিয়ে আসে।
২. শতভাগ সুতি হ্যান্ডলুম ও নকশিকাঁথা কুশন সেট — ঐতিহ্যের সাথে আধুনিক মিনিমাল ডিজাইনের সমন্বয়।
৩. পরিবেশবান্ধব প্রাকৃতিক বেতের পেন্ডেন্ট ল্যাম্প — সন্ধ্যার নরম আলোর জন্য আদর্শ।

কর্পোরেট গিফট বা কাস্টম ইন্টেরিয়র অর্ডারের জন্য সরাসরি আমাদের অ্যাস্টার সেলস রিপ্রেজেন্টেটিভের সাথে কথা বলুন।`,
    authorAgent: 'Astra Content Agent',
    featured: true,
    views: 1840,
    createdAt: '2026-11-15T09:00:00.000Z',
    updatedAt: '2026-11-19T10:30:00.000Z',
  },
  {
    id: 'post-corporate-gifting',
    title: 'Corporate & Festive Gift Hampers — Tailored by Swapnokuthir',
    slug: 'corporate-festive-gift-hampers-dhaka',
    category: 'Campaign',
    status: 'published',
    excerpt:
      'Curated Bengali artisan gift boxes for executive teams, client appreciation, and architectural housewarmings with custom branding.',
    content: `Swapnokuthir Studio crafts bespoke gift hampers combining handwoven textiles, aromatic beeswax candles, ceramic tea sets, and brass keepsakes.

Key highlights for B2B & corporate buyers:
- Custom wooden monogrammed packaging with company branding
- Minimum order starting from 15 hampers with 5-day Dhaka dispatch
- Dedicated Astra Sales Representative tracking from sample approval to doorstep delivery.`,
    authorAgent: 'Astra Sales Agent',
    featured: true,
    views: 1120,
    createdAt: '2026-11-12T14:20:00.000Z',
    updatedAt: '2026-11-18T16:10:00.000Z',
  },
  {
    id: 'post-care-guide',
    title: 'বেত ও কাঠের ফার্নিচার ও ডেকোর দীর্ঘদিন ভালো রাখার সহজ উপায়',
    slug: 'cane-wood-decor-care-guide',
    category: 'Guide',
    status: 'draft',
    excerpt:
      'বাংলাদেশের আবহাওয়ায় প্রাকৃতিক বেত, পাট ও সেগুন কাঠের হোম ডেকোর যত্নে রাখার ব্যবহারিক নির্দেশিকা।',
    content: `প্রাকৃতিক উপাদানে তৈরি ঘরের জিনিসগুলো সঠিক যত্নে বছরের পর বছর নতুনের মতো থাকে।

- মাসে একবার নরম শুকনো ব্রাশ বা মাইক্রোফাইবার কাপড় দিয়ে ধুলা পরিষ্কার করুন।
- সরাসরি বর্ষার আর্দ্রতা থেকে দূরে রাখুন এবং প্রয়োজনে হালকা রোদে শুকিয়ে নিন।
- ব্রাস বা পিতলের সামগ্রীতে লেবুর রস ও নরম কাপড় ব্যবহার করলে উজ্জ্বলতা ফিরে আসে।`,
    authorAgent: 'Astra Content Agent',
    featured: false,
    views: 420,
    createdAt: '2026-11-17T11:00:00.000Z',
    updatedAt: '2026-11-17T11:00:00.000Z',
  },
];

export const DEFAULT_SWAPNOKUTHIR_CONTENTS: SwapnokuthirContentBlock[] = [
  {
    id: 'content-hero',
    sectionKey: 'hero',
    label: 'Homepage Hero Banner',
    headline: 'স্বপ্নকুঠির — অন্দরসজ্জা, ঐতিহ্য ও আধুনিক জীবনযাপনের মেলবন্ধন',
    subheadline:
      'Swapnokuthir.com · সম্পূর্ণ অ্যাস্টার (Astra) এআই এজেন্ট দ্বারা পরিচালিত লাইভ ক্যাটালগ, কনটেন্ট ও স্মার্ট সেলস সহায়তা',
    body: 'হাতে তৈরি হোম ডেকোর, নকশিকাঁথা, টেরাকোটা ও কর্পোরেট গিফট হ্যাম্পার—সবকিছু এখন অ্যাস্টার মাস্টার এজেন্ট ও সেক্টর সাব-এজেন্টদের তত্ত্বাবধানে তাৎক্ষণিক আপডেট ও অর্ডার সহায়তাসহ।',
    ctaLabel: 'Explore Winter Collection',
    ctaUrl: '#posts',
    seoTitle: 'Swapnokuthir.com | Artisan Home Decor & Living Studio Dhaka',
    seoDescription:
      'Discover handcrafted home decor, ceramics, cane lighting, and bespoke gifts curated by Swapnokuthir & Astra AI.',
    isLive: true,
    controlledByAgent: 'Astra-Gravity + Content Agent',
    updatedAt: '2026-11-19T10:30:00.000Z',
  },
  {
    id: 'content-announcement',
    sectionKey: 'announcement',
    label: 'Top Announcement Strip',
    headline: 'ঢাকার ভেতরে ৪৮ ঘণ্টায় ফ্রি হোম ডেলিভারি ও কাস্টম গিফট বক্স প্রি-অর্ডার চলছে',
    subheadline: 'Winter Craft Edition 2026 · Code: SWAPNO10',
    body: 'সকল কর্পোরেট ও হোম ডেকোর অর্ডারে তাৎক্ষণিক কোটেশন পেতে নিচে সেলস রিপ্রেজেন্টেটিভ অ্যাস্টারে মেসেজ করুন।',
    ctaLabel: 'Talk to Sales Rep',
    ctaUrl: '#sales-chat',
    seoTitle: 'Swapnokuthir Seasonal Delivery Offer',
    seoDescription: 'Free 48-hour Dhaka delivery on handcrafted home decor.',
    isLive: true,
    controlledByAgent: 'Catalog & Merchandising Agent',
    updatedAt: '2026-11-19T09:15:00.000Z',
  },
  {
    id: 'content-collections',
    sectionKey: 'featured_collections',
    label: 'Featured Collections & Pricing',
    headline: 'Curated Artisan Collections · সরাসরি কারিগরের হাত থেকে আপনার ঘরে',
    subheadline: 'Handwoven Textiles · Terracotta & Ceramic · Cane Lighting · Corporate Gifts',
    body: 'প্রতিটি কালেকশন সরাসরি বাংলাদেশের দক্ষ কারিগরদের সাথে সমন্বয় করে প্রস্তুত করা হয়। প্রাইস রেঞ্জ: ৳১,২৫০ থেকে ৳১৮,৫০০।',
    ctaLabel: 'Request Custom Quote',
    ctaUrl: '#sales-chat',
    seoTitle: 'Swapnokuthir Collections',
    seoDescription: 'Browse curated terracotta, cane, ceramic, and textile home decor collections.',
    isLive: true,
    controlledByAgent: 'Catalog & Merchandising Agent',
    updatedAt: '2026-11-18T18:00:00.000Z',
  },
  {
    id: 'content-story',
    sectionKey: 'brand_story',
    label: 'Brand Story & Craftsmanship',
    headline: 'বাংলার ঐতিহ্যবাহী কারুশিল্পকে আধুনিক ঘরে পৌঁছে দেওয়ার অঙ্গীকার',
    subheadline: 'Supervised by Sumon Hossain · Orchestrated by Astra-Gravity',
    body: 'ধামরাইয়ের পিতল, রাজশাহীর মাটি, সিলেটের শীতলপাটি ও বেত—এই সব ঐতিহ্যকে আধুনিক আর্কিটেকচারাল স্পেসের উপযোগী করে তুলেছে স্বপ্নকুঠির।',
    ctaLabel: 'Read Journal',
    ctaUrl: '#posts',
    seoTitle: 'About Swapnokuthir Studio',
    seoDescription: 'The craftsmanship and heritage behind Swapnokuthir.com.',
    isLive: true,
    controlledByAgent: 'Content & Editorial Agent',
    updatedAt: '2026-11-16T12:00:00.000Z',
  },
  {
    id: 'content-contact',
    sectionKey: 'contact_cta',
    label: 'Showroom & Sales Desk CTA',
    headline: 'ব্যক্তিগত পরামর্শ বা বাল্ক অর্ডারের জন্য অ্যাস্টার সেলস ডেস্ক সর্বদা প্রস্তুত',
    subheadline: 'Gulshan / Banani Studio · swapnokutheir@gmail.com',
    body: 'বাজেট, রুম সাইজ অথবা গিফটের সংখ্যা জানালে আমাদের সেলস রিপ্রেজেন্টেটিভ এজেন্ট সাথে সাথে কাস্টম প্রপোজাল পাঠিয়ে দেবে।',
    ctaLabel: 'Connect Sales Desk',
    ctaUrl: '#sales-chat',
    seoTitle: 'Contact Swapnokuthir Sales Desk',
    seoDescription: 'Direct sales representative concierge for Swapnokuthir.com.',
    isLive: true,
    controlledByAgent: 'Sales Representative Agent',
    updatedAt: '2026-11-19T11:00:00.000Z',
  },
];

export const DEFAULT_SWAPNOKUTHIR_SALES_REPS: SwapnokuthirSalesRep[] = [
  {
    id: 'rep-astra-closer',
    name: 'Astra Sales Concierge',
    role: 'Autonomous Primary Sales Representative',
    type: 'ai-agent',
    territory: 'Swapnokuthir.com · All Online Channels',
    status: 'active',
    handledLeads: 142,
    conversionRate: 38,
    pitchScript:
      'আসসালামু আলাইকুম! স্বপ্নকুঠিরে আপনাকে স্বাগতম। আপনার ঘরের সাজসজ্জা বা কর্পোরেট গিফটের চাহিদা অনুযায়ী আমি সেরা কালেকশন ও প্রাইস কোটেশন সাজিয়ে দিচ্ছি।',
    integratedWithAstra: true,
    updatedAt: '2026-11-19T11:20:00.000Z',
  },
  {
    id: 'rep-tanvir',
    name: 'Tanvir Ahmed',
    role: 'Senior Corporate & Interior Sales Rep',
    type: 'human-rep',
    territory: 'Dhaka Gulshan · Banani · Baridhara',
    status: 'active',
    handledLeads: 56,
    conversionRate: 44,
    pitchScript:
      'Handles architectural B2B orders, turnkey apartment styling packages, and custom brass/wood gift boxes above ৳50,000.',
    integratedWithAstra: true,
    updatedAt: '2026-11-19T09:10:00.000Z',
  },
  {
    id: 'rep-nusrat',
    name: 'Nusrat Jahan',
    role: 'Lifestyle & Social Commerce Specialist',
    type: 'human-rep',
    territory: 'Nationwide Delivery · Facebook & WhatsApp',
    status: 'active',
    handledLeads: 89,
    conversionRate: 34,
    pitchScript:
      'Follows up on wedding housewarming bundles, Nakshi Kantha sets, and nationwide Steadfast/Pathao courier confirmations.',
    integratedWithAstra: true,
    updatedAt: '2026-11-18T17:30:00.000Z',
  },
];

export const DEFAULT_SWAPNOKUTHIR_LEADS: SwapnokuthirSalesLead[] = [
  {
    id: 'lead-101',
    customerName: 'Farhana Karim',
    contact: '+880 1711-482910',
    channel: 'Website Chat',
    inquiry: 'নতুন ফ্ল্যাটের ডাইনিং ও লিভিং রুমের জন্য বেতের ল্যাম্পশেড ও মাটির ফুলদানির সেট প্যাকেজের দাম জানতে চাই।',
    assignedRepId: 'rep-astra-closer',
    assignedRepName: 'Astra Sales Concierge',
    stage: 'quoted',
    aiSuggestedReply:
      'শুভেচ্ছা ফারহানা আপু! আপনার নতুন ফ্ল্যাটের জন্য আমাদের "টেরাকোটা + প্রাকৃতিক বেতের ল্যাম্পশেড কম্বো" পাচ্ছেন মাত্র ৳৮,৪০০ টাকায়, সাথে ঢাকার ভেতর ফ্রি ডেলিভারি। ছবি ও ডিটেইলস কি পাঠিয়ে দেবো?',
    createdAt: '2026-11-19T08:40:00.000Z',
    updatedAt: '2026-11-19T10:15:00.000Z',
  },
  {
    id: 'lead-102',
    customerName: 'Mahmudul Hasan (Apex Architects)',
    contact: 'mahmud@apexarch-bd.com',
    channel: 'Direct',
    inquiry: 'Need 45 custom wooden & brass corporate gift boxes for year-end client gifting by December 5.',
    assignedRepId: 'rep-tanvir',
    assignedRepName: 'Tanvir Ahmed',
    stage: 'contacted',
    aiSuggestedReply:
      'Dear Mahmudul, Astra & our Corporate Desk have reserved a 45-box artisan brass-and-candle batch with complimentary logo engraving at ৳2,150/unit. Tanvir can bring physical samples tomorrow at 11 AM.',
    createdAt: '2026-11-18T14:00:00.000Z',
    updatedAt: '2026-11-19T09:00:00.000Z',
  },
  {
    id: 'lead-103',
    customerName: 'Sadia Afrin',
    contact: '@sadia.decor (FB)',
    channel: 'Facebook',
    inquiry: 'নকশিকাঁথা কুশন কভার ৬ পিস সেটের সাথে ম্যাচিং টেবিল রানার আছে কি?',
    assignedRepId: 'rep-nusrat',
    assignedRepName: 'Nusrat Jahan',
    stage: 'new',
    aiSuggestedReply:
      'জি আপু! ৬ পিস নকশিকাঁথা কুশন কভারের সাথে হ্যান্ডলুম ম্যাচিং টেবিল রানার রয়েছে—পুরো সেট ৳৪,২০০ টাকায় অর্ডার করতে পারবেন।',
    createdAt: '2026-11-19T11:10:00.000Z',
    updatedAt: '2026-11-19T11:10:00.000Z',
  },
];

export const DEFAULT_SWAPNOKUTHIR_STATE: SwapnokuthirStateSnapshot = {
  agents: DEFAULT_SWAPNOKUTHIR_AGENTS,
  posts: DEFAULT_SWAPNOKUTHIR_POSTS,
  contents: DEFAULT_SWAPNOKUTHIR_CONTENTS,
  salesReps: DEFAULT_SWAPNOKUTHIR_SALES_REPS,
  leads: DEFAULT_SWAPNOKUTHIR_LEADS,
  lastMasterSync: '2026-11-19T11:40:00.000Z',
};
