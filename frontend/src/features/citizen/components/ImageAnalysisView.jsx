import React from 'react';
import { ImageIcon, AlertCircle, AlertTriangle, Building, Gauge, RefreshCw, Eye, ListChecks, HelpCircle } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';

const STATUS_BADGES = {
  CIVIC_ISSUE: { variant: 'success', label: 'CIVIC ISSUE DETECTED' },
  NOT_CIVIC: { variant: 'warning', label: 'NOT A CIVIC ISSUE' },
  UNCLEAR: { variant: 'warning', label: 'PHOTO UNCLEAR' },
};

const SEVERITY_BADGES = { CRITICAL: 'critical', HIGH: 'warning', MODERATE: 'info', LOW: 'neutral' };

const ISSUE_LABELS = {
  pothole_or_damaged_road: 'Pothole / damaged road',
  garbage_accumulation: 'Garbage accumulation',
  overflowing_dustbin: 'Overflowing dustbin',
  water_leakage: 'Water leakage',
  drainage_or_sewage: 'Drainage / sewage issue',
  broken_streetlight: 'Broken streetlight',
  damaged_public_infrastructure: 'Damaged public infrastructure',
  waterlogging: 'Waterlogging',
  other_civic_issue: 'Other civic issue',
  not_civic_issue: 'Not a civic issue',
  unclear: 'Unclear',
};

function DetailList({ icon: Icon, title, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <span className="text-xs font-semibold text-[#2E4A62] dark:text-[#F2F5F8] flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-[#7C97B0] dark:text-[#8FAFCB]" /> {title}
      </span>
      <ul className="list-disc pl-5 space-y-0.5 text-xs text-[#64748B] dark:text-[#B7C3CE] leading-relaxed">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Citizen-facing result of the backend photo analysis (Gemini via the AI service).
 */
export function ImageAnalysisView({ analysis = null, isLoading = false, error = null, onRetry }) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#2D3C49] rounded-xl p-6 border border-[#E1E7EE] dark:border-[#40515F] shadow-2xs">
        <LoadingSpinner label="Analysing your photo..." size="md" />
        <p className="text-[11px] text-center text-[#64748B] dark:text-[#B7C3CE] mt-2">
          Checking what the photo shows and which department handles it.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/40 rounded-xl p-4 sm:p-5 border border-amber-200 dark:border-amber-800/50 space-y-2">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Photo analysis failed</span>
        </div>
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{error}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500 dark:text-[#819990] italic">
            Your photo is still attached and will be submitted with the complaint.
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#2D3C49] text-[#2E4A62] dark:text-[#F2F5F8] border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry analysis
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const status = STATUS_BADGES[analysis.status] || STATUS_BADGES.UNCLEAR;
  const isIssue = analysis.status === 'CIVIC_ISSUE';

  return (
    <div className="bg-white dark:bg-[#2D3C49] rounded-xl p-5 border border-[#E1E7EE] dark:border-[#40515F] shadow-2xs space-y-4">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#E1E7EE] dark:border-[#40515F]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#D6E3EF] dark:bg-[#344656] text-[#7C97B0] dark:text-[#8FAFCB] flex items-center justify-center">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-[#2E4A62] dark:text-[#F2F5F8]">AI Photo Analysis</h4>
            <p className="text-[11px] text-[#64748B] dark:text-[#B7C3CE]">Based only on what is visible in your photo</p>
          </div>
        </div>
        <Badge variant={status.variant} size="md">{status.label}</Badge>
      </div>

      {analysis.warnings.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-800/50">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            {analysis.warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#F7F9FB] dark:bg-[#202C38] p-3 rounded-lg border border-[#E1E7EE] dark:border-[#40515F]">
          <span className="text-[11px] text-[#64748B] dark:text-[#B7C3CE] font-medium block">Issue Type</span>
          <span className="text-sm font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block">
            {ISSUE_LABELS[analysis.issueType] || analysis.detectedIssue || 'Unknown'}
          </span>
        </div>

        <div className="bg-[#F7F9FB] dark:bg-[#202C38] p-3 rounded-lg border border-[#E1E7EE] dark:border-[#40515F]">
          <span className="text-[11px] text-[#64748B] dark:text-[#B7C3CE] font-medium flex items-center gap-1">
            <Building className="w-3 h-3 text-[#7C97B0] dark:text-[#8FAFCB]" /> Suggested Department
          </span>
          <span className="text-sm font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block">
            {isIssue && analysis.suggestedDepartment ? analysis.suggestedDepartment : 'Not determined'}
          </span>
        </div>

        <div className="bg-[#F7F9FB] dark:bg-[#202C38] p-3 rounded-lg border border-[#E1E7EE] dark:border-[#40515F]">
          <span className="text-[11px] text-[#64748B] dark:text-[#B7C3CE] font-medium flex items-center gap-1">
            <Gauge className="w-3 h-3 text-[#7C97B0] dark:text-[#8FAFCB]" /> Visual Priority
          </span>
          {isIssue && analysis.visualSeverity ? (
            <Badge variant={SEVERITY_BADGES[analysis.visualSeverity] || 'primary'} size="sm">
              {analysis.visualSeverity}
            </Badge>
          ) : (
            <span className="text-sm font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block">Not determined</span>
          )}
          {analysis.confidence !== null && (
            <span className="text-[11px] text-[#64748B] dark:text-[#B7C3CE] block mt-1">
              Confidence {Math.round(analysis.confidence * 100)}%
            </span>
          )}
        </div>
      </div>

      {analysis.description && (
        <div className="text-xs text-[#2E4A62] dark:text-[#B7C3CE] bg-[#D6E3EF]/30 dark:bg-[#344656]/30 p-3 rounded-lg border border-[#E1E7EE] dark:border-[#40515F]">
          <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] block mb-0.5">What the photo shows:</span>
          <p className="leading-relaxed">{analysis.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DetailList icon={Eye} title="Visible observations" items={analysis.visibleObservations} />
        <DetailList icon={ListChecks} title="Supporting evidence" items={isIssue ? analysis.evidence : []} />
      </div>
      <DetailList icon={HelpCircle} title="Cannot be determined from the photo" items={analysis.uncertainties} />

      {analysis.disclaimer && (
        <p className="text-[11px] text-[#64748B] dark:text-[#B7C3CE] italic">{analysis.disclaimer}</p>
      )}
    </div>
  );
}

export default ImageAnalysisView;
