import React, { useState, useRef } from 'react';
import { UploadCloud, ShieldAlert, ShieldCheck, Trash2, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { CivicApiService } from '../../../services/api/client';

export function ImagePrivacyUpload({
  imageFile,
  onImageChange,
  redactedData,
  onRedactedDataChange,
}) {
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState('original');
  const [processingStatus, setProcessingStatus] = useState('idle');
  const [processingError, setProcessingError] = useState(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState(null);

  const fileInputRef = useRef(null);

  // Handle Drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectFile(e.target.files[0]);
    }
  };

  const handleSelectFile = (file) => {
    // Same formats the backend accepts; HEIC/GIF/BMP would otherwise fail only at final submission
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Please upload a JPEG, PNG, or WebP photo. (On iPhone, set Camera > Formats to "Most Compatible".)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File exceeds 10MB limit.');
      return;
    }

    if (originalPreviewUrl) {
      URL.revokeObjectURL(originalPreviewUrl);
    }
    const newUrl = URL.createObjectURL(file);
    setOriginalPreviewUrl(newUrl);

    onImageChange(file);
    onRedactedDataChange(null);
    setProcessingStatus('idle');
    setProcessingError(null);
    setActiveTab('original');
  };

  const handleRemoveImage = () => {
    if (originalPreviewUrl) {
      URL.revokeObjectURL(originalPreviewUrl);
      setOriginalPreviewUrl(null);
    }
    onImageChange(null);
    onRedactedDataChange(null);
    setProcessingStatus('idle');
    setProcessingError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Trigger backend privacy redaction service
  const handleRedactImage = async () => {
    if (!imageFile) return;

    setProcessingStatus('processing');
    setProcessingError(null);

    try {
      const result = await CivicApiService.redactPii(imageFile);
      if (result && result.redacted) {
        onRedactedDataChange(result);
        setProcessingStatus('success');
        setActiveTab('redacted');
      } else {
        throw new Error('Backend privacy service did not return a redacted asset.');
      }
    } catch (err) {
      setProcessingStatus('failed');
      setProcessingError(
        err.message || 'Backend privacy redaction service failed or is unavailable.'
      );
      onRedactedDataChange(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="block text-xs font-semibold text-[#2E4A62] dark:text-[#F2F5F8]">
            Incident Evidence & Privacy Redaction
          </span>
          <p className="text-[11px] text-[#64748B] dark:text-[#B7C3CE]">
            Upload damage photos. Faces, vehicle license plates, and sensitive documents are processed via our backend privacy service.
          </p>
        </div>

        {imageFile && (
          <div className="flex items-center gap-1.5">
            {redactedData?.redacted ? (
              <Badge variant="success" size="sm" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                Privacy Protected
              </Badge>
            ) : (
              <Badge variant="warning" size="sm" icon={<ShieldAlert className="w-3.5 h-3.5" />}>
                Redaction Pending
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Upload Drag & Drop Area */}
      {imageFile ? (
        /* Image Preview & Privacy Management Panel */
        <div className="bg-white dark:bg-[#2D3C49] rounded-xl border border-[#E1E7EE] dark:border-[#40515F] overflow-hidden shadow-2xs">
          {/* Top Bar with View Mode Toggles */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border-b border-[#E1E7EE] dark:border-[#40515F] bg-[#F7F9FB] dark:bg-[#202C38] gap-2">
            <div className="flex rounded-lg bg-white dark:bg-[#2D3C49] border border-[#E1E7EE] dark:border-[#40515F] p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab('original')}
                className={`text-xs px-3 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'original'
                    ? 'bg-[#7C97B0] dark:bg-[#8FAFCB] text-white dark:text-[#202C38]'
                    : 'text-[#64748B] dark:text-[#B7C3CE] hover:text-[#2E4A62] dark:hover:text-[#F2F5F8]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Original (Private Intake)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('redacted')}
                className={`text-xs px-3 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'redacted'
                    ? 'bg-[#7C97B0] dark:bg-[#8FAFCB] text-white dark:text-[#202C38]'
                    : 'text-[#64748B] dark:text-[#B7C3CE] hover:text-[#2E4A62] dark:hover:text-[#F2F5F8]'
                }`}
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Public Preview (Redacted)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {!redactedData?.redacted && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={processingStatus === 'processing'}
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                  onClick={handleRedactImage}
                >
                  Apply AI Privacy Redaction
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<Trash2 className="w-3.5 h-3.5 text-red-600" />}
                onClick={handleRemoveImage}
              >
                Remove
              </Button>
            </div>
          </div>

          {/* Active Preview View */}
          <div className="p-4 flex flex-col items-center justify-center bg-slate-900/5 min-h-[220px]">
            {activeTab === 'original' ? (
              <div className="relative max-h-72 w-full flex justify-center">
                <img
                  src={originalPreviewUrl}
                  alt="Original civic evidence"
                  className="max-h-72 object-contain rounded-lg border border-[#E1E7EE] dark:border-[#40515F] shadow-xs"
                />
                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded font-mono">
                  Internal Private Intake View
                </div>
              </div>
            ) : redactedData?.redacted ? (
              <div className="relative max-h-72 w-full flex justify-center">
                <img
                  src={redactedData.redactedImageUrl}
                  alt="Redacted civic evidence"
                  className="max-h-72 object-contain rounded-lg border border-[#E1E7EE] dark:border-[#40515F] shadow-xs"
                />
                <div className="absolute top-2 left-2 bg-[#7C97B0] dark:bg-[#8FAFCB] text-white dark:text-[#202C38] text-[10px] px-2 py-0.5 rounded font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-white dark:text-[#202C38]" />
                  Public Verified Safe
                </div>
              </div>
            ) : (
              /* Enforce rule: Prevent unredacted images from being publicly displayed */
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center max-w-sm">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                  <ShieldAlert className="w-6 h-6 stroke-[1.75]" />
                </div>
                <h5 className="text-xs font-semibold text-[#2E4A62] dark:text-[#F2F5F8]">
                  Unredacted Image Blocked From Public Preview
                </h5>
                <p className="text-[11px] text-[#64748B] dark:text-[#B7C3CE] mt-1 leading-relaxed">
                  To protect public privacy (identifiable faces, license plates), this image cannot be published until backend AI privacy redaction completes successfully.
                </p>
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={processingStatus === 'processing'}
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                    onClick={handleRedactImage}
                  >
                    Run Privacy Redaction Now
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Redaction Status & Detected Metrics (Only if returned by service) */}
          {redactedData && redactedData.redacted && (
            <div className="p-3 bg-[#2E7D6B]/10 dark:bg-[#2E7D6B]/20 border-t border-[#E1E7EE] dark:border-[#40515F] flex flex-wrap items-center justify-between text-xs text-slate-700 dark:text-slate-300 gap-2">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-[#2E7D6B] dark:text-[#4EAD97] flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-[#2E7D6B] dark:text-[#4EAD97]" />
                  Sensitive Features Redacted:
                </span>
                <span className="bg-white dark:bg-[#202C38] px-2 py-0.5 rounded border border-[#2E7D6B]/30 dark:border-[#4EAD97]/40 text-[#2E4A62] dark:text-[#F2F5F8] font-mono text-[11px]">
                  Faces: {redactedData.facesDetected ?? 0}
                </span>
                <span className="bg-white dark:bg-[#202C38] px-2 py-0.5 rounded border border-[#2E7D6B]/30 dark:border-[#4EAD97]/40 text-[#2E4A62] dark:text-[#F2F5F8] font-mono text-[11px]">
                  Plates: {redactedData.licensePlatesDetected ?? 0}
                </span>
              </div>
              {redactedData.processingTimeMs && (
                <span className="text-[11px] text-slate-500 font-mono">
                  Latency: {redactedData.processingTimeMs}ms
                </span>
              )}
            </div>
          )}

          {/* Error Message when service fails */}
          {processingStatus === 'failed' && (
            <div className="p-3 bg-red-50 border-t border-red-200 flex items-center justify-between text-xs text-red-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                <span>{processingError}</span>
              </div>
              <button
                type="button"
                onClick={handleRedactImage}
                className="font-medium underline hover:text-red-950 ml-2 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          aria-label="Upload incident evidence photo"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-colors duration-150 ${
            dragActive
              ? 'border-[#7C97B0] dark:border-[#8FAFCB] bg-[#D6E3EF]/40 dark:bg-[#344656]/40'
              : 'border-[#E1E7EE] dark:border-[#40515F] bg-white dark:bg-[#2D3C49] hover:border-[#7C97B0] dark:hover:border-[#8FAFCB] hover:bg-[#F7F9FB] dark:hover:bg-[#202C38]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-[#D6E3EF] dark:bg-[#344656] text-[#7C97B0] dark:text-[#8FAFCB] flex items-center justify-center shadow-2xs">
              <UploadCloud className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#2E4A62] dark:text-[#F2F5F8]">
                Click to upload or drag & drop photo
              </p>
              <p className="text-xs text-[#64748B] dark:text-[#B7C3CE] mt-0.5">
                PNG, JPG or WebP (max 10MB)
              </p>
            </div>
          </div>
        </button>
      )}
    </div>
  );
}

export default ImagePrivacyUpload;
