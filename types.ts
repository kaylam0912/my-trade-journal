
export interface Deal {
  id: string; // Unique ID based on time+symbol
  symbol: string;
  direction: 'Buy' | 'Sell';
  time: Date;
  entryPrice: number;
  closingPrice: number;
  volume: number; // Lots
  netPL: number;
  balance: number;
  mae?: number; // Maximum Adverse Excursion (USD)
  mfe?: number; // Maximum Favorable Excursion (USD)
  exitEfficiency?: number; // (netPL / mfe) * 100
}

// Data stored locally by user input
export interface DealAnnotation {
  entryReason?: string;
  imageUrl?: string;
  aiAnalysis?: string;
}

export type DealWithAnnotation = Deal & DealAnnotation;

export interface TradingStats {
  totalDeals: number;
  totalNetPL: number;
  winRate: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
  averageWin: number;
  averageLoss: number;
  longsWon: number;
  shortsWon: number;
  totalLongs: number;
  totalShorts: number;
  currentBalance: number;
}

export interface TraderScore {
  totalScore: number; // 0-100
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  consistencyScore: number; // Based on R:R stability
  performanceScore: number; // Based on Win Rate & Profit Factor
  disciplineScore: number; // Derived from avoiding large losses (Drawdown control)
  feedback: string;
}

export interface CorrelationAnalysis {
  hasRisk: boolean;
  correlatedPairs: string[];
  explanation: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  JOURNAL = 'JOURNAL',
  CALENDAR = 'CALENDAR',
  PLANNING = 'PLANNING',
  NEWS = 'NEWS',
  CHAT = 'CHAT',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  snippet: string;
  publishedTime?: string;
}

export interface TradingPlan {
  id: string;
  timeframe: 'week' | 'month';
  asset: string;
  scenario: string;
  imageUrl?: string;
  createdAt: number;
}
