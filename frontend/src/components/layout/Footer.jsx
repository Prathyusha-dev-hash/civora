import { Shield, EyeOff, HeartHandshake } from 'lucide-react';

const CURRENT_YEAR = 2026;

export function Footer() {
  return (
    <footer className="bg-white dark:bg-[#263746] border-t border-[#E1E7EE] dark:border-[#40515F] mt-auto transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-sm sm:text-base text-[#64748B] dark:text-[#B7C3CE]">
          <div>
            <div className="flex items-center gap-2.5 text-[#2E4A62] dark:text-[#F2F5F8] font-bold text-base sm:text-lg mb-2.5">
              <Shield className="w-5 h-5 text-[#7C97B0] dark:text-[#8FAFCB] shrink-0" />
              <span>Civora Transparency Core</span>
            </div>
            <p className="leading-relaxed">
              Open civic accountability infrastructure connecting residents with municipal departments. Zero fabricated metrics, verified resolution workflows.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2.5 text-[#2E4A62] dark:text-[#F2F5F8] font-bold text-base sm:text-lg mb-2.5">
              <EyeOff className="w-5 h-5 text-[#7C97B0] dark:text-[#8FAFCB] shrink-0" />
              <span>Privacy & Redaction First</span>
            </div>
            <p className="leading-relaxed">
              Citizen reports undergo backend PII masking for faces, vehicle plates, and personal contact information prior to public indexing.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2.5 text-[#2E4A62] dark:text-[#F2F5F8] font-bold text-base sm:text-lg mb-2.5">
              <HeartHandshake className="w-5 h-5 text-[#7C97B0] dark:text-[#8FAFCB] shrink-0" />
              <span>Citizen-Verified Sign-Off</span>
            </div>
            <p className="leading-relaxed">
              Municipal repairs require dual verification: vision-based inspection models paired with mandatory citizen reporter feedback.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#E1E7EE] dark:border-[#40515F] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-[#64748B] dark:text-[#B7C3CE] font-medium">
          <p>© {CURRENT_YEAR} Civora Foundation.</p>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="hover:text-[#2E4A62] dark:hover:text-[#F2F5F8] transition-colors">Senior-Friendly Typography</span>
            <span>•</span>
            <span className="hover:text-[#2E4A62] dark:hover:text-[#F2F5F8] transition-colors">WCAG AAA Contrast</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
