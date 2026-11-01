import React from 'react';
import { Mic, ShieldAlert, CopyCheck, UserCheck, PlusCircle, Inbox } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';

export function CitizenPortalPlaceholder() {
  return (
    <div className="space-y-6">
      {/* Portal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#2D3C49] p-6 rounded-xl border border-[#E1E7EE] dark:border-[#40515F]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#2E4A62] dark:text-[#F2F5F8] tracking-tight">Citizen Portal</h1>
            <Badge variant="primary" size="sm">Public Access</Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#B7C3CE] max-w-2xl">
            Report local public infrastructure issues with AI-assisted severity classification, automated privacy redaction, and multilingual voice reporting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => alert('New Incident Reporting Flow configured for Phase 2')}
          >
            Report an Issue
          </Button>
        </div>
      </div>

      {/* Feature Capabilities Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hover>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-[#D6E3EF] text-[#7C97B0] dark:bg-[#344656] dark:text-[#8FAFCB] flex items-center justify-center mb-2">
              <Mic className="w-4 h-4" />
            </div>
            <CardTitle>Multilingual Voice</CardTitle>
            <CardDescription>
              Audio transcription service supporting regional languages directly from your microphone.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <span className="text-[#7C97B0] dark:text-[#8FAFCB] font-medium">Backend STT Service</span>
          </CardFooter>
        </Card>

        <Card hover>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-[#D6E3EF] text-[#7C97B0] dark:bg-[#344656] dark:text-[#8FAFCB] flex items-center justify-center mb-2">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <CardTitle>Privacy Redaction</CardTitle>
            <CardDescription>
              Automated image blurring for faces and vehicle license plates before public submission.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <span className="text-[#7C97B0] dark:text-[#8FAFCB] font-medium">Vision Sanitization</span>
          </CardFooter>
        </Card>

        <Card hover>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-[#D6E3EF] text-[#7C97B0] dark:bg-[#344656] dark:text-[#8FAFCB] flex items-center justify-center mb-2">
              <CopyCheck className="w-4 h-4" />
            </div>
            <CardTitle>Duplicate Detection</CardTitle>
            <CardDescription>
              Proximity checks alert you if a nearby pothole or hazard is already active, allowing 1-click upvotes.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <span className="text-[#7C97B0] dark:text-[#8FAFCB] font-medium">Geo-clustering</span>
          </CardFooter>
        </Card>

        <Card hover>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-[#2E7D6B]/15 text-[#2E7D6B] dark:bg-[#2E7D6B]/30 dark:text-[#4EAD97] flex items-center justify-center mb-2">
              <UserCheck className="w-4 h-4" />
            </div>
            <CardTitle>Citizen Verification</CardTitle>
            <CardDescription>
              Authorities cannot close an issue without submitting repair proof and receiving citizen sign-off.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <span className="text-[#7C97B0] dark:text-[#8FAFCB] font-medium">Closed-loop Audit</span>
          </CardFooter>
        </Card>
      </div>

      {/* Citizen Active Submissions List with Strict Empty State */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Tracked Reports</CardTitle>
            <CardDescription>Your reported civic incidents and their real-time resolution status.</CardDescription>
          </div>
          <Badge variant="neutral" size="sm">0 Active</Badge>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Inbox}
            title="No Incidents Reported Yet"
            description="You have not submitted any civic complaints. When you submit a report with photos or voice notes, it will appear here with live municipal tracking."
            actionLabel="Submit First Report"
            actionIcon={<PlusCircle className="w-4 h-4" />}
            onAction={() => alert('New Incident Reporting Flow configured for Phase 2')}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default CitizenPortalPlaceholder;

