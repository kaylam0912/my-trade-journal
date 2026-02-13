
import { GoogleGenAI } from "@google/genai";
import { TradingStats, Deal, DealWithAnnotation, NewsItem, CorrelationAnalysis } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

// 1. Generate Iron Man Logo (Nano Banana) with robust error handling
export const generateIronManLogo = async (): Promise<string | null> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{
        parts: [{
          text: "A highly minimalist, sleek Iron Man helmet face icon. Luxury high-tech aesthetic, metallic gold and deep red finish, glowing white eyes, dark reflective background, centered composition, premium Apple app icon style, 4K render."
        }]
      }],
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    // Fix: Safely access candidates and parts
    const candidate = response.candidates?.[0];
    if (candidate && candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    console.warn("Logo Generation: No image data in response candidates.");
    return null;
  } catch (error) {
    console.error("Logo Generation Error:", error);
    return null;
  }
};

// 1.5 Generate Login Background (Neon Iron Man Mark 42)
export const generateLoginBackground = async (): Promise<string | null> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{
        parts: [{
          text: "Neon art style Iron Man Mark 42 armor. Dark black background with glowing red and neon cyan contour lines outlining the suit. Cyberpunk aesthetic, futuristic digital art, high contrast, minimalist but detailed wireframe effect, 8k resolution, cinematic lighting. The suit looks powerful and high-tech."
        }]
      }],
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    const candidate = response.candidates?.[0];
    if (candidate && candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Background Generation Error:", error);
    return null;
  }
};

// 2. General Trading Insights (Chat)
export const generateTradingInsights = async (
  prompt: string, 
  stats: TradingStats, 
  recentDeals: Deal[]
): Promise<string> => {
  const ai = getAiClient();
  
  const context = `
    你是一位專業的華爾街交易導師。以下是用戶的數據：
    總交易: ${stats.totalDeals}, 淨盈虧: $${stats.totalNetPL.toFixed(2)}, 勝率: ${stats.winRate.toFixed(2)}%, PF: ${stats.profitFactor.toFixed(2)}
    最近 5 筆交易:
    ${recentDeals.slice(0, 5).map(d => `${d.symbol} (${d.direction}) $${d.netPL}`).join(', ')}
  `;

  const systemInstruction = "你是一位簡潔、專業且富有洞察力的交易教練 Jarvis。請用繁體中文回答。分析要一針見血，展現高科技 AI 的冷靜與智慧。";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `數據背景:${context}\n\n用戶問題: ${prompt}` }] }],
      config: { systemInstruction }
    });
    return response.text || "無法生成回應。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "分析時發生錯誤，請稍後再試。";
  }
};

// 3. Analyze Single Trade (Enhanced with Vision)
export const analyzeSingleTrade = async (deal: DealWithAnnotation): Promise<string> => {
  const ai = getAiClient();
  
  const parts: any[] = [];
  
  // Vision Capability: Add Image Part if available
  if (deal.imageUrl) {
    // Basic cleanup to get raw base64
    const base64Data = deal.imageUrl.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
    parts.push({
      inlineData: {
        mimeType: 'image/png', // Assuming png/jpeg, Gemini is flexible
        data: base64Data
      }
    });
  }

  const promptText = `
    請作為專業交易教練分析這筆交易 (Deal Analysis)：
    
    【交易數據】
    商品: ${deal.symbol}
    方向: ${deal.direction}
    進場價: ${deal.entryPrice}
    出場價: ${deal.closingPrice}
    盈虧: $${deal.netPL.toFixed(2)}
    交易理由 (用戶筆記): "${deal.entryReason || "未提供"}"
    
    【你的任務】
    ${deal.imageUrl ? "1. [視覺辨識] 請仔細查看附圖。識別圖表中的支撐/壓力位、趨勢線或技術形態。評判進場點是否符合技術面邏輯？\n" : ""}
    2. [邏輯評估] 用戶的交易理由是否充分？
    3. [改進建議] 下次如何做得更好？
    4. [評分] 給這筆操作打分 (0-10)。
    
    請用繁體中文，語氣簡潔專業 (Jarvis 風格)。
  `;
  
  parts.push({ text: promptText });

  try {
    // Use Pro model for better visual reasoning
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts }
    });
    return response.text || "無法分析此交易。";
  } catch (error) {
    console.error("Trade Analysis Error:", error);
    return "分析失敗。如上傳圖片，請確保圖片大小適中且格式正確。";
  }
};

// 4. Risk Diagnosis
export const diagnoseRisk = async (stats: TradingStats): Promise<string> => {
  const ai = getAiClient();
  
  const prompt = `
    Jarvis, 啟動全面績效掃描。請根據以下數據進行「風險與紀律診斷」：
    - 總交易數: ${stats.totalDeals}
    - 總淨盈虧: $${stats.totalNetPL.toFixed(2)}
    - 勝率: ${stats.winRate.toFixed(2)}%
    - 獲利因子 (Profit Factor): ${stats.profitFactor.toFixed(2)}
    - 平均獲利: $${stats.averageWin.toFixed(2)}
    - 平均虧損: $${stats.averageLoss.toFixed(2)}
    - 最大單筆虧損: $${stats.worstTrade.toFixed(2)}
    
    請重點分析用戶的「風險回報比 (Risk:Reward Ratio)」是否合理。
    如果平均虧損大於平均獲利，請嚴厲提醒。
    限制在 150 字以內，語氣展現 Jarvis 的優雅、專業與客觀。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "你是一位專門負責風險管控的 AI 助手 Jarvis。你的目標是通過數據分析保護用戶的本金。語氣應優雅而嚴謹，使用繁體中文。"
      }
    });
    return response.text || "Jarvis 暫時無法連線。";
  } catch (error) {
    console.error("Risk Diagnosis Error:", error);
    return "系統掃描失敗，請檢查網路連線。";
  }
};

// 5. Correlation Check (New)
export const checkCorrelation = async (assets: string[]): Promise<CorrelationAnalysis> => {
  const ai = getAiClient();
  const uniqueAssets = Array.from(new Set(assets));
  
  if (uniqueAssets.length < 2) {
    return { hasRisk: false, correlatedPairs: [], explanation: "監控資產少於 2 個，無相關性風險。" };
  }

  const prompt = `
    請分析以下資產列表是否存在高度正相關性 (High Positive Correlation)，這會導致風險過度集中：
    資產列表: ${uniqueAssets.join(', ')}

    如果發現高度相關的組合（例如 黃金與白銀、納指與比特幣、歐元與英鎊等），請發出警告。
    
    請回傳 JSON 格式：
    {
      "hasRisk": boolean,
      "correlatedPairs": ["Asset A & Asset B", ...],
      "explanation": "簡短解釋風險 (繁體中文)"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    const text = response.text || "{}";
    const result = JSON.parse(text);
    return result;
  } catch (error) {
    console.error("Correlation Check Error:", error);
    return { hasRisk: false, correlatedPairs: [], explanation: "Jarvis 暫時無法分析相關性。" };
  }
};

// 6. Real-time News (Jarvis 市場情報)
export const fetchFinancialNews = async (): Promise<{summary: string, news: NewsItem[]}> => {
  const ai = getAiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: "請列出目前全球金融市場最重要的 5 則即時新聞頭條，重點關注外匯(Forex)、黃金(Gold)、原油(Oil)和美股指數。請提供詳細的新聞摘要。",
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const summary = response.text || "暫無市場摘要。";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const newsItems: NewsItem[] = [];

    groundingChunks.forEach((chunk: any) => {
      if (chunk.web?.uri && chunk.web?.title) {
        newsItems.push({
          title: chunk.web.title,
          url: chunk.web.uri,
          source: new URL(chunk.web.uri).hostname.replace('www.', ''),
          snippet: "查看情報來源"
        });
      }
    });

    const uniqueNews = Array.from(new Map(newsItems.map(item => [item.url, item])).values());
    return { summary, news: uniqueNews.slice(0, 8) };
  } catch (error) {
    console.error("News Fetch Error:", error);
    return { summary: "獲取新聞時發生錯誤。", news: [] };
  }
};

// 7. Parse Trade Screenshot (New Feature)
export const parseTradeFromImage = async (base64Image: string): Promise<Deal | null> => {
  const ai = getAiClient();
  const rawBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  const prompt = `
    你是一個 OCR 數據提取專家。請分析這張交易截圖（通常來自 TradingView, MT4/MT5, 或加密貨幣交易所）。
    
    提取以下數據並以 JSON 格式返回。如果截圖中缺少某些數據，請盡力根據上下文推斷（例如：如果看到紅色盈虧，可能方向是做空但價格上漲）。
    
    Fields required:
    - symbol: 商品名稱 (e.g., XAUUSD, BTCUSD, EURUSD)
    - direction: "Buy" or "Sell"
    - entryPrice: number
    - closingPrice: number (current price or exit price)
    - volume: number (lots or amount)
    - netPL: number (Profit/Loss in currency)
    - time: ISO string of the closing time (use current year if not specified, assume UTC if unknown)

    Return raw JSON only. Do not use markdown.
    Example:
    {
      "symbol": "XAUUSD",
      "direction": "Buy",
      "entryPrice": 2000.50,
      "closingPrice": 2010.00,
      "volume": 1.0,
      "netPL": 950.00,
      "time": "2024-10-27T14:30:00.000Z"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: rawBase64 } },
          { text: prompt }
        ]
      },
      config: { responseMimeType: "application/json" }
    });

    const text = response.text;
    if (!text) return null;
    
    // Clean markdown if present (though responseMimeType usually handles this)
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(jsonStr);

    return {
      id: `scan-${Date.now()}`,
      symbol: data.symbol?.toUpperCase() || 'UNKNOWN',
      direction: (data.direction === 'Buy' || data.direction === 'Sell') ? data.direction : (data.netPL > 0 ? 'Buy' : 'Sell'), // Fallback
      time: new Date(data.time || new Date()),
      entryPrice: data.entryPrice || 0,
      closingPrice: data.closingPrice || 0,
      volume: data.volume || 0,
      netPL: data.netPL || 0,
      balance: 0, // Placeholder
      exitEfficiency: 0
    };
  } catch (error) {
    console.error("Trade Scan Error:", error);
    return null;
  }
};
