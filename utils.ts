import { Deal, TradingStats } from './types';

const generateDealId = (deal: Omit<Deal, 'id'>): string => {
  return `${deal.time.getTime()}-${deal.symbol}-${deal.entryPrice}-${deal.volume}`;
};

export const parseDeals = (csvData: string): Deal[] => {
  if (!csvData) return [];
  
  const lines = csvData.trim().split(/\r?\n/);
  const deals: Deal[] = [];
  
  const headerLine = lines.find(line => line.includes('Symbol') && line.includes('Opening Direction'));
  if (!headerLine) return [];
  
  const headers = headerLine.split(',').map(h => h.trim());
  const headerIndex = lines.indexOf(headerLine);

  // Map header indexes
  const idx = {
    symbol: headers.indexOf('Symbol'),
    direction: headers.indexOf('Opening Direction'),
    time: headers.indexOf('Closing Time (UTC+8)'),
    entry: headers.indexOf('Entry price'),
    closing: headers.indexOf('Closing Price'),
    volume: headers.indexOf('Closing Quantity'),
    netPL: headers.indexOf('Net USD'),
    balance: headers.indexOf('Balance USD'),
    mae: headers.indexOf('MAE USD'), // Optional
    mfe: headers.indexOf('MFE USD')  // Optional
  };

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    if (parts.length < 8) continue;

    try {
        const symbol = parts[idx.symbol];
        const direction = parts[idx.direction] as 'Buy' | 'Sell';
        const timeStr = parts[idx.time];
        const entryPrice = parseFloat(parts[idx.entry]);
        const closingPrice = parseFloat(parts[idx.closing]);
        const volumeStr = parts[idx.volume];
        const netPL = parseFloat(parts[idx.netPL]);
        const balanceStr = parts[idx.balance];

        const volume = parseFloat(volumeStr.replace(' Lots', ''));
        const balance = parseFloat(balanceStr.replace(/\s/g, '').replace(/,/g, ''));
        const time = new Date(timeStr);
        
        if (isNaN(time.getTime())) continue;

        // Extract or Mock MAE/MFE for demonstration if not in CSV
        let mae = idx.mae !== -1 ? parseFloat(parts[idx.mae]) : undefined;
        let mfe = idx.mfe !== -1 ? parseFloat(parts[idx.mfe]) : undefined;

        // Mock logic: If not provided, simulate based on netPL
        if (mae === undefined) mae = netPL > 0 ? -Math.abs(netPL * 0.2) : netPL * 1.5;
        if (mfe === undefined) mfe = netPL > 0 ? netPL * 1.2 : Math.abs(netPL * 0.3);

        // Efficiency = Realized / Max Possible (only makes sense for winning trades really, but can be calculated for all)
        // For wins: How much of the peak did you catch?
        // For losses: How much did it go in your favor before hitting stop?
        const exitEfficiency = mfe > 0 ? Math.max(0, Math.min(100, (netPL / mfe) * 100)) : 0;

        const partialDeal = {
          symbol,
          direction,
          time,
          entryPrice,
          closingPrice,
          volume,
          netPL,
          balance,
          mae,
          mfe,
          exitEfficiency
        };

        deals.push({
          ...partialDeal,
          id: generateDealId(partialDeal)
        });
    } catch (e) {
        console.warn("Skipping invalid line:", line);
        continue;
    }
  }
  
  return deals.sort((a, b) => b.time.getTime() - a.time.getTime());
};

export const calculateStats = (deals: Deal[]): TradingStats => {
  const totalDeals = deals.length;
  if (totalDeals === 0) {
    return {
      totalDeals: 0,
      totalNetPL: 0,
      winRate: 0,
      profitFactor: 0,
      bestTrade: 0,
      worstTrade: 0,
      averageWin: 0,
      averageLoss: 0,
      longsWon: 0,
      shortsWon: 0,
      totalLongs: 0,
      totalShorts: 0,
      currentBalance: 0
    };
  }

  let totalNetPL = 0;
  let wins = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let bestTrade = -Infinity;
  let worstTrade = Infinity;
  let longWins = 0;
  let shortWins = 0;
  let totalLongs = 0;
  let totalShorts = 0;

  deals.forEach(deal => {
    totalNetPL += deal.netPL;
    
    if (deal.netPL > bestTrade) bestTrade = deal.netPL;
    if (deal.netPL < worstTrade) worstTrade = deal.netPL;

    if (deal.netPL > 0) {
      wins++;
      grossProfit += deal.netPL;
      if (deal.direction === 'Buy') longWins++;
      else shortWins++;
    } else {
      grossLoss += Math.abs(deal.netPL);
    }

    if (deal.direction === 'Buy') totalLongs++;
    else totalShorts++;
  });

  const winRate = (wins / totalDeals) * 100;
  const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;
  const averageWin = wins > 0 ? grossProfit / wins : 0;
  const lossCount = totalDeals - wins;
  const averageLoss = lossCount > 0 ? grossLoss / lossCount : 0;
  const currentBalance = deals[0]?.balance || 0;

  return {
    totalDeals,
    totalNetPL,
    winRate,
    profitFactor,
    bestTrade,
    worstTrade,
    averageWin,
    averageLoss,
    longsWon: longWins,
    shortsWon: shortWins,
    totalLongs,
    totalShorts,
    currentBalance
  };
};

export const getEquityCurveData = (deals: Deal[]) => {
  const sortedDeals = [...deals].sort((a, b) => a.time.getTime() - b.time.getTime());
  let cumulativePL = 0;
  
  return sortedDeals.map(deal => {
    cumulativePL += deal.netPL;
    return {
      date: new Intl.DateTimeFormat('zh-HK', { month: '2-digit', day: '2-digit' }).format(deal.time),
      fullDate: deal.time,
      balance: cumulativePL,
      netPL: deal.netPL
    };
  });
};

export const getSymbolPerformanceData = (deals: Deal[]) => {
  const symbolMap = new Map<string, number>();
  deals.forEach(deal => {
    const current = symbolMap.get(deal.symbol) || 0;
    symbolMap.set(deal.symbol, current + deal.netPL);
  });

  return Array.from(symbolMap.entries())
    .map(([symbol, pl]) => ({ symbol, pl }))
    .sort((a, b) => b.pl - a.pl);
};