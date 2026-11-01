import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ label = 'Connecting to civic registry...', size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={`flex flex-col items-center justify-center py-8 gap-3 text-[#64748B] dark:text-[#B7C3CE] ${className}`}>
      <Loader2 className={`${sizeClasses[size] || sizeClasses.md} animate-spin text-[#7C97B0] dark:text-[#8FAFCB]`} />
      {label && <p className="text-xs sm:text-sm font-medium text-[#64748B] dark:text-[#B7C3CE]">{label}</p>}
    </div>
  );
}

export default LoadingSpinner;
