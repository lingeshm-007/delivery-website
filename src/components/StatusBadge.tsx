import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let colorStyles = 'bg-slate-100 text-slate-700 border-slate-200';

  switch (status) {
    // Positive / Available / Delivered / Completed
    case 'Available':
    case 'Delivered':
    case 'COMPLETED':
      colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/10';
      break;

    // Active / In Transit / Assigned
    case 'Assigned':
    case 'In Transit':
    case 'ACTIVE':
      colorStyles = 'bg-teal-50 text-teal-800 border-teal-200 ring-1 ring-teal-500/20';
      break;

    // Pending / Warnings
    case 'Pending':
      colorStyles = 'bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-500/20';
      break;

    // Maintenance / Caution
    case 'Maintenance':
    case 'Unavailable':
      colorStyles = 'bg-orange-50 text-orange-800 border-orange-200 ring-1 ring-orange-500/20';
      break;

    // Inactive / Cancelled
    case 'Cancelled':
    case 'CANCELLED':
    case 'Inactive':
      colorStyles = 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/20';
      break;
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${padding} ${colorStyles} font-mono tracking-tight transition-colors`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
};
