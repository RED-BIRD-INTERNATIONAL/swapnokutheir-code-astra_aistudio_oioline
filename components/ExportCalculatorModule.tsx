import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Ship, 
  Plane, 
  Globe, 
  DollarSign, 
  ShieldCheck, 
  FileText, 
  Download, 
  Save, 
  Package, 
  Percent, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Boxes, 
  Anchor, 
  Scale, 
  ArrowRight,
  Sparkles,
  Info,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import jsPDF from 'jspdf';
import { db } from '../src/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface CountryTariffProfile {
  code: string;
  country: string;
  flag: string;
  mainPort: string;
  standardDutyPercent: number;
  preferentialDutyPercent: number; // e.g. APTA / GSP / EBA Certificate 0%
  dutyAgreementName: string;
  seaFreightPerCbm: number; // Sea LCL rate per CBM from Chittagong
  seaFcl20ftRate: number; // 20ft Container
  seaFcl40ftRate: number; // 40ft HC Container
  airFreightPerKg: number; // Air Cargo per KG
  avgTransitDaysSea: string;
  avgTransitDaysAir: string;
}

const DESTINATION_PROFILES: CountryTariffProfile[] = [
  {
    code: 'KR',
    country: 'South Korea',
    flag: '🇰🇷',
    mainPort: 'Busan Port (KRPUS)',
    standardDutyPercent: 13.0,
    preferentialDutyPercent: 0.0, // APTA Certificate of Origin
    dutyAgreementName: 'APTA (Asia-Pacific Trade Agreement - Form APTA)',
    seaFreightPerCbm: 42,
    seaFcl20ftRate: 850,
    seaFcl40ftRate: 1450,
    airFreightPerKg: 3.80,
    avgTransitDaysSea: '12 - 14 Days (Feeder via Singapore/Port Klang)',
    avgTransitDaysAir: '2 - 3 Days'
  },
  {
    code: 'JP',
    country: 'Japan',
    flag: '🇯🇵',
    mainPort: 'Yokohama Port (JPYOK)',
    standardDutyPercent: 8.4,
    preferentialDutyPercent: 0.0, // GSP Form A
    dutyAgreementName: 'Japan Generalized System of Preferences (GSP Form A)',
    seaFreightPerCbm: 48,
    seaFcl20ftRate: 920,
    seaFcl40ftRate: 1580,
    airFreightPerKg: 4.20,
    avgTransitDaysSea: '14 - 16 Days',
    avgTransitDaysAir: '2 - 3 Days'
  },
  {
    code: 'DE',
    country: 'Germany / European Union',
    flag: '🇩🇪',
    mainPort: 'Hamburg Port (DEHAM)',
    standardDutyPercent: 12.0,
    preferentialDutyPercent: 0.0, // EU GSP EBA (Everything But Arms)
    dutyAgreementName: 'EU GSP EBA (Everything But Arms - Rex System)',
    seaFreightPerCbm: 65,
    seaFcl20ftRate: 1650,
    seaFcl40ftRate: 2850,
    airFreightPerKg: 4.90,
    avgTransitDaysSea: '22 - 26 Days (Direct Ocean Corridor)',
    avgTransitDaysAir: '3 - 4 Days'
  },
  {
    code: 'US',
    country: 'United States',
    flag: '🇺🇸',
    mainPort: 'Port of Long Beach / Los Angeles (USLGB)',
    standardDutyPercent: 16.5,
    preferentialDutyPercent: 16.5, // Standard MFN Tariff
    dutyAgreementName: 'US MFN Standard Tariff (Harmonized Tariff Schedule)',
    seaFreightPerCbm: 75,
    seaFcl20ftRate: 1950,
    seaFcl40ftRate: 3400,
    airFreightPerKg: 5.80,
    avgTransitDaysSea: '28 - 34 Days (Transpacific)',
    avgTransitDaysAir: '3 - 5 Days'
  },
  {
    code: 'GB',
    country: 'United Kingdom',
    flag: '🇬🇧',
    mainPort: 'Felixstowe Port (GBFXT)',
    standardDutyPercent: 12.0,
    preferentialDutyPercent: 0.0, // UK DCTS
    dutyAgreementName: 'UK Developing Countries Trading Scheme (DCTS)',
    seaFreightPerCbm: 68,
    seaFcl20ftRate: 1720,
    seaFcl40ftRate: 2950,
    airFreightPerKg: 5.10,
    avgTransitDaysSea: '24 - 28 Days',
    avgTransitDaysAir: '3 - 4 Days'
  },
  {
    code: 'AE',
    country: 'United Arab Emirates',
    flag: '🇦🇪',
    mainPort: 'Jebel Ali Port, Dubai (AEJEA)',
    standardDutyPercent: 5.0,
    preferentialDutyPercent: 5.0, // GCC Standard Tariff
    dutyAgreementName: 'GCC Common External Tariff (CET)',
    seaFreightPerCbm: 38,
    seaFcl20ftRate: 720,
    seaFcl40ftRate: 1250,
    airFreightPerKg: 3.20,
    avgTransitDaysSea: '10 - 12 Days (Direct Gulf Route)',
    avgTransitDaysAir: '1 - 2 Days'
  }
];

export const ExportCalculatorModule: React.FC = () => {
  // Cargo Input States
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('KR');
  const [transportMode, setTransportMode] = useState<'sea_fcl_20' | 'sea_fcl_40' | 'sea_lcl' | 'air_cargo'>('sea_fcl_40');
  const [garmentCategory, setGarmentCategory] = useState<string>('Cotton T-Shirts & Hoodies');
  const [unitPriceUsd, setUnitPriceUsd] = useState<number>(4.80);
  const [totalQuantityPcs, setTotalQuantityPcs] = useState<number>(10000);
  
  // Packing & Carton Dimensions
  const [pcsPerCarton, setTotalPcsPerCarton] = useState<number>(50);
  const [cartonLengthCm, setCartonLengthCm] = useState<number>(60);
  const [cartonWidthCm, setCartonWidthCm] = useState<number>(40);
  const [cartonHeightCm, setCartonHeightCm] = useState<number>(35);
  const [netWeightPerPcsGrams, setNetWeightPerPcsGrams] = useState<number>(220); // 220 GSM

  // Trade Terms & Insurance
  const [applyPreferentialTariff, setApplyPreferentialTariff] = useState<boolean>(true);
  const [insuranceCoverage, setInsuranceCoverage] = useState<'none' | 'basic' | 'comprehensive'>('comprehensive');
  const [chittagongPortChargesUsd, setChittagongPortChargesUsd] = useState<number>(350); // Local port handling & EXP

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const selectedCountry = useMemo(() => {
    return DESTINATION_PROFILES.find(c => c.code === selectedCountryCode) || DESTINATION_PROFILES[0];
  }, [selectedCountryCode]);

  // DERIVED CARGO CALCULATIONS
  const calculatedMetrics = useMemo(() => {
    const totalCartons = Math.ceil(totalQuantityPcs / (pcsPerCarton || 1));
    const singleCartonCbm = (cartonLengthCm * cartonWidthCm * cartonHeightCm) / 1000000;
    const totalCbm = +(totalCartons * singleCartonCbm).toFixed(2);

    const totalNetWeightKg = +((totalQuantityPcs * netWeightPerPcsGrams) / 1000).toFixed(1);
    // Estimated Gross Weight adding 1.2kg carton box weight per carton
    const totalGrossWeightKg = +(totalNetWeightKg + (totalCartons * 1.2)).toFixed(1);
    const volumetricWeightKg = +((totalCbm * 1000) / 6).toFixed(1); // Standard Air/Sea ratio

    // FOB Cargo Value
    const totalFobValueUsd = +(totalQuantityPcs * unitPriceUsd).toFixed(2);

    // Freight Charge Calculation
    let freightCostUsd = 0;
    if (transportMode === 'sea_fcl_20') {
      freightCostUsd = selectedCountry.seaFcl20ftRate;
    } else if (transportMode === 'sea_fcl_40') {
      freightCostUsd = selectedCountry.seaFcl40ftRate;
    } else if (transportMode === 'sea_lcl') {
      freightCostUsd = Math.max(150, Math.round(totalCbm * selectedCountry.seaFreightPerCbm));
    } else if (transportMode === 'air_cargo') {
      const chargeableWeight = Math.max(totalGrossWeightKg, volumetricWeightKg);
      freightCostUsd = Math.round(chargeableWeight * selectedCountry.airFreightPerKg);
    }

    // Insurance Charge Calculation
    let insuranceCostUsd = 0;
    if (insuranceCoverage === 'basic') {
      insuranceCostUsd = +(totalFobValueUsd * 0.0035).toFixed(2); // 0.35%
    } else if (insuranceCoverage === 'comprehensive') {
      insuranceCostUsd = +(totalFobValueUsd * 0.0065).toFixed(2); // 0.65%
    }

    // CIF Value (FOB + Freight + Insurance)
    const totalCifValueUsd = +(totalFobValueUsd + freightCostUsd + insuranceCostUsd).toFixed(2);

    // Tariff & Customs Duty Calculation
    const effectiveDutyRatePercent = applyPreferentialTariff 
      ? selectedCountry.preferentialDutyPercent 
      : selectedCountry.standardDutyPercent;
    
    const estimatedDutyUsd = +(totalCifValueUsd * (effectiveDutyRatePercent / 100)).toFixed(2);

    // Total Landed Import/Export Value
    const totalLandedCostUsd = +(totalCifValueUsd + estimatedDutyUsd + chittagongPortChargesUsd).toFixed(2);
    const costPerPieceUsd = +(totalLandedCostUsd / (totalQuantityPcs || 1)).toFixed(2);
    const dutySavingsUsd = applyPreferentialTariff 
      ? +((totalCifValueUsd * (selectedCountry.standardDutyPercent / 100)) - estimatedDutyUsd).toFixed(2)
      : 0;

    return {
      totalCartons,
      totalCbm,
      totalNetWeightKg,
      totalGrossWeightKg,
      totalFobValueUsd,
      freightCostUsd,
      insuranceCostUsd,
      totalCifValueUsd,
      effectiveDutyRatePercent,
      estimatedDutyUsd,
      totalLandedCostUsd,
      costPerPieceUsd,
      dutySavingsUsd
    };
  }, [
    selectedCountry,
    transportMode,
    unitPriceUsd,
    totalQuantityPcs,
    pcsPerCarton,
    cartonLengthCm,
    cartonWidthCm,
    cartonHeightCm,
    netWeightPerPcsGrams,
    applyPreferentialTariff,
    insuranceCoverage,
    chittagongPortChargesUsd
  ]);

  // PDF QUOTATION EXPORT
  const handleExportPdfEstimate = () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Header Banner
      pdf.setFillColor(220, 38, 38); // Red Bird Brand Red
      pdf.rect(0, 0, 210, 30, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text('RED BIRD INTERNATIONAL - EXPORT COST ESTIMATE', 14, 15);
      pdf.setFontSize(9);
      pdf.text('Dhaka RMG Export Hub • Official Logistics Estimate', 14, 22);

      // Body Details
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(12);
      pdf.text(`Export Destination: ${selectedCountry.flag} ${selectedCountry.country} (${selectedCountry.mainPort})`, 14, 42);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Date: ${new Date().toLocaleDateString()} | Ref Estimate ID: EST-${Date.now().toString().slice(-6)}`, 14, 48);
      pdf.text(`Garment Type: ${garmentCategory} | Quantity: ${totalQuantityPcs.toLocaleString()} Pcs`, 14, 54);
      pdf.text(`Transport Mode: ${transportMode.toUpperCase()} | Total Cartons: ${calculatedMetrics.totalCartons} | Total Volume: ${calculatedMetrics.totalCbm} CBM`, 14, 60);

      // Breakdown Box
      pdf.setFillColor(248, 250, 252);
      pdf.rect(14, 68, 182, 100, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(14, 68, 182, 100, 'S');

      pdf.setFont('helvetica', 'bold');
      pdf.text('FINANCIAL COST & TARIFF BREAKDOWN ($ USD)', 20, 78);
      
      pdf.setFont('helvetica', 'normal');
      let y = 88;
      const addRow = (label: string, value: string, bold: boolean = false) => {
        if (bold) pdf.setFont('helvetica', 'bold');
        else pdf.setFont('helvetica', 'normal');
        pdf.text(label, 20, y);
        pdf.text(value, 160, y, { align: 'right' });
        y += 8;
      };

      addRow('1. FOB Cargo Value (Free on Board):', `$${calculatedMetrics.totalFobValueUsd.toLocaleString()}`);
      addRow('2. Ocean / Air Freight Charges:', `$${calculatedMetrics.freightCostUsd.toLocaleString()}`);
      addRow('3. Marine Cargo Insurance Coverage:', `$${calculatedMetrics.insuranceCostUsd.toLocaleString()}`);
      addRow('Total CIF Value (FOB + Freight + Insurance):', `$${calculatedMetrics.totalCifValueUsd.toLocaleString()}`, true);
      addRow(`4. Customs Duty (${calculatedMetrics.effectiveDutyRatePercent}% - ${selectedCountry.dutyAgreementName}):`, `$${calculatedMetrics.estimatedDutyUsd.toLocaleString()}`);
      addRow('5. Chittagong Port Local Charges & EXP:', `$${chittagongPortChargesUsd.toLocaleString()}`);
      
      pdf.setDrawColor(220, 38, 38);
      pdf.line(20, y + 2, 180, y + 2);
      y += 10;

      addRow('ESTIMATED TOTAL LANDED EXPORT COST:', `$${calculatedMetrics.totalLandedCostUsd.toLocaleString()}`, true);
      addRow('EFFECTIVE COST PER UNIT / PIECE:', `$${calculatedMetrics.costPerPieceUsd} / Pc`, true);

      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Estimated Transit Corridor: ${selectedCountry.avgTransitDaysSea}`, 14, 185);
      if (calculatedMetrics.dutySavingsUsd > 0) {
        pdf.text(`Preferential Certificate Savings (APTA/GSP): $${calculatedMetrics.dutySavingsUsd.toLocaleString()} USD saved in tariffs!`, 14, 190);
      }

      pdf.save(`Export_Estimate_${selectedCountry.code}_${totalQuantityPcs}Pcs.pdf`);
      setNotification('Export Quotation Estimate PDF downloaded!');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Error exporting PDF estimate:', err);
      alert('Could not export PDF. Please try again.');
    }
  };

  // SAVE ESTIMATE TO FIRESTORE
  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    try {
      const record = {
        countryCode: selectedCountryCode,
        countryName: selectedCountry.country,
        destinationPort: selectedCountry.mainPort,
        garmentCategory,
        quantityPcs: totalQuantityPcs,
        fobValueUsd: calculatedMetrics.totalFobValueUsd,
        freightCostUsd: calculatedMetrics.freightCostUsd,
        cifValueUsd: calculatedMetrics.totalCifValueUsd,
        dutyAmountUsd: calculatedMetrics.estimatedDutyUsd,
        totalLandedCostUsd: calculatedMetrics.totalLandedCostUsd,
        costPerPieceUsd: calculatedMetrics.costPerPieceUsd,
        transportMode,
        createdAt: serverTimestamp()
      };

      if (db) {
        await addDoc(collection(db, 'export_calculations'), record);
      }

      setNotification('Export calculation saved to database history!');
      setTimeout(() => setNotification(null), 3500);
    } catch (err) {
      console.warn('Failed to save calculation:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <header className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 font-black uppercase text-[10px] border border-red-100">
              Trade Finance & Logistics Engine
            </span>
            <span>•</span>
            <span>Chittagong BDCGP & Global Ports</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
            <Calculator className="w-8 h-8 text-red-600" />
            <span>Export Freight, Tariff & Duty Calculator</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1 max-w-2xl leading-relaxed">
            Estimate sea/air freight costs, APTA/GSP customs tariffs, marine cargo insurance, and landed cost per unit based on shipment volume, carton dimensions, and destination port.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            type="button"
            onClick={handleSaveToDatabase}
            disabled={isSaving}
            className="px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Save size={15} className="text-emerald-400" />
            <span>{isSaving ? 'Saving...' : 'Save Estimate'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdfEstimate}
            className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-red-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Download size={16} />
            <span>Download Quotation PDF</span>
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {notification && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between text-xs font-bold animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
        </div>
      )}

      {/* Main Grid: Inputs Form (7 Cols) vs Dynamic Real-time Calculations (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: PARAMETER INPUTS (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200/90 shadow-sm space-y-6">
          
          {/* Section 1: Destination & Transport Corridor */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Globe className="w-4 h-4 text-red-600" /> 1. Export Destination & Corridor
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Destination Country
                </label>
                <select
                  value={selectedCountryCode}
                  onChange={e => setSelectedCountryCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-red-600 outline-none cursor-pointer"
                >
                  {DESTINATION_PROFILES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.country} ({c.mainPort})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Transport Logistics Mode
                </label>
                <select
                  value={transportMode}
                  onChange={e => setTransportMode(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-red-600 outline-none cursor-pointer"
                >
                  <option value="sea_fcl_40">🚢 Sea Ocean Freight - 40FT High Cube FCL</option>
                  <option value="sea_fcl_20">🚢 Sea Ocean Freight - 20FT Standard FCL</option>
                  <option value="sea_lcl">📦 Sea Consolidation - LCL Per CBM</option>
                  <option value="air_cargo">✈️ Air Express Cargo - Per KG</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Garment Category, Unit Price & Volume */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Package className="w-4 h-4 text-red-600" /> 2. Cargo Consignment Volume & Value
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Garment Category Description
                </label>
                <input
                  type="text"
                  value={garmentCategory}
                  onChange={e => setGarmentCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-red-600 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  FOB Unit Price ($ USD)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={unitPriceUsd}
                  onChange={e => setUnitPriceUsd(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-red-600 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Total Order Pieces (Pcs)
                </label>
                <input
                  type="number"
                  step="500"
                  value={totalQuantityPcs}
                  onChange={e => setTotalQuantityPcs(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-red-600 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Pcs Per Carton Box
                </label>
                <input
                  type="number"
                  value={pcsPerCarton}
                  onChange={e => setTotalPcsPerCarton(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-red-600 outline-none"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Single Garment Weight (GSM/g)
                </label>
                <input
                  type="number"
                  step="10"
                  value={netWeightPerPcsGrams}
                  onChange={e => setNetWeightPerPcsGrams(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-red-600 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Master Carton Dimensions (CBM Matrix) */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Boxes className="w-4 h-4 text-red-600" /> 3. Master Carton Dimensions (CBM & Weight)
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Length (cm)</label>
                <input
                  type="number"
                  value={cartonLengthCm}
                  onChange={e => setCartonLengthCm(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Width (cm)</label>
                <input
                  type="number"
                  value={cartonWidthCm}
                  onChange={e => setCartonWidthCm(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={cartonHeightCm}
                  onChange={e => setCartonHeightCm(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>
            </div>

            {/* CBM Real-time Pill */}
            <div className="p-3 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-between text-xs font-bold text-red-900">
              <span>Total Calculated Cartons: <strong className="font-black text-red-700">{calculatedMetrics.totalCartons} Cartons</strong></span>
              <span>Total Volume: <strong className="font-black text-red-700">{calculatedMetrics.totalCbm} CBM</strong></span>
              <span>Est. Gross Weight: <strong className="font-black text-red-700">{calculatedMetrics.totalGrossWeightKg} KG</strong></span>
            </div>
          </div>

          {/* Section 4: Tariff Preferences & Marine Insurance */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <ShieldCheck className="w-4 h-4 text-red-600" /> 4. Tariff Agreements & Insurance
            </h3>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 cursor-pointer hover:bg-slate-100/60 transition-all">
                <input
                  type="checkbox"
                  checked={applyPreferentialTariff}
                  onChange={e => setApplyPreferentialTariff(e.target.checked)}
                  className="mt-1 rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-black text-slate-900 block">
                    Apply Preferential Trade Agreement ({selectedCountry.dutyAgreementName})
                  </span>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    Reduces customs duty rate from {selectedCountry.standardDutyPercent}% down to <strong className="text-emerald-600 font-black">{selectedCountry.preferentialDutyPercent}%</strong> with official Form APTA / GSP Certificate.
                  </span>
                </div>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Marine Cargo Insurance
                  </label>
                  <select
                    value={insuranceCoverage}
                    onChange={e => setInsuranceCoverage(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-red-600 outline-none"
                  >
                    <option value="comprehensive">Comprehensive All-Risks (0.65%)</option>
                    <option value="basic">Basic Marine Cargo (0.35%)</option>
                    <option value="none">No Insurance (Buyer Risk)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Chittagong Port & Local EXP Charges ($)
                  </label>
                  <input
                    type="number"
                    value={chittagongPortChargesUsd}
                    onChange={e => setChittagongPortChargesUsd(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-red-600 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: DYNAMIC CALCULATED RESULTS SHEET (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-slate-950 text-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-200">
                  Calculated Export Summary
                </span>
              </div>
              <span className="text-xs font-black text-amber-400 bg-amber-950/60 border border-amber-500/30 px-3 py-1 rounded-full">
                {selectedCountry.flag} {selectedCountry.code}
              </span>
            </div>

            {/* Total Landed Cost Headline */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-3xl border border-red-500/30 text-center space-y-1 shadow-inner">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                ESTIMATED TOTAL LANDED COST
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight text-red-500 font-mono">
                ${calculatedMetrics.totalLandedCostUsd.toLocaleString()} <span className="text-xs text-slate-400">USD</span>
              </h2>
              <p className="text-xs font-bold text-amber-300 pt-1">
                Cost Per Unit: <strong className="text-white text-sm font-black">${calculatedMetrics.costPerPieceUsd} USD / Piece</strong>
              </p>
            </div>

            {/* Itemized Cost Breakdown List */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-slate-800/80">
                <span className="text-slate-400">FOB Cargo Value ({totalQuantityPcs.toLocaleString()} Pcs @ ${unitPriceUsd}):</span>
                <span className="font-bold text-white font-mono">${calculatedMetrics.totalFobValueUsd.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Ocean / Air Freight ({transportMode}):</span>
                <span className="font-bold text-white font-mono">${calculatedMetrics.freightCostUsd.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Marine Insurance Premium:</span>
                <span className="font-bold text-white font-mono">${calculatedMetrics.insuranceCostUsd.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center py-2 bg-slate-900/90 px-3 rounded-xl border border-slate-800 font-bold">
                <span className="text-amber-300">Total CIF Value (FOB + Freight + Ins.):</span>
                <span className="text-amber-300 font-mono">${calculatedMetrics.totalCifValueUsd.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Customs Duty ({calculatedMetrics.effectiveDutyRatePercent}% Rate):</span>
                <span className="font-bold text-white font-mono">${calculatedMetrics.estimatedDutyUsd.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Port Handling & Clearing Charges:</span>
                <span className="font-bold text-white font-mono">${chittagongPortChargesUsd.toLocaleString()}</span>
              </div>
            </div>

            {/* Preferential Duty Savings Pill */}
            {calculatedMetrics.dutySavingsUsd > 0 && (
              <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs font-bold space-y-1">
                <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-emerald-400">
                  <Sparkles size={13} />
                  <span>Preferential Tariff Savings Unlocked</span>
                </div>
                <p>
                  By using <strong className="text-white">{selectedCountry.dutyAgreementName}</strong>, you save <strong className="text-white font-black">${calculatedMetrics.dutySavingsUsd.toLocaleString()} USD</strong> in import tariffs!
                </p>
              </div>
            )}

            {/* Logistics Corridor Summary */}
            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 text-[11px] text-slate-300 space-y-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                Corridor Shipping Advice
              </span>
              <p>📍 <strong>Departure:</strong> Chittagong Port (BDCGP), Bangladesh</p>
              <p>📍 <strong>Discharge:</strong> {selectedCountry.mainPort}</p>
              <p>⏱️ <strong>Est. Transit Time:</strong> {selectedCountry.avgTransitDaysSea}</p>
            </div>

            {/* Actions */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleExportPdfEstimate}
                className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Download size={15} />
                <span>Export Official Quotation PDF</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default ExportCalculatorModule;
