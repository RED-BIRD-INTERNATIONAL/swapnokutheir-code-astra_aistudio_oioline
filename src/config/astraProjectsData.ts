import { AstraProject, ChatMessage, WorkspaceFileUpdate } from '../types/astra';

export const DEFAULT_ASTRA_PROJECTS: AstraProject[] = [
  {
    id: 'proj-red-bird-exec',
    name: 'Red Bird Executive Hub',
    category: 'Apparel & Export',
    description: 'Global garment export invoices, LC logistics, and Hamburg port compliance documentation.',
    color: '#06b6d4',
    createdAt: '2026-09-20T09:00:00.000Z',
    updatedAt: '2026-09-28T17:40:00.000Z',
    fileCount: 2,
    messageCount: 2,
    isDefault: true,
  },
  {
    id: 'proj-dream-house-iot',
    name: 'Dream House Smart IoT',
    category: 'Smart Automation',
    description: 'Home solar inverter telemetry, HVAC zone control, and Python automation scripts.',
    color: '#10b981',
    createdAt: '2026-09-21T10:30:00.000Z',
    updatedAt: '2026-09-28T16:30:00.000Z',
    fileCount: 1,
    messageCount: 2,
  },
  {
    id: 'proj-devops-cloud',
    name: 'GitLab & Cloud Swarm',
    category: 'DevOps & AI',
    description: 'Automated deployment pipelines, Cloudflare edge workers, and Gemini multimodal routing.',
    color: '#8b5cf6',
    createdAt: '2026-09-22T12:15:00.000Z',
    updatedAt: '2026-09-28T15:10:00.000Z',
    fileCount: 1,
    messageCount: 2,
  },
];

export const INITIAL_PROJECT_FILES: Record<string, WorkspaceFileUpdate[]> = {
  'proj-red-bird-exec': [
    {
      filename: 'red_bird_commercial_invoice.md',
      language: 'markdown',
      content: `# RED BIRD INTERNATIONAL
### Exporter & Apparel Logistics Management
**Dhaka, Bangladesh** | E-mail: logistics@redbird-intl.com | Tel: +880-2-9884712

## COMMERCIAL INVOICE & PACKING SPECIFICATION
**Invoice No:** RBI/EXP/2026/0442  
**L/C No:** LC-984420-EUR  
**Port of Loading:** Chittagong Port, Bangladesh (BDCGP)  
**Port of Discharge:** Port of Hamburg, Germany (DEHAM)  
**Shipment Terms:** FOB Chittagong  

| Item No | Style / PO Ref | Description of Goods | HS Code | Quantity (Pcs) | Unit Price (FOB USD) | Total (USD) |
|:---:|:---:|---|---:|---:|---:|---:|
| 01 | RB-SS26-01 | Men's 100% Organic Cotton Crew Neck Tee (180 GSM) | 6109.10.00 | 7,500 | $4.80 | $36,000.00 |
| 02 | RB-SS26-02 | Women's Modal Blend Enzyme Washed Tee (160 GSM) | 6109.90.10 | 5,000 | $5.10 | $25,500.00 |
| **TOTAL** | - | **Total Export Consignment** | - | **12,500** | - | **$61,500.00** |
`,
      versions: [
        {
          id: 'rbi-v1',
          versionNumber: 1,
          timestamp: 'Sep 28, 2026 05:40 PM',
          relativeTime: 'Baseline',
          author: 'Astra Agent',
          summary: 'Commercial invoice baseline for Hamburg shipment',
          content: '# RED BIRD INTERNATIONAL\nCommercial Invoice RBI/EXP/2026/0442 ($61,500.00 FOB Chittagong)',
          language: 'markdown',
          lineCount: 18,
          charCount: 820,
        },
      ],
    },
    {
      filename: 'shipment_lc_checklist.md',
      language: 'markdown',
      content: `# Export L/C Compliance Checklist
- [x] Commercial Invoice verified against LC-984420-EUR
- [x] Packing List weight & CBM matched (3,250 kg / 18.5 CBM)
- [x] Certificate of Origin (EPB Bangladesh)
- [ ] Bill of Lading vessel departure scan upload`,
    },
  ],
  'proj-dream-house-iot': [
    {
      filename: 'dream_house_iot_controller.py',
      language: 'python',
      content: `# 'DREAM HOUSE' SMART HOME AUTOMATION CONTROLLER v4.2
from dataclasses import dataclass, asdict

@dataclass
class ZoneStatus:
    name: str
    lights_on: bool
    brightness: int
    target_temp_c: float

class DreamHouseController:
    def __init__(self, owner: str = "Sumon Hossain"):
        self.owner = owner
        self.solar_inverter_kw = 4.82
        self.zones = {
            "Executive Office": ZoneStatus("Executive Office", True, 90, 22.0),
            "Living Room": ZoneStatus("Living Room", True, 75, 22.5),
        }

    def get_energy_telemetry(self):
        return {
            "solar_generation_kw": self.solar_inverter_kw,
            "battery_storage_pct": 94.5,
            "net_metering_surplus_kwh": 12.8,
        }
`,
    },
  ],
  'proj-devops-cloud': [
    {
      filename: 'gitlab_vercel_deploy.yml',
      language: 'yaml',
      content: `stages:
  - lint_and_audit
  - test
  - deploy_production

deploy_production:
  stage: deploy_production
  only:
    - main
  script:
    - npm ci
    - npm run lint
    - npm run build
`,
    },
  ],
};

export const INITIAL_PROJECT_MESSAGES: Record<string, ChatMessage[]> = {
  'proj-red-bird-exec': [
    {
      id: 'init-rb-1',
      role: 'system',
      content: 'Dedicated workspace active: Red Bird Executive Hub (Apparel & Export).',
      timestamp: '09:00 AM',
      projectId: 'proj-red-bird-exec',
    },
    {
      id: 'init-rb-2',
      role: 'agent',
      content: 'সুমন ভাই, Red Bird Executive Hub প্রজেক্ট প্রস্তুত। আপনি ইনভয়েস, প্যাকিং লিস্ট, L/C চেক বা মিউজিক জেনারেট করতে চাইলে সরাসরি নির্দেশ দিন।',
      timestamp: '09:01 AM',
      projectId: 'proj-red-bird-exec',
    },
  ],
  'proj-dream-house-iot': [
    {
      id: 'init-dh-1',
      role: 'system',
      content: 'Dedicated workspace active: Dream House Smart IoT.',
      timestamp: '10:30 AM',
      projectId: 'proj-dream-house-iot',
    },
    {
      id: 'init-dh-2',
      role: 'agent',
      content: 'Dream House IoT সোলার ও অটোমেশন ওয়ার্কস্পেস সক্রিয় রয়েছে। পাইথন স্ক্রিপ্ট আপডেট বা টেলিমেট্রি বিশ্লেষণের জন্য নির্দেশ দিন।',
      timestamp: '10:31 AM',
      projectId: 'proj-dream-house-iot',
    },
  ],
  'proj-devops-cloud': [
    {
      id: 'init-dev-1',
      role: 'system',
      content: 'Dedicated workspace active: GitLab & Cloud Swarm.',
      timestamp: '12:15 PM',
      projectId: 'proj-devops-cloud',
    },
    {
      id: 'init-dev-2',
      role: 'agent',
      content: 'CI/CD ও ক্লাউড এজ সোয়ার্ম ওয়ার্কস্পেস লোড হয়েছে। ডিপ্লয়মেন্ট YAML বা আর্কিটেকচার নোট চাইলে আমাকে জানান।',
      timestamp: '12:16 PM',
      projectId: 'proj-devops-cloud',
    },
  ],
};

export const TEMPLATE_SEED_FILES: Record<string, WorkspaceFileUpdate[]> = {
  blank: [
    {
      filename: 'project_overview.md',
      language: 'markdown',
      content: `# New Project Workspace\n\nUse the Live Audio Terminal or prompt bar to generate code, logistics specs, or musical lyrics directly into this workspace.`,
    },
  ],
  logistics: [
    {
      filename: 'export_manifest.md',
      language: 'markdown',
      content: `# Export Consignment Manifest\n- Origin: Dhaka / Chittagong (BDCGP)\n- Destination: EU / North America Hub\n- Terms: FOB / CIF\n- Status: Draft Ready`,
    },
  ],
  software: [
    {
      filename: 'architecture_spec.ts',
      language: 'typescript',
      content: `export interface ServiceConfig {\n  name: string;\n  region: string;\n  replicas: number;\n}\n\nexport const defaultConfig: ServiceConfig = {\n  name: 'astra-service',\n  region: 'asia-southeast1',\n  replicas: 2,\n};\n`,
    },
  ],
  creative: [
    {
      filename: 'song_lyrics_draft.md',
      language: 'markdown',
      content: `# Songwriting & Lyrics Workspace\n\nSwitch to the **Music Studio** tab to generate multi-track compositions and save arranged lyrics directly here.`,
    },
  ],
};
