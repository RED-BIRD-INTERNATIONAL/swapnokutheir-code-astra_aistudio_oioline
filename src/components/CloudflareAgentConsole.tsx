import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldCheck, Globe, Zap, Cpu, Terminal, RefreshCw, CheckCircle2, 
  AlertTriangle, Lock, Server, Play, Plus, Trash2, Edit3, Save, 
  Copy, Check, ExternalLink, Code2, AlertOctagon, Eye, Radio,
  Layers, ArrowUpRight, Activity, Search, Filter, ShieldAlert,
  Sliders, ChevronRight, X, ArrowRight, Network, Wifi, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AgentTelemetry3D } from './AgentTelemetry3D';
import { AgentHeartbeatWidget } from './AgentHeartbeatWidget';

interface Toast {
  id: string;
  message: string;
  type: 'warning' | 'error' | 'success' | 'info';
}

interface SwarmNode {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'degraded';
  region: string;
  load: number;
}

interface DnsRecord {
  id: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'NS' | 'SRV';
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
  priority?: number;
  created_on?: string;
  modified_on?: string;
}

interface SecurityEvent {
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

interface WorkerScript {
  id: string;
  name: string;
  routes: string[];
  script: string;
  created_on?: string;
  modified_on?: string;
  status: 'active' | 'deploying' | 'disabled';
  environmentVars: Record<string, string>;
  memoryUsageMb: number;
  lastInvocation: string;
}

interface DomainSettings {
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

export const CloudflareAgentConsole: React.FC<{
  onClose?: () => void;
  isStandalone?: boolean;
}> = ({ onClose, isStandalone = false }) => {
  const [activeTab, setActiveTab] = useState<'mcp' | 'security' | 'workers' | 'dns' | 'domain'>('mcp');
  const [loading, setLoading] = useState(false);
  const [domainSettings, setDomainSettings] = useState<DomainSettings | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [securityMetrics, setSecurityMetrics] = useState<any>(null);
  const [workers, setWorkers] = useState<WorkerScript[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [workerEditorCode, setWorkerEditorCode] = useState<string>('');
  const [workerEditorRoutes, setWorkerEditorRoutes] = useState<string>('');
  const [workerDeploying, setWorkerDeploying] = useState(false);
  const [deployNotification, setDeployNotification] = useState<string | null>(null);

  // MCP Tester state
  const [mcpTools, setMcpTools] = useState<any[]>([]);
  const [selectedMcpTool, setSelectedMcpTool] = useState<string>('cloudflare_security_monitor');
  const [mcpArgumentsInput, setMcpArgumentsInput] = useState<string>('{\n  "limit": 5\n}');
  const [mcpResponseOutput, setMcpResponseOutput] = useState<string>('');
  const [mcpTesting, setMcpTesting] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Worker Test Simulator state
  const [workerTestPath, setWorkerTestPath] = useState('/mcp');
  const [workerTestMethod, setWorkerTestMethod] = useState('GET');
  const [workerTestOutput, setWorkerTestOutput] = useState<any>(null);
  const [workerTesting, setWorkerTesting] = useState(false);

  // DNS modal state
  const [isDnsModalOpen, setIsDnsModalOpen] = useState(false);
  const [editingDnsId, setEditingDnsId] = useState<string | null>(null);
  const [dnsForm, setDnsForm] = useState<{
    type: 'A' | 'CNAME' | 'TXT' | 'MX';
    name: string;
    content: string;
    proxied: boolean;
    ttl: number;
    priority?: number;
  }>({
    type: 'CNAME',
    name: '',
    content: '',
    proxied: true,
    ttl: 1
  });

  // Block IP modal state
  const [isBlockIpModalOpen, setIsBlockIpModalOpen] = useState(false);
  const [blockIpAddress, setBlockIpAddress] = useState('');
  const [blockIpReason, setBlockIpReason] = useState('Manual suspicious activity block');

  // Live Telemetry State
  const [cpu, setCpu] = useState(42.5);
  const [memory, setMemory] = useState(68.2);
  const [network, setNetwork] = useState(245);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [swarmNodes, setSwarmNodes] = useState<SwarmNode[]>([
    { id: 'node-01', name: 'Primary Neural Core', status: 'online', region: 'asia-southeast1', load: 45 },
    { id: 'node-02', name: 'Edge Filter Alpha', status: 'online', region: 'us-west1', load: 20 },
    { id: 'node-03', name: 'Edge Filter Beta', status: 'online', region: 'europe-west3', load: 15 },
    { id: 'node-04', name: 'Audit Sync Node', status: 'degraded', region: 'asia-east1', load: 88 },
    { id: 'node-05', name: 'Backup Archive', status: 'offline', region: 'us-central1', load: 0 },
  ]);

  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Telemetry Simulation Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setCpu(prev => {
        const next = Math.max(5, Math.min(98, prev + (Math.random() - 0.5) * 10));
        if (next > 85 && prev <= 85) addToast('Critical CPU Load Detected on Primary Node', 'warning');
        return next;
      });
      setMemory(prev => {
        const next = Math.max(10, Math.min(95, prev + (Math.random() - 0.5) * 5));
        if (next > 90 && prev <= 90) addToast('Memory Usage exceeding 90% threshold', 'error');
        return next;
      });
      setNetwork(prev => Math.max(10, Math.min(1000, prev + (Math.random() - 0.5) * 50)));
      
      // Randomly flicker degraded node
      setSwarmNodes(prev => prev.map(node => {
        if (node.id === 'node-04') {
          return { ...node, status: Math.random() > 0.8 ? 'online' : 'degraded', load: 80 + Math.random() * 15 };
        }
        return node;
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Load initial data
  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cloudflare/agent/overview');
      const data = await res.json();
      if (data.domain) setDomainSettings(data.domain);
      if (data.security) setSecurityMetrics(data.security);
      if (data.dns?.records) setDnsRecords(data.dns.records);
      if (data.workers?.list) {
        setWorkers(data.workers.list);
        if (data.workers.list.length > 0 && !selectedWorkerId) {
          const first = data.workers.list[0];
          setSelectedWorkerId(first.id);
          setWorkerEditorCode(first.script);
          setWorkerEditorRoutes(first.routes.join(', '));
        }
      }
      if (data.mcp?.tools) {
        setMcpTools(data.mcp.tools);
      }
    } catch (err) {
      console.error('Failed to load Cloudflare agent overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSecurity = async () => {
    try {
      const res = await fetch('/api/cloudflare/agent/security');
      const data = await res.json();
      if (data.metrics) setSecurityMetrics(data.metrics);
      if (data.events) setSecurityEvents(data.events);
    } catch (err) {
      console.error('Failed to load security details:', err);
    }
  };

  useEffect(() => {
    loadOverview();
    loadSecurity();
  }, []);

  const handleSelectWorker = (worker: WorkerScript) => {
    setSelectedWorkerId(worker.id);
    setWorkerEditorCode(worker.script);
    setWorkerEditorRoutes(worker.routes.join(', '));
    setWorkerTestOutput(null);
  };

  const handleDeployWorker = async () => {
    const curWorker = workers.find(w => w.id === selectedWorkerId);
    if (!curWorker) return;

    setWorkerDeploying(true);
    try {
      const res = await fetch('/api/cloudflare/agent/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: curWorker.id,
          name: curWorker.name,
          script: workerEditorCode,
          routes: workerEditorRoutes.split(',').map(r => r.trim()).filter(Boolean),
          environmentVars: curWorker.environmentVars
        })
      });
      const data = await res.json();
      if (data.success) {
        setDeployNotification(`Worker '${curWorker.name}' successfully deployed to Cloudflare Edge Network!`);
        setTimeout(() => setDeployNotification(null), 5000);
        loadOverview();
      }
    } catch (err: any) {
      alert(`Deployment failed: ${err.message}`);
    } finally {
      setWorkerDeploying(false);
    }
  };

  const handleTestWorker = async () => {
    if (!selectedWorkerId) return;
    setWorkerTesting(true);
    try {
      const res = await fetch(`/api/cloudflare/agent/workers/${selectedWorkerId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: workerTestPath,
          method: workerTestMethod,
          headers: {
            'cf-connecting-ip': '203.0.113.195',
            'cf-ipcountry': 'SG',
            'user-agent': 'RedBird-Cloudflare-Tester/1.0'
          }
        })
      });
      const data = await res.json();
      setWorkerTestOutput(data.result);
    } catch (err: any) {
      setWorkerTestOutput({ error: err.message });
    } finally {
      setWorkerTesting(false);
    }
  };

  const handleToggleUnderAttack = async () => {
    if (!domainSettings) return;
    const newLevel = domainSettings.securityLevel === 'under_attack' ? 'medium' : 'under_attack';
    try {
      const res = await fetch('/api/cloudflare/agent/security/level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: newLevel })
      });
      const data = await res.json();
      if (data.success) {
        setDomainSettings(prev => prev ? { ...prev, securityLevel: newLevel } : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExecuteMcpTool = async () => {
    setMcpTesting(true);
    setMcpResponseOutput('');
    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(mcpArgumentsInput);
      } catch (e) {
        parsedArgs = {};
      }

      const res = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `mcp_client_${Date.now()}`,
          method: 'tools/call',
          params: {
            name: selectedMcpTool,
            arguments: parsedArgs
          }
        })
      });
      const data = await res.json();
      setMcpResponseOutput(JSON.stringify(data, null, 2));
      // Refresh state if DNS or security tools were run
      if (selectedMcpTool.startsWith('cloudflare_dns_') || selectedMcpTool.startsWith('cloudflare_update_')) {
        loadOverview();
      }
    } catch (err: any) {
      setMcpResponseOutput(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setMcpTesting(false);
    }
  };

  const handleToggleDnsProxy = async (rec: DnsRecord) => {
    try {
      const res = await fetch(`/api/cloudflare/agent/dns/${rec.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxied: !rec.proxied })
      });
      if (res.ok) {
        setDnsRecords(prev => prev.map(r => r.id === rec.id ? { ...r, proxied: !r.proxied } : r));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDnsRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this DNS record?')) return;
    try {
      const res = await fetch(`/api/cloudflare/agent/dns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDnsRecords(prev => prev.filter(r => r.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveDnsRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDnsId) {
        const res = await fetch(`/api/cloudflare/agent/dns/${editingDnsId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dnsForm)
        });
        if (res.ok) {
          setIsDnsModalOpen(false);
          setEditingDnsId(null);
          loadOverview();
        }
      } else {
        const res = await fetch('/api/cloudflare/agent/dns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dnsForm)
        });
        if (res.ok) {
          setIsDnsModalOpen(false);
          loadOverview();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBlockIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockIpAddress.trim()) return;
    try {
      const res = await fetch('/api/cloudflare/agent/security/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: blockIpAddress.trim(), reason: blockIpReason })
      });
      if (res.ok) {
        setIsBlockIpModalOpen(false);
        setBlockIpAddress('');
        loadSecurity();
        loadOverview();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const mcpConfigSnippet = JSON.stringify({
    mcpServers: {
      "redbird-cloudflare-agent": {
        url: "https://redbird-international.cm/mcp",
        transport: "sse"
      }
    }
  }, null, 2);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className={`flex flex-col h-full bg-slate-950 text-slate-100 font-sans ${isStandalone ? 'min-h-screen' : ''}`}>
      {/* Top Header Bar */}
      <header className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-600 to-red-600 p-[1px] shadow-lg shadow-orange-950/40">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-orange-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">Cloudflare Agent & MCP Server</h1>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-full">
                Edge v1.0
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Network Synchronized
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>Domain Zone: <strong className="text-slate-200">redbird-international.cm</strong></span>
              <span>•</span>
              <span className="font-mono text-[11px] text-slate-400">Target Host: Cloud Run (asia-southeast1)</span>
            </p>
          </div>
        </div>

        {/* Global Controls & Emergency Switch */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleUnderAttack}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
              domainSettings?.securityLevel === 'under_attack'
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/50 ring-2 ring-red-400 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <AlertOctagon className="w-4 h-4 text-red-400" />
            {domainSettings?.securityLevel === 'under_attack' ? 'UNDER ATTACK: ACTIVE' : 'Under Attack Mode: Off'}
          </button>

          <button
            onClick={() => copyToClipboard('https://redbird-international.cm/mcp')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold transition"
          >
            {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy MCP URL</span>
          </button>

          <button
            onClick={loadOverview}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition disabled:opacity-50"
            title="Refresh Network Status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-400' : ''}`} />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Deploy Notification Banner */}
      <AnimatePresence>
        {deployNotification && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-emerald-950/80 border-b border-emerald-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-300"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {deployNotification}
            </span>
            <button onClick={() => setDeployNotification(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/40 px-6 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('mcp')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition ${
            activeTab === 'mcp'
              ? 'border-orange-500 text-orange-400 bg-orange-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>MCP Protocol Server</span>
          <span className="px-1.5 py-0.2 text-[10px] bg-orange-500/20 text-orange-300 rounded">12 Tools</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition ${
            activeTab === 'security'
              ? 'border-orange-500 text-orange-400 bg-orange-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Network Security & WAF</span>
          <span className="px-1.5 py-0.2 text-[10px] bg-red-500/20 text-red-300 rounded">Mitigation Active</span>
        </button>

        <button
          onClick={() => setActiveTab('workers')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition ${
            activeTab === 'workers'
              ? 'border-orange-500 text-orange-400 bg-orange-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Cloudflare Workers Studio</span>
          <span className="px-1.5 py-0.2 text-[10px] bg-slate-800 text-slate-300 rounded">{workers.length} Scripts</span>
        </button>

        <button
          onClick={() => setActiveTab('dns')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition ${
            activeTab === 'dns'
              ? 'border-orange-500 text-orange-400 bg-orange-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>DNS Zone Management</span>
          <span className="px-1.5 py-0.2 text-[10px] bg-slate-800 text-slate-300 rounded">{dnsRecords.length} Records</span>
        </button>

        <button
          onClick={() => setActiveTab('domain')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition ${
            activeTab === 'domain'
              ? 'border-orange-500 text-orange-400 bg-orange-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Domain & SSL Settings</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* =========================================================================
            TAB 1: MODEL CONTEXT PROTOCOL (MCP) PROTOCOL SERVER
            ========================================================================= */}
        {activeTab === 'mcp' && (
          <div className="space-y-6">
            {/* 3D Telemetry Overlay & Swarm Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 3D Telemetry Visualizer */}
              <div className="lg:col-span-2 relative h-[400px] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden group">
                <div className="absolute inset-0 z-0">
                  <AgentTelemetry3D cpu={cpu} memory={memory} network={network} isWarning={cpu > 85 || memory > 90} />
                </div>
                
                {/* Visual Decorative Frame */}
                <div className="absolute inset-0 pointer-events-none border-[12px] border-slate-950/20 rounded-3xl z-10" />
                <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-orange-500/30 rounded-tl-3xl z-10" />
                <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-orange-500/30 rounded-br-3xl z-10" />

                {/* HUD Header */}
                <div className="absolute top-6 right-6 z-20 flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Node ID</span>
                    <span className="text-xs font-mono text-orange-400 font-bold">NODE-SCARLET-01</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-950/80 border border-slate-800 flex items-center justify-center">
                    <Activity className={`w-5 h-5 ${cpu > 85 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`} />
                  </div>
                </div>

                <div className="absolute bottom-6 left-6 z-20">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/60 backdrop-blur-sm border border-slate-800 rounded-full">
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Autonomous Uplink Active</span>
                  </div>
                </div>
              </div>

              {/* Swarm Health Summary Widget */}
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-orange-400" />
                    Swarm Infrastructure
                  </h3>
                  <span className="px-2 py-0.5 bg-slate-950 rounded-full text-[10px] font-bold text-slate-400">
                    {swarmNodes.filter(n => n.status === 'online').length}/{swarmNodes.length} Online
                  </span>
                </div>

                {/* Swarm Visualization (Mini Grid) */}
                <div className="flex-1 space-y-4">
                  {swarmNodes.map(node => (
                    <div key={node.id} className="p-3 bg-slate-950/50 border border-slate-800 rounded-2xl flex items-center justify-between group/node hover:border-slate-700 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          node.status === 'online' ? 'bg-emerald-500' : 
                          node.status === 'degraded' ? 'bg-amber-500 animate-pulse' : 'bg-red-600'
                        }`} />
                        <div>
                          <p className="text-xs font-bold text-slate-200">{node.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{node.region}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="h-1 w-16 bg-slate-800 rounded-full overflow-hidden mb-1">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${node.load}%` }}
                            className={`h-full ${node.load > 80 ? 'bg-red-500' : 'bg-orange-500'}`} 
                          />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{node.load}% Load</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => addToast('Executing Swarm-Wide Health Audit...', 'info')}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Trigger Swarm Audit
                </button>
              </div>
            </div>

            {/* Real-time Agent Heartbeat D3 Dynamic Telemetry Waveform */}
            <AgentHeartbeatWidget 
              activeNodeId="NODE-SCARLET-01"
              onNodeAlert={(msg) => addToast(msg, 'warning')}
            />

            {/* Primary Endpoint Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-bold bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                      Standard MCP Endpoint
                    </span>
                    <span className="text-xs text-slate-400">Spec Version: 2024-11-05</span>
                  </div>
                  <h2 className="text-xl font-bold text-white font-mono flex items-center gap-2">
                    <span>https://redbird-international.cm/mcp</span>
                  </h2>
                  <p className="text-xs text-slate-400 max-w-2xl">
                    Allows autonomous AI agents (Claude Desktop, Cursor, LangChain, Autogen) to monitor Cloudflare network security telemetry, inspect/deploy Workers, and manipulate DNS zones in real time.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => copyToClipboard('https://redbird-international.cm/mcp')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-950/50 transition"
                  >
                    {copiedSnippet ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>Copy Endpoint</span>
                  </button>
                  <a
                    href="/mcp?format=json"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Raw JSON Schema</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Agent Configuration Snippet */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-orange-400" />
                  Claude Desktop Config
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Add this block into your <code className="text-orange-300 bg-slate-950 px-1 py-0.5 rounded">claude_desktop_config.json</code> to give Claude direct control over your Cloudflare edge infrastructure:
                </p>
                <div className="relative">
                  <pre className="p-3 bg-slate-950 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto border border-slate-800">
                    {mcpConfigSnippet}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(mcpConfigSnippet)}
                    className="absolute top-2 right-2 p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded transition"
                    title="Copy Config"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="pt-2 text-[11px] text-slate-400 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Transports: HTTP JSON-RPC 2.0 & SSE
                  </p>
                  <p className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    CORS Enabled for multi-agent workflows
                  </p>
                </div>
              </div>

              {/* Interactive MCP Tool Invocation Tester */}
              <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Play className="w-4 h-4 text-emerald-400" />
                    Interactive MCP Tool Execution Console
                  </h3>
                  <span className="text-[11px] text-slate-400">Run direct JSON-RPC calls against the live server</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select Tool and Arguments */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Select MCP Tool
                      </label>
                      <select
                        value={selectedMcpTool}
                        onChange={(e) => {
                          const toolName = e.target.value;
                          setSelectedMcpTool(toolName);
                          // Default parameter template
                          if (toolName === 'cloudflare_security_monitor') setMcpArgumentsInput('{\n  "limit": 5\n}');
                          else if (toolName === 'cloudflare_update_security_level') setMcpArgumentsInput('{\n  "level": "high"\n}');
                          else if (toolName === 'cloudflare_waf_block_ip') setMcpArgumentsInput('{\n  "ip": "198.51.100.99",\n  "reason": "Automated SQLi attempt"\n}');
                          else if (toolName === 'cloudflare_dns_list_records') setMcpArgumentsInput('{\n  "type": "CNAME"\n}');
                          else if (toolName === 'cloudflare_dns_create_record') setMcpArgumentsInput('{\n  "type": "CNAME",\n  "name": "status",\n  "content": "redbird-international.cm",\n  "proxied": true,\n  "ttl": 1\n}');
                          else if (toolName === 'cloudflare_worker_get_script') setMcpArgumentsInput('{\n  "workerId": "redbird-security-edge"\n}');
                          else if (toolName === 'cloudflare_worker_test') setMcpArgumentsInput('{\n  "workerId": "redbird-security-edge",\n  "path": "/mcp",\n  "method": "GET"\n}');
                          else setMcpArgumentsInput('{}');
                        }}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-orange-300 focus:outline-none focus:border-orange-500"
                      >
                        {mcpTools.length > 0 ? (
                          mcpTools.map(t => (
                            <option key={t.name} value={t.name}>{t.name}</option>
                          ))
                        ) : (
                          <>
                            <option value="cloudflare_security_monitor">cloudflare_security_monitor</option>
                            <option value="cloudflare_update_security_level">cloudflare_update_security_level</option>
                            <option value="cloudflare_waf_block_ip">cloudflare_waf_block_ip</option>
                            <option value="cloudflare_dns_list_records">cloudflare_dns_list_records</option>
                            <option value="cloudflare_dns_create_record">cloudflare_dns_create_record</option>
                            <option value="cloudflare_worker_list">cloudflare_worker_list</option>
                            <option value="cloudflare_worker_get_script">cloudflare_worker_get_script</option>
                            <option value="cloudflare_worker_test">cloudflare_worker_test</option>
                            <option value="cloudflare_domain_zone_status">cloudflare_domain_zone_status</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Tool Arguments (JSON)
                      </label>
                      <textarea
                        value={mcpArgumentsInput}
                        onChange={(e) => setMcpArgumentsInput(e.target.value)}
                        rows={7}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <button
                      onClick={handleExecuteMcpTool}
                      disabled={mcpTesting}
                      className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                      {mcpTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                      <span>Execute Tool via MCP JSON-RPC</span>
                    </button>
                  </div>

                  {/* Output Terminal */}
                  <div className="space-y-1 flex flex-col">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Execution Output (MCP JSON-RPC Response)
                    </label>
                    <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 p-3 overflow-y-auto max-h-[240px]">
                      {mcpResponseOutput ? (
                        <pre className="text-[11px] font-mono text-emerald-400 whitespace-pre-wrap">
                          {mcpResponseOutput}
                        </pre>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                          Click "Execute Tool" to test real-time MCP invocation.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: NETWORK SECURITY & WAF MONITORING
            ========================================================================= */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Top Stat Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">Security Mode</span>
                <div className="flex items-center justify-between">
                  <span className={`text-lg font-bold uppercase font-mono ${
                    domainSettings?.securityLevel === 'under_attack' ? 'text-red-400 animate-pulse' : 'text-orange-400'
                  }`}>
                    {domainSettings?.securityLevel || 'MEDIUM'}
                  </span>
                  <ShieldCheck className="w-5 h-5 text-orange-400" />
                </div>
                <span className="text-[11px] text-slate-400">Cloudflare Managed WAF</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">Threats Blocked (24h)</span>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-white font-mono">
                    {securityMetrics?.threatsBlocked24h || 382}
                  </span>
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <span className="text-[11px] text-emerald-400">Mitigation Rate: 99.8%</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">DDoS Mitigation Status</span>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-emerald-400 uppercase font-mono">
                    {securityMetrics?.ddosMitigation || 'ACTIVE'}
                  </span>
                  <Zap className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-[11px] text-slate-400">Global Anycast L3/L4/L7</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">Edge SSL/TLS Encryption</span>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-indigo-400 uppercase font-mono">
                    {domainSettings?.sslMode || 'STRICT'}
                  </span>
                  <Lock className="w-5 h-5 text-indigo-400" />
                </div>
                <span className="text-[11px] text-slate-400">TLS 1.3 / ECC CA-3</span>
              </div>
            </div>

            {/* Live Security Threat Events Table */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-orange-400" />
                    Real-Time WAF & Threat Telemetry Feed
                  </h3>
                  <p className="text-xs text-slate-400">
                    Live security incidents intercepted at the Cloudflare edge for <strong className="text-slate-200">redbird-international.cm</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsBlockIpModalOpen(true)}
                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Block IP Address</span>
                  </button>
                  <button
                    onClick={loadSecurity}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                    title="Refresh Log"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Client IP & Geo</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Threat Type & Rationale</th>
                      <th className="py-2.5 px-3">Path / Request</th>
                      <th className="py-2.5 px-3">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {securityEvents.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-3 text-slate-200 whitespace-nowrap">
                          <span className="font-bold">{ev.clientIP}</span>
                          <span className="ml-1.5 px-1 py-0.2 bg-slate-800 text-[10px] text-slate-300 rounded">
                            {ev.clientCountry}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            ev.action === 'block'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : ev.action === 'challenge' || ev.action === 'js_challenge'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {ev.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          <div className="font-semibold text-slate-200">{ev.ruleDescription}</div>
                          <div className="text-[10px] text-slate-500">Source: {ev.source} • Rule ID: {ev.ruleId}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          <span className="text-orange-400 font-bold mr-1">{ev.method}</span>
                          <span className="text-slate-300">{ev.path}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`font-bold ${
                            ev.threatScore > 80 ? 'text-red-400' : ev.threatScore > 50 ? 'text-amber-400' : 'text-slate-400'
                          }`}>
                            {ev.threatScore}/100
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: CLOUDFLARE WORKERS STUDIO (EDIT & DEPLOY)
            ========================================================================= */}
        {activeTab === 'workers' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Workers List Column */}
              <div className="lg:col-span-1 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-orange-400" />
                    Deployed Workers
                  </h3>
                  <button
                    onClick={() => {
                      const newId = `worker_custom_${Date.now()}`;
                      const newWorker: WorkerScript = {
                        id: newId,
                        name: `custom-edge-worker-${workers.length + 1}`,
                        routes: ['redbird-international.cm/custom/*'],
                        status: 'active',
                        script: `export default {\n  async fetch(request, env, ctx) {\n    return new Response("Hello from Red Bird Edge Worker!");\n  }\n};`,
                        environmentVars: {},
                        memoryUsageMb: 8.0,
                        lastInvocation: new Date().toISOString()
                      };
                      setWorkers([...workers, newWorker]);
                      handleSelectWorker(newWorker);
                    }}
                    className="p-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition"
                    title="Add Worker"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {workers.map((w) => (
                    <div
                      key={w.id}
                      onClick={() => handleSelectWorker(w)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        selectedWorkerId === w.id
                          ? 'bg-slate-900 border-orange-500 ring-1 ring-orange-500/50'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono">{w.name}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 truncate">
                        Route: {w.routes[0] || 'No route'}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                        <span>Mem: {w.memoryUsageMb}MB</span>
                        <span>Global Edge</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Code Editor Column */}
              <div className="lg:col-span-3 space-y-4">
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-orange-400" />
                        Editing: {workers.find(w => w.id === selectedWorkerId)?.name || 'Worker Script'}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Runs on V8 isolates at 300+ Cloudflare global edge data centers.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDeployWorker}
                        disabled={workerDeploying}
                        className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-orange-950/50 transition disabled:opacity-50"
                      >
                        {workerDeploying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                        <span>Deploy Worker to Global Edge</span>
                      </button>
                    </div>
                  </div>

                  {/* Route Pattern Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Attached Cloudflare Edge Route Pattern (comma separated)
                    </label>
                    <input
                      type="text"
                      value={workerEditorRoutes}
                      onChange={(e) => setWorkerEditorRoutes(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-orange-500"
                      placeholder="e.g. redbird-international.cm/*, mcp.redbird-international.cm/*"
                    />
                  </div>

                  {/* Code Area */}
                  <div>
                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950 border-t border-x border-slate-800 rounded-t-lg text-[11px] text-slate-400 font-mono">
                      <span>JavaScript (Cloudflare Worker ES Module)</span>
                      <span>Target: V8 Edge Runtime</span>
                    </div>
                    <textarea
                      value={workerEditorCode}
                      onChange={(e) => setWorkerEditorCode(e.target.value)}
                      rows={14}
                      className="w-full p-4 bg-slate-950 border border-slate-800 rounded-b-lg text-xs font-mono text-amber-200/90 leading-relaxed focus:outline-none focus:border-orange-500 selection:bg-orange-500/30"
                    />
                  </div>

                  {/* Worker Live Test Simulator */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                      Sandbox Worker Execution Simulator
                    </h4>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={workerTestMethod}
                        onChange={(e) => setWorkerTestMethod(e.target.value)}
                        className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-orange-400"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="OPTIONS">OPTIONS</option>
                      </select>
                      <input
                        type="text"
                        value={workerTestPath}
                        onChange={(e) => setWorkerTestPath(e.target.value)}
                        placeholder="/mcp or test path"
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
                      />
                      <button
                        onClick={handleTestWorker}
                        disabled={workerTesting}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        {workerTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>Send Test Request</span>
                      </button>
                    </div>

                    {workerTestOutput && (
                      <div className="p-3 bg-slate-900 rounded-lg text-xs font-mono space-y-2 border border-slate-800">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">
                            Status: <strong className={workerTestOutput.status === 200 ? 'text-emerald-400' : 'text-red-400'}>{workerTestOutput.status} {workerTestOutput.statusText}</strong>
                          </span>
                          <span className="text-slate-500">Latency: {workerTestOutput.executionTimeMs}ms</span>
                        </div>
                        <pre className="text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                          {workerTestOutput.body}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: DNS ZONE MANAGEMENT
            ========================================================================= */}
        {activeTab === 'dns' && (
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-orange-400" />
                    DNS Records for <span className="font-mono text-orange-300">redbird-international.cm</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cloudflare Proxy (Orange Cloud) accelerates traffic and filters DDoS threats at the edge.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingDnsId(null);
                      setDnsForm({ type: 'CNAME', name: '', content: '', proxied: true, ttl: 1 });
                      setIsDnsModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add DNS Record</span>
                  </button>
                  <button
                    onClick={loadOverview}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                    title="Reload DNS Zone"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* DNS Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Content / Target</th>
                      <th className="py-2.5 px-3 text-center">Proxy Status</th>
                      <th className="py-2.5 px-3">TTL</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {dnsRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-orange-300 border border-slate-700">
                            {rec.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-white font-bold">
                          {rec.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate" title={rec.content}>
                          {rec.content}
                          {rec.priority !== undefined && <span className="ml-1 text-slate-500">({rec.priority})</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleToggleDnsProxy(rec)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition ${
                              rec.proxied
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 hover:bg-orange-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                            }`}
                            title="Toggle Cloudflare CDN & WAF proxy"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${rec.proxied ? 'bg-orange-400' : 'bg-slate-500'}`} />
                            {rec.proxied ? 'Proxied' : 'DNS Only'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {rec.ttl === 1 ? 'Auto' : `${rec.ttl}s`}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingDnsId(rec.id);
                                setDnsForm({
                                  type: rec.type as any,
                                  name: rec.name,
                                  content: rec.content,
                                  proxied: rec.proxied,
                                  ttl: rec.ttl,
                                  priority: rec.priority
                                });
                                setIsDnsModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                              title="Edit Record"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteDnsRecord(rec.id)}
                              className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: DOMAIN & SSL SETTINGS
            ========================================================================= */}
        {activeTab === 'domain' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SSL/TLS Settings Card */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  SSL/TLS Edge Encryption
                </h3>
                <p className="text-xs text-slate-400">
                  Select the level of end-to-end cryptographic encryption between visitors and Cloudflare Edge.
                </p>

                <div className="space-y-2">
                  {(['strict', 'full', 'flexible', 'off'] as const).map((mode) => (
                    <label
                      key={mode}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                        domainSettings?.sslMode === mode
                          ? 'bg-slate-950 border-emerald-500/50 text-white'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="sslMode"
                          checked={domainSettings?.sslMode === mode}
                          onChange={async () => {
                            setDomainSettings(prev => prev ? { ...prev, sslMode: mode } : null);
                            await fetch('/api/cloudflare/agent/domain', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ sslMode: mode })
                            });
                          }}
                          className="text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-xs font-bold uppercase font-mono">{mode}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {mode === 'strict' && 'End-to-end verified with valid origin CA'}
                        {mode === 'full' && 'Encrypted end-to-end'}
                        {mode === 'flexible' && 'Browser to Cloudflare encrypted only'}
                        {mode === 'off' && 'No encryption'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Edge Speed & Performance Optimization */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Performance & Network Optimizations
                </h3>
                <p className="text-xs text-slate-400">
                  Edge caching, compression, and next-gen protocols for <strong className="text-slate-200">redbird-international.cm</strong>.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div>
                      <div className="text-xs font-bold text-white">Always Use HTTPS</div>
                      <div className="text-[11px] text-slate-400">Redirects all HTTP requests to secure HTTPS</div>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 rounded">
                      Enabled
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div>
                      <div className="text-xs font-bold text-white">HTTP/3 with QUIC</div>
                      <div className="text-[11px] text-slate-400">Accelerates delivery over lossy mobile connections</div>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 rounded">
                      Enabled
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div>
                      <div className="text-xs font-bold text-white">Brotli Compression</div>
                      <div className="text-[11px] text-slate-400">Speed up page load times for web visitors</div>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 rounded">
                      Active
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div>
                      <div className="text-xs font-bold text-white">Auto Minify (CSS, HTML, JS)</div>
                      <div className="text-[11px] text-slate-400">Strips whitespace and comments at the edge</div>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 rounded">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add / Edit DNS Record Modal */}
      {isDnsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                {editingDnsId ? 'Edit DNS Record' : 'Add New DNS Record'}
              </h3>
              <button onClick={() => setIsDnsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDnsRecord} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Record Type</label>
                <select
                  value={dnsForm.type}
                  onChange={(e) => setDnsForm({ ...dnsForm, type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="CNAME">CNAME</option>
                  <option value="A">A</option>
                  <option value="TXT">TXT</option>
                  <option value="MX">MX</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Name / Host (@ for root)</label>
                <input
                  type="text"
                  required
                  value={dnsForm.name}
                  onChange={(e) => setDnsForm({ ...dnsForm, name: e.target.value })}
                  placeholder="e.g. @ or www or mcp"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target / Content</label>
                <input
                  type="text"
                  required
                  value={dnsForm.content}
                  onChange={(e) => setDnsForm({ ...dnsForm, content: e.target.value })}
                  placeholder="e.g. 192.0.2.1 or target hostname"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {dnsForm.type === 'MX' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <input
                    type="number"
                    value={dnsForm.priority || 10}
                    onChange={(e) => setDnsForm({ ...dnsForm, priority: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="proxiedToggle"
                  checked={dnsForm.proxied}
                  onChange={(e) => setDnsForm({ ...dnsForm, proxied: e.target.checked })}
                  className="text-orange-500 focus:ring-orange-500 rounded"
                />
                <label htmlFor="proxiedToggle" className="text-xs text-slate-300">
                  Cloudflare Proxy (CDN, DDoS & WAF Active)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsDnsModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block IP Modal */}
      {isBlockIpModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                Block Client IP Address
              </h3>
              <button onClick={() => setIsBlockIpModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBlockIp} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">IP Address to Block</label>
                <input
                  type="text"
                  required
                  value={blockIpAddress}
                  onChange={(e) => setBlockIpAddress(e.target.value)}
                  placeholder="e.g. 198.51.100.42"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Rationale</label>
                <input
                  type="text"
                  value={blockIpReason}
                  onChange={(e) => setBlockIpReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsBlockIpModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold"
                >
                  Block Across All PoPs
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Toast Notification HUD */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md min-w-[300px] ${
                toast.type === 'error' ? 'bg-red-950/80 border-red-500/50 text-red-200' :
                toast.type === 'warning' ? 'bg-amber-950/80 border-amber-500/50 text-amber-200' :
                toast.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200' :
                'bg-slate-900/80 border-slate-700/50 text-slate-200'
              }`}
            >
              <div className="flex-shrink-0">
                {toast.type === 'error' && <AlertOctagon className="w-5 h-5 text-red-400" />}
                {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
              </div>
              <div className="flex-1 text-sm font-medium">{toast.message}</div>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="flex-shrink-0 text-slate-500 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CloudflareAgentConsole;
