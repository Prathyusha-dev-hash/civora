import React from 'react';
import { HardHat, Camera, CheckSquare, Clock, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';

export function AuthorityPortalPlaceholder() {
  return (
    <div className="space-y-6">
      {/* Portal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#2D3C49] p-6 rounded-xl border border-[#E1E7EE] dark:border-[#40515F]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#2E4A62] dark:text-[#F2F5F8] tracking-tight">Authority Portal</h1>
            <Badge variant="primary" size="sm">Field Operations & Dispatch</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#B7C3CE] max-w-2xl">
            Triage municipal repair tasks, monitor SLA deadlines by AI severity level, and upload resolution proof for computer-vision verification.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<Filter className="w-4 h-4" />}>
            Filter Department
          </Button>
          <Button variant="primary" size="sm">
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Operational Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card hover>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-[#B7791F]/15 text-[#B7791F] dark:text-[#E09E3E] flex items-center justify-center mb-2">
              <Clock className="w-4 h-4" />
            </div>
            <CardTitle>SLA Response Matrix</CardTitle>
            <CardDescription>
              Critical hazards demand 4-hour field deployment; standard maintenance is paced by AI severity tier.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <span className="text-xs text-slate-500 dark:text-[#B7C3CE] font-mono">Dynamic Triage Policy</span>
          </CardFooter>
        </Card>

        <Card hover>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-[#2E7D6B]/15 text-[#2E7D6B] dark:text-[#4EAD97] flex items-center justify-center mb-2">
              <Camera className="w-4 h-4" />
            </div>
            <CardTitle>AI Resolution Verification</CardTitle>
            <CardDescription>
              Backend vision comparison model compares original damage against field officer&apos;s post-repair evidence.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <span className="text-xs text-[#7C97B0] dark:text-[#8FAFCB] font-mono">Vision Validation</span>
          </CardFooter>
        </Card>

        <Card hover>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-[#D6E3EF] dark:bg-[#344656] text-[#2E4A62] dark:text-[#8FAFCB] flex items-center justify-center mb-2">
              <CheckSquare className="w-4 h-4" />
            </div>
            <CardTitle>Citizen Sign-Off</CardTitle>
            <CardDescription>
              Resolutions remain in provisional status until verified by the reporting citizen or supervisory audit.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <span className="text-xs text-slate-500 dark:text-[#B7C3CE] font-mono">Dual-Key Accountability</span>
          </CardFooter>
        </Card>
      </div>

      {/* Work Orders Queue with Strict Empty State */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Active Dispatch Queue</CardTitle>
            <CardDescription>Field tickets sorted by assigned department and urgency tier.</CardDescription>
          </div>
          <Badge variant="neutral" size="sm">0 Pending</Badge>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={HardHat}
            title="Dispatch Queue Empty"
            description="There are currently no active work orders dispatched to your department. When citizens submit verified reports, tickets will be prioritized here automatically."
            actionLabel="Sync Dispatch Records"
            onAction={() => alert('Dispatch sync endpoint configured for Phase 2')}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default AuthorityPortalPlaceholder;
