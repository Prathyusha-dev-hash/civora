import { useState } from 'react';
import { PlusCircle, Search } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { ReportForm } from './components/ReportForm';
import { ComplaintTracker } from './components/ComplaintTracker';
import { useLanguage } from '../../context/useLanguage';

export function CitizenPortal() {
  const { t } = useLanguage();
  const [activeView, setActiveView] = useState('report');
  const [selectedTicketId, setSelectedTicketId] = useState('');

  const handleViewTracker = (ticketId) => {
    setSelectedTicketId(ticketId || '');
    setActiveView('track');
  };

  return (
    <div className="space-y-8">
      {/* Citizen Portal Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-white dark:bg-[#2D3C49] p-6 sm:p-8 rounded-2xl border border-[#E1E7EE] dark:border-[#40515F] shadow-2xs transition-colors duration-150">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2E4A62] dark:text-[#F2F5F8] tracking-tight">
              {t('citizen.title')}
            </h1>
            <Badge variant="primary" size="md">{t('citizen.badge')}</Badge>
          </div>
          <p className="text-base sm:text-lg text-[#64748B] dark:text-[#B7C3CE] max-w-3xl leading-relaxed">
            {t('citizen.subtitle')}
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex rounded-xl bg-[#F7F9FB] dark:bg-[#202C38] border border-[#E1E7EE] dark:border-[#40515F] p-1.5 shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => setActiveView('report')}
              className={`min-h-[48px] text-base sm:text-lg px-5 py-2.5 rounded-lg font-bold flex items-center gap-2.5 transition-all cursor-pointer select-none ${
                activeView === 'report'
                  ? 'bg-[#7C97B0] dark:bg-[#8FAFCB] text-white dark:text-[#202C38] shadow-sm'
                  : 'text-[#64748B] dark:text-[#B7C3CE] hover:text-[#2E4A62] dark:hover:text-[#F2F5F8]'
              }`}
            >
              <PlusCircle className="w-5 h-5" />
              <span>{t('citizen.fileComplaint')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('track')}
              className={`min-h-[48px] text-base sm:text-lg px-5 py-2.5 rounded-lg font-bold flex items-center gap-2.5 transition-all cursor-pointer select-none ${
                activeView === 'track'
                  ? 'bg-[#7C97B0] dark:bg-[#8FAFCB] text-white dark:text-[#202C38] shadow-sm'
                  : 'text-[#64748B] dark:text-[#B7C3CE] hover:text-[#2E4A62] dark:hover:text-[#F2F5F8]'
              }`}
            >
              <Search className="w-5 h-5" />
              <span>{t('citizen.trackStatus')}</span>
            </button>
          </div>
        </div>

      {/* Main View Area */}
      {activeView === 'report' ? (
        <ReportForm
          onViewTracker={handleViewTracker}
          onReportSubmitted={(res) => {
            if (res?.id || res?.ticketNumber) {
              setSelectedTicketId(res.id || res.ticketNumber);
            }
          }}
        />
      ) : (
        <ComplaintTracker
          initialTicketId={selectedTicketId}
          onNewReportClick={() => setActiveView('report')}
        />
      )}
    </div>
  );
}

export default CitizenPortal;
