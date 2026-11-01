import React, { useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, PlusCircle } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useLanguage } from '../../../context/useLanguage';

export function SubmissionSuccess({
  submissionResult,
  onReset,
  onViewTracker,
}) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const ticketId = submissionResult?.ticketNumber || submissionResult?.id || 'CIV-0000';

  const handleCopyTicket = () => {
    navigator.clipboard.writeText(ticketId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="max-w-2xl mx-auto overflow-hidden">
      <div className="bg-[#7C97B0] dark:bg-[#263746] text-white p-6 sm:p-8 text-center relative">
        <div className="w-16 h-16 rounded-full bg-white/10 mx-auto flex items-center justify-center mb-4 border border-white/20">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <Badge variant="primary" size="sm" className="bg-[#2E4A62] text-white border-white/20">
          Official Complaint Logged
        </Badge>
        <h2 className="text-xl sm:text-2xl font-bold mt-2 tracking-tight">
          {t('citizen.successTitle')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-100 max-w-md mx-auto mt-1 leading-relaxed">
          Your report has been securely registered in the municipal accountability ledger and queued for field dispatch.
        </p>

        {/* Complaint Reference ID Badge */}
        <div className="mt-6 inline-flex items-center gap-2 bg-white/10 backdrop-blur-xs border border-white/25 px-4 py-2 rounded-xl">
          <span className="text-xs text-slate-200">{t('citizen.ticketRef')}:</span>
          <span className="font-mono text-base font-bold text-white tracking-wider">
            #{ticketId}
          </span>
          <button
            type="button"
            onClick={handleCopyTicket}
            className="p-1 hover:bg-white/10 rounded transition-colors text-slate-200 hover:text-white cursor-pointer"
            title="Copy reference ID"
          >
            <Copy className="w-4 h-4" />
          </button>
          {copied && <span className="text-[10px] text-white font-medium">Copied!</span>}
        </div>
      </div>

      <CardContent className="p-6 sm:p-8 space-y-6">
        {/* Ticket Lifecycle Steps */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-[#2E4A62] dark:text-[#F2F5F8] uppercase tracking-wider">
            Accountability Protocol
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-[#F7F9FB] dark:bg-[#202C38] border border-[#E1E7EE] dark:border-[#40515F]">
              <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block mb-1">1. Dispatch</span>
              <p className="text-[#64748B] dark:text-[#B7C3CE] text-[11px]">
                Assigned to department based on triage SLA.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-[#F7F9FB] dark:bg-[#202C38] border border-[#E1E7EE] dark:border-[#40515F]">
              <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block mb-1">2. AI Verification</span>
              <p className="text-[#64748B] dark:text-[#B7C3CE] text-[11px]">
                Field crew submits repair photo for computer vision review.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-[#F7F9FB] dark:bg-[#202C38] border border-[#E1E7EE] dark:border-[#40515F]">
              <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block mb-1">3. Citizen Sign-Off</span>
              <p className="text-[#64748B] dark:text-[#B7C3CE] text-[11px]">
                You receive a verification request to confirm the resolution.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-[#E1E7EE] dark:border-[#40515F] flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={onReset}
          >
            {t('citizen.fileAnother')}
          </Button>

          <Button
            type="button"
            variant="primary"
            icon={<ExternalLink className="w-4 h-4" />}
            iconPosition="right"
            onClick={() => onViewTracker && onViewTracker(ticketId)}
          >
            {t('citizen.trackBtn')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default SubmissionSuccess;
