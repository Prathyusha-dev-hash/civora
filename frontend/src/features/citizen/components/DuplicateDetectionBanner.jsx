import React, { useState } from 'react';
import { CopyCheck, ThumbsUp, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { CivicApiService } from '../../../services/api/client';

export function DuplicateDetectionBanner({
  duplicates = [],
  onSupportExisting,
  onProceedAnyway,
}) {
  const [supportedId, setSupportedId] = useState(null);
  const [isSupporting, setIsSupporting] = useState(false);
  const [supportMessage, setSupportMessage] = useState(null);

  if (!duplicates || duplicates.length === 0) {
    return null;
  }

  const handleSupport = async (incidentId) => {
    setIsSupporting(true);
    setSupportMessage(null);
    try {
      const result = await CivicApiService.supportIncident(incidentId);
      setSupportedId(incidentId);
      setSupportMessage(
        `Thank you! Your endorsement was added to Ticket #${incidentId}. This escalates municipal urgency without creating a redundant ticket.`
      );
      if (onSupportExisting) {
        onSupportExisting(incidentId, result);
      }
    } catch (err) {
      setSupportMessage(`Failed to support incident: ${err.message}`);
    } finally {
      setIsSupporting(false);
    }
  };

  return (
    <div className="bg-amber-50/80 dark:bg-amber-950/30 rounded-xl p-4 sm:p-5 border border-amber-300 dark:border-amber-800/60 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-600 dark:bg-amber-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
          <CopyCheck className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">
              Nearby Similar Reports Detected ({duplicates.length})
            </h4>
            <Badge variant="warning" size="sm">Proximity Match</Badge>
          </div>
          <p className="text-xs text-amber-900/90 dark:text-amber-300/90 mt-1 leading-relaxed">
            Citizens in this vicinity have already logged reports for a similar issue. Supporting an existing ticket consolidates municipal field dispatch and prevents ticket fragmentation.
          </p>
        </div>
      </div>

      {supportMessage && (
        <div className="p-3 bg-white dark:bg-[#202C38] rounded-lg border border-amber-200 dark:border-amber-800/50 text-xs text-slate-800 dark:text-[#F2F5F8] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#2E7D6B] dark:text-[#4EAD97] shrink-0" />
          <span>{supportMessage}</span>
        </div>
      )}

      {/* List of Duplicate Matches (Real backend items only) */}
      <div className="space-y-2.5">
        {duplicates.map((item) => {
          const isThisSupported = supportedId === item.id;
          return (
            <div
              key={item.id}
              className="bg-white dark:bg-[#202C38] rounded-lg p-3.5 border border-amber-200 dark:border-amber-800/50 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-[#2E4A62] dark:text-[#8FAFCB]">
                    Ticket #{item.id}
                  </span>
                  <Badge variant="neutral" size="sm">{item.category}</Badge>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {item.approxLocation || `${item.distanceMeters ?? 'Nearby'}m away`}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                  {item.description}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>Status: <strong className="text-slate-800 dark:text-slate-200">{item.status || 'Active'}</strong></span>
                  <span>•</span>
                  <span>Supporters: <strong className="text-[#2E4A62] dark:text-[#8FAFCB]">{item.supportCount ?? 1}</strong></span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <Button
                  type="button"
                  variant={isThisSupported ? 'subtle' : 'secondary'}
                  size="sm"
                  disabled={isThisSupported || isSupporting}
                  loading={isSupporting && supportedId === item.id}
                  icon={<ThumbsUp className="w-3.5 h-3.5" />}
                  onClick={() => handleSupport(item.id)}
                >
                  {isThisSupported ? 'Supported' : 'Support This Report'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bypass / Proceed Anyway CTA */}
      <div className="pt-2 flex items-center justify-between text-xs border-t border-amber-200/70">
        <span className="text-amber-900">
          Not the same issue? You can submit your report separately.
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={<ArrowRight className="w-3.5 h-3.5" />}
          iconPosition="right"
          onClick={onProceedAnyway}
        >
          Submit As New Incident
        </Button>
      </div>
    </div>
  );
}

export default DuplicateDetectionBanner;
