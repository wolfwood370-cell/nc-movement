import { Input } from '@/components/ui/input';
import { forwardRef } from 'react';

interface Props {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  onBlur?: () => void;
  placeholder?: string;
  suffix?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

const NumPadInput = forwardRef<HTMLInputElement, Props>(function NumPadInput(
  { value, onChange, onBlur, placeholder, suffix, disabled, ariaLabel },
  ref,
) {
  return (
    <div className="relative">
      <Input
        ref={ref}
        type="number"
        inputMode="decimal"
        pattern="[0-9]*"
        step="0.1"
        min="0"
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === '' ? null : Number(raw));
        }}
        onBlur={onBlur}
        className="h-12 rounded-xl pr-10 text-base"
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
});

export default NumPadInput;
