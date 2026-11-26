import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  QrCode, 
  UserCheck, 
  Globe, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Download, 
  Plus, 
  Search, 
  Copy, 
  Check, 
  CreditCard, 
  ExternalLink, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Award, 
  ArrowRight,
  FileText,
  Ship,
  CheckCircle2,
  RefreshCw,
  Zap,
  Camera,
  X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { db } from '../src/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';

export interface BusinessProfile {
  id: string;
  type: 'buyer' | 'supplier';
  companyName: string;
  shortCode?: string;
  binVatNumber?: string;
  registrationNumber?: string;
  contactName: string;
  designation: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  defaultIncoterms: string;
  defaultPaymentTerms: string;
  portOfDestination?: string;
  bankName?: string;
  bankBranch?: string;
  swiftCode?: string;
  accountNumber?: string;
  notes?: string;
  logoUrl?: string;
  status: 'Verified' | 'Pending' | 'VIP';
  createdAt?: any;
}

const DEFAULT_PROFILES: BusinessProfile[] = [
  {
    id: 'BUYER-KR-001',
    type: 'buyer',
    companyName: 'HANWHA GLOBAL TRADING CORP / SEOUL RETAIL CO.',
    shortCode: 'HANWHA-KR',
    binVatNumber: 'KR-TAX-104-81-01294',
    contactName: 'Mr. Min-Seok Park',
    designation: 'Procurement & Sourcing Director',
    email: 'sumon.hanwha@gmail.com',
    phone: '+82-2-729-1114',
    country: 'South Korea',
    city: 'Seoul',
    address: '86 Cheonggyecheon-ro, Jung-gu, Seoul 04541, Republic of Korea',
    defaultIncoterms: 'FOB Chittagong Port',
    defaultPaymentTerms: '100% Irrevocable Letter of Credit (L/C) at sight',
    portOfDestination: 'Busan Port (KRPUS), South Korea',
    bankName: 'Hana Bank Global Trade Center',
    bankBranch: 'Main Corporate Branch, Seoul',
    swiftCode: 'HNBNKRSE',
    accountNumber: '984-102938-44102',
    status: 'VIP',
    notes: 'Key South Korea retail partner for high-density 220 GSM crewneck t-shirts and hoodies.'
  },
  {
    id: 'BUYER-JP-002',
    type: 'buyer',
    companyName: 'TOKYO MERCHANDISING APPAREL GROUP',
    shortCode: 'TOKYO-JP',
    binVatNumber: 'JP-VAT-9010001092831',
    contactName: 'Kenji Takahashi',
    designation: 'Global Trade Sourcing Manager',
    email: 'sourcing@tokyo-merch.co.jp',
    phone: '+81-3-5456-7800',
    country: 'Japan',
    city: 'Tokyo',
    address: 'Shibuya Scramble Square 22F, Shibuya-ku, Tokyo 150-6122, Japan',
    defaultIncoterms: 'CIF Yokohama Port',
    defaultPaymentTerms: '30% Advance T/T, 70% against B/L Copy',
    portOfDestination: 'Yokohama Port (JPYOK), Japan',
    bankName: 'MUFG Bank Ltd',
    bankBranch: 'Shibuya Commercial Branch',
    swiftCode: 'BOTKJPJT',
    accountNumber: '001-98234-881',
    status: 'Verified',
    notes: 'Premium Japanese buyer for Oeko-Tex certified cotton knitwear and ribbed sweaters.'
  },
  {
    id: 'SUPPLIER-BD-101',
    type: 'supplier',
    companyName: 'RED BIRD INTERNATIONAL (FACTORY UNIT-2)',
    shortCode: 'REDBIRD-BD',
    binVatNumber: 'BIN: 002910394-0102',
    contactName: 'Sumon Hossain',
    designation: 'Managing Director / Operations Head',
    email: 'info@redbird-international.com',
    phone: '+880-1966-635-888',
    country: 'Bangladesh',
    city: 'Dhaka',
    address: 'Plot-100, Majar Chow Road, Uttarkhan Majhar, Uttarkhan, Dhaka-1230, Bangladesh',
    defaultIncoterms: 'FOB Chittagong Port',
    defaultPaymentTerms: '100% L/C at Sight',
    portOfDestination: 'Chittagong Port (BDCGP), Bangladesh',
    bankName: 'STANDARD ISLAMI BANK PLC',
    bankBranch: 'UTTARA MODEL TOWN BRANCH',
    swiftCode: 'STDISLBDDHK',
    accountNumber: '2019-100982-001',
    status: 'VIP',
    notes: 'Primary apparel manufacturing facility & export clearance hub in Uttarkhan, Dhaka.'
  }
];

interface TradeIdentityCardManagerProps {
  onSelectProfileForShipment?: (profile: BusinessProfile) => void;
  onSelectProfileForDocument?: (profile: BusinessProfile) => void;
  onNavigateTab?: (tab: string) => void;
}

export const TradeIdentityCardManager: React.FC<TradeIdentityCardManagerProps> = ({
  onSelectProfileForShipment,
  onSelectProfileForDocument,
  onNavigateTab
}) => {
  const [profiles, setProfiles] = useState<BusinessProfile[]>(DEFAULT_PROFILES);
  const [activeTypeTab, setActiveTypeTab] = useState<'all' | 'buyer' | 'supplier'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<BusinessProfile>(DEFAULT_PROFILES[0]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<BusinessProfile>>({
    type: 'buyer',
    companyName: '',
    shortCode: '',
    binVatNumber: '',
    contactName: '',
    designation: '',
    email: '',
    phone: '',
    country: 'South Korea',
    city: '',
    address: '',
    defaultIncoterms: 'FOB Chittagong Port',
    defaultPaymentTerms: '100% Irrevocable Letter of Credit (L/C) at sight',
    portOfDestination: 'Busan Port (KRPUS)',
    bankName: '',
    bankBranch: '',
    swiftCode: '',
    accountNumber: '',
    status: 'Verified',
    notes: ''
  });

  const cardRef = useRef<HTMLDivElement>(null);

  // Load from Firestore / LocalStorage
  useEffect(() => {
    if (!db) return;
    try {
      const q = query(collection(db, 'trade_identity_cards'), orderBy('companyName', 'asc'));
      const unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BusinessProfile));
          setProfiles(loaded);
          if (loaded.length > 0 && !selectedProfile) {
            setSelectedProfile(loaded[0]);
          }
        }
      }, (err) => {
        console.warn('Firestore trade_identity_cards listener error:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Could not initialize trade_identity_cards listener:', e);
    }
  }, []);

  const filteredProfiles = profiles.filter(p => {
    const matchesType = activeTypeTab === 'all' || p.type === activeTypeTab;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      p.companyName.toLowerCase().includes(q) ||
      p.contactName.toLowerCase().includes(q) ||
      p.country.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.id || '').toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.contactName) {
      alert('Please fill in Company Name and Contact Person.');
      return;
    }

    const newId = isEditing && formData.id ? formData.id : `${formData.type === 'buyer' ? 'BUYER' : 'SUPPLIER'}-${Date.now().toString().slice(-6)}`;
    const newRecord: BusinessProfile = {
      id: newId,
      type: formData.type || 'buyer',
      companyName: formData.companyName,
      shortCode: formData.shortCode || formData.companyName.slice(0, 10).toUpperCase(),
      binVatNumber: formData.binVatNumber || '',
      contactName: formData.contactName,
      designation: formData.designation || 'Director',
      email: formData.email || '',
      phone: formData.phone || '',
      country: formData.country || 'International',
      city: formData.city || '',
      address: formData.address || '',
      defaultIncoterms: formData.defaultIncoterms || 'FOB Chittagong Port',
      defaultPaymentTerms: formData.defaultPaymentTerms || '100% L/C at Sight',
      portOfDestination: formData.portOfDestination || 'Chittagong Port',
      bankName: formData.bankName || '',
      bankBranch: formData.bankBranch || '',
      swiftCode: formData.swiftCode || '',
      accountNumber: formData.accountNumber || '',
      status: formData.status || 'Verified',
      notes: formData.notes || ''
    };

    // Update Local State
    setProfiles(prev => {
      const idx = prev.findIndex(p => p.id === newId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newRecord;
        return copy;
      }
      return [newRecord, ...prev];
    });

    setSelectedProfile(newRecord);

    // Persist to Firestore
    if (db) {
      try {
        await setDoc(doc(db, 'trade_identity_cards', newId), {
          ...newRecord,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Failed to save trade card to Firestore:', err);
      }
    }

    setIsFormOpen(false);
    setIsEditing(false);
    setNotification(`Business Profile "${newRecord.companyName}" successfully saved!`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDeleteProfile = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this Business Profile Card?')) return;

    setProfiles(prev => prev.filter(p => p.id !== id));
    if (selectedProfile.id === id) {
      setSelectedProfile(profiles.find(p => p.id !== id) || DEFAULT_PROFILES[0]);
    }

    if (db) {
      try {
        await deleteDoc(doc(db, 'trade_identity_cards', id));
      } catch (err) {
        console.warn('Failed to delete trade card from Firestore:', err);
      }
    }

    setNotification('Business Profile deleted.');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDownloadCardPdf = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', [105, 65]); // Business card ISO size 105mm x 65mm
      pdf.addImage(imgData, 'PNG', 0, 0, 105, 65);
      pdf.save(`TradeCard_${selectedProfile.id}_${selectedProfile.companyName.slice(0, 15).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      setNotification('Digital Trade Pass PDF downloaded!');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Error generating card PDF:', err);
      alert('Could not export PDF. Please try again.');
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(field);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Generate verified QR Payload
  const qrPayload = JSON.stringify({
    id: selectedProfile.id,
    company: selectedProfile.companyName,
    taxId: selectedProfile.binVatNumber,
    contact: selectedProfile.contactName,
    email: selectedProfile.email,
    country: selectedProfile.country,
    port: selectedProfile.portOfDestination,
    incoterms: selectedProfile.defaultIncoterms,
    verifyUrl: `https://redbird-international.com/verify-profile?id=${selectedProfile.id}`
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Banner */}
      <header className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 font-black uppercase text-[10px] border border-red-100">
              Trade Identity & Compliance
            </span>
            <span>•</span>
            <span>Digital QR Pass Generator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
            <Building2 className="w-8 h-8 text-red-600" />
            <span>Business Profile & Digital Pass</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1 max-w-2xl leading-relaxed">
            Create verified trade identity cards for global buyers & factory suppliers with on-the-fly QR code verification. Auto-populate shipment profiles & export documents in 1-click.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            type="button"
            onClick={() => {
              setFormData({
                type: 'buyer',
                companyName: '',
                shortCode: '',
                binVatNumber: '',
                contactName: '',
                designation: '',
                email: '',
                phone: '',
                country: 'South Korea',
                city: '',
                address: '',
                defaultIncoterms: 'FOB Chittagong Port',
                defaultPaymentTerms: '100% Irrevocable Letter of Credit (L/C) at sight',
                portOfDestination: 'Busan Port (KRPUS)',
                bankName: '',
                bankBranch: '',
                swiftCode: '',
                accountNumber: '',
                status: 'Verified',
                notes: ''
              });
              setIsEditing(false);
              setIsFormOpen(true);
            }}
            className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-red-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={16} />
            <span>+ Create Business Pass</span>
          </button>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className="p-4 bg-emerald-900 text-white rounded-2xl border border-emerald-500 shadow-xl flex items-center justify-between text-xs font-bold animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-emerald-300 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Grid: Profiles List vs Active Trade Identity Card View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: Profile Selector & List (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-[2rem] border border-slate-200/90 shadow-sm space-y-4">
          
          {/* Type Tabs & Search */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTypeTab('all')}
                className={`py-2 rounded-xl transition-all ${
                  activeTypeTab === 'all' ? 'bg-slate-900 text-white font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({profiles.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTypeTab('buyer')}
                className={`py-2 rounded-xl transition-all ${
                  activeTypeTab === 'buyer' ? 'bg-red-600 text-white font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Buyers ({profiles.filter(p => p.type === 'buyer').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTypeTab('supplier')}
                className={`py-2 rounded-xl transition-all ${
                  activeTypeTab === 'supplier' ? 'bg-emerald-600 text-white font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Suppliers ({profiles.filter(p => p.type === 'supplier').length})
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search company, contact, or country..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>

          {/* Profiles Cards List */}
          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {filteredProfiles.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No matching profiles found. Click "+ Create Business Pass" to add one.
              </div>
            ) : (
              filteredProfiles.map(p => {
                const isSelected = selectedProfile?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProfile(p)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-[1.01]' 
                        : 'bg-slate-50/80 hover:bg-white border-slate-200/80 text-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          p.type === 'buyer' 
                            ? isSelected ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'
                            : isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {p.type}
                        </span>
                        {p.status && (
                          <span className={`text-[9px] font-bold ${isSelected ? 'text-amber-400' : 'text-slate-500'}`}>
                            • {p.status}
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-mono ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                        #{p.id}
                      </span>
                    </div>

                    <h3 className={`font-black text-xs uppercase tracking-tight mt-2 line-clamp-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                      {p.companyName}
                    </h3>

                    <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-slate-200/20">
                      <span className={isSelected ? 'text-slate-300 font-medium' : 'text-slate-600 font-medium'}>
                        👤 {p.contactName}
                      </span>
                      <span className={isSelected ? 'text-slate-400 font-bold' : 'text-slate-500 font-bold'}>
                        📍 {p.country}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Digital Pass Card Preview & Instant Actions (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {selectedProfile && (
            <>
              {/* DIGITAL TRADE PASS CARD CANVAS */}
              <div className="bg-slate-950 p-6 rounded-[2.5rem] shadow-2xl border border-slate-800 space-y-6 relative overflow-hidden">
                
                {/* Header Actions */}
                <div className="flex items-center justify-between text-white border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-200">
                      Digital Executive Pass Preview
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(selectedProfile);
                        setIsEditing(true);
                        setIsFormOpen(true);
                      }}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                      title="Edit Profile"
                    >
                      <Edit3 size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProfile(selectedProfile.id)}
                      className="p-2 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                      title="Delete Profile"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* THE PHYSICAL CARD UI (ISO Ratio Card Element) */}
                <div 
                  ref={cardRef}
                  className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-3xl p-6 border-2 border-amber-500/30 shadow-2xl relative overflow-hidden space-y-4"
                >
                  {/* Card Metallic Foil Effect Overlay */}
                  <div className="absolute -top-24 -right-24 w-60 h-60 bg-gradient-to-br from-amber-500/10 via-red-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
                  
                  {/* Top Bar: Hologram Badge & ID */}
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 p-0.5 shadow-lg shadow-red-600/30 shrink-0">
                        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-white text-base">
                          R
                        </div>
                      </div>
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-wider text-white">RED BIRD INTERNATIONAL</h2>
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 block">
                          VERIFIED GLOBAL TRADE PASS • {selectedProfile.type.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400/10 text-amber-300 border border-amber-400/30">
                        <ShieldCheck size={12} className="text-amber-400" />
                        <span>{selectedProfile.status}</span>
                      </span>
                      <p className="text-[10px] font-mono text-slate-400 mt-1">ID: {selectedProfile.id}</p>
                    </div>
                  </div>

                  {/* Body: Company Info vs QR Code */}
                  <div className="grid grid-cols-12 gap-4 items-center relative z-10 pt-2">
                    
                    {/* Company Details (8 Cols) */}
                    <div className="col-span-8 space-y-3">
                      <div>
                        <h3 className="text-base font-black text-white uppercase tracking-tight leading-snug">
                          {selectedProfile.companyName}
                        </h3>
                        {selectedProfile.binVatNumber && (
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {selectedProfile.binVatNumber}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Contact Person:</span>
                          <span className="font-bold text-slate-100 block">{selectedProfile.contactName}</span>
                          <span className="text-[10px] text-slate-400 block">{selectedProfile.designation}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Country / Location:</span>
                          <span className="font-bold text-slate-100 block">{selectedProfile.country}</span>
                          <span className="text-[10px] text-slate-400 block">{selectedProfile.city}</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-300 space-y-0.5 pt-1 border-t border-slate-800">
                        <p>📧 {selectedProfile.email}</p>
                        <p>📞 {selectedProfile.phone}</p>
                        <p>🚢 Preferred Port: <span className="text-amber-300 font-bold">{selectedProfile.portOfDestination || 'Chittagong BDCGP'}</span></p>
                      </div>
                    </div>

                    {/* QR Code Canvas (4 Cols) */}
                    <div className="col-span-4 flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-xl text-slate-950">
                      <QRCodeSVG
                        value={qrPayload}
                        size={110}
                        level="H"
                        includeMargin={false}
                        imageSettings={{
                          src: "https://redbird-international.com/favicon.ico",
                          x: undefined,
                          y: undefined,
                          height: 18,
                          width: 18,
                          excavate: true,
                        }}
                      />
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 mt-1.5 text-center">
                        SCAN TO VERIFY
                      </span>
                    </div>
                  </div>

                  {/* Card Footer: Terms & Verification Watermark */}
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-2 border-t border-slate-800/80 relative z-10">
                    <span>Terms: {selectedProfile.defaultIncoterms} • {selectedProfile.defaultPaymentTerms}</span>
                    <span className="text-amber-400 font-bold">RED BIRD OS VERIFIED</span>
                  </div>
                </div>

                {/* Card One-Click Action Trigger Strip */}
                <div className="space-y-3 pt-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Zap size={13} className="text-amber-400" />
                    <span>Instant Workflow Integrations (1-Click Pre-Fill)</span>
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={handleDownloadCardPdf}
                      className="p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all border border-slate-800 flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md"
                    >
                      <Download size={14} className="text-amber-400" />
                      <span>Download Pass PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectProfileForShipment?.(selectedProfile);
                        if (onNavigateTab) onNavigateTab('new-shipment');
                        setNotification(`Auto-populated shipment profile for ${selectedProfile.companyName}!`);
                      }}
                      className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md shadow-red-600/30"
                    >
                      <Ship size={14} />
                      <span>Fill Shipment Creator</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectProfileForDocument?.(selectedProfile);
                        if (onNavigateTab) onNavigateTab('documents');
                        setNotification(`Loaded ${selectedProfile.companyName} into Document Generator!`);
                      }}
                      className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md"
                    >
                      <FileText size={14} className="text-red-600" />
                      <span>Fill Document Generator</span>
                    </button>
                  </div>
                </div>

                {/* Profile Details Sheet */}
                <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-3 text-xs text-slate-300">
                  <h4 className="font-black text-white text-xs uppercase tracking-wide flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-red-500" /> Complete Banking & Logistics Specifications
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                    <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <p className="text-[9px] font-bold text-slate-500 uppercase">Bank & Remittance Details</p>
                      <p className="font-bold text-white">{selectedProfile.bankName || 'Not Specified'}</p>
                      <p className="text-slate-400">Branch: {selectedProfile.bankBranch || 'Main Branch'}</p>
                      <p className="text-slate-400 font-mono">SWIFT: {selectedProfile.swiftCode || 'N/A'}</p>
                      <p className="text-slate-400 font-mono">A/C: {selectedProfile.accountNumber || 'N/A'}</p>
                    </div>

                    <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <p className="text-[9px] font-bold text-slate-500 uppercase">Full Trade Address</p>
                      <p className="text-slate-200">{selectedProfile.address}</p>
                      <p className="text-slate-400">{selectedProfile.city}, {selectedProfile.country}</p>
                      {selectedProfile.notes && (
                        <p className="text-amber-300/80 italic mt-1 pt-1 border-t border-slate-800 text-[10px]">
                          Note: "{selectedProfile.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </>
          )}

        </div>
      </div>

      {/* CREATE / EDIT BUSINESS PROFILE MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in no-print">
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600 rounded-2xl flex items-center justify-center text-white font-black">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    {isEditing ? 'Edit Business Profile' : 'Create New Business Profile Card'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Generate persistent buyer or supplier data with an instant digital QR pass.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-bold text-slate-800">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Profile Category
                  </label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-red-600 outline-none"
                  >
                    <option value="buyer">Global Buyer / Consignee</option>
                    <option value="supplier">Factory Supplier / Vendor</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Verification Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-red-600 outline-none"
                  >
                    <option value="VIP">VIP Key Account</option>
                    <option value="Verified">Verified Official</option>
                    <option value="Pending">Pending Audit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Company Name (Full Legal Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HANWHA GLOBAL TRADING CORP"
                  value={formData.companyName}
                  onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-red-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    BIN / VAT / Tax ID Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. KR-TAX-104-81-01294"
                    value={formData.binVatNumber}
                    onChange={e => setFormData({ ...formData, binVatNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-red-600 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Short Code / Brand Alias
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HANWHA-KR"
                    value={formData.shortCode}
                    onChange={e => setFormData({ ...formData, shortCode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-red-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mr. Min-Seok Park"
                    value={formData.contactName}
                    onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-red-600 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Procurement Director"
                    value={formData.designation}
                    onChange={e => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-red-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Official Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="sumon.hanwha@gmail.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-red-600 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Direct Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="+82-2-729-1114"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-red-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. South Korea"
                    value={formData.country}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-red-600 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    City / Region
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Seoul"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-red-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Full Registered Street Address
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 86 Cheonggyecheon-ro, Jung-gu, Seoul 04541, Republic of Korea"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:ring-2 focus:ring-red-600 outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Preferred Incoterms
                  </label>
                  <select
                    value={formData.defaultIncoterms}
                    onChange={e => setFormData({ ...formData, defaultIncoterms: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-red-600 outline-none"
                  >
                    <option value="FOB Chittagong Port">FOB Chittagong Port</option>
                    <option value="CIF Destination Port">CIF Destination Port</option>
                    <option value="CFR Destination Port">CFR Destination Port</option>
                    <option value="EXW Factory Dhaka">EXW Factory Dhaka</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Port of Destination
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Busan Port (KRPUS)"
                    value={formData.portOfDestination}
                    onChange={e => setFormData({ ...formData, portOfDestination: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-red-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Default Payment Condition
                </label>
                <input
                  type="text"
                  placeholder="e.g. 100% Irrevocable Letter of Credit (L/C) at sight"
                  value={formData.defaultPaymentTerms}
                  onChange={e => setFormData({ ...formData, defaultPaymentTerms: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-red-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Hana Bank Global Trade Center"
                    value={formData.bankName}
                    onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-red-600 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    SWIFT Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HNBNKRSE"
                    value={formData.swiftCode}
                    onChange={e => setFormData({ ...formData, swiftCode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-red-600 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-600/30"
                >
                  Save Business Pass & QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeIdentityCardManager;
