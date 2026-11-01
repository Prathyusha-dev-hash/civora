import React, { useState } from 'react';
import {
  AlertTriangle,
  Droplets,
  Trash2,
  Lightbulb,
  ShieldAlert,
  TrafficCone,
  Trees,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Send,
  AlertCircle,
  Keyboard,
  Mic,
  CheckCircle2,
  Languages,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Textarea } from '../../../components/ui/Textarea';
import { VoiceRecorder } from './VoiceRecorder';
import { ImagePrivacyUpload } from './ImagePrivacyUpload';
import { LocationPickerMap } from './LocationPickerMap';
import { DuplicateDetectionBanner } from './DuplicateDetectionBanner';
import { SeverityAssessmentView } from './SeverityAssessmentView';
import { ImageAnalysisView } from './ImageAnalysisView';
import { SubmissionSuccess } from './SubmissionSuccess';
import { IncidentService, AiService } from '../../../services';
import { useLanguage } from '../../../context/useLanguage';
import { getLanguageMetadata } from '../../../i18n';

const CIVIC_CATEGORIES = [
  { id: 'roads', label: 'Roads & Potholes', icon: AlertTriangle, description: 'Craters, road cave-ins, broken asphalt' },
  { id: 'water', label: 'Water & Drainage', icon: Droplets, description: 'Burst pipelines, sewage overflows, flooded drains' },
  { id: 'sanitation', label: 'Waste & Sanitation', icon: Trash2, description: 'Uncollected garbage, open dumping, dead animal' },
  { id: 'lighting', label: 'Streetlighting & Power', icon: Lightbulb, description: 'Dark streets, dangling live wires, damaged poles' },
  { id: 'safety', label: 'Public Safety Hazard', icon: ShieldAlert, description: 'Open manholes, unsafe construction, structural risks' },
  { id: 'traffic', label: 'Traffic & Signals', icon: TrafficCone, description: 'Non-functional signals, missing signage, blocked lanes' },
  { id: 'parks', label: 'Parks & Trees', icon: Trees, description: 'Fallen trees, overgrown foliage blocking visibility' },
  { id: 'other', label: 'Other Civic Issues', icon: HelpCircle, description: 'General municipal accountability issues' },
];

export function ReportForm({ onReportSubmitted, onViewTracker }) {
  const { language, t } = useLanguage();

  // Wizard Step: 1 (Category & Description), 2 (Media & Privacy), 3 (Location), 4 (AI Review & Submit), 5 (Success)
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [category, setCategory] = useState('');

  // Mutually Exclusive Input Method State ('text' | 'audio')
  // Text mode is default; audio is never forced or prioritised.
  const [inputMethod, setInputMethod] = useState('text');
  const [textDescription, setTextDescription] = useState('');
  const [audioTranscription, setAudioTranscription] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState('idle');

  // Input Method Switching Confirmation Dialog State
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [pendingInputMethod, setPendingInputMethod] = useState(null);

  // Media & Location
  const [imageFile, setImageFile] = useState(null);
  const [redactedData, setRedactedData] = useState(null);
  const [coordinates, setCoordinates] = useState({ lat: 28.6139, lng: 77.2090 });
  const [address, setAddress] = useState('');

  // AI & Duplicate State
  const [aiAssessment, setAiAssessment] = useState(null);
  const [isAssessing, setIsAssessing] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [imageAnalysis, setImageAnalysis] = useState(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageAnalysisError, setImageAnalysisError] = useState(null);
  const [duplicates, setDuplicates] = useState([]);

  // English Translation State
  const [englishTranslation, setEnglishTranslation] = useState(null);
  const [translationStatus, setTranslationStatus] = useState('idle'); // 'idle' | 'translating' | 'success' | 'error' | 'not_applicable'
  const [translationError, setTranslationError] = useState(null);
  const [translationMetadata, setTranslationMetadata] = useState(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Field Validation Errors
  const [errors, setErrors] = useState({});

  // Exactly ONE canonical description is maintained at all times
  const canonicalDescription = inputMethod === 'text'
    ? textDescription.trim()
    : audioTranscription.trim();

  // Handle switching between Text and Audio input methods
  const handleRequestSwitch = (targetMethod) => {
    if (targetMethod === inputMethod) return;

    const hasActiveText = inputMethod === 'text' && textDescription.trim().length > 0;
    const hasActiveAudio = inputMethod === 'audio' && (audioBlob !== null || audioTranscription.trim().length > 0);

    // If citizen has typed or recorded content, ask confirmation before discarding
    if (hasActiveText || hasActiveAudio) {
      setPendingInputMethod(targetMethod);
      setShowSwitchModal(true);
    } else {
      performSwitch(targetMethod);
    }
  };

  const confirmSwitch = () => {
    if (pendingInputMethod) {
      performSwitch(pendingInputMethod);
    }
    setShowSwitchModal(false);
    setPendingInputMethod(null);
  };

  const cancelSwitch = () => {
    setShowSwitchModal(false);
    setPendingInputMethod(null);
  };

  const performSwitch = (targetMethod) => {
    if (targetMethod === 'text') {
      // Discard recorded audio and transcription
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioBlob(null);
      setAudioUrl(null);
      setAudioTranscription('');
      setTranscriptionStatus('idle');
      setInputMethod('text');
    } else {
      // Discard typed text
      setTextDescription('');
      setInputMethod('audio');
    }

    if (errors.description) {
      setErrors((prev) => ({ ...prev, description: undefined }));
    }
  };

  // Reset Form
  const handleResetForm = () => {
    setCurrentStep(1);
    setCategory('');
    setInputMethod('text');
    setTextDescription('');
    setAudioTranscription('');
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscriptionStatus('idle');
    setEnglishTranslation(null);
    setTranslationStatus('idle');
    setTranslationError(null);
    setTranslationMetadata(null);
    setImageFile(null);
    setRedactedData(null);
    setCoordinates({ lat: 28.6139, lng: 77.2090 });
    setAddress('');
    setAiAssessment(null);
    setImageAnalysis(null);
    setImageAnalysisError(null);
    setDuplicates([]);
    setSubmissionResult(null);
    setSubmissionError(null);
    setErrors({});
  };

  // Step 1 Validation
  const validateStep1 = () => {
    const errs = {};
    if (!category) {
      errs.category = t('citizen.categoryRequired') || 'Please select a civic issue category.';
    }

    if (inputMethod === 'text') {
      if (!textDescription || textDescription.trim().length < 10) {
        errs.description = t('citizen.descriptionMinLength') || 'Please provide a detailed description (minimum 10 characters).';
      }
    } else {
      // Audio mode validation
      if (!audioBlob) {
        errs.description = t('citizen.audioRequiredError');
      } else if (transcriptionStatus !== 'success' || !audioTranscription || audioTranscription.trim().length < 10) {
        errs.description = t('citizen.transcriptionPendingError');
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    const errs = {};
    if (!coordinates || !coordinates.lat || !coordinates.lng) {
      errs.coordinates = 'Please select the incident location on the map.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Analyse the evidence photo; resolves to the analysis or null and never throws
  const runImageAnalysis = async () => {
    if (!imageFile) {
      setImageAnalysis(null);
      setImageAnalysisError(null);
      return null;
    }
    setIsAnalyzingImage(true);
    setImageAnalysisError(null);
    try {
      const result = await AiService.analyzeImage(imageFile, { category, description: canonicalDescription });
      setImageAnalysis(result);
      return result;
    } catch (err) {
      setImageAnalysis(null);
      setImageAnalysisError(err.message || 'Photo analysis is temporarily unavailable.');
      return null;
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const runSeverityAssessment = (description, analysis) => {
    setIsAssessing(true);
    setAiError(null);
    return AiService.assessSeverity({
      category,
      description,
      location: coordinates,
      image_findings: analysis?.imageFindings || [],
    })
      .then((data) => {
        setAiAssessment(data);
      })
      .catch((err) => {
        setAiError(err.message || 'AI severity assessment service currently unavailable.');
      })
      .finally(() => {
        setIsAssessing(false);
      });
  };

  const handleRetryImageAnalysis = async () => {
    const analysis = await runImageAnalysis();
    if (analysis) runSeverityAssessment(englishTranslation || canonicalDescription, analysis);
  };

  // Call real backend AI services (strictly one canonical description with English translation for cross-language matching)
  const runBackendPreChecks = async () => {
    setIsAssessing(true);
    setAiError(null);
    // Photo analysis runs alongside translation; severity waits for both
    const imageAnalysisPromise = runImageAnalysis();

    let effectiveEnglishTranslation = canonicalDescription;

    if (language !== 'en') {
      setTranslationStatus('translating');
      setTranslationError(null);
      try {
        const transResult = await AiService.translateText({
          text: canonicalDescription,
          sourceLanguage: language,
          targetLanguage: 'en',
        });
        effectiveEnglishTranslation = transResult.translatedText;
        setEnglishTranslation(transResult.translatedText);
        setTranslationStatus('success');
        setTranslationMetadata(transResult.metadata);
      } catch (err) {
        effectiveEnglishTranslation = null;
        setTranslationStatus('error');
        setTranslationError(err.message || 'English translation pipeline offline.');
      }
    } else {
      setEnglishTranslation(canonicalDescription);
      setTranslationStatus('not_applicable');
      effectiveEnglishTranslation = canonicalDescription;
    }

    // 2. Proximity Duplicate Detection across languages (does not need the photo result)
    AiService.checkDuplicates({
      lat: coordinates.lat,
      lng: coordinates.lng,
      category,
      englishTranslation: effectiveEnglishTranslation,
      description: canonicalDescription,
      originalLanguage: language,
    })
      .then((data) => {
        if (data && data.duplicates) {
          setDuplicates(data.duplicates);
        } else {
          setDuplicates([]);
        }
      })
      .catch(() => {
        setDuplicates([]);
      });

    // 1. AI Severity Assessment, informed by what the photo shows
    const analysis = await imageAnalysisPromise;
    runSeverityAssessment(effectiveEnglishTranslation || canonicalDescription, analysis);
  };

  const handleRetryTranslation = () => {
    runBackendPreChecks();
  };

  // Navigation: Next
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!validateStep3()) return;
      setCurrentStep(4);
      runBackendPreChecks();
    }
  };

  // Navigation: Back
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Final Submission to API
  const handleSubmitReport = async () => {
    setIsSubmitting(true);
    setSubmissionError(null);

    const effectiveEngTrans = englishTranslation || (language === 'en' ? canonicalDescription : null);
    const effectiveTransStatus = translationStatus === 'success'
      ? 'TRANSLATED'
      : (language === 'en'
        ? 'NOT_APPLICABLE'
        : (translationStatus === 'error' ? 'FAILED' : 'PENDING'));

    // UI model consumed by toCreateIncidentDTO / toCreateIncidentFormData.
    // The actual image and audio files are uploaded; temporary blob: preview URLs are never sent.
    const incidentPayload = {
      category,
      description: canonicalDescription,
      originalText: canonicalDescription,
      originalLanguage: language,
      inputMethod,
      hasAudio: inputMethod === 'audio' && Boolean(audioBlob),
      audioBlob: inputMethod === 'audio' ? audioBlob : null,
      englishTranslation: effectiveEngTrans,
      transcriptionStatus: inputMethod === 'audio' ? (transcriptionStatus === 'success' ? 'transcribed' : 'none') : 'none',
      translationStatus: effectiveTransStatus,
      translationMetadata,
      location: {
        lat: coordinates.lat,
        lng: coordinates.lng,
        address: address.trim() || undefined,
      },
      imageFile,
      hasImage: !!imageFile,
      isRedacted: !!redactedData?.redacted,
      redactedEvidenceId: redactedData?.redactedEvidenceId || null,
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await IncidentService.createIncident(incidentPayload);
      setSubmissionResult(response);
      setCurrentStep(5);
      if (onReportSubmitted) {
        onReportSubmitted(response);
      }
    } catch (err) {
      setSubmissionError(err.message || 'An error occurred while submitting your complaint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Step 5 (Confirmation)
  if (currentStep === 5 && submissionResult) {
    return (
      <SubmissionSuccess
        submissionResult={submissionResult}
        onReset={handleResetForm}
        onViewTracker={onViewTracker}
      />
    );
  }

  const getStepTitle = (stepNum) => {
    switch (stepNum) {
      case 1:
        return t('citizen.step1Title');
      case 2:
        return t('citizen.step2Title');
      case 3:
        return t('citizen.step3Title');
      case 4:
      default:
        return t('citizen.step4Title');
    }
  };

  return (
    <>
      <Card className="max-w-3xl mx-auto border-[#E1E7EE] dark:border-[#40515F]">
        {/* Wizard Step Progress Indicator */}
        <CardHeader className="bg-[#E7EEF5]/50 dark:bg-[#263746]/50 border-b border-[#E1E7EE] dark:border-[#40515F]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle>{t('citizen.fileComplaint')}</CardTitle>
              <CardDescription>
                {t('citizen.stepOf', { current: currentStep })}: {getStepTitle(currentStep)}
              </CardDescription>
            </div>
            <Badge variant="primary" size="sm">
              {t('citizen.stepOf', { current: currentStep })}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#E1E7EE] dark:bg-[#40515F] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#7C97B0] dark:bg-[#8FAFCB] h-full transition-all duration-300 ease-out"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-8">
          {/* STEP 1: Category & Mutually Exclusive Description (Text OR Audio) */}
          {currentStep === 1 && (
            <div className="space-y-7">
              {/* Category Grid */}
              <div>
                <span className="block text-base sm:text-lg font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-2.5">
                  {t('citizen.selectCategory')} <span className="text-red-500">*</span>
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {CIVIC_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    const localizedLabel = t(`categories.${cat.id}.label`) || cat.label;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategory(cat.id);
                          if (errors.category) {
                            setErrors((prev) => ({ ...prev, category: undefined }));
                          }
                        }}
                        className={`min-h-[110px] p-4 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between cursor-pointer select-none ${
                          isSelected
                            ? 'border-[#7C97B0] dark:border-[#8FAFCB] bg-[#D6E3EF] dark:bg-[#344656] shadow-sm ring-2 ring-[#7C97B0] dark:ring-[#8FAFCB]'
                            : 'border-[#E1E7EE] dark:border-[#40515F] bg-white dark:bg-[#2D3C49] hover:border-[#7C97B0] dark:hover:border-[#8FAFCB] hover:bg-[#F7F9FB] dark:hover:bg-[#202C38]'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#7C97B0] dark:bg-[#8FAFCB] text-white dark:text-[#202C38]' : 'bg-[#F7F9FB] dark:bg-[#202C38] text-[#7C97B0] dark:text-[#8FAFCB]'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className={`text-sm sm:text-base font-bold line-clamp-2 mt-2 leading-snug ${
                          isSelected ? 'text-[#2E4A62] dark:text-[#F2F5F8]' : 'text-[#2E4A62] dark:text-[#F2F5F8]'
                        }`}>
                          {localizedLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {errors.category && (
                  <p className="mt-2 text-sm sm:text-base text-red-600 dark:text-red-400 font-medium">{errors.category}</p>
                )}
              </div>

              {/* Mutually Exclusive Input Method Segmented Control */}
              <div className="space-y-2.5">
                <span className="block text-base sm:text-lg font-bold text-[#2E4A62] dark:text-[#F2F5F8]">
                  {t('citizen.chooseInputMethod')} <span className="text-red-500">*</span>
                </span>

                <div
                  role="radiogroup"
                  aria-label="Complaint Input Method"
                  className="grid grid-cols-2 gap-2 sm:gap-3 p-1.5 bg-[#F7F9FB] dark:bg-[#202C38] border border-[#E1E7EE] dark:border-[#40515F] rounded-2xl"
                >
                  {/* Option 1: Type Complaint */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={inputMethod === 'text'}
                    onClick={() => handleRequestSwitch('text')}
                    className={`min-h-[52px] sm:min-h-[58px] px-4 py-2.5 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer select-none ${
                      inputMethod === 'text'
                        ? 'bg-[#7C97B0] text-white shadow-sm ring-2 ring-[#7C97B0] dark:bg-[#8FAFCB] dark:text-[#202C38] dark:ring-[#8FAFCB]'
                        : 'bg-transparent text-[#64748B] dark:text-[#B7C3CE] hover:text-[#2E4A62] dark:hover:text-[#F2F5F8] hover:bg-white/60 dark:hover:bg-[#344656]/40'
                    }`}
                  >
                    <Keyboard className="w-5 h-5 shrink-0" />
                    <span>{t('citizen.typeComplaint')}</span>
                  </button>

                  {/* Option 2: Speak Complaint */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={inputMethod === 'audio'}
                    onClick={() => handleRequestSwitch('audio')}
                    className={`min-h-[52px] sm:min-h-[58px] px-4 py-2.5 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer select-none ${
                      inputMethod === 'audio'
                        ? 'bg-[#7C97B0] text-white shadow-sm ring-2 ring-[#7C97B0] dark:bg-[#8FAFCB] dark:text-[#202C38] dark:ring-[#8FAFCB]'
                        : 'bg-transparent text-[#64748B] dark:text-[#B7C3CE] hover:text-[#2E4A62] dark:hover:text-[#F2F5F8] hover:bg-white/60 dark:hover:bg-[#344656]/40'
                    }`}
                  >
                    <Mic className="w-5 h-5 shrink-0" />
                    <span>{t('citizen.speakComplaint')}</span>
                  </button>
                </div>
              </div>

              {/* MUTUALLY EXCLUSIVE VIEW 1: Text Mode */}
              {inputMethod === 'text' && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  <Textarea
                    label={t('citizen.descriptionLabel')}
                    required
                    rows={5}
                    maxLength={500}
                    placeholder={t('citizen.descriptionPlaceholder')}
                    value={textDescription}
                    onChange={(e) => {
                      setTextDescription(e.target.value);
                      if (errors.description) {
                        setErrors((prev) => ({ ...prev, description: undefined }));
                      }
                    }}
                    error={errors.description}
                    helperText={t('citizen.descriptionHelp')}
                  />
                </div>
              )}

              {/* MUTUALLY EXCLUSIVE VIEW 2: Audio Mode */}
              {inputMethod === 'audio' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <VoiceRecorder
                    currentTranscript={audioTranscription}
                    audioBlob={audioBlob}
                    audioUrl={audioUrl}
                    transcriptionStatus={transcriptionStatus}
                    onTranscriptionStatusChange={setTranscriptionStatus}
                    onAudioCaptured={(blob, url) => {
                      setAudioBlob(blob);
                      setAudioUrl(url);
                      if (errors.description) {
                        setErrors((prev) => ({ ...prev, description: undefined }));
                      }
                    }}
                    onAudioCleared={() => {
                      setAudioBlob(null);
                      setAudioUrl(null);
                      setAudioTranscription('');
                      setTranscriptionStatus('idle');
                    }}
                    onTranscriptionChange={(transcript) => {
                      setAudioTranscription(transcript);
                      setTranscriptionStatus('success');
                      if (errors.description) {
                        setErrors((prev) => ({ ...prev, description: undefined }));
                      }
                    }}
                    onSwitchToType={() => handleRequestSwitch('text')}
                  />

                  {errors.description && (
                    <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-center gap-2 text-sm text-red-700 dark:text-red-300 font-semibold">
                      <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
                      <span>{errors.description}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Media & Privacy Protection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <ImagePrivacyUpload
                imageFile={imageFile}
                onImageChange={setImageFile}
                redactedData={redactedData}
                onRedactedDataChange={setRedactedData}
              />
            </div>
          )}

          {/* STEP 3: Location & Geolocation */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <LocationPickerMap
                coordinates={coordinates}
                onCoordinatesChange={setCoordinates}
                address={address}
                onAddressChange={setAddress}
              />
              {errors.coordinates && (
                <p className="text-xs text-red-600">{errors.coordinates}</p>
              )}
            </div>
          )}

          {/* STEP 4: AI Review, Duplicate Check & Submit */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Duplicate Incident Banner if backend returned duplicates */}
              {duplicates.length > 0 && (
                <DuplicateDetectionBanner
                  duplicates={duplicates}
                  onSupportExisting={(incidentId) => {
                    alert(`Supported ticket #${incidentId}. You may now track its progress.`);
                  }}
                  onProceedAnyway={() => {
                    setDuplicates([]);
                  }}
                />
              )}

              {/* AI Photo Analysis (only when a photo is attached) */}
              {imageFile && (
                <ImageAnalysisView
                  analysis={imageAnalysis}
                  isLoading={isAnalyzingImage}
                  error={imageAnalysisError}
                  onRetry={handleRetryImageAnalysis}
                />
              )}

              {/* AI Severity Assessment View (Real backend response) */}
              <SeverityAssessmentView
                assessment={aiAssessment}
                isLoading={isAssessing}
                error={aiError}
              />

              {/* Submission Summary Preview */}
              <div className="bg-[#F7F9FB] dark:bg-[#202C38] rounded-2xl p-5 sm:p-6 border border-[#E1E7EE] dark:border-[#40515F] space-y-4">
                <h4 className="text-xs sm:text-sm font-bold text-[#2E4A62] dark:text-[#8FAFCB] uppercase tracking-wider">
                  Complaint Summary / शिकायत सारांश
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block font-medium">Issue Category</span>
                    <span className="font-bold text-[#2E4A62] dark:text-[#F2F5F8] capitalize text-sm sm:text-base">
                      {CIVIC_CATEGORIES.find((c) => c.id === category)?.label || category}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block font-medium">Input Method</span>
                    <span className="inline-flex items-center gap-1.5 font-bold text-[#2E4A62] dark:text-[#8FAFCB] text-sm sm:text-base">
                      {inputMethod === 'audio' ? (
                        <>
                          <Mic className="w-4 h-4 text-[#7C97B0] dark:text-[#8FAFCB]" />
                          <span>Voice Recording (AI Transcribed)</span>
                        </>
                      ) : (
                        <>
                          <Keyboard className="w-4 h-4 text-[#7C97B0] dark:text-[#8FAFCB]" />
                          <span>Typed Text</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block font-medium">Location Coordinates</span>
                    <span className="font-mono font-medium text-[#2E4A62] dark:text-[#F2F5F8]">
                      {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block font-medium">Landmark / Address</span>
                    <span className="font-medium text-[#2E4A62] dark:text-[#F2F5F8]">
                      {address || 'Coordinates only'}
                    </span>
                  </div>

                  {/* 1. Original Complaint in Native Language */}
                  <div className="sm:col-span-2 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs sm:text-sm font-bold text-[#2E4A62] dark:text-[#8FAFCB] uppercase tracking-wider">
                        {t('citizen.originalComplaint')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#D6E3EF] dark:bg-[#344656] text-[#2E4A62] dark:text-[#8FAFCB] font-semibold text-xs">
                          <Languages className="w-3.5 h-3.5" />
                          <span>{getLanguageMetadata(language)?.nativeName} ({getLanguageMetadata(language)?.label})</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E1E7EE] dark:bg-[#202C38] text-slate-700 dark:text-[#B7C3CE] text-xs font-medium">
                          {inputMethod === 'audio' ? <Mic className="w-3 h-3" /> : <Keyboard className="w-3 h-3" />}
                          <span>{inputMethod === 'audio' ? 'Voice Transcribed' : 'Typed Text'}</span>
                        </span>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-[#2D3C49] p-4 rounded-xl border border-[#E1E7EE] dark:border-[#40515F]">
                      <p className="text-[#2E4A62] dark:text-[#F2F5F8] font-normal leading-relaxed text-sm sm:text-base">
                        {canonicalDescription}
                      </p>
                      {inputMethod === 'audio' && audioUrl && (
                        <div className="mt-3 pt-3 border-t border-[#E1E7EE] dark:border-[#40515F]">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-[#B7C3CE] block mb-1.5">
                            Original Audio Recording:
                          </span>
                          <audio controls src={audioUrl} className="w-full h-8 outline-none">
                            <track kind="captions" />
                          </audio>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. English Translation */}
                  <div className="sm:col-span-2 space-y-2">
                    <span className="text-xs sm:text-sm font-bold text-[#2E4A62] dark:text-[#8FAFCB] uppercase tracking-wider block">
                      {t('citizen.englishTranslation')}
                    </span>

                    {translationStatus === 'translating' && (
                      <div className="p-4 rounded-xl border border-[#E1E7EE] dark:border-[#40515F] bg-white dark:bg-[#2D3C49] flex items-center gap-3 text-slate-600 dark:text-[#B7C3CE] text-sm">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#7C97B0] shrink-0" />
                        <span>{t('citizen.translationPending')}</span>
                      </div>
                    )}

                    {translationStatus === 'success' && (
                      <div className="p-4 rounded-xl border border-[#2E7D6B]/30 dark:border-[#4EAD97]/30 bg-[#2E7D6B]/10 dark:bg-[#2E7D6B]/20 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#2E7D6B]/20 text-[#2E7D6B] dark:text-[#4EAD97]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verified Neural MT
                          </span>
                          {translationMetadata?.model && (
                            <span className="text-[11px] text-slate-500 dark:text-[#B7C3CE] font-mono">
                              Model: {translationMetadata.model}
                            </span>
                          )}
                        </div>
                        <p className="text-[#2E4A62] dark:text-[#F2F5F8] text-sm sm:text-base leading-relaxed">
                          {englishTranslation}
                        </p>
                      </div>
                    )}

                    {translationStatus === 'error' && (
                      <div className="p-4 rounded-xl border border-[#B7791F]/30 dark:border-[#E09E3E]/30 bg-[#B7791F]/10 dark:bg-[#B7791F]/20 text-[#B7791F] dark:text-[#E09E3E] space-y-2.5">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-[#B7791F] dark:text-[#E09E3E] mt-0.5 shrink-0" />
                          <p className="text-sm font-medium">
                            {t('citizen.translationFailed')}
                            {translationError ? ` (${translationError})` : ''}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRetryTranslation}
                          icon={<RefreshCw className="w-3.5 h-3.5" />}
                        >
                          {t('citizen.retryTranslation')}
                        </Button>
                      </div>
                    )}

                    {translationStatus === 'not_applicable' && (
                      <div className="p-3.5 rounded-xl border border-[#E1E7EE] dark:border-[#40515F] bg-white dark:bg-[#2D3C49] text-slate-600 dark:text-[#B7C3CE] text-xs sm:text-sm italic">
                        Original complaint was submitted in English. No additional translation required.
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-[#B7C3CE] block font-medium">Attached Photo Evidence</span>
                    <span className="font-medium text-[#2E4A62] dark:text-[#F2F5F8]">
                      {imageFile ? (
                        redactedData?.redacted ? (
                          <span className="text-[#2E7D6B] dark:text-[#4EAD97] font-bold">1 Photo (Privacy Redacted)</span>
                        ) : (
                          <span className="text-[#B7791F] dark:text-[#E09E3E] font-bold">1 Photo (Private)</span>
                        )
                      ) : (
                        'No photo attached'
                      )}
                    </span>
                  </div>

                  {inputMethod === 'audio' && (
                    <div>
                      <span className="text-slate-500 dark:text-[#B7C3CE] block font-medium">Audio Recording</span>
                      <span className="text-[#2E7D6B] dark:text-[#4EAD97] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> 1 Voice Note Attached
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {submissionError && (
                <div className="p-4 bg-[#C74949]/10 dark:bg-[#E56B6B]/20 text-[#C74949] dark:text-[#E56B6B] text-sm rounded-xl border border-[#C74949]/30 dark:border-[#E56B6B]/30 flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-[#C74949] dark:text-[#E56B6B] shrink-0" />
                  <span>{submissionError}</span>
                </div>
              )}
            </div>
          )}

          {/* Wizard Controls Footer */}
          <div className="pt-6 border-t border-[#E1E7EE] dark:border-[#40515F] flex items-center justify-between gap-4">
            <div>
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  icon={<ArrowLeft className="w-5 h-5" />}
                  onClick={handlePrevStep}
                  disabled={isSubmitting}
                >
                  {t('common.back')}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {currentStep < 4 ? (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  icon={<ArrowRight className="w-5 h-5" />}
                  iconPosition="right"
                  onClick={handleNextStep}
                >
                  {t('common.continue')}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  loading={isSubmitting}
                  icon={<Send className="w-5 h-5" />}
                  iconPosition="right"
                  onClick={handleSubmitReport}
                >
                  {t('citizen.submitComplaint')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal when switching input methods with unsaved content */}
      {showSwitchModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="switch-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100"
        >
          <div className="bg-white dark:bg-[#2D3C49] border border-[#E1E7EE] dark:border-[#40515F] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 text-[#2E4A62] dark:text-[#F2F5F8]">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#B7791F]/15 dark:bg-[#E09E3E]/20 border border-[#B7791F]/30 dark:border-[#E09E3E]/30 text-[#B7791F] dark:text-[#E09E3E] flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 id="switch-modal-title" className="text-xl font-bold text-[#2E4A62] dark:text-[#F2F5F8]">
                  {t('citizen.switchWarningTitle')}
                </h3>
                <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-[#B7C3CE] leading-relaxed">
                  {pendingInputMethod === 'audio'
                    ? t('citizen.switchFromTextWarning')
                    : t('citizen.switchFromAudioWarning')}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={cancelSwitch}
                className="w-full sm:w-auto"
              >
                {t('citizen.keepCurrentInput')}
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={confirmSwitch}
                className="w-full sm:w-auto"
              >
                {t('citizen.discardAndSwitch')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ReportForm;
