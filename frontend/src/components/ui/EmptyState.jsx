import { Inbox } from 'lucide-react';
import { Button } from './Button';

/**
 * Standard Empty State for Civora views.
 * Senior-Friendly accessibility with clear typography, comfortable spacing, and no tiny text.
 * Option 9 – Dusty Blue Palette.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title = 'No records available',
  description = 'No incidents or records are currently available in this view. Real-time updates will appear here once submitted or dispatched.',
  actionLabel = null,
  onAction = null,
  actionIcon = null,
  className = '',
  children,
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-14 text-center rounded-2xl border border-dashed border-[#E1E7EE] dark:border-[#40515F] bg-white dark:bg-[#2D3C49] ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-[#E7EEF5] dark:bg-[#263746] text-[#7C97B0] dark:text-[#8FAFCB] flex items-center justify-center mb-5 shadow-2xs">
        <Icon className="w-7 h-7 stroke-[1.75]" />
      </div>
      <h4 className="text-xl sm:text-2xl font-bold text-[#2E4A62] dark:text-[#F2F5F8] tracking-tight">{title}</h4>
      <p className="text-sm sm:text-base text-[#64748B] dark:text-[#B7C3CE] max-w-lg mt-2 leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <div className="mt-6">
          <Button
            variant="primary"
            size="md"
            icon={actionIcon}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </div>
      )}

      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

export default EmptyState;
