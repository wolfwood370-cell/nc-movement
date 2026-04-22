import * as React from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Props {
  /** ISO string or null. When null, the picker shows "today". */
  value: string | null;
  onChange: (iso: string) => void;
  disabled?: boolean;
  /** Optional label shown above the trigger. */
  label?: string;
  /** Optional helper hint shown above the trigger. */
  hint?: string;
}

/**
 * Compact date picker for backdating an assessment (`assessed_at`).
 * Defaults to today when value is null. Disallows future dates.
 */
export default function AssessedAtPicker({
  value,
  onChange,
  disabled,
  label = 'Data del test',
  hint = 'Default: oggi · puoi retrodatare un test svolto in precedenza',
}: Props) {
  const date = React.useMemo(() => {
    if (!value) return new Date();
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [value]);

  return (
    <div className="surface-card p-4 space-y-2">
      <div>
        <div className="font-display font-semibold text-sm">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full h-12 rounded-xl justify-start text-left font-normal',
              !value && 'text-foreground',
            )}
          >
            <CalendarIcon className="w-4 h-4 mr-2 opacity-70" />
            {format(date, 'EEEE d MMMM yyyy', { locale: it })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (!d) return;
              // Preserve the current time-of-day (or use noon to avoid TZ edge cases).
              const out = new Date(d);
              const ref = value ? new Date(value) : new Date();
              if (!isNaN(ref.getTime())) {
                out.setHours(ref.getHours(), ref.getMinutes(), ref.getSeconds(), ref.getMilliseconds());
              } else {
                out.setHours(12, 0, 0, 0);
              }
              onChange(out.toISOString());
            }}
            disabled={(d) => d > new Date()}
            initialFocus
            className={cn('p-3 pointer-events-auto')}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
