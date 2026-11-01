import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Globe, AlertCircle, RefreshCw, Volume2, CheckCircle2, RotateCcw, Keyboard } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { CivicApiService } from '../../../services/api/client';
import { useLanguage } from '../../../context/useLanguage';

export function VoiceRecorder({
  onTranscriptionChange,
  onAudioCaptured,
  onAudioCleared,
  onSwitchToType,
  currentTranscript = '',
  audioBlob = null,
  audioUrl = null,
  transcriptionStatus = 'idle',
  onTranscriptionStatusChange,
}) {
  const { languages, currentLanguage, t } = useLanguage();
  const [userSelectedLang, setUserSelectedLang] = useState(null);
  const selectedLanguage = userSelectedLang || currentLanguage.bcp47 || 'en-IN';

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState(null);
  const [transcriptionError, setTranscriptionError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Format seconds into MM:SS
  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start Voice Recording
  const handleStartRecording = async () => {
    setMicError(null);
    setTranscriptionError(null);

    if (onAudioCleared) {
      onAudioCleared();
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError('Your browser does not support audio recording (MediaDevices API).');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);

        if (onAudioCaptured) {
          onAudioCaptured(blob, url);
        }

        // Stop all audio tracks to release microphone hardware
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicError('Microphone permission was denied. Please allow microphone access in your browser settings.');
      } else {
        setMicError(`Unable to start audio recording: ${err.message || 'Unknown device error'}`);
      }
    }
  };

  // Stop Recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setIsRecording(false);
  };

  // Delete recorded audio & reset
  const handleDeleteAudio = () => {
    if (isRecording) {
      handleStopRecording();
    }
    setRecordingSeconds(0);
    setTranscriptionError(null);

    if (onAudioCleared) {
      onAudioCleared();
    }
  };

  // Upload to backend transcription service
  const handleTranscribe = async () => {
    if (!audioBlob) return;

    if (onTranscriptionStatusChange) {
      onTranscriptionStatusChange('transcribing');
    }
    setTranscriptionError(null);

    try {
      const result = await CivicApiService.transcribeVoiceReport(audioBlob, selectedLanguage);
      if (result && result.transcript) {
        if (onTranscriptionChange) {
          onTranscriptionChange(result.transcript);
        }
        if (onTranscriptionStatusChange) {
          onTranscriptionStatusChange('success');
        }
      } else {
        throw new Error('Backend returned an empty transcription.');
      }
    } catch (err) {
      if (onTranscriptionStatusChange) {
        onTranscriptionStatusChange('error');
      }
      setTranscriptionError(
        err.message || 'Backend transcription service is unreachable. Please retry or switch to Type Complaint.'
      );
    }
  };

  // Handle manual edits within the audio workflow
  const handleTextChange = (e) => {
    const val = e.target.value;
    if (onTranscriptionChange) {
      onTranscriptionChange(val);
    }
  };

  return (
    <div className="bg-[#F7F9FB] dark:bg-[#202C38] rounded-2xl p-5 sm:p-6 border border-[#E1E7EE] dark:border-[#40515F] space-y-5 transition-colors duration-150">
      {/* Header & Speech Language Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E1E7EE] dark:border-[#40515F]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7C97B0] dark:bg-[#8FAFCB] text-white dark:text-[#202C38] flex items-center justify-center shrink-0 shadow-xs">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-bold text-[#2E4A62] dark:text-[#F2F5F8]">
              {t('citizen.speakComplaint')}
            </h4>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#B7C3CE] mt-0.5">
              {t('citizen.voiceReportingSubtitle')}
            </p>
          </div>
        </div>

        {/* 10-Language Speech Dropdown */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Globe className="w-5 h-5 text-[#7C97B0] dark:text-[#8FAFCB] shrink-0" />
          <select
            value={selectedLanguage}
            onChange={(e) => setUserSelectedLang(e.target.value)}
            disabled={isRecording}
            aria-label="Speech Language"
            className="min-h-[46px] px-3.5 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-[#2D3C49] border border-[#E1E7EE] dark:border-[#40515F] text-[#2E4A62] dark:text-[#F2F5F8] focus:outline-none focus:ring-2 focus:ring-[#7C97B0] dark:focus:ring-[#8FAFCB] cursor-pointer shadow-2xs"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.bcp47}>
                {lang.nativeName} ({lang.label})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Microphone Error Banner */}
      {micError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-sm sm:text-base border border-red-200 dark:border-red-800/50">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Microphone Access Error</p>
            <p className="mt-1">{micError}</p>
          </div>
        </div>
      )}

      {/* Recorder Controls & Status Banner */}
      <div className="bg-white dark:bg-[#2D3C49] p-5 sm:p-6 rounded-2xl border border-[#E1E7EE] dark:border-[#40515F] transition-all space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isRecording ? (
              <div className="flex items-center gap-3">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600" />
                </span>
                <span className="text-base sm:text-lg font-bold text-red-700 dark:text-red-400 font-mono">
                  {t('citizen.recording')} {formatTimer(recordingSeconds)}
                </span>
              </div>
            ) : audioBlob ? (
              <div className="flex items-center gap-3">
                <Badge variant="primary" size="md">
                  <CheckCircle2 className="w-4 h-4 mr-1 text-[#2E7D6B] dark:text-[#4EAD97]" />
                  {t('citizen.audioCaptured')}
                </Badge>
                <span className="text-sm text-[#64748B] dark:text-[#B7C3CE] font-mono">
                  Duration: {formatTimer(recordingSeconds)}
                </span>
              </div>
            ) : (
              <span className="text-sm sm:text-base text-[#64748B] dark:text-[#B7C3CE] font-medium">
                Click <span className="font-bold text-[#7C97B0] dark:text-[#8FAFCB]">{t('citizen.startRecording')}</span> to speak your complaint in {languages.find((l) => l.bcp47 === selectedLanguage)?.nativeName || 'selected language'}.
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {!isRecording && !audioBlob && (
              <Button
                type="button"
                variant="primary"
                size="lg"
                icon={<Mic className="w-5 h-5" />}
                onClick={handleStartRecording}
                className="w-full sm:w-auto"
              >
                {t('citizen.startRecording')}
              </Button>
            )}

            {isRecording && (
              <Button
                type="button"
                variant="danger"
                size="lg"
                icon={<Square className="w-5 h-5" />}
                onClick={handleStopRecording}
                className="w-full sm:w-auto"
              >
                {t('citizen.stopRecording')}
              </Button>
            )}

            {audioBlob && !isRecording && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  icon={<RotateCcw className="w-4 h-4" />}
                  onClick={handleStartRecording}
                  title="Record Again"
                >
                  Record Again
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  icon={<Trash2 className="w-4 h-4 text-red-600" />}
                  onClick={handleDeleteAudio}
                >
                  {t('citizen.deleteAudio')}
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  loading={transcriptionStatus === 'transcribing'}
                  icon={<RefreshCw className="w-4 h-4" />}
                  onClick={handleTranscribe}
                >
                  {transcriptionStatus === 'transcribing' ? t('citizen.transcribing') : t('citizen.transcribeBtn')}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Audio Playback Player */}
        {audioUrl && (
          <div className="flex items-center gap-3 bg-[#F7F9FB] dark:bg-[#202C38] p-3 rounded-xl border border-[#E1E7EE] dark:border-[#40515F]">
            <Volume2 className="w-5 h-5 text-[#7C97B0] dark:text-[#8FAFCB] shrink-0" />
            <audio controls src={audioUrl} className="w-full h-9 outline-none">
              <track kind="captions" />
            </audio>
          </div>
        )}
      </div>

      {/* Transcription Failure State (Strictly real backend result) */}
      {transcriptionStatus === 'error' && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-sm sm:text-base">Backend Transcription Service Offline</p>
              <p className="mt-0.5 text-xs sm:text-sm leading-relaxed">{transcriptionError}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTranscribe}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Retry Transcription
            </Button>
            {onSwitchToType && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onSwitchToType}
                icon={<Keyboard className="w-4 h-4" />}
              >
                {t('citizen.switchToType')}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Editable Transcription Result (within Audio workflow) */}
      {transcriptionStatus === 'success' && (
        <div className="space-y-2 bg-[#2E7D6B]/10 dark:bg-[#2E7D6B]/20 p-4 sm:p-5 rounded-2xl border border-[#2E7D6B]/30 dark:border-[#4EAD97]/40 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
            <span className="text-sm sm:text-base font-bold text-[#2E7D6B] dark:text-[#4EAD97] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#2E7D6B] dark:text-[#4EAD97]" />
              {t('citizen.reviewTranscript')}
            </span>
            <Badge variant="success" size="sm">
              Backend Transcribed
            </Badge>
          </div>

          <p className="text-xs text-[#64748B] dark:text-[#B7C3CE]">
            {t('citizen.canonicalDescriptionHelp')}
          </p>

          <textarea
            value={currentTranscript}
            onChange={handleTextChange}
            rows={4}
            className="w-full rounded-xl text-base border border-[#2E7D6B]/40 dark:border-[#4EAD97]/50 bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] p-3.5 focus:outline-none focus:ring-2 focus:ring-[#7C97B0] dark:focus:ring-[#8FAFCB] shadow-2xs font-sans leading-relaxed"
            placeholder="Edit transcribed speech if needed..."
          />
        </div>
      )}
    </div>
  );
}

export default VoiceRecorder;
