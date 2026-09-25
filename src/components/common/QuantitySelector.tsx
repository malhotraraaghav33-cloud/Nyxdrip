import React from 'react';

interface QuantitySelectorProps {
  quantity: number;
  max: number;
  onChange: (qty: number) => void;
  size?: 'sm' | 'md';
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  max,
  onChange,
  size = 'md',
}) => {
  const isSm = size === 'sm';

  return (
    <div className={`inline-flex items-center border border-[#2A2A32] bg-[#15151B] ${isSm ? 'h-8' : 'h-10'}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, quantity - 1))}
        disabled={quantity <= 1}
        className={`px-3 text-[#9A9AA3] hover:text-[#F5F5F7] disabled:opacity-30 disabled:hover:text-[#9A9AA3] transition-colors focus-visible:outline-none ${isSm ? 'text-xs' : 'text-sm'}`}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className={`px-2 font-mono-numbers text-center font-medium text-[#F5F5F7] ${isSm ? 'text-xs min-w-[28px]' : 'text-sm min-w-[36px]'}`}>
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        className={`px-3 text-[#9A9AA3] hover:text-[#F5F5F7] disabled:opacity-30 disabled:hover:text-[#9A9AA3] transition-colors focus-visible:outline-none ${isSm ? 'text-xs' : 'text-sm'}`}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
};
