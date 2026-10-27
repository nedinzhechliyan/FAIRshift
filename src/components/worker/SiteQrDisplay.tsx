import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SECTOR_CONFIGS } from '../../config/siteRules';
import { RefreshCw, Clock, Copy, Check } from 'lucide-react';

interface SiteQrDisplayProps {
  siteId: string;
}

export const SiteQrDisplay: React.FC<SiteQrDisplayProps> = ({ siteId }) => {
  const [token, setToken] = useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [copied, setCopied] = useState<boolean>(false);
  const siteConfig = SECTOR_CONFIGS[siteId] || SECTOR_CONFIGS['site-metro-const'];

  const fetchToken = async () => {
    try {
      const res = await fetch(`/api/qr/token/${siteId}`);
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        setSecondsRemaining(60);
      }
    } catch (err) {
      console.warn('Failed to fetch QR token:', err);
    }
  };

  useEffect(() => {
    fetchToken();
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          fetchToken();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [siteId]);

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white border border-[#E5E5E0] rounded-[8px] p-5 shadow-xs max-w-sm mx-auto text-center space-y-4">
      <div>
        <Badge variant="teal" label="Official Site Gate QR" size="sm" />
        <h3 className="text-sm font-bold text-[#17181A] mt-1">{siteConfig.siteName}</h3>
        <p className="text-xs text-[#73757C]">Gate Check-In & Check-Out Terminal</p>
      </div>

      {/* SVG QR Code Simulation with live data */}
      <div className="w-48 h-48 mx-auto p-3 bg-white border-2 border-[#17181A] rounded-[8px] flex flex-col items-center justify-center relative shadow-sm">
        {/* Decorative QR-like matrix grid */}
        <div className="w-full h-full grid grid-cols-6 grid-rows-6 gap-1 p-1 bg-[#FAFAF8]">
          <div className="bg-[#17181A] col-span-2 row-span-2 rounded-[2px]" />
          <div className="bg-[#17181A] col-start-5 col-span-2 row-span-2 rounded-[2px]" />
          <div className="bg-[#17181A] row-start-5 col-span-2 row-span-2 rounded-[2px]" />
          <div className="bg-[#0F766E] col-start-3 row-start-3 col-span-2 row-span-2 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
            FS
          </div>
          <div className="bg-[#17181A] col-start-3 row-start-1" />
          <div className="bg-[#17181A] col-start-4 row-start-2" />
          <div className="bg-[#17181A] col-start-1 row-start-3" />
          <div className="bg-[#17181A] col-start-6 row-start-4" />
          <div className="bg-[#17181A] col-start-4 row-start-5" />
          <div className="bg-[#17181A] col-start-5 row-start-6" />
        </div>

        <div className="absolute -bottom-2.5 bg-[#17181A] text-white px-2 py-0.5 rounded-full text-[10px] font-mono-code flex items-center gap-1 shadow-sm">
          <Clock className="w-2.5 h-2.5 text-amber-400" />
          <span>Rotates in {secondsRemaining}s</span>
        </div>
      </div>

      <div className="pt-2 text-xs text-[#73757C] space-y-2">
        <p className="text-[11px] leading-relaxed">
          HMAC-signed 60-second token prevents screenshot replay fraud.
        </p>
        <div className="flex gap-2 justify-center">
          <Button variant="secondary" size="sm" onClick={fetchToken} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            Force Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={copyToken} icon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}>
            {copied ? 'Copied' : 'Copy Token'}
          </Button>
        </div>
      </div>
    </div>
  );
};
