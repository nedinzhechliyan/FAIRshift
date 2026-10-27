import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useI18n } from '../../i18n';

export interface AudioSpeakerButtonProps {
  textToSpeak: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const AudioSpeakerButton: React.FC<AudioSpeakerButtonProps> = ({
  textToSpeak,
  size = 'md',
  label,
  className = '',
}) => {
  const { speak, isSpeaking, stopSpeaking, t } = useI18n();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(textToSpeak);
    }
  };

  const sizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'px-3 py-2 text-sm font-medium',
  };

  return (
    <button
      onClick={handleClick}
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-[6px] transition-colors border select-none ${
        isSpeaking
          ? 'bg-amber-100 border-amber-300 text-amber-900 animate-pulse'
          : 'bg-[#F4F4F1] hover:bg-[#EBEBE6] border-[#D1D1CB] text-[#17181A]'
      } ${sizeClasses[size]} ${className}`}
      title={isSpeaking ? t('common.stop') : t('common.listen')}
      aria-label={label || t('common.listen')}
    >
      {isSpeaking ? (
        <VolumeX className="w-4 h-4 text-amber-800" strokeWidth={2} />
      ) : (
        <Volume2 className="w-4 h-4 text-[#0F766E]" strokeWidth={2} />
      )}
      {label && <span>{label}</span>}
      {isSpeaking && <span className="text-[11px] font-semibold">({t('common.stop')})</span>}
    </button>
  );
};
