import React from 'react';
import { useNavigation } from '../../context/NavigationContext';

export const AnnouncementBar: React.FC = () => {
  const { navigateTo } = useNavigation();

  return (
    <div className="bg-[#15151B] border-b border-[#2A2A32] text-[#C7CBD3] text-[11px] md:text-xs py-1.5 px-4 text-center tracking-widest uppercase font-medium flex items-center justify-center gap-3">
      <span>FREE SHIPPING ON ORDERS ABOVE ₹999</span>
      <span className="w-1 h-1 rounded-full bg-[#8B5CF6]" />
      <button 
        onClick={() => navigateTo('shop', { newArrivalsOnly: true } as unknown as object)}
        className="text-[#F5F5F7] underline underline-offset-2 hover:text-[#00D9FF] transition-colors"
      >
        NEW DROP LIVE
      </button>
    </div>
  );
};
