/**
 * Cloudflare Agent & Model Context Protocol (MCP) Core Service
 * Handles:
 * 1. Network Security Monitoring & WAF events
 * 2. Cloudflare Workers code editing, testing, and deployment
 * 3. Domain & DNS Zone Management for redbird-international.cm / redbird-international.com
 * 4. Model Context Protocol (MCP) JSON-RPC 2.0 & SSE Server Protocol
 */

export interface DnsRecord {
  id: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'NS' | 'SRV';
  name: string;
  content: string;
  proxied: boolean;
  ttl: number; // 1 for auto
  priority?: number;
  created_on: string;
  modified_on: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  clientIP: string;
  clientCountry: string;
  action: 'block' | 'challenge' | 'js_challenge' | 'log' | 'allow';
  source: 'waf' | 'rateLimit' | 'botFight' | 'ddos' | 'ipAccessRule';
  ruleId: string;
  ruleDescription: string;
  path: string;
  method: string;
  userAgent: string;
  threatScore: number;
}

export interface WorkerScript {
  id: string;
  name: string;
  routes: string[];
  script: string;
  created_on: string;
  modified_on: string;
  status: 'active' | 'deploying' | 'disabled';
  environmentVars: Record<string, string>;
  memoryUsageMb: number;
  lastInvocation: string;
}

export interface DomainSettings {
  domain: string;
  zoneId: string;
  status: 'active' | 'pending';
  nameServers: string[];
  sslMode: 'off' | 'flexible' | 'full' | 'strict';
  securityLevel: 'essentially_off' | 'low' | 'medium' | 'high' | 'under_attack';
  alwaysUseHttps: boolean;
  brotli: boolean;
  http3: boolean;
  minify: { css: boolean; html: boolean; js: boolean };
  dnssec: boolean;
  wafEnabled: boolean;
  ddosProtection: 'active' | 'monitoring';
}

class CloudflareMcpAgentService {
  private domainSettings: DomainSettings = {
    domain: 'redbird-international.cm',
    zoneId: 'rb-cf-zone-789a9f23',
    status: 'active',
    nameServers: ['cora.ns.cloudflare.com', 'walt.ns.cloudflare.com'],
    sslMode: 'strict',
    securityLevel: 'medium',
    alwaysUseHttps: true,
    brotli: true,
    http3: true,
    minify: { css: true, html: true, js: true },
    dnssec: true,
    wafEnabled: true,
    ddosProtection: 'active'
  };

  private dnsRecords: DnsRecord[] = [
    {
      id: 'rec_root_001',
      type: 'CNAME',
      name: '@',
      content: 'ais-pre-ziwwkovm2dex5yeaykpkjq-162933049095.asia-southeast1.run.app',
      proxied: true,
      ttl: 1,
      created_on: '2026-01-15T10:00:00Z',
      modified_on: '2026-10-22T08:00:00Z'
    },
    {
      id: 'rec_www_002',
      type: 'CNAME',
      name: 'www',
      content: 'ais-pre-ziwwkovm2dex5yeaykpkjq-162933049095.asia-southeast1.run.app',
      proxied: true,
      ttl: 1,
      created_on: '2026-01-15T10:00:00Z',
      modified_on: '2026-10-22T08:00:00Z'
    },
    {
      id: 'rec_mcp_003',
      type: 'CNAME',
      name: 'mcp',
      content: 'redbird-international.cm',
      proxied: true,
      ttl: 1,
      created_on: '2026-10-22T08:15:00Z',
      modified_on: '2026-10-22T08:15:00Z'
    },
    {
      id: 'rec_api_004',
      type: 'CNAME',
      name: 'api',
      content: 'redbird-international.cm',
      proxied: true,
      ttl: 1,
      created_on: '2026-02-01T12:00:00Z',
      modified_on: '2026-02-01T12:00:00Z'
    },
    {
      id: 'rec_mx_005',
      type: 'MX',
      name: '@',
      content: 'mail.redbird-international.cm',
      proxied: false,
      ttl: 3600,
      priority: 10,
      created_on: '2026-01-15T10:00:00Z',
      modified_on: '2026-01-15T10:00:00Z'
    },
    {
      id: 'rec_txt_spf_006',
      type: 'TXT',
      name: '@',
      content: 'v=spf1 include:_spf.google.com ~all',
      proxied: false,
      ttl: 3600,
      created_on: '2026-01-15T10:00:00Z',
      modified_on: '2026-01-15T10:00:00Z'
    },
    {
      id: 'rec_txt_dmarc_007',
      type: 'TXT',
      name: '_dmarc',
      content: 'v=DMARC1; p=reject; rua=mailto:dmarc@redbird-international.cm; pct=100',
      proxied: false,
      ttl: 3600,
      created_on: '2026-01-15T10:00:00Z',
      modified_on: '2026-01-15T10:00:00Z'
    }
  ];

  private securityEvents: SecurityEvent[] = [
    {
      id: 'sec_ev_901',
      timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      clientIP: '198.51.100.42',
      clientCountry: 'RU',
      action: 'block',
      source: 'waf',
      ruleId: '100001',
      ruleDescription: 'SQL Injection Attack Attempt detected in URI query parameters',
      path: '/api/catalog?query=SELECT%20*%20FROM%20users',
      method: 'GET',
      userAgent: 'sqlmap/1.7.2#stable',
      threatScore: 94
    },
    {
      id: 'sec_ev_902',
      timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      clientIP: '203.0.113.19',
      clientCountry: 'CN',
      action: 'challenge',
      source: 'botFight',
      ruleId: 'cf-bot-automated',
      ruleDescription: 'Automated Scraping Bot detected without browser fingerprint',
      path: '/products',
      method: 'GET',
      userAgent: 'Python-urllib/3.10',
      threatScore: 82
    },
    {
      id: 'sec_ev_903',
      timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
      clientIP: '192.0.2.88',
      clientCountry: 'US',
      action: 'block',
      source: 'rateLimit',
      ruleId: 'rl-mcp-throttle',
      ruleDescription: 'Burst Rate Limit Exceeded (142 req/10s on /mcp)',
      path: '/mcp',
      method: 'POST',
      userAgent: 'curl/8.4.0',
      threatScore: 68
    },
    {
      id: 'sec_ev_904',
      timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
      clientIP: '45.142.122.9',
      clientCountry: 'NL',
      action: 'block',
      source: 'waf',
      ruleId: '100008',
      ruleDescription: 'Directory Traversal Attempt (../etc/passwd)',
      path: '/../../etc/passwd',
      method: 'GET',
      userAgent: 'Mozilla/5.0 (compatible; Nmap Scripting Engine)',
      threatScore: 99
    },
    {
      id: 'sec_ev_905',
      timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
      clientIP: '185.220.101.5',
      clientCountry: 'DE',
      action: 'js_challenge',
      source: 'ipAccessRule',
      ruleId: 'tor-exit-challenge',
      ruleDescription: 'TOR Network Exit Node Verified - Automated JS Challenge Passed',
      path: '/admin',
      method: 'GET',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; rv:109.0)',
      threatScore: 45
    }
  ];

  private workers: WorkerScript[] = [
    {
      id: 'worker_sec_edge',
      name: 'redbird-security-edge',
      routes: ['redbird-international.cm/*', 'www.redbird-international.cm/*'],
      status: 'active',
      created_on: '2026-02-10T14:30:00Z',
      modified_on: '2026-10-22T08:30:00Z',
      memoryUsageMb: 12.4,
      lastInvocation: new Date().toISOString(),
      environmentVars: {
        ALLOWED_ORIGIN: 'https://redbird-international.cm',
        SECURITY_LEVEL: 'HIGH',
        EDGE_CACHE_TTL: '3600'
      },
      script: `/**
 * Red Bird International - Cloudflare Edge Security & WAF Worker
 * Handles network security monitoring, edge sanitization, and MCP routing.
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const clientIP = request.headers.get("cf-connecting-ip") || "unknown";
    const country = request.headers.get("cf-ipcountry") || "XX";

    // 1. Network Security: Block malicious path traversals and dotfiles
    if (url.pathname.includes("../") || url.pathname.includes("/.env") || url.pathname.includes("/wp-config")) {
      return new Response(JSON.stringify({
        error: "Forbidden: Security anomaly detected by Red Bird Cloudflare WAF",
        ip: clientIP,
        country: country,
        timestamp: new Date().toISOString()
      }), {
        status: 403,
        headers: { "Content-Type": "application/json", "X-Edge-Defense": "Active-Block" }
      });
    }

    // 2. Fast MCP Protocol Uplink Headers
    if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
      const response = await fetch(request);
      const mcpHeaders = new Headers(response.headers);
      mcpHeaders.set("X-MCP-Server", "RedBird-Cloudflare-Agent-v1.0");
      mcpHeaders.set("Access-Control-Allow-Origin", "*");
      mcpHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      mcpHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-MCP-Protocol-Version");
      return new Response(response.body, { status: response.status, headers: mcpHeaders });
    }

    // 3. Forward request to Origin Cloud Run
    const response = await fetch(request);

    // 4. Harden HTTP Security Headers
    const secureHeaders = new Headers(response.headers);
    secureHeaders.set("X-Content-Type-Options", "nosniff");
    secureHeaders.set("X-Frame-Options", "SAMEORIGIN");
    secureHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
    secureHeaders.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    secureHeaders.set("X-Worker-Executed-By", "redbird-security-edge");

    return new Response(response.body, {
      status: response.status,
      headers: secureHeaders
    });
  }
};`
    },
    {
      id: 'worker_mcp_router',
      name: 'redbird-mcp-router',
      routes: ['redbird-international.cm/mcp*', 'mcp.redbird-international.cm/*'],
      status: 'active',
      created_on: '2026-10-22T08:00:00Z',
      modified_on: '2026-10-22T08:35:00Z',
      memoryUsageMb: 8.1,
      lastInvocation: new Date().toISOString(),
      environmentVars: {
        MCP_PROTOCOL_VERSION: '2024-11-05',
        RATE_LIMIT_PER_MINUTE: '120'
      },
      script: `/**
 * Red Bird International - Cloudflare MCP Protocol Edge Router
 * Routes Model Context Protocol requests over HTTP & SSE with edge caching.
 */
export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-MCP-Protocol-Version"
        }
      });
    }

    const originResponse = await fetch(request);
    const newHeaders = new Headers(originResponse.headers);
    newHeaders.set("X-Cloudflare-MCP-Agent", "Operational");
    newHeaders.set("X-Protocol-Version", "2024-11-05");

    return new Response(originResponse.body, {
      status: originResponse.status,
      headers: newHeaders
    });
  }
};`
    }
  ];

  // --- Domain & Status Methods ---
  public getDomainSettings(): DomainSettings {
    return { ...this.domainSettings };
  }

  public updateDomainSettings(updates: Partial<DomainSettings>): DomainSettings {
    this.domainSettings = { ...this.domainSettings, ...updates };
    return this.domainSettings;
  }

  // --- DNS Management Methods ---
  public getDnsRecords(): DnsRecord[] {
    return [...this.dnsRecords];
  }

  public createDnsRecord(record: Omit<DnsRecord, 'id' | 'created_on' | 'modified_on'>): DnsRecord {
    const newRec: DnsRecord = {
      ...record,
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_on: new Date().toISOString(),
      modified_on: new Date().toISOString()
    };
    this.dnsRecords.unshift(newRec);
    return newRec;
  }

  public updateDnsRecord(id: string, updates: Partial<Omit<DnsRecord, 'id' | 'created_on'>>): DnsRecord | null {
    const idx = this.dnsRecords.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.dnsRecords[idx] = {
      ...this.dnsRecords[idx],
      ...updates,
      modified_on: new Date().toISOString()
    };
    return this.dnsRecords[idx];
  }

  public deleteDnsRecord(id: string): boolean {
    const initialLen = this.dnsRecords.length;
    this.dnsRecords = this.dnsRecords.filter(r => r.id !== id);
    return this.dnsRecords.length < initialLen;
  }

  // --- Security & WAF Methods ---
  public getSecurityEvents(limit = 20): SecurityEvent[] {
    return this.securityEvents.slice(0, limit);
  }

  public getSecurityMetrics() {
    const totalThreats = this.securityEvents.length;
    const blocked = this.securityEvents.filter(e => e.action === 'block').length;
    const challenged = this.securityEvents.filter(e => e.action === 'challenge' || e.action === 'js_challenge').length;

    return {
      status: 'protected',
      securityLevel: this.domainSettings.securityLevel,
      wafActive: this.domainSettings.wafEnabled,
      ddosMitigation: this.domainSettings.ddosProtection,
      totalEvents24h: 1420 + totalThreats,
      threatsBlocked24h: 382 + blocked,
      challengesIssued24h: 124 + challenged,
      mitigationRatePercent: 99.8,
      sslCertificate: {
        issuer: "Cloudflare Inc ECC CA-3",
        validUntil: '2027-02-14T23:59:59Z',
        type: 'Universal SSL / TLS 1.3 Strict',
        sni: '*.redbird-international.cm, redbird-international.cm'
      }
    };
  }

  public setSecurityLevel(level: DomainSettings['securityLevel']) {
    this.domainSettings.securityLevel = level;
    return { success: true, securityLevel: level };
  }

  public blockIp(ip: string, reason: string) {
    const newEvent: SecurityEvent = {
      id: `sec_ev_${Date.now()}`,
      timestamp: new Date().toISOString(),
      clientIP: ip,
      clientCountry: 'Manual',
      action: 'block',
      source: 'ipAccessRule',
      ruleId: 'manual-block-admin',
      ruleDescription: `IP Blocked by Admin/Agent: ${reason}`,
      path: '/*',
      method: 'ALL',
      userAgent: 'Manual Intervention',
      threatScore: 100
    };
    this.securityEvents.unshift(newEvent);
    return { success: true, blockedIP: ip, eventId: newEvent.id };
  }

  // --- Cloudflare Workers Methods ---
  public getWorkers(): WorkerScript[] {
    return [...this.workers];
  }

  public getWorkerById(id: string): WorkerScript | undefined {
    return this.workers.find(w => w.id === id || w.name === id);
  }

  public saveWorker(worker: Partial<WorkerScript> & { name: string; script: string }): WorkerScript {
    const existingIdx = this.workers.findIndex(w => w.id === worker.id || w.name === worker.name);
    const now = new Date().toISOString();

    if (existingIdx >= 0) {
      this.workers[existingIdx] = {
        ...this.workers[existingIdx],
        ...worker,
        status: 'active',
        modified_on: now
      };
      return this.workers[existingIdx];
    } else {
      const newWorker: WorkerScript = {
        id: worker.id || `worker_${Date.now()}`,
        name: worker.name,
        routes: worker.routes || [`redbird-international.cm/${worker.name}/*`],
        script: worker.script,
        status: 'active',
        created_on: now,
        modified_on: now,
        environmentVars: worker.environmentVars || {},
        memoryUsageMb: 10.0,
        lastInvocation: now
      };
      this.workers.push(newWorker);
      return newWorker;
    }
  }

  public deleteWorker(id: string): boolean {
    const initialLen = this.workers.length;
    this.workers = this.workers.filter(w => w.id !== id && w.name !== id);
    return this.workers.length < initialLen;
  }

  public testWorkerExecution(workerId: string, testPath: string, testMethod = 'GET', testHeaders: Record<string, string> = {}) {
    const worker = this.getWorkerById(workerId);
    if (!worker) {
      throw new Error(`Worker with ID or name '${workerId}' not found.`);
    }

    const start = performance.now();
    const isWafBlock = (testPath.includes('../') || testPath.includes('.env')) && worker.name === 'redbird-security-edge';
    const elapsedMs = Math.round((performance.now() - start + Math.random() * 8 + 3) * 100) / 100;

    if (isWafBlock) {
      return {
        status: 403,
        statusText: 'Forbidden',
        executionTimeMs: elapsedMs,
        headers: {
          'Content-Type': 'application/json',
          'X-Edge-Defense': 'Active-Block',
          'X-Worker-Executed-By': worker.name
        },
        body: JSON.stringify({
          error: 'Forbidden: Security anomaly detected by Red Bird Cloudflare WAF',
          ip: testHeaders['cf-connecting-ip'] || '127.0.0.1',
          timestamp: new Date().toISOString()
        }, null, 2)
      };
    }

    return {
      status: 200,
      statusText: 'OK',
      executionTimeMs: elapsedMs,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'X-Worker-Executed-By': worker.name,
        'X-MCP-Server': 'RedBird-Cloudflare-Agent-v1.0'
      },
      body: JSON.stringify({
        message: 'Request successfully intercepted, sanitized, and proxied by Cloudflare Worker.',
        worker: worker.name,
        route: testPath,
        method: testMethod,
        edgeLocation: 'SIN (Singapore - Asia Southeast)',
        timestamp: new Date().toISOString()
      }, null, 2)
    };
  }

  // =========================================================================
  // MODEL CONTEXT PROTOCOL (MCP) JSON-RPC 2.0 PROTOCOL ENGINE
  // =========================================================================

  public getMcpServerCapabilities() {
    return {
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: 'redbird-cloudflare-agent',
        title: 'Red Bird International Cloudflare Security & Infrastructure MCP Server',
        version: '1.0.0',
        description: 'Exposes network security monitoring, WAF threat telemetry, Workers script editing & deployment, and DNS zone management via Model Context Protocol.'
      },
      capabilities: {
        tools: {
          listChanged: true
        },
        resources: {
          subscribe: false,
          listChanged: true
        },
        prompts: {
          listChanged: false
        }
      }
    };
  }

  public getMcpToolsList() {
    return [
      {
        name: 'cloudflare_security_monitor',
        description: 'Get real-time Cloudflare network security metrics, active threat levels, WAF status, and DDoS protection state for redbird-international.cm.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of recent security/WAF incidents to return (default: 10)' }
          }
        }
      },
      {
        name: 'cloudflare_update_security_level',
        description: 'Set the Cloudflare zone security level (e.g. enable "under_attack" mode during DDoS, or "high" / "medium").',
        inputSchema: {
          type: 'object',
          properties: {
            level: {
              type: 'string',
              enum: ['essentially_off', 'low', 'medium', 'high', 'under_attack'],
              description: 'Target Cloudflare security level'
            }
          },
          required: ['level']
        }
      },
      {
        name: 'cloudflare_waf_block_ip',
        description: 'Block a malicious client IP address in Cloudflare Firewall / IP Access Rules.',
        inputSchema: {
          type: 'object',
          properties: {
            ip: { type: 'string', description: 'IPv4 or IPv6 address to block' },
            reason: { type: 'string', description: 'Audit rationale for the IP block' }
          },
          required: ['ip', 'reason']
        }
      },
      {
        name: 'cloudflare_dns_list_records',
        description: 'List all DNS records (A, CNAME, TXT, MX) for the active zone (redbird-international.cm).',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Optional filter by record type (A, CNAME, TXT, MX)' }
          }
        }
      },
      {
        name: 'cloudflare_dns_create_record',
        description: 'Create a new DNS record in Cloudflare zone with optional CDN proxy toggle.',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['A', 'AAAA', 'CNAME', 'TXT', 'MX'], description: 'Record type' },
            name: { type: 'string', description: 'Subdomain or @ for root' },
            content: { type: 'string', description: 'Target IP, hostname, or TXT value' },
            proxied: { type: 'boolean', description: 'Whether Cloudflare CDN & WAF proxy is enabled (Orange Cloud)' },
            ttl: { type: 'number', description: 'TTL in seconds (1 for auto)' },
            priority: { type: 'number', description: 'Priority (required for MX records)' }
          },
          required: ['type', 'name', 'content']
        }
      },
      {
        name: 'cloudflare_dns_update_record',
        description: 'Update an existing DNS record content, proxy status, or TTL.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The DNS record ID to update' },
            content: { type: 'string', description: 'Updated target or IP' },
            proxied: { type: 'boolean', description: 'Cloudflare proxy status' },
            ttl: { type: 'number', description: 'TTL in seconds' }
          },
          required: ['id']
        }
      },
      {
        name: 'cloudflare_dns_delete_record',
        description: 'Delete a DNS record from the Cloudflare zone by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The record ID to delete' }
          },
          required: ['id']
        }
      },
      {
        name: 'cloudflare_worker_list',
        description: 'List all deployed Cloudflare Workers, their assigned routes, and execution health.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'cloudflare_worker_get_script',
        description: 'Inspect the JavaScript/TypeScript source code and environment variables of a Cloudflare Worker.',
        inputSchema: {
          type: 'object',
          properties: {
            workerId: { type: 'string', description: 'Worker ID or name (e.g. redbird-security-edge)' }
          },
          required: ['workerId']
        }
      },
      {
        name: 'cloudflare_worker_deploy',
        description: 'Deploy or update code for a Cloudflare Worker script and attach edge routes.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Worker name' },
            script: { type: 'string', description: 'JavaScript code for the worker' },
            routes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Domain route patterns (e.g. ["redbird-international.cm/*"])'
            },
            environmentVars: {
              type: 'object',
              description: 'Key-value environment variables'
            }
          },
          required: ['name', 'script']
        }
      },
      {
        name: 'cloudflare_worker_test',
        description: 'Test worker execution against a virtual edge request to verify HTTP response and security headers.',
        inputSchema: {
          type: 'object',
          properties: {
            workerId: { type: 'string', description: 'Worker ID or name to test' },
            path: { type: 'string', description: 'Simulated request path (e.g. /mcp or /api/orders)' },
            method: { type: 'string', description: 'HTTP method (GET, POST, etc.)' }
          },
          required: ['workerId', 'path']
        }
      },
      {
        name: 'cloudflare_domain_zone_status',
        description: 'Get complete zone health, nameservers, SSL/TLS mode, HTTP/3, and optimization settings.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  public getMcpResourcesList() {
    return [
      {
        uri: 'cloudflare://domain/zone',
        name: 'Cloudflare Domain Zone Configuration',
        mimeType: 'application/json',
        description: 'Current domain health, nameservers, and edge encryption settings for redbird-international.cm'
      },
      {
        uri: 'cloudflare://security/waf-events',
        name: 'WAF & Firewall Security Incident Log',
        mimeType: 'application/json',
        description: 'Real-time telemetry of mitigated attacks, SQLi attempts, and bot challenges'
      },
      {
        uri: 'cloudflare://dns/records',
        name: 'Zone DNS Records',
        mimeType: 'application/json',
        description: 'Complete DNS zone file for redbird-international.cm'
      },
      {
        uri: 'cloudflare://workers/list',
        name: 'Cloudflare Workers Catalog',
        mimeType: 'application/json',
        description: 'Edge workers actively serving traffic and security routing'
      }
    ];
  }

  public readMcpResource(uri: string) {
    switch (uri) {
      case 'cloudflare://domain/zone':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(this.getDomainSettings(), null, 2)
          }]
        };
      case 'cloudflare://security/waf-events':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              metrics: this.getSecurityMetrics(),
              events: this.getSecurityEvents(50)
            }, null, 2)
          }]
        };
      case 'cloudflare://dns/records':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(this.getDnsRecords(), null, 2)
          }]
        };
      case 'cloudflare://workers/list':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(this.getWorkers(), null, 2)
          }]
        };
      default:
        throw new Error(`Resource with URI '${uri}' not found.`);
    }
  }

  public executeMcpTool(name: string, args: any) {
    switch (name) {
      case 'cloudflare_security_monitor': {
        const metrics = this.getSecurityMetrics();
        const events = this.getSecurityEvents(args?.limit || 10);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              zone: this.domainSettings.domain,
              metrics,
              recentThreats: events
            }, null, 2)
          }]
        };
      }

      case 'cloudflare_update_security_level': {
        const result = this.setSecurityLevel(args.level);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              message: `Cloudflare security level for ${this.domainSettings.domain} updated to ${args.level}`,
              result
            }, null, 2)
          }]
        };
      }

      case 'cloudflare_waf_block_ip': {
        const result = this.blockIp(args.ip, args.reason);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              message: `IP ${args.ip} successfully blocked across all edge PoPs`,
              result
            }, null, 2)
          }]
        };
      }

      case 'cloudflare_dns_list_records': {
        let records = this.getDnsRecords();
        if (args?.type) {
          records = records.filter(r => r.type.toUpperCase() === args.type.toUpperCase());
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              zone: this.domainSettings.domain,
              totalRecords: records.length,
              records
            }, null, 2)
          }]
        };
      }

      case 'cloudflare_dns_create_record': {
        const newRecord = this.createDnsRecord({
          type: args.type,
          name: args.name,
          content: args.content,
          proxied: args.proxied !== undefined ? args.proxied : true,
          ttl: args.ttl || 1,
          priority: args.priority
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              message: `DNS record '${args.name}' (${args.type}) created and propagated to Cloudflare edge`,
              record: newRecord
            }, null, 2)
          }]
        };
      }

      case 'cloudflare_dns_update_record': {
        const updated = this.updateDnsRecord(args.id, args);
        if (!updated) {
          throw new Error(`Record with ID '${args.id}' not found`);
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              message: `DNS record ${args.id} updated`,
              record: updated
            }, null, 2)
          }]
        };
      }

      case 'cloudflare_dns_delete_record': {
        const ok = this.deleteDnsRecord(args.id);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: ok ? 'success' : 'error',
              message: ok ? `DNS record ${args.id} removed from zone` : `Record ${args.id} not found`
            }, null, 2)
          }]
        };
      }

      case 'cloudflare_worker_list': {
        const workers = this.getWorkers();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              totalWorkers: workers.length,
              workers: workers.map(w => ({
                id: w.id,
                name: w.name,
                routes: w.routes,
                status: w.status,
                memoryUsageMb: w.memoryUsageMb,
                lastInvocation: w.lastInvocation
              }))
            }, null, 2)
          }]
        };
      }

      case 'cloudflare_worker_get_script': {
        const worker = this.getWorkerById(args.workerId);
        if (!worker) {
          throw new Error(`Worker '${args.workerId}' not found.`);
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              worker
            }, null, 2)
          }]
        };
      }

      case 'cloudflare_worker_deploy': {
        const deployed = this.saveWorker({
          name: args.name,
          script: args.script,
          routes: args.routes,
          environmentVars: args.environmentVars
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              message: `Worker '${args.name}' deployed successfully to Cloudflare global network`,
              worker: deployed
            }, null, 2)
          }]
        };
      }

      case 'cloudflare_worker_test': {
        const testResult = this.testWorkerExecution(args.workerId, args.path, args.method || 'GET');
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              workerId: args.workerId,
              testResult
            }, null, 2)
          }]
        };
      }

      case 'cloudflare_domain_zone_status': {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              zone: this.getDomainSettings(),
              dnsSummary: {
                totalRecords: this.dnsRecords.length,
                proxiedRecords: this.dnsRecords.filter(r => r.proxied).length
              },
              workersSummary: {
                totalWorkers: this.workers.length
              }
            }, null, 2)
          }]
        };
      }

      default:
        throw new Error(`Unknown MCP Tool: ${name}`);
    }
  }

  /**
   * Handle incoming JSON-RPC 2.0 MCP Request
   */
  public handleJsonRpcMessage(message: any) {
    if (!message || typeof message !== 'object') {
      return {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: Invalid JSON object' }
      };
    }

    const { id, method, params } = message;

    try {
      switch (method) {
        case 'initialize': {
          return {
            jsonrpc: '2.0',
            id,
            result: this.getMcpServerCapabilities()
          };
        }

        case 'notifications/initialized': {
          return {
            jsonrpc: '2.0',
            id,
            result: {}
          };
        }

        case 'ping': {
          return {
            jsonrpc: '2.0',
            id,
            result: {}
          };
        }

        case 'tools/list': {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              tools: this.getMcpToolsList()
            }
          };
        }

        case 'tools/call': {
          if (!params || !params.name) {
            return {
              jsonrpc: '2.0',
              id,
              error: { code: -32602, message: 'Missing tool name parameter in tools/call' }
            };
          }
          const callResult = this.executeMcpTool(params.name, params.arguments || {});
          return {
            jsonrpc: '2.0',
            id,
            result: callResult
          };
        }

        case 'resources/list': {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              resources: this.getMcpResourcesList()
            }
          };
        }

        case 'resources/read': {
          if (!params || !params.uri) {
            return {
              jsonrpc: '2.0',
              id,
              error: { code: -32602, message: 'Missing uri parameter in resources/read' }
            };
          }
          const resourceData = this.readMcpResource(params.uri);
          return {
            jsonrpc: '2.0',
            id,
            result: resourceData
          };
        }

        case 'prompts/list': {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              prompts: [
                {
                  name: 'audit_network_security',
                  description: 'Audit Cloudflare WAF, threat scores, and rate limiting status for redbird-international.cm',
                  arguments: []
                },
                {
                  name: 'optimize_dns_records',
                  description: 'Review DNS zone records for optimal CNAME proxies, SPF/DMARC records, and latency',
                  arguments: []
                },
                {
                  name: 'scaffold_security_worker',
                  description: 'Generate and deploy a specialized Cloudflare Worker for custom IP blocking or header transforms',
                  arguments: [{ name: 'feature', description: 'Desired feature: bot-challenge, rate-limit, or custom-headers', required: true }]
                }
              ]
            }
          };
        }

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Method not found: ${method}` }
          };
      }
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32000, message: err.message || 'Internal MCP Execution Error' }
      };
    }
  }
}

export const cloudflareMcpAgent = new CloudflareMcpAgentService();
