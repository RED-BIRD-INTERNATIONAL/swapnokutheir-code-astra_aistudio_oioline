import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import {
  Package,
  Users,
  FileCheck2,
  TrendingUp,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  ShipmentRecord,
  ClientAccountRecord,
  VerificationRequestRecord,
  DailyShipmentVolume,
} from '../src/types/logistics';
import { CloudflareAgentConsole } from './CloudflareAgentConsole';
import { AstraLiveAgentModule } from './AstraLiveAgentModule';
import type { VaultAuthMode } from '../src/services/vaultAuth';

interface AdminPortalProps {
  vaultToken?: string | null;
  vaultMode?: VaultAuthMode;
  vaultExpiresAt?: number | null;
  onLockVault?: () => void;
  onTokenRotated?: (payload: { token: string; expiresAt: number; mode: VaultAuthMode }) => void;
  onSessionExpired?: () => void;
}

const INITIAL_SHIPMENTS: ShipmentRecord[] = [
  {
    id: 'shp-1',
    trackingNumber: 'RBI-2026-0442',
    clientName: 'Nordic Garments GmbH',
    originPort: 'Chittagong (BDCGP)',
    destinationPort: 'Hamburg (DEHAM)',
    containerType: '40FT High Cube',
    garmentQuantityPcs: 12500,
    status: 'In Transit',
    etaDate: '2026-10-14',
    valueUsd: 61500,
    updatedAt: '2h ago',
  },
  {
    id: 'shp-2',
    trackingNumber: 'RBI-2026-0439',
    clientName: 'Scandia Apparel AB',
    originPort: 'Dhaka Air Cargo (DAC)',
    destinationPort: 'Stockholm (ARN)',
    containerType: 'Air Freight',
    garmentQuantityPcs: 3400,
    status: 'Customs Clearance',
    etaDate: '2026-10-03',
    valueUsd: 24800,
    updatedAt: '5h ago',
  },
  {
    id: 'shp-3',
    trackingNumber: 'RBI-2026-0431',
    clientName: 'Atlantic Retail Group',
    originPort: 'Chittagong (BDCGP)',
    destinationPort: 'Rotterdam (NLRTM)',
    containerType: '40FT High Cube',
    garmentQuantityPcs: 18200,
    status: 'Delivered',
    etaDate: '2026-09-27',
    valueUsd: 89400,
    updatedAt: '1d ago',
  },
  {
    id: 'shp-4',
    trackingNumber: 'RBI-2026-0445',
    clientName: 'Alpine Outerwear AG',
    originPort: 'Chittagong (BDCGP)',
    destinationPort: 'Zurich / Genoa (ITGOA)',
    containerType: '20FT Standard',
    garmentQuantityPcs: 6800,
    status: 'Booking Confirmed',
    etaDate: '2026-10-22',
    valueUsd: 41200,
    updatedAt: '30m ago',
  },
];

const INITIAL_CLIENTS: ClientAccountRecord[] = [
  { id: 'c-1', companyName: 'Nordic Garments GmbH', country: 'Germany', contactEmail: 'procurement@nordic-garments.de', activeOrders: 4, totalVolumeUsd: 245000, status: 'VIP' },
  { id: 'c-2', companyName: 'Scandia Apparel AB', country: 'Sweden', contactEmail: 'supply@scandia.se', activeOrders: 2, totalVolumeUsd: 118000, status: 'Active' },
  { id: 'c-3', companyName: 'Atlantic Retail Group', country: 'Netherlands', contactEmail: 'imports@atlanticretail.nl', activeOrders: 3, totalVolumeUsd: 194000, status: 'Active' },
  { id: 'c-4', companyName: 'Alpine Outerwear AG', country: 'Switzerland', contactEmail: 'logistics@alpine.ch', activeOrders: 1, totalVolumeUsd: 41200, status: 'Pending Review' },
];

const INITIAL_VERIFICATIONS: VerificationRequestRecord[] = [
  { id: 'v-1', entityName: 'Nordic Garments GmbH', documentType: 'GOTS Organic Cert', submittedDate: '2026-09-28', priority: 'High', status: 'Pending' },
  { id: 'v-2', entityName: 'Alpine Outerwear AG', documentType: 'LC Compliance', submittedDate: '2026-09-27', priority: 'High', status: 'In Review' },
  { id: 'v-3', entityName: 'Dhaka Knitting Unit B', documentType: 'OEKO-TEX Standard', submittedDate: '2026-09-25', priority: 'Normal', status: 'Pending' },
];

const THIRTY_DAY_VOLUME: DailyShipmentVolume[] = Array.from({ length: 30 }, (_, idx) => {
  const date = new Date(Date.now() - (29 - idx) * 86_400_000);
  const label = `${date.getMonth() + 1}/${date.getDate()}`;
  const wave = Math.round(14 + Math.sin(idx * 0.45) * 5 + (idx % 7 === 0 ? 4 : 0) + idx * 0.2);
  return {
    date: date.toISOString().slice(0, 10),
    label,
    shipments: wave,
    containers: Math.max(4, Math.round(wave * 0.65)),
  };
});

export const AdminPortal: React.FC<AdminPortalProps> = ({
  vaultToken,
  vaultMode,
  vaultExpiresAt,
  onLockVault,
  onTokenRotated,
  onSessionExpired,
}) => {
  const [shipments] = useState<ShipmentRecord[]>(INITIAL_SHIPMENTS);
  const [clients] = useState<ClientAccountRecord[]>(INITIAL_CLIENTS);
  const [verifications, setVerifications] = useState<VerificationRequestRecord[]>(INITIAL_VERIFICATIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [portalView, setPortalView] = useState<'overview' | 'astra'>('overview');

  const trendSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (portalView !== 'overview') return;
    const svgEl = trendSvgRef.current;
    if (!svgEl) return;

    const width = 760;
    const height = 220;
    const margin = { top: 18, right: 20, bottom: 28, left: 36 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scalePoint<string>()
      .domain(THIRTY_DAY_VOLUME.map((d) => d.label))
      .range([0, innerW]);

    const y = d3
      .scaleLinear()
      .domain([0, (d3.max(THIRTY_DAY_VOLUME, (d) => d.shipments) || 25) + 5])
      .range([innerH, 0]);

    g.append('g')
      .attr('stroke', 'rgba(148,163,184,0.12)')
      .call(d3.axisLeft(y).ticks(4).tickSize(-innerW).tickFormat(() => ''))
      .select('.domain')
      .remove();

    g.append('g')
      .call(d3.axisLeft(y).ticks(4))
      .attr('color', '#94a3b8')
      .attr('font-size', '10px');

    const tickLabels = THIRTY_DAY_VOLUME.filter((_, i) => i % 5 === 0 || i === 29).map((d) => d.label);
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickValues(tickLabels))
      .attr('color', '#94a3b8')
      .attr('font-size', '10px');

    const area = d3
      .area<DailyShipmentVolume>()
      .x((d) => x(d.label) || 0)
      .y0(innerH)
      .y1((d) => y(d.shipments))
      .curve(d3.curveMonotoneX);

    const line = d3
      .line<DailyShipmentVolume>()
      .x((d) => x(d.label) || 0)
      .y((d) => y(d.shipments))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(THIRTY_DAY_VOLUME)
      .attr('fill', 'rgba(34, 211, 238, 0.14)')
      .attr('d', area);

    g.append('path')
      .datum(THIRTY_DAY_VOLUME)
      .attr('fill', 'none')
      .attr('stroke', '#22D3EE')
      .attr('stroke-width', 2.2)
      .attr('d', line);
  }, [portalView]);

  const filteredShipments = shipments.filter(
    (s) =>
      s.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.destinationPort.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = verifications.filter((v) => v.status !== 'Approved').length;
  const activeAccounts = clients.filter((c) => c.status !== 'Pending Review').length;

  const approveVerification = (id: string) => {
    setVerifications((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: 'Approved' } : v))
    );
  };

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 space-y-6">
      {/* Portal Sub-Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1A2233] pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            Operations Admin Portal
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Global apparel logistics metrics, edge agent telemetry, and Astra-Gravity command
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-[#1A2233] bg-[#0B0E17] p-1 text-xs">
          <button
            type="button"
            onClick={() => setPortalView('overview')}
            className={`rounded-lg px-4 py-2 font-semibold transition-colors cursor-pointer ${
              portalView === 'overview'
                ? 'bg-[#111623] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Logistics & Swarm
          </button>
          <button
            type="button"
            onClick={() => setPortalView('astra')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 font-semibold transition-colors cursor-pointer ${
              portalView === 'astra'
                ? 'bg-cyan-400 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Astra-Gravity Studio</span>
          </button>
        </div>
      </div>

      {portalView === 'astra' ? (
        <AstraLiveAgentModule
          shipments={shipments}
          vaultToken={vaultToken}
          vaultMode={vaultMode}
          vaultExpiresAt={vaultExpiresAt}
          onLockVault={onLockVault}
          onTokenRotated={onTokenRotated}
          onSessionExpired={onSessionExpired}
        />
      ) : (
        <>
          {/* Summary Card */}
          <div className="rounded-2xl border border-[#1A2233] bg-[#0B0E17] p-5 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-[#1A2233] bg-[#07090F] p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Total Shipments</span>
                  <Package className="h-4 w-4 text-cyan-400" />
                </div>
                <p className="mt-2 text-2xl font-bold text-white tabular-nums">
                  {shipments.length + 148}
                </p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#111623]">
                  <div className="h-full w-4/5 bg-cyan-400" />
                </div>
              </div>

              <div className="rounded-xl border border-[#1A2233] bg-[#07090F] p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Active Client Accounts</span>
                  <Users className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="mt-2 text-2xl font-bold text-white tabular-nums">
                  {activeAccounts + 24}
                </p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#111623]">
                  <div className="h-full w-3/4 bg-emerald-400" />
                </div>
              </div>

              <div className="rounded-xl border border-[#1A2233] bg-[#07090F] p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Pending Verification Requests</span>
                  <FileCheck2 className="h-4 w-4 text-amber-400" />
                </div>
                <p className="mt-2 text-2xl font-bold text-white tabular-nums">
                  {pendingCount}
                </p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#111623]">
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${Math.min(100, pendingCount * 28)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 30-Day Time-Series Shipment Volume Chart */}
            <div className="border-t border-[#1A2233] pt-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-cyan-400" />
                  <h3 className="font-display text-sm font-bold text-white">
                    30-Day Shipment Volume Trend
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400 tabular-nums">
                  Daily consignments dispatched
                </span>
              </div>
              <svg ref={trendSvgRef} className="w-full h-56" role="img" aria-label="30-day shipment volume chart" />
            </div>
          </div>

          <CloudflareAgentConsole />

          {/* Active Shipments & Pending Verification Queue */}
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="rounded-2xl border border-[#1A2233] bg-[#0B0E17] p-5 lg:col-span-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="font-display text-sm font-bold text-white">Recent Export Consignments</h3>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tracking or port..."
                    className="w-full rounded-lg border border-[#243047] bg-[#07090F] py-1.5 pl-8 pr-3 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#1A2233] text-slate-400">
                    <tr>
                      <th className="pb-2.5 font-semibold">Tracking</th>
                      <th className="pb-2.5 font-semibold">Client</th>
                      <th className="pb-2.5 font-semibold">Route</th>
                      <th className="pb-2.5 text-right font-semibold">Qty (Pcs)</th>
                      <th className="pb-2.5 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A2233]/70">
                    {filteredShipments.map((s) => (
                      <tr key={s.id} className="hover:bg-[#111623]/60">
                        <td className="py-3 font-mono font-semibold text-cyan-300">{s.trackingNumber}</td>
                        <td className="py-3 text-slate-200">{s.clientName}</td>
                        <td className="py-3 text-slate-400">
                          {s.originPort} → {s.destinationPort}
                        </td>
                        <td className="py-3 text-right font-mono tabular-nums text-slate-200">
                          {s.garmentQuantityPcs.toLocaleString()}
                        </td>
                        <td className="py-3 text-right font-medium text-emerald-300">{s.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-[#1A2233] bg-[#0B0E17] p-5 lg:col-span-4">
              <h3 className="font-display text-sm font-bold text-white mb-4">Verification Requests</h3>
              <div className="space-y-3">
                {verifications.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-xl border border-[#1A2233] bg-[#07090F] p-3.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{req.entityName}</span>
                      <span
                        className={`font-mono text-[11px] ${
                          req.status === 'Approved' ? 'text-emerald-400' : 'text-amber-300'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-400">
                      {req.documentType} · Submitted {req.submittedDate}
                    </p>
                    {req.status !== 'Approved' && (
                      <button
                        type="button"
                        onClick={() => approveVerification(req.id)}
                        className="mt-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/25"
                      >
                        Approve Document
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
