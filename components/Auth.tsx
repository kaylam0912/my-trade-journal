
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { generateLoginBackground } from '../services/geminiService';
import { Zap, Loader2, Mail, Lock, ArrowRight, RefreshCw, Upload, Image as ImageIcon } from 'lucide-react';

const STORAGE_KEY_BG = 'jarvis_login_bg_v4_custom'; // New key for user-uploaded/generated background

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgLoading, setBgLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. Check LocalStorage Cache
    const cachedBg = localStorage.getItem(STORAGE_KEY_BG);
    if (cachedBg) {
      setBgImage(cachedBg);
    } 
    // Default fallback removed as per user request. 
    // It will remain black until user uploads or generates an image.
  }, []);

  // Handle User Uploading their own image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) {
          setBgImage(result);
          try {
            localStorage.setItem(STORAGE_KEY_BG, result); // Save user image to local storage
          } catch (e) {
            console.warn("Image too large to cache in localStorage");
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle AI Regeneration
  const handleRegenerateBg = async () => {
    setBgLoading(true);
    try {
      const imageUrl = await generateLoginBackground();
      if (imageUrl) {
        setBgImage(imageUrl);
        try {
          localStorage.setItem(STORAGE_KEY_BG, imageUrl);
        } catch (e) {
          console.warn("Storage full");
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBgLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('註冊成功！請檢查您的電子郵件以進行驗證 (如果已啟用)。');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-screen items-center justify-center bg-black overflow-hidden">
      
      {/* Background Layer */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
        style={{ 
          backgroundImage: bgImage ? `url(${bgImage})` : 'none',
        }}
      ></div>
      
      {/* Overlay Layer */}
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-black/95 via-black/50 to-black/30 backdrop-blur-[2px]"></div>

      {/* Control Buttons (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-20 flex gap-2">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
          accept="image/*"
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="p-3 rounded-full bg-black/40 border border-white/10 text-[#86868b] hover:text-white hover:bg-black/60 transition-all backdrop-blur-md group"
          title="Upload Your Own Background"
        >
          <Upload size={16} className="group-hover:-translate-y-0.5 transition-transform" />
        </button>
        <button 
          onClick={handleRegenerateBg}
          disabled={bgLoading}
          className="p-3 rounded-full bg-black/40 border border-white/10 text-[#86868b] hover:text-white hover:bg-black/60 transition-all backdrop-blur-md group"
          title="Generate New AI Background"
        >
          <RefreshCw size={16} className={bgLoading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-700"} />
        </button>
      </div>

      <div className="relative z-10 w-full max-w-md p-4 animate-fade-in">
        <div className="glass-panel w-full rounded-[40px] p-8 md:p-12 shadow-2xl border border-white/10 backdrop-blur-2xl bg-black/30">
          
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1c1c1e] to-black border border-white/10 flex items-center justify-center mb-6 shadow-xl group">
              <Zap className="text-red-600 group-hover:scale-110 transition-transform drop-shadow-[0_0_15px_rgba(220,38,38,0.6)]" size={32} />
            </div>
            
            <h1 className="text-3xl font-black text-white tracking-tight mb-2 drop-shadow-lg italic">K Journal</h1>
            <p className="text-[10px] text-[#86868b] font-bold uppercase tracking-[0.3em] mb-10">Jarvis Protocol 5.0</p>

            <form onSubmit={handleAuth} className="w-full space-y-4">
              <div className="space-y-2">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b] group-focus-within:text-white transition-colors" size={18} />
                  <input
                    type="email"
                    placeholder="Identity"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-[#555] focus:border-red-600 focus:bg-black/70 focus:outline-none transition-all text-sm font-bold tracking-wide"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b] group-focus-within:text-white transition-colors" size={18} />
                  <input
                    type="password"
                    placeholder="Passcode"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-[#555] focus:border-red-600 focus:bg-black/70 focus:outline-none transition-all text-sm font-bold tracking-wide"
                  />
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-[10px] font-bold text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20 animate-pulse">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-6 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    {isSignUp ? 'Initialize' : 'Access System'} <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex items-center gap-2 text-[10px] font-bold text-[#86868b] uppercase tracking-widest">
              <span>{isSignUp ? 'Already have access?' : 'New to the system?'}</span>
              <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-white hover:text-red-500 transition-colors underline decoration-white/20 underline-offset-4"
              >
                {isSignUp ? 'Sign In' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
