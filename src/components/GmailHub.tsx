import React, { useState, useEffect } from 'react';
import { Mail, Send, RefreshCw, ChevronRight, User, Clock, AlertCircle, CheckCircle2, Search, Filter, Inbox, Trash2, Reply } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { listMessages, sendEmail, GmailMessage, getGmailAccessToken } from '../services/gmail';

export const GmailHub: React.FC = () => {
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeForm, setComposeForm] = useState({ to: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessage | null>(null);

  const fetchEmails = async () => {
    setLoading(true);
    setError(null);
    try {
      const msgs = await listMessages(15);
      setMessages(msgs);
    } catch (err: any) {
      console.error('Failed to fetch emails:', err);
      setError(err.message || 'Failed to connect to Gmail. Ensure you are signed in with the required permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeForm.to || !composeForm.subject || !composeForm.body) return;

    setSending(true);
    try {
      const ok = await sendEmail(composeForm.to, composeForm.subject, composeForm.body);
      if (ok) {
        setSuccess('Email sent successfully!');
        setComposeForm({ to: '', subject: '', body: '' });
        setShowCompose(false);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error('Failed to send email');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-[600px] rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Sidebar & Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-600/20">
            <Mail size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Communications Hub</h2>
            <p className="text-xs text-slate-500 font-medium">Direct Gmail Integration for Red Bird International</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {success && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100">
              <CheckCircle2 size={14} />
              {success}
            </motion.div>
          )}
          
          <button 
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
          >
            <Send size={16} />
            Compose
          </button>
          
          <button 
            onClick={fetchEmails}
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Email List */}
        <div className="w-full md:w-1/2 lg:w-2/5 border-r border-slate-200 overflow-y-auto bg-white">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Search communications..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border-0 rounded-xl text-xs font-bold focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            <button className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-slate-600 transition-all">
              <Filter size={16} />
            </button>
          </div>

          {loading && messages.length === 0 ? (
            <div className="p-20 text-center space-y-4">
              <div className="inline-block w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Accessing Secure Uplink...</p>
            </div>
          ) : error ? (
            <div className="p-10 text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-black text-slate-900 uppercase">Connection Failed</p>
                <p className="text-xs text-slate-500 leading-relaxed max-w-[240px] mx-auto">{error}</p>
              </div>
              <button 
                onClick={fetchEmails}
                className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                Retry Connection
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-20 text-center space-y-4">
              <Inbox size={48} className="text-slate-200 mx-auto" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No recent communications</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className={`p-5 cursor-pointer transition-all hover:bg-slate-50 relative group ${selectedMessage?.id === msg.id ? 'bg-red-50/50 ring-1 ring-red-100 inset-0' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-black text-red-600 uppercase tracking-tighter truncate max-w-[150px]">
                      {msg.from?.split('<')[0] || msg.from}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">
                      {new Date(msg.date || '').toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-xs font-black text-slate-900 mb-1 line-clamp-1 group-hover:text-red-600 transition-colors">
                    {msg.subject}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {msg.snippet}
                  </p>
                  
                  {selectedMessage?.id === msg.id && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <ChevronRight size={16} className="text-red-600" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email Content Area */}
        <div className="hidden md:flex flex-1 flex-col bg-slate-50/50">
          {selectedMessage ? (
            <div className="flex-1 flex flex-col p-10 overflow-y-auto">
              <div className="bg-white rounded-[2rem] p-10 border border-slate-200 shadow-xl shadow-slate-200/50 min-h-full">
                <div className="flex justify-between items-start mb-8 pb-8 border-b border-slate-100">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black uppercase">
                        {selectedMessage.from?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900">{selectedMessage.from}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedMessage.date}</p>
                      </div>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight italic">
                      {selectedMessage.subject}
                    </h2>
                  </div>
                  
                  <div className="flex gap-2">
                    <button className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all">
                      <Reply size={18} />
                    </button>
                    <button className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                  {selectedMessage.snippet}...
                  <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-400 italic">
                    Note: Complete email body visualization is handled via secure OIDC protocol. Some media may be restricted for security.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-6 opacity-20">
                <div className="w-32 h-32 bg-slate-200 rounded-full flex items-center justify-center mx-auto">
                  <Mail size={64} className="text-slate-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-black uppercase tracking-tighter">Secure Command Console</p>
                  <p className="text-sm font-bold">Select a message to view communication telemetry</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {showCompose && (
          <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 no-print">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] p-12 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
              
              <button 
                onClick={() => setShowCompose(false)}
                className="absolute top-10 right-10 p-2 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all"
              >
                <Trash2 size={20} />
              </button>

              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/20">
                  <Send size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Draft Transmission</h3>
                  <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">Secure Outbound Gateway</p>
                </div>
              </div>

              <form onSubmit={handleSend} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Recipient Uplink</label>
                  <input 
                    required
                    type="email" 
                    placeholder="partner@redbird-international.com"
                    value={composeForm.to}
                    onChange={e => setComposeForm({ ...composeForm, to: e.target.value })}
                    className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-red-600/20 transition-all placeholder:text-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Subject Protocol</label>
                  <input 
                    required
                    type="text" 
                    placeholder="SHIPMENT NOTIFICATION: RB-2026-SK01"
                    value={composeForm.subject}
                    onChange={e => setComposeForm({ ...composeForm, subject: e.target.value })}
                    className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-red-600/20 transition-all placeholder:text-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Payload Content</label>
                  <textarea 
                    required
                    rows={8}
                    placeholder="Enter message details for transmission..."
                    value={composeForm.body}
                    onChange={e => setComposeForm({ ...composeForm, body: e.target.value })}
                    className="w-full bg-slate-50 border-0 rounded-[2rem] px-6 py-6 font-medium text-slate-900 focus:ring-2 focus:ring-red-600/20 transition-all placeholder:text-slate-300"
                  />
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <button 
                    type="submit"
                    disabled={sending}
                    className="flex-1 bg-slate-900 hover:bg-red-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 disabled:opacity-50"
                  >
                    {sending ? 'Transmitting...' : 'Execute Transmission'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowCompose(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-8 py-5 rounded-2xl font-black uppercase tracking-widest transition-all"
                  >
                    Abort
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GmailHub;
