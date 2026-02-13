
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar as CalendarIcon, 
  Newspaper, 
  MessageSquare, 
  Upload, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpRight, 
  TrendingUp, 
  BrainCircuit, 
  Loader2, 
  FileText, 
  Image as ImageIcon, 
  X,
  Zap,
  Activity,
  ShieldAlert,
  Tag,
  Target,
  BarChart3,
  Percent,
  Plus,
  Trash2,
  Telescope,
  Clock,
  Info,
  Save,
  CheckCircle2,
  AlertTriangle,
  Award,
  Camera,
  ScanLine,
  Menu,
  LogOut,
  User
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ScatterChart, Scatter, ZAxis, Cell, PieChart, Pie, Cell as PieCell
} from 'recharts';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, getDay } from 'date-fns';

import { Deal, DealAnnotation, DealWithAnnotation, TradingStats, AppView, ChatMessage, NewsItem, TradingPlan, TraderScore, CorrelationAnalysis } from './types';
import { parseDeals, calculateStats, getEquityCurveData, getSymbolPerformanceData } from './utils';
import { generateTradingInsights, analyzeSingleTrade, fetchFinancialNews, diagnoseRisk, generateIronManLogo, checkCorrelation, parseTradeFromImage } from './services/geminiService';
import { supabase } from './services/supabase';
import { Auth } from './components/Auth';

const TACTICAL_SHORTCUTS = [
  { label: '突破回測', type: 'tech' },
  { label: '假突破回測', type: 'tech' },
  { label: '618', type: 'tech' },
  { label: '橫行突破', type: 'tech' },
  { label: '橫行假突破', type: 'tech' },
  { label: '大圖大位', type: 'tech' },
  { label: '旗型突破', type: 'tech' },
  { label: 'Stop order突破', type: 'tech' },
  { label: '禁區', type: 'tech' },
  { label: '禁區換手', type: 'tech' },
  { label: '報復性交易', type: 'risk' },
  { label: 'FOMO', type: 'risk' },
  { label: '賭博', type: 'risk' }
];

// --- Shared Components ---

// Responsive NavButton
const NavButton = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full p-4 rounded-2xl flex items-center transition-all duration-300 group ${
      active ? 'bg-white text-black shadow-xl scale-105' : 'text-[#86868b] hover:bg-white/5 hover:text-white'
    } justify-center lg:justify-start gap-0 lg:gap-4`}
  >
    <span className={active ? 'text-black' : 'text-[#86868b] group-hover:text-white transition-colors'}>{icon}</span>
    <span className="text-xs font-bold tracking-widest uppercase hidden lg:block">{label}</span>
  </button>
);

const KPICard = ({ title, value, sub, icon, trend }: { title: string, value: string, sub?: string, icon: React.ReactNode, trend?: number }) => (
  <div className="glass-panel p-6 rounded-[32px] border border-white/5 shadow-xl hover:border-red-600/30 transition-colors group relative overflow-hidden">
    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity scale-150">{icon}</div>
    <div className="flex justify-between items-start mb-4">
       <div className="p-3 bg-white/5 rounded-2xl text-[#86868b] group-hover:text-white transition-colors">{icon}</div>
       {trend && (
         <div className={`px-2 py-1 rounded-lg text-[10px] font-bold ${trend > 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
           {trend > 0 ? '+TREND' : '-Drawdown'}
         </div>
       )}
    </div>
    <h4 className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest mb-1">{title}</h4>
    <div className="text-3xl font-black text-white tracking-tight">{value}</div>
    {sub && <div className="text-[10px] text-[#86868b] font-medium mt-2">{sub}</div>}
  </div>
);

const ScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#1c1c1e]/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
        <p className="text-xs font-bold text-white mb-1">{data.name}</p>
        <p className="text-[10px] text-[#86868b]">Vol: {data.volume} | P&L: <span className={data.pl > 0 ? 'text-green-500' : 'text-red-500'}>${data.pl}</span></p>
      </div>
    );
  }
  return null;
};

// Branding: Dynamic K Trading Journal with AI Generated Logo
const BrandHeader = ({ logoUrl }: { logoUrl: string | null }) => (
  <div className="flex items-center justify-center lg:justify-start gap-4">
    <div className="relative flex-shrink-0">
      <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#1c1c1e] flex items-center justify-center">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt="AI Generated Logo" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="animate-pulse">
            <Zap className="text-red-600/50" size={24} />
          </div>
        )}
      </div>
      <div className="absolute -bottom-1 -right-1 w-3 h-3 lg:w-4 lg:h-4 bg-red-600 rounded-full border-2 border-black animate-pulse"></div>
    </div>
    <div className="hidden lg:block">
      <h2 className="text-xl font-bold tracking-tight text-white leading-none">K Journal</h2>
      <p className="text-[10px] text-[#86868b] font-bold uppercase tracking-widest mt-1">Jarvis System 5.0</p>
    </div>
  </div>
);

// --- Manual Entry Modal ---
const ManualEntryModal = ({ onClose, onSave }: { onClose: () => void, onSave: (deal: Deal) => void }) => {
  const [formData, setFormData] = useState({
    symbol: '',
    direction: 'Buy',
    entryPrice: '',
    closingPrice: '',
    volume: '',
    netPL: '',
    time: format(new Date(), 'yyyy-MM-ddTHH:mm')
  });

  const handleSubmit = () => {
    if (!formData.symbol || !formData.entryPrice || !formData.closingPrice || !formData.netPL) return;
    
    const timeDate = new Date(formData.time);
    const deal: Deal = {
      id: `manual-${Date.now()}`, // Temporary ID, Supabase generates UUID
      symbol: formData.symbol.toUpperCase(),
      direction: formData.direction as 'Buy' | 'Sell',
      time: timeDate,
      entryPrice: parseFloat(formData.entryPrice),
      closingPrice: parseFloat(formData.closingPrice),
      volume: parseFloat(formData.volume || '0'),
      netPL: parseFloat(formData.netPL),
      balance: 0, 
      exitEfficiency: 0
    };
    onSave(deal);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#1c1c1e] w-full max-w-lg rounded-[40px] border border-white/10 shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black text-white italic">MANUAL ENTRY</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#86868b] uppercase">Asset Symbol</label>
            <input 
              type="text" 
              placeholder="e.g. XAUUSD"
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-red-600 outline-none font-bold uppercase"
              value={formData.symbol}
              onChange={e => setFormData({...formData, symbol: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#86868b] uppercase">Direction</label>
            <div className="flex bg-black/40 rounded-xl p-1 border border-white/10">
              {['Buy', 'Sell'].map(dir => (
                <button 
                  key={dir}
                  onClick={() => setFormData({...formData, direction: dir})}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.direction === dir ? (dir === 'Buy' ? 'bg-green-600 text-white' : 'bg-red-600 text-white') : 'text-[#86868b]'}`}
                >
                  {dir}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#86868b] uppercase">Entry Price</label>
            <input 
              type="number" 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-red-600 outline-none"
              value={formData.entryPrice}
              onChange={e => setFormData({...formData, entryPrice: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#86868b] uppercase">Exit Price</label>
            <input 
              type="number" 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-red-600 outline-none"
              value={formData.closingPrice}
              onChange={e => setFormData({...formData, closingPrice: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#86868b] uppercase">Volume (Lots)</label>
            <input 
              type="number" 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-red-600 outline-none"
              value={formData.volume}
              onChange={e => setFormData({...formData, volume: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#86868b] uppercase">Net P&L ($)</label>
            <input 
              type="number" 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-red-600 outline-none"
              value={formData.netPL}
              onChange={e => setFormData({...formData, netPL: e.target.value})}
            />
          </div>
          <div className="col-span-2 space-y-2">
            <label className="text-[10px] font-bold text-[#86868b] uppercase">Close Time</label>
            <input 
              type="datetime-local" 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-red-600 outline-none"
              value={formData.time}
              onChange={e => setFormData({...formData, time: e.target.value})}
            />
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          className="w-full py-4 bg-white text-black rounded-2xl font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <Save size={18} /> Record Trade
        </button>
      </div>
    </div>
  );
};

// --- Trader Score Card Component ---
const TraderScoreCard = ({ stats }: { stats: TradingStats }) => {
  const score = useMemo(() => {
    // 1. Performance (40pts)
    const winRateScore = Math.min(40, (stats.winRate / 100) * 40 * 1.5); // 50% wr -> 30pts
    
    // 2. Efficiency (30pts)
    // Good PF > 1.5. Max score at PF 3.0
    const pfScore = Math.min(30, (stats.profitFactor / 3) * 30);
    
    // 3. Discipline (30pts) - Penalty for big losses
    const rrRatio = Math.abs(stats.averageWin / (stats.averageLoss || 1));
    const disciplineScore = Math.min(30, rrRatio * 15); // 2.0 R:R = 30pts

    const total = Math.round(winRateScore + pfScore + disciplineScore);
    
    let grade: TraderScore['grade'] = 'F';
    if (total >= 95) grade = 'S';
    else if (total >= 85) grade = 'A';
    else if (total >= 75) grade = 'B';
    else if (total >= 60) grade = 'C';
    else if (total >= 50) grade = 'D';

    return { total, grade, winRateScore, pfScore, disciplineScore };
  }, [stats]);

  const gradeColor = {
    'S': 'text-yellow-400',
    'A': 'text-purple-400',
    'B': 'text-blue-400',
    'C': 'text-green-400',
    'D': 'text-orange-400',
    'F': 'text-red-600'
  };

  return (
    <div className="glass-panel p-8 rounded-[40px] relative overflow-hidden flex flex-col justify-between h-[450px] shadow-2xl border border-white/5 group">
      <div className="absolute top-0 right-0 p-8 opacity-10"><Award size={140} /></div>
      
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Award size={20} className={gradeColor[score.grade]} />
          <h3 className="text-sm font-bold text-[#86868b] uppercase tracking-[0.2em]">Trader Grade</h3>
        </div>
        <div className={`text-8xl font-black tracking-tighter ${gradeColor[score.grade]} drop-shadow-2xl`}>
          {score.grade}
        </div>
        <div className="text-xl font-bold text-white mt-2 flex items-baseline gap-2">
          Score: {score.total} <span className="text-xs text-[#86868b] font-normal uppercase tracking-widest">/ 100</span>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-xs font-bold mb-2">
            <span className="text-[#86868b]">WIN RATE IMPACT</span>
            <span className="text-white">{Math.round(score.winRateScore)}/40</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${(score.winRateScore/40)*100}%` }}></div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-xs font-bold mb-2">
            <span className="text-[#86868b]">PROFIT FACTOR</span>
            <span className="text-white">{Math.round(score.pfScore)}/30</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${(score.pfScore/30)*100}%` }}></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-bold mb-2">
            <span className="text-[#86868b]">DISCIPLINE (R:R)</span>
            <span className="text-white">{Math.round(score.disciplineScore)}/30</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${(score.disciplineScore/30)*100}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Correlation Monitor Component ---
const CorrelationMonitor = ({ activeAssets }: { activeAssets: string[] }) => {
  const [analysis, setAnalysis] = useState<CorrelationAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeAssets.length > 1) {
      setLoading(true);
      checkCorrelation(activeAssets).then(res => {
        setAnalysis(res);
        setLoading(false);
      });
    }
  }, [activeAssets.join(',')]); // Re-run when assets change

  if (activeAssets.length < 2) return null;

  return (
    <div className="glass-panel p-6 rounded-[32px] border border-white/5 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <Activity size={20} className="text-[#86868b]" />
        <h3 className="text-xs font-bold text-[#86868b] uppercase tracking-widest">Risk Exposure Monitor</h3>
      </div>
      
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-[#86868b] animate-pulse">
          <Loader2 size={14} className="animate-spin" /> Analyzing asset correlations...
        </div>
      ) : analysis?.hasRisk ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-4">
          <AlertTriangle className="text-red-500 flex-shrink-0" size={24} />
          <div>
            <h4 className="text-white font-bold text-sm mb-1">High Correlation Detected</h4>
            <p className="text-xs text-red-200/80 leading-relaxed mb-2">{analysis.explanation}</p>
            <div className="flex flex-wrap gap-2">
              {analysis.correlatedPairs.map((pair, i) => (
                <span key={i} className="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-lg">{pair}</span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-green-500 bg-green-500/10 p-4 rounded-2xl border border-green-500/20">
          <CheckCircle2 size={20} />
          <span className="text-xs font-bold">No significant correlation risks detected in active plans.</span>
        </div>
      )}
    </div>
  );
};

// --- View Components ---

const DashboardView = ({ stats, isDiagnosing, riskDiagnosis, filteredDeals }: any) => {
  const scatterData = useMemo(() => filteredDeals.map((d: any) => ({ volume: d.volume, pl: d.netPL, isWin: d.netPL > 0, name: d.symbol })), [filteredDeals]);
  const heatmapData = useMemo(() => {
    const matrix = Array(7).fill(0).map(() => Array(24).fill(0).map(() => ({ wins: 0, total: 0 })));
    filteredDeals.forEach((d: any) => {
      const day = getDay(d.time);
      const hour = d.time.getHours();
      matrix[day][hour].total++;
      if (d.netPL > 0) matrix[day][hour].wins++;
    });
    const flat = [];
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const wr = matrix[d][h].total > 0 ? (matrix[d][h].wins / matrix[d][h].total) * 100 : 0;
        flat.push({ day: d, hour: h, winRate: wr, count: matrix[d][h].total });
      }
    }
    return flat;
  }, [filteredDeals]);

  return (
    <div className="space-y-8 lg:space-y-12 animate-fade-in">
      <section className="glass-panel rounded-[24px] lg:rounded-[32px] p-6 lg:p-10 border-l-[8px] border-l-red-600 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity hidden lg:block">
           <ShieldAlert size={120} className="text-red-600" />
        </div>
        <div className="flex items-center gap-4 mb-6 lg:mb-8">
          <div className="p-3 bg-red-600/10 rounded-2xl">
            <ShieldAlert className="text-red-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg lg:text-2xl font-bold text-white tracking-tight">Jarvis 績效診斷報告</h3>
            <p className="text-[10px] lg:text-xs text-[#86868b] uppercase tracking-widest font-bold">Stark Strategic Diagnostic</p>
          </div>
        </div>
        <div className="relative min-h-[120px] flex items-center">
          {isDiagnosing ? (
            <div className="flex items-center gap-4 text-[#86868b] animate-pulse">
              <Loader2 className="animate-spin" size={24} />
              <span className="text-lg lg:text-xl italic font-medium">Jarvis 正在進行全面戰術掃描...</span>
            </div>
          ) : (
            <div className="bg-black/40 p-6 lg:p-8 rounded-3xl border border-white/5 w-full shadow-inner">
              <p className="text-base lg:text-xl text-[#f5f5f7] leading-relaxed font-medium italic whitespace-pre-wrap">"{riskDiagnosis || '待命中。上傳交易紀錄後，Jarvis 將為您提供專業診斷。'}"</p>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
        <KPICard title="Net Profit" value={`$${stats.totalNetPL.toFixed(2)}`} trend={stats.totalNetPL > 0 ? 1 : -1} icon={<TrendingUp />} />
        <KPICard title="Win Rate" value={`${stats.winRate.toFixed(1)}%`} sub={`${stats.longsWon + stats.shortsWon} Wins`} icon={<Activity />} />
        <KPICard title="Profit Factor" value={stats.profitFactor.toFixed(2)} sub="Efficiency ratio" icon={<Zap />} />
        <KPICard title="Total Trades" value={stats.totalDeals.toString()} sub="Operation count" icon={<FileText />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
        <div className="glass-panel rounded-[32px] lg:rounded-[40px] p-6 lg:p-8 shadow-2xl h-[350px] lg:h-[450px]">
          <h3 className="text-xs lg:text-sm font-bold text-[#86868b] uppercase tracking-[0.2em] mb-6 lg:mb-10">盈虧 vs 交易量</h3>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis type="number" dataKey="volume" name="Volume" unit=" Lots" stroke="#666" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis type="number" dataKey="pl" name="P&L" unit="$" stroke="#666" fontSize={10} axisLine={false} tickLine={false} />
              <ZAxis type="number" range={[50, 400]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ScatterTooltip />} />
              <Scatter name="Trades" data={scatterData}>
                {scatterData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.isWin ? '#34c759' : '#ff3b30'} fillOpacity={0.6} stroke={entry.isWin ? '#34c759' : '#ff3b30'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        {/* New Trader Score Card */}
        <TraderScoreCard stats={stats} />

        <div className="glass-panel rounded-[32px] lg:rounded-[40px] p-6 lg:p-8 shadow-2xl h-[350px] lg:h-[450px]">
          <div className="flex justify-between items-center mb-6 px-2">
             <h3 className="text-xs lg:text-sm font-bold text-[#86868b] uppercase tracking-[0.2em]">作戰窗口勝率分析</h3>
             <div className="text-[10px] text-[#86868b] flex items-center gap-2 lg:gap-4">
               <span className="flex items-center gap-1"><div className="w-2 h-2 bg-[#34c759] opacity-100 rounded-sm"></div> High</span>
               <span className="flex items-center gap-1"><div className="w-2 h-2 bg-[#34c759] opacity-20 rounded-sm"></div> Low</span>
             </div>
          </div>
          <div className="grid grid-cols-[20px_1fr] lg:grid-cols-[30px_1fr] gap-2 lg:gap-4 h-[250px] lg:h-[320px]">
            <div className="flex flex-col justify-between text-[8px] text-[#86868b] font-bold py-1">
              {['SUN','MON','TUE','WED','THU','FRI','SAT'].reverse().map(d => <div key={d}>{d.slice(0,1)}</div>)}
            </div>
            <div>
              <div className="grid grid-cols-24 gap-0.5 lg:gap-1 h-full">
                {heatmapData.map((cell: any, idx: number) => (
                  <div 
                    key={idx}
                    title={`${Math.floor(idx/24)}:00 - Win Rate: ${cell.winRate.toFixed(1)}% (${cell.count} trades)`}
                    className="rounded-sm transition-all hover:scale-125 cursor-help border border-white/5"
                    style={{ 
                      backgroundColor: cell.count === 0 ? 'rgba(255,255,255,0.02)' : `rgba(52, 199, 89, ${cell.winRate / 100})`,
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[8px] text-[#86868b] font-mono px-1">
                 <span>00</span>
                 <span>06</span>
                 <span>12</span>
                 <span>18</span>
                 <span>23</span>
              </div>
            </div>
          </div>
          <style>{`.grid-cols-24 { grid-template-columns: repeat(24, 1fr); }`}</style>
        </div>
      </div>
    </div>
  );
};

const PlanningView = ({ plans, onAddPlan, onDeletePlan }: { plans: TradingPlan[], onAddPlan: (p: TradingPlan) => void, onDeletePlan: (id: string) => void }) => {
  const [timeframe, setTimeframe] = useState<'week' | 'month'>('week');
  const [showAdd, setShowAdd] = useState(false);
  const [newAsset, setNewAsset] = useState('');
  const [newScenario, setNewScenario] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);

  const filteredPlans = plans.filter(p => p.timeframe === timeframe);
  // Collect active assets for correlation check
  const activeAssets = useMemo(() => plans.map(p => p.asset), [plans]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setNewImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!newAsset || !newScenario) return;
    onAddPlan({
      id: '', // Generated by DB
      timeframe,
      asset: newAsset,
      scenario: newScenario,
      imageUrl: newImage || undefined,
      createdAt: Date.now()
    });
    setNewAsset('');
    setNewScenario('');
    setNewImage(null);
    setShowAdd(false);
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto space-y-8 lg:space-y-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-4 w-full lg:w-auto">
           <h2 className="text-3xl lg:text-5xl font-black text-white tracking-tighter uppercase italic">Mission Briefing</h2>
           <div className="flex bg-[#1c1c1e] p-1 rounded-2xl w-full lg:w-fit border border-white/5">
             <button 
               onClick={() => setTimeframe('week')}
               className={`flex-1 lg:flex-none px-6 lg:px-8 py-3 rounded-xl text-xs font-bold transition-all ${timeframe === 'week' ? 'bg-red-600 text-white shadow-lg' : 'text-[#86868b] hover:text-white'}`}
             >下週部署 WEEKLY</button>
             <button 
               onClick={() => setTimeframe('month')}
               className={`flex-1 lg:flex-none px-6 lg:px-8 py-3 rounded-xl text-xs font-bold transition-all ${timeframe === 'month' ? 'bg-red-600 text-white shadow-lg' : 'text-[#86868b] hover:text-white'}`}
             >下月展望 MONTHLY</button>
           </div>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="p-4 lg:p-5 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-2xl self-end"
        >
          {showAdd ? <X size={24} /> : <Plus size={24} />}
        </button>
      </div>

      {/* Correlation Monitor Widget */}
      <CorrelationMonitor activeAssets={activeAssets} />

      {showAdd && (
        <div className="glass-panel p-6 lg:p-10 rounded-[40px] border-t-4 border-t-red-600 animate-fade-in shadow-2xl space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest block mb-3">追蹤資產 Asset</label>
                <input 
                  type="text" 
                  value={newAsset}
                  onChange={e => setNewAsset(e.target.value)}
                  placeholder="例如: XAUUSD, NAS100..."
                  className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white focus:border-red-600 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest block mb-3">If-Then 戰術劇本 Scenario</label>
                <textarea 
                  value={newScenario}
                  onChange={e => setNewScenario(e.target.value)}
                  placeholder="描述你的劇本。If 價格突破... Then 我會..."
                  className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white focus:border-red-600 outline-none h-40 resize-none"
                />
              </div>
            </div>
            <div className="space-y-6">
               <label className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest block mb-3">戰術圖表截圖 Intelligence (Image)</label>
               <div className="relative group aspect-video bg-black/40 border-2 border-dashed border-white/10 rounded-[32px] flex items-center justify-center overflow-hidden cursor-pointer hover:border-red-600/50 transition-colors">
                  {newImage ? (
                    <>
                      <img src={newImage} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                         <button onClick={() => setNewImage(null)} className="p-3 bg-red-600 rounded-full"><Trash2 size={20} /></button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-[#86868b]">
                       <ImageIcon size={48} className="opacity-20" />
                       <span className="text-xs font-bold">點擊上傳技術圖表</span>
                       <input type="file" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                    </div>
                  )}
               </div>
            </div>
          </div>
          <button 
            onClick={handleSubmit}
            className="w-full py-5 bg-white text-black rounded-[24px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl"
          >
            啟動部署指令 INITIALIZE MISSION
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredPlans.map(plan => (
          <div key={plan.id} className="glass-panel rounded-[40px] overflow-hidden border border-white/5 hover:border-red-600/30 transition-all group">
            {plan.imageUrl && (
              <div className="aspect-video w-full overflow-hidden">
                <img src={plan.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
            )}
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                   <div className="text-[10px] font-bold text-red-600 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                     <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></div> 戰略目標 ACTIVE TARGET
                   </div>
                   <h3 className="text-4xl font-black text-white tracking-tighter italic uppercase">{plan.asset}</h3>
                </div>
                <button onClick={() => onDeletePlan(plan.id)} className="p-3 bg-white/5 text-[#86868b] hover:text-red-600 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="bg-black/30 p-6 rounded-3xl border border-white/5">
                 <p className="text-lg text-[#f5f5f7] font-medium leading-relaxed whitespace-pre-wrap italic">"{plan.scenario}"</p>
              </div>
              <div className="text-[10px] text-[#86868b] font-bold uppercase tracking-widest flex items-center justify-between border-t border-white/5 pt-6">
                <span>ESTABLISHED: {format(new Date(plan.createdAt), 'yyyy-MM-dd HH:mm')}</span>
                <span className="text-white/20">#STRAT-00{plan.id.slice(-3)}</span>
              </div>
            </div>
          </div>
        ))}
        {filteredPlans.length === 0 && !showAdd && (
          <div className="col-span-full py-40 text-center text-[#86868b] space-y-4 opacity-30">
            <Telescope size={80} className="mx-auto" />
            <p className="text-xl font-bold uppercase tracking-widest italic">目前無戰略部署內容。點擊右上角新增。</p>
          </div>
        )}
      </div>
    </div>
  );
};

const JournalView = ({ filteredDeals, onAnalyzeTrade, updateAnnotation, onManualEntry }: any) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleImageUpload = (dealId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        updateAnnotation(dealId, { imageUrl: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end mb-4">
        <button onClick={onManualEntry} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors shadow-lg">
          <Plus size={16} /> <span className="hidden sm:inline">Add Trade Manually</span>
        </button>
      </div>
      
      {/* Table Header - Hidden on very small screens, adapted for others */}
      <div className="grid grid-cols-12 text-[10px] font-bold text-[#86868b] uppercase tracking-widest px-4 lg:px-6 pb-2">
        <div className="col-span-2 md:col-span-1">Time</div>
        <div className="col-span-2 md:col-span-1">Symbol</div>
        <div className="col-span-1 md:col-span-1">Dir</div>
        <div className="col-span-2 md:col-span-1">Vol</div>
        <div className="hidden md:block col-span-1">Entry</div>
        <div className="hidden md:block col-span-1">Exit</div>
        <div className="col-span-2 md:col-span-1 text-right">P&L</div>
        <div className="col-span-3 md:col-span-5 text-center">Analysis</div>
      </div>

      <div className="space-y-2">
        {filteredDeals.map((deal: DealWithAnnotation) => (
          <div key={deal.id} className="glass-panel rounded-2xl border border-white/5 overflow-hidden transition-all hover:border-white/10">
            <div 
              className="grid grid-cols-12 items-center p-3 lg:p-4 text-xs lg:text-sm font-medium cursor-pointer hover:bg-white/5"
              onClick={() => setExpandedId(expandedId === deal.id ? null : deal.id)}
            >
              <div className="col-span-2 md:col-span-1 text-[#86868b] text-[10px] lg:text-xs leading-tight">{format(deal.time, 'MM/dd')}<br/>{format(deal.time, 'HH:mm')}</div>
              <div className="col-span-2 md:col-span-1 font-bold text-white">{deal.symbol}</div>
              <div className={`col-span-1 md:col-span-1 text-[10px] lg:text-xs font-bold ${deal.direction === 'Buy' ? 'text-green-500' : 'text-red-500'}`}>{deal.direction.toUpperCase()}</div>
              <div className="col-span-2 md:col-span-1 text-[10px] lg:text-xs">{deal.volume}</div>
              <div className="hidden md:block col-span-1 text-[10px] lg:text-xs text-[#86868b]">{deal.entryPrice}</div>
              <div className="hidden md:block col-span-1 text-[10px] lg:text-xs text-[#86868b]">{deal.closingPrice}</div>
              <div className={`col-span-2 md:col-span-1 text-right font-bold ${deal.netPL > 0 ? 'text-green-500' : 'text-red-500'}`}>${deal.netPL.toFixed(0)}</div>
              <div className="col-span-3 md:col-span-5 flex items-center justify-end gap-2">
                {deal.entryReason && <div className="hidden lg:block px-2 py-1 bg-white/10 rounded-lg text-[10px] truncate max-w-[100px]">{deal.entryReason}</div>}
                {deal.imageUrl && <ImageIcon size={14} className="text-blue-400" />}
                {deal.aiAnalysis && <BrainCircuit size={14} className="text-purple-400" />}
                <ChevronDown size={14} className={`transform transition-transform ${expandedId === deal.id ? 'rotate-180' : ''}`} />
              </div>
            </div>
            {expandedId === deal.id && (
              <div className="p-4 lg:p-6 bg-black/40 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                <div className="space-y-4">
                  {/* Mobile Only Details */}
                  <div className="md:hidden grid grid-cols-2 gap-4 text-xs text-[#86868b] mb-4 border-b border-white/5 pb-4">
                    <div>Entry: <span className="text-white">{deal.entryPrice}</span></div>
                    <div>Exit: <span className="text-white">{deal.closingPrice}</span></div>
                  </div>

                  <h4 className="text-xs font-bold text-[#86868b] uppercase tracking-widest">Tactical Annotation & Chart</h4>
                  
                  {/* Chart Upload Area */}
                  <div className="relative group aspect-video bg-black/20 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500/50 transition-colors">
                    {deal.imageUrl ? (
                      <>
                        <img src={deal.imageUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                           <button onClick={() => updateAnnotation(deal.id, { imageUrl: undefined })} className="p-2 bg-red-600 rounded-full"><Trash2 size={16} /></button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-[#86868b]">
                         <ImageIcon size={24} className="opacity-50" />
                         <span className="text-[10px] font-bold">Upload Setup Screenshot</span>
                         <input type="file" onChange={(e) => handleImageUpload(deal.id, e)} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {TACTICAL_SHORTCUTS.map(tag => (
                      <button 
                        key={tag.label}
                        onClick={() => updateAnnotation(deal.id, { entryReason: tag.label })}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${deal.entryReason === tag.label ? 'bg-red-600 border-red-600 text-white' : 'border-white/10 hover:border-white/30 text-[#86868b]'}`}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                  <textarea 
                    placeholder="Add manual notes..."
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs text-white h-24 focus:border-red-600/50 outline-none"
                    value={deal.entryReason || ''}
                    onChange={(e) => updateAnnotation(deal.id, { entryReason: e.target.value })}
                  />
                </div>
                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                     <h4 className="text-xs font-bold text-[#86868b] uppercase tracking-widest">Jarvis Analysis</h4>
                     <button onClick={() => onAnalyzeTrade(deal)} className="flex items-center gap-2 text-[10px] font-bold text-purple-400 hover:text-purple-300">
                       <BrainCircuit size={14} /> ANALYZE {deal.imageUrl ? '(VISION ENABLED)' : ''}
                     </button>
                   </div>
                   <div className="bg-black/20 rounded-xl p-6 border border-white/5 min-h-[250px] text-xs leading-relaxed whitespace-pre-wrap font-medium">
                     {deal.aiAnalysis || "Click Analyze to get insights. Upload a chart screenshot for better technical analysis."}
                   </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const CalendarView = ({ deals }: { deals: Deal[] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getDayStats = (day: Date) => {
    const dayDeals = deals.filter(d => isSameDay(d.time, day));
    const netPL = dayDeals.reduce((sum, d) => sum + d.netPL, 0);
    const count = dayDeals.length;
    return { netPL, count };
  };

  return (
    <div className="glass-panel p-4 lg:p-8 rounded-[40px] shadow-2xl animate-fade-in">
       <div className="flex justify-between items-center mb-8">
         <h2 className="text-xl lg:text-2xl font-black text-white uppercase italic">{format(currentDate, 'MMMM yyyy')}</h2>
         <div className="flex gap-2">
           <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1))} className="p-2 hover:bg-white/10 rounded-full"><ChevronDown className="rotate-90" /></button>
           <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1))} className="p-2 hover:bg-white/10 rounded-full"><ChevronDown className="-rotate-90" /></button>
         </div>
       </div>
       <div className="grid grid-cols-7 gap-2 lg:gap-4">
         {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
           <div key={day} className="text-center text-[10px] lg:text-xs font-bold text-[#86868b] uppercase tracking-widest py-2">{day}</div>
         ))}
         {Array(getDay(monthStart)).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
         {days.map(day => {
           const { netPL, count } = getDayStats(day);
           return (
             <div key={day.toString()} className={`aspect-square rounded-xl lg:rounded-2xl border border-white/5 p-1 lg:p-2 relative group hover:border-white/20 transition-all ${count > 0 ? (netPL >= 0 ? 'bg-green-500/10' : 'bg-red-500/10') : 'bg-black/20'}`}>
               <span className="text-[10px] lg:text-xs font-bold text-[#86868b] absolute top-2 left-2">{format(day, 'd')}</span>
               {count > 0 && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className={`text-xs lg:text-base font-black tracking-tighter ${netPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>{netPL >= 0 ? '+' : ''}{Math.round(netPL)}</span>
                   <span className="text-[8px] lg:text-[10px] text-[#86868b] font-bold uppercase">{count} Trades</span>
                 </div>
               )}
             </div>
           );
         })}
       </div>
    </div>
  );
};

const NewsView = ({ newsSummary, newsItems }: { newsSummary: string, newsItems: NewsItem[] }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      <div className="lg:col-span-2 space-y-8">
        <section className="glass-panel p-8 lg:p-10 rounded-[40px] border-l-4 border-l-red-600 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5">
            <Newspaper size={160} />
          </div>
          <div className="flex items-center gap-4 mb-6">
             <div className="p-3 bg-red-600/10 rounded-2xl">
               <Zap className="text-red-600" size={24} />
             </div>
             <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Jarvis Market Brief</h2>
          </div>
          <div className="prose prose-invert prose-sm max-w-none">
             <p className="text-base lg:text-lg text-[#f5f5f7] leading-relaxed font-medium whitespace-pre-wrap">{newsSummary || "Intercepting global financial data streams... Standby."}</p>
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
             <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest flex items-center gap-2">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Live Feed Active
             </span>
             <span className="text-[10px] font-bold text-[#86868b] uppercase">{format(new Date(), 'HH:mm:ss')} UTC</span>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {newsItems.map((item, idx) => (
            <a 
              key={idx} 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="glass-panel p-6 rounded-[32px] border border-white/5 hover:border-red-600/30 hover:-translate-y-1 transition-all group flex flex-col justify-between h-[200px]"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest border border-red-600/20 px-2 py-1 rounded-lg bg-red-600/5">{item.source}</span>
                  <ArrowUpRight size={16} className="text-[#86868b] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-white leading-snug line-clamp-3 group-hover:text-red-500 transition-colors">{item.title}</h3>
              </div>
              <div className="text-[10px] text-[#86868b] font-medium mt-4 line-clamp-2">
                {item.snippet}
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="glass-panel p-8 rounded-[40px] h-full border border-white/5 shadow-2xl sticky top-24">
          <h3 className="text-xs font-bold text-[#86868b] uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
            <Info size={14} /> System Status
          </h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
              <span className="text-sm font-bold text-white">Market Data</span>
              <span className="flex items-center gap-2 text-[10px] font-bold text-green-500 uppercase tracking-widest">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Online
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
              <span className="text-sm font-bold text-white">AI Neural Net</span>
              <span className="flex items-center gap-2 text-[10px] font-bold text-green-500 uppercase tracking-widest">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Active
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
              <span className="text-sm font-bold text-white">Database</span>
              <span className="flex items-center gap-2 text-[10px] font-bold text-green-500 uppercase tracking-widest">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Connected
              </span>
            </div>
            
            <div className="mt-12 p-6 bg-gradient-to-br from-red-600/20 to-transparent rounded-3xl border border-red-600/20">
              <h4 className="text-white font-bold text-sm mb-2">Jarvis Tip</h4>
              <p className="text-xs text-red-100/80 leading-relaxed">
                Markets are showing increased volatility. Ensure stop losses are set and correlation risks are managed before executing new orders.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatView = ({ chatMessages, isTyping, inputMessage, setInputMessage, handleChatSend, messagesEndRef }: any) => {
  return (
    <div className="glass-panel rounded-[40px] flex flex-col h-[calc(100vh-140px)] shadow-2xl border border-white/5 overflow-hidden animate-fade-in relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none z-10"></div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 scroll-smooth z-0">
        {chatMessages.map((msg: ChatMessage) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`max-w-[85%] lg:max-w-[70%] p-4 lg:p-6 rounded-3xl text-sm lg:text-base leading-relaxed font-medium shadow-lg backdrop-blur-sm ${
              msg.role === 'user' 
                ? 'bg-white text-black rounded-tr-sm' 
                : 'bg-[#1c1c1e] text-[#f5f5f7] border border-white/10 rounded-tl-sm'
            }`}>
              {msg.role === 'model' && (
                <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-red-600 uppercase tracking-widest opacity-80">
                  <BrainCircuit size={12} /> Jarvis AI
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.text}</div>
              <div className={`text-[10px] font-bold mt-3 uppercase tracking-widest opacity-40 ${msg.role === 'user' ? 'text-black' : 'text-white'}`}>
                {format(msg.timestamp, 'HH:mm')}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start animate-fade-in">
             <div className="bg-[#1c1c1e] p-4 rounded-3xl rounded-tl-sm border border-white/10 flex items-center gap-2">
               <span className="w-2 h-2 bg-red-600 rounded-full animate-bounce"></span>
               <span className="w-2 h-2 bg-red-600 rounded-full animate-bounce delay-100"></span>
               <span className="w-2 h-2 bg-red-600 rounded-full animate-bounce delay-200"></span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 lg:p-6 bg-[#161617] border-t border-white/5 z-20">
        <div className="bg-[#1c1c1e] rounded-[24px] p-2 flex items-center gap-2 border border-white/10 shadow-xl focus-within:border-red-600/50 transition-colors">
          <input 
            type="text" 
            className="flex-1 bg-transparent border-none text-white px-4 py-3 focus:outline-none placeholder-[#555] font-medium"
            placeholder="Ask Jarvis for analysis or trading advice..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
          />
          <button 
            onClick={handleChatSend}
            disabled={!inputMessage.trim() || isTyping}
            className="p-3 bg-white text-black rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <ArrowUpRight size={20} />
          </button>
        </div>
        <div className="text-center mt-3">
          <p className="text-[10px] text-[#86868b] font-bold uppercase tracking-widest">
            Jarvis System may display inaccurate info, please double check.
          </p>
        </div>
      </div>
    </div>
  );
};

function JournalApp() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeView, setActiveView] = useState<AppView>(AppView.DASHBOARD);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [plans, setPlans] = useState<TradingPlan[]>([]);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  
  // AI States
  const [aiLogo, setAiLogo] = useState<string | null>(null);
  const [riskDiagnosis, setRiskDiagnosis] = useState<string>('');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  
  // News/Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [newsSummary, setNewsSummary] = useState<string>('');
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [filterSymbol, setFilterSymbol] = useState<string>('All');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Auth & Data Fetching Logic ---

  useEffect(() => {
    // 1. Auth State Listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchDeals = async () => {
    setDataLoading(true);
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .order('time', { ascending: false });

    if (error) {
      console.error('Error fetching deals:', error);
    } else {
      // Map DB snake_case to frontend camelCase
      const mappedDeals: DealWithAnnotation[] = data.map((d: any) => ({
        id: d.id,
        symbol: d.symbol,
        direction: d.direction,
        time: new Date(d.time),
        entryPrice: d.entry_price,
        closingPrice: d.closing_price,
        volume: d.volume,
        netPL: d.net_pl,
        balance: d.balance || 0,
        entryReason: d.entry_reason,
        imageUrl: d.image_url,
        aiAnalysis: d.ai_analysis
      }));
      setDeals(mappedDeals);
    }
    setDataLoading(false);
  };

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching plans:', error);
    } else {
      const mappedPlans: TradingPlan[] = data.map((p: any) => ({
        id: p.id,
        timeframe: p.timeframe,
        asset: p.asset,
        scenario: p.scenario,
        imageUrl: p.image_url,
        createdAt: new Date(p.created_at).getTime()
      }));
      setPlans(mappedPlans);
    }
  };

  // Fetch Data from Supabase when session exists
  useEffect(() => {
    if (session) {
      fetchDeals();
      fetchPlans();
      generateIronManLogo().then(url => setAiLogo(url));
      setChatMessages([{ id: 'init', role: 'model', text: '賈維斯系統已就緒。K 先生，系統已完成自檢，請閱覽您的戰術日誌與部署。', timestamp: new Date() }]);
    }
  }, [session]);

  // --- Derived State ---

  const filteredDeals = useMemo(() => {
    return deals.filter(deal => filterSymbol === 'All' || deal.symbol === filterSymbol);
  }, [deals, filterSymbol]);

  const stats = useMemo(() => calculateStats(filteredDeals), [filteredDeals]);
  const uniqueSymbols = useMemo(() => Array.from(new Set(deals.map(d => d.symbol))).sort(), [deals]);

  useEffect(() => {
    if (activeView === AppView.DASHBOARD && stats.totalDeals > 0) {
      setIsDiagnosing(true);
      diagnoseRisk(stats).then(res => { setRiskDiagnosis(res); setIsDiagnosing(false); });
    }
  }, [activeView, filterSymbol, stats.totalDeals]);

  // --- Actions ---

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setDeals([]);
    setPlans([]);
  };

  // REPLACED: Save to Supabase instead of LocalStorage
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const text = ev.target?.result as string;
        if (text) {
          const parsedDeals = parseDeals(text);
          if (!session?.user) return;

          // Transform for DB insert
          const dbDeals = parsedDeals.map(d => ({
            user_id: session.user.id,
            symbol: d.symbol,
            direction: d.direction,
            entry_price: d.entryPrice,
            closing_price: d.closingPrice,
            volume: d.volume,
            net_pl: d.netPL,
            balance: d.balance,
            time: d.time.toISOString() // Important: ISO string for Timestamptz
          }));

          const { error } = await supabase.from('deals').insert(dbDeals);

          if (error) {
            console.error('Import Error:', error);
            setImportStatus('Import failed. Check console.');
          } else {
            setImportStatus(`Successfully merged ${dbDeals.length} new trades.`);
            fetchDeals(); // Refresh from DB
          }
          
          setTimeout(() => setImportStatus(null), 3000);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleScanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsScanning(true);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        if (base64) {
          const newDeal = await parseTradeFromImage(base64);
          setIsScanning(false);
          
          if (newDeal && session?.user) {
             const { error } = await supabase.from('deals').insert({
               user_id: session.user.id,
               symbol: newDeal.symbol,
               direction: newDeal.direction,
               entry_price: newDeal.entryPrice,
               closing_price: newDeal.closingPrice,
               volume: newDeal.volume,
               net_pl: newDeal.netPL,
               time: newDeal.time.toISOString(),
               // We can save the scan image too if we want
               image_url: base64
             });

             if (!error) {
               fetchDeals();
               setImportStatus(`AI Scan Successful: ${newDeal.symbol}`);
             }
             setTimeout(() => setImportStatus(null), 5000);
          } else {
            setImportStatus('AI Scan Failed. Please try a clearer image.');
            setTimeout(() => setImportStatus(null), 3000);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleManualTradeAdd = async (newDeal: Deal) => {
    if (!session?.user) return;
    
    const { error } = await supabase.from('deals').insert({
        user_id: session.user.id,
        symbol: newDeal.symbol,
        direction: newDeal.direction,
        entry_price: newDeal.entryPrice,
        closing_price: newDeal.closingPrice,
        volume: newDeal.volume,
        net_pl: newDeal.netPL,
        time: newDeal.time.toISOString()
    });

    if (!error) {
        fetchDeals();
        setShowManualEntry(false);
    } else {
        console.error(error);
    }
  };

  const updateAnnotation = async (id: string, updates: Partial<DealAnnotation>) => {
    // Map updates to snake_case for DB
    const dbUpdates: any = {};
    if (updates.entryReason !== undefined) dbUpdates.entry_reason = updates.entryReason;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.aiAnalysis !== undefined) dbUpdates.ai_analysis = updates.aiAnalysis;

    const { error } = await supabase
      .from('deals')
      .update(dbUpdates)
      .eq('id', id);

    if (!error) {
        // Optimistic update or refetch
        setDeals(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    }
  };

  const handleAddPlan = async (newPlan: TradingPlan) => {
    if (!session?.user) return;

    const { error } = await supabase.from('plans').insert({
        user_id: session.user.id,
        timeframe: newPlan.timeframe,
        asset: newPlan.asset,
        scenario: newPlan.scenario,
        image_url: newPlan.imageUrl
    });

    if (!error) fetchPlans();
  };

  const handleDeletePlan = async (id: string) => {
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (!error) fetchPlans();
  };

  const handleAnalyzeTrade = async (deal: DealWithAnnotation) => {
    try {
      const analysis = await analyzeSingleTrade(deal);
      updateAnnotation(deal.id, { aiAnalysis: analysis });
    } catch (error) {
      console.error("Trade analysis failed:", error);
    }
  };

  const handleChatSend = async () => {
    if (!inputMessage.trim()) return;
    const newMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputMessage, timestamp: new Date() };
    setChatMessages(prev => [...prev, newMsg]);
    setInputMessage('');
    setIsTyping(true);
    const response = await generateTradingInsights(inputMessage, stats, filteredDeals);
    setChatMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'model', text: response, timestamp: new Date() }]);
    setIsTyping(false);
  };

  const handleNavClick = (view: AppView) => {
    setActiveView(view);
    setIsMobileMenuOpen(false); // Close menu on mobile when clicking a nav item
    // Auto fetch news if that view is selected
    if (view === AppView.NEWS && !newsItems.length) {
      fetchFinancialNews().then(d => { setNewsSummary(d.summary); setNewsItems(d.news); });
    }
  };

  // --- Auth Check ---
  if (authLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-black text-white"><Loader2 className="animate-spin" size={48}/></div>;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="flex h-screen bg-black text-[#f5f5f7] font-sans selection:bg-red-500/30 overflow-hidden">
      
      {showManualEntry && (
        <ManualEntryModal onClose={() => setShowManualEntry(false)} onSave={handleManualTradeAdd} />
      )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex-shrink-0 bg-[#161617] border-r border-white/5 flex flex-col pt-10 pb-4 shadow-2xl transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:relative md:w-[88px] lg:w-[280px]
      `}>
        <div className="px-4 lg:px-8 mb-16 flex justify-center lg:justify-start">
          <BrandHeader logoUrl={aiLogo} />
        </div>

        <nav className="flex-1 px-2 lg:px-4 space-y-2">
          <NavButton icon={<LayoutDashboard size={20} />} label="數據中心" active={activeView === AppView.DASHBOARD} onClick={() => handleNavClick(AppView.DASHBOARD)} />
          <NavButton icon={<Telescope size={20} />} label="部署計劃" active={activeView === AppView.PLANNING} onClick={() => handleNavClick(AppView.PLANNING)} />
          <NavButton icon={<BookOpen size={20} />} label="交易日誌" active={activeView === AppView.JOURNAL} onClick={() => handleNavClick(AppView.JOURNAL)} />
          <NavButton icon={<CalendarIcon size={20} />} label="盈虧月曆" active={activeView === AppView.CALENDAR} onClick={() => handleNavClick(AppView.CALENDAR)} />
          <NavButton icon={<Newspaper size={20} />} label="Jarvis 市場情報" active={activeView === AppView.NEWS} onClick={() => handleNavClick(AppView.NEWS)} />
          <NavButton icon={<MessageSquare size={20} />} label="Jarvis Intelligence" active={activeView === AppView.CHAT} onClick={() => handleNavClick(AppView.CHAT)} />
        </nav>

        <div className="px-2 lg:px-6 mt-auto space-y-4">
          {importStatus && (
            <div className={`text-[10px] font-bold p-3 rounded-xl flex items-center justify-center gap-2 animate-fade-in ${importStatus.includes('Failed') ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
              <CheckCircle2 size={12} /> <span className="hidden lg:inline">{importStatus}</span>
            </div>
          )}
          
          <input type="file" ref={scanInputRef} onChange={handleScanUpload} className="hidden" accept="image/*" />
          <button 
            onClick={() => scanInputRef.current?.click()} 
            disabled={isScanning}
            className="w-full py-3 px-2 lg:px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            title="AI Scan Entry"
          >
            {isScanning ? <Loader2 size={14} className="animate-spin" /> : <ScanLine size={14} />} 
            <span className="hidden lg:inline">{isScanning ? 'ANALYZING...' : 'AI SCAN ENTRY (BETA)'}</span>
          </button>

          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv" />
          <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 px-2 lg:px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#f5f5f7] transition-all flex items-center justify-center gap-2 border border-white/5 shadow-lg" title="Import Statement">
            <Upload size={14} /> <span className="hidden lg:inline">Import Statement (Merge)</span>
          </button>

          <div className="text-[10px] text-center text-[#86868b] uppercase tracking-widest opacity-50 font-bold hidden lg:block">Protocol 5.0 Active</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-black relative">
        <header className="sticky top-0 z-20 bg-black/70 backdrop-blur-3xl border-b border-white/5 px-4 lg:px-10 py-6 lg:py-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 -ml-2 text-white hover:bg-white/10 rounded-xl transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            
            <h1 className="text-xl lg:text-3xl font-extrabold tracking-tight text-white italic truncate">
              {activeView === AppView.DASHBOARD && 'Dashboard'}
              {activeView === AppView.PLANNING && 'Strategy Planning'}
              {activeView === AppView.JOURNAL && 'Trading Journal'}
              {activeView === AppView.CALENDAR && 'Profit Matrix'}
              {activeView === AppView.NEWS && 'Jarvis 市場情報'}
              {activeView === AppView.CHAT && 'Jarvis Intelligence'}
            </h1>
          </div>
          
          <div className="flex items-center gap-3 lg:gap-6">
            <div className="flex items-center bg-[#1c1c1e] rounded-2xl px-3 lg:px-5 py-2 lg:py-2.5 border border-white/5 shadow-inner">
              <Filter size={14} className="text-[#86868b] mr-2 lg:mr-3" />
              <select 
                value={filterSymbol} 
                onChange={(e) => setFilterSymbol(e.target.value)}
                className="bg-transparent border-none text-[10px] lg:text-xs font-bold text-[#f5f5f7] focus:outline-none cursor-pointer uppercase [&>option]:bg-[#1c1c1e] [&>option]:text-white max-w-[80px] lg:max-w-none"
              >
                <option value="All" className="bg-[#1c1c1e] text-white">All Assets</option>
                {uniqueSymbols.map(s => <option key={s} value={s} className="bg-[#1c1c1e] text-white">{s}</option>)}
              </select>
            </div>
            
            {/* User Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="h-8 w-8 lg:h-10 lg:w-10 rounded-full bg-red-600 flex items-center justify-center text-xs font-black text-white shadow-2xl ring-2 ring-white/10 hover:scale-105 transition-transform"
              >
                {session?.user?.email?.[0].toUpperCase() || 'K'}
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-4 w-64 bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
                    <div className="p-2 bg-white/5 rounded-full">
                      <User size={16} className="text-white" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-white truncate">{session?.user?.email}</p>
                      <p className="text-[10px] text-[#86868b]">Authenticated</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 p-3 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-10 max-w-[1500px] mx-auto min-h-screen pb-20">
          {dataLoading ? (
             <div className="flex items-center justify-center h-64 text-[#86868b] gap-3">
               <Loader2 className="animate-spin" /> Retrieving secure data...
             </div>
          ) : (
            <>
              {activeView === AppView.DASHBOARD && <DashboardView stats={stats} isDiagnosing={isDiagnosing} riskDiagnosis={riskDiagnosis} filteredDeals={filteredDeals} />}
              {activeView === AppView.PLANNING && <PlanningView plans={plans} onAddPlan={handleAddPlan} onDeletePlan={handleDeletePlan} />}
              {activeView === AppView.JOURNAL && <JournalView filteredDeals={filteredDeals} onAnalyzeTrade={handleAnalyzeTrade} updateAnnotation={updateAnnotation} onManualEntry={() => setShowManualEntry(true)} />}
              {activeView === AppView.CALENDAR && <CalendarView deals={filteredDeals} />}
              {activeView === AppView.NEWS && <NewsView newsSummary={newsSummary} newsItems={newsItems} />}
              {activeView === AppView.CHAT && <ChatView chatMessages={chatMessages} isTyping={isTyping} inputMessage={inputMessage} setInputMessage={setInputMessage} handleChatSend={handleChatSend} messagesEndRef={messagesEndRef} />}
            </>
          )}
        </div>
        
        {/* Overlay to close user menu when clicking outside */}
        {showUserMenu && <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />}
      </main>
    </div>
  );
}

export default JournalApp;
