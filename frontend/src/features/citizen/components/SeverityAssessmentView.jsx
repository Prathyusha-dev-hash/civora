import React from 'react';
import { Sparkles, AlertCircle, Clock, Building } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';

export function SeverityAssessmentView({
  assessment = null,
  isLoading = false,
  error = null,
}) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#2D3C49] rounded-xl p-6 border border-[#E1E7EE] dark:border-[#40515F] shadow-2xs">
        <LoadingSpinner
          label="Running Backend AI Severity & Triage Analysis..."
          size="md"
        />
        <p className="text-[11px] text-center text-[#64748B] dark:text-[#B7C3CE] mt-2">
          Evaluating structural risk, traffic safety, and SLA routing criteria via backend inference.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/40 rounded-xl p-4 sm:p-5 border border-amber-200 dark:border-amber-800/50 space-y-2">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Backend AI Triage Service Offline</span>
        </div>
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          {error}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-[#819990] italic">
          Your complaint will still be submitted successfully and triaged manually by municipal officers.
        </p>
      </div>
    );
  }

  if (!assessment) {
    return null;
  }

  const levelBadgeVariants = {
    CRITICAL: 'critical',
    HIGH: 'warning',
    MODERATE: 'info',
    LOW: 'neutral',
  };

  return (
    <div className="bg-white dark:bg-[#2D3C49] rounded-xl p-5 border border-[#E1E7EE] dark:border-[#40515F] shadow-2xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#E1E7EE] dark:border-[#40515F]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#D6E3EF] dark:bg-[#344656] text-[#7C97B0] dark:text-[#8FAFCB] flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-[#2E4A62] dark:text-[#F2F5F8]">
              AI Severity & Routing Assessment
            </h4>
            <p className="text-[11px] text-[#64748B] dark:text-[#B7C3CE]">
              Verified assessment provided by backend civic triage service
            </p>
          </div>
        </div>

        <Badge
          variant={levelBadgeVariants[assessment.severityLevel] || 'primary'}
          size="md"
        >
          {assessment.severityLevel} PRIORITY
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#F7F9FB] dark:bg-[#202C38] p-3 rounded-lg border border-[#E1E7EE] dark:border-[#40515F]">
          <span className="text-[11px] text-[#64748B] dark:text-[#B7C3CE] font-medium block">Hazard Score</span>
          <span className="text-lg font-bold text-[#2E4A62] dark:text-[#F2F5F8] font-mono">
            {assessment.score ? `${assessment.score}/10` : 'N/A'}
          </span>
        </div>

        <div className="bg-[#F7F9FB] dark:bg-[#202C38] p-3 rounded-lg border border-[#E1E7EE] dark:border-[#40515F]">
          <span className="text-[11px] text-[#64748B] dark:text-[#B7C3CE] font-medium block flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#7C97B0] dark:text-[#8FAFCB]" /> Target SLA
          </span>
          <span className="text-base font-semibold text-[#2E4A62] dark:text-[#F2F5F8]">
            {assessment.targetSlaHours ? `${assessment.targetSlaHours} Hours` : 'Standard Dispatch'}
          </span>
        </div>

        <div className="bg-[#F7F9FB] dark:bg-[#202C38] p-3 rounded-lg border border-[#E1E7EE] dark:border-[#40515F]">
          <span className="text-[11px] text-[#64748B] dark:text-[#B7C3CE] font-medium block flex items-center gap-1">
            <Building className="w-3 h-3 text-[#7C97B0] dark:text-[#8FAFCB]" /> Department
          </span>
          <span className="text-sm font-semibold text-[#2E4A62] dark:text-[#F2F5F8] truncate block">
            {assessment.suggestedDepartment || 'Municipal Operations'}
          </span>
        </div>
      </div>

      {assessment.explanation && (
        <div className="text-xs text-[#2E4A62] dark:text-[#B7C3CE] bg-[#D6E3EF]/30 dark:bg-[#344656]/30 p-3 rounded-lg border border-[#E1E7EE] dark:border-[#40515F]">
          <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block mb-0.5">Triage Rationale:</span>
          <p className="leading-relaxed">{assessment.explanation}</p>
        </div>
      )}

      {assessment.factors && assessment.factors.length > 0 && (
        <div>
          <span className="text-xs font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block mb-1.5">
            Contributing Risk Factors:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {assessment.factors.map((factor, index) => (
              <span
                key={index}
                className="text-[11px] bg-[#D6E3EF] dark:bg-[#344656] text-[#2E4A62] dark:text-[#8FAFCB] px-2.5 py-1 rounded-md border border-[#7C97B0]/30 dark:border-[#8FAFCB]/30 font-medium"
              >
                {factor}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SeverityAssessmentView;
