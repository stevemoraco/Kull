import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CodeInputProps {
  length?: number;
  onComplete: (code: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * Specialized input component for 6-character device codes
 * Features:
 * - 6 individual input boxes
 * - Auto-advance to next box on type
 * - Auto-submit when all 6 filled
 * - Paste support (splits pasted code across boxes)
 * - Backspace navigation
 */
export function CodeInput({ length = 6, onComplete, autoFocus = true, disabled = false }: CodeInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, value: string) => {
    // Only allow alphanumeric characters
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (sanitized.length === 0) {
      // Clear current box
      const newValues = [...values];
      newValues[index] = '';
      setValues(newValues);
      return;
    }

    if (sanitized.length === 1) {
      // Single character - update and move to next
      const newValues = [...values];
      newValues[index] = sanitized;
      setValues(newValues);

      // Auto-advance to next input
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Check if complete
      if (newValues.every(v => v.length === 1)) {
        onComplete(newValues.join(''));
      }
    } else if (sanitized.length > 1) {
      // Multiple characters (paste) - distribute across boxes
      handlePaste(sanitized, index);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();

      if (values[index]) {
        // Clear current box
        const newValues = [...values];
        newValues[index] = '';
        setValues(newValues);
      } else if (index > 0) {
        // Move to previous box and clear it
        const newValues = [...values];
        newValues[index - 1] = '';
        setValues(newValues);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (pastedText: string, startIndex: number = 0) => {
    const sanitized = pastedText.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const newValues = [...values];

    for (let i = 0; i < Math.min(sanitized.length, length - startIndex); i++) {
      newValues[startIndex + i] = sanitized[i];
    }

    setValues(newValues);

    // Focus the next empty box or the last box
    const nextEmptyIndex = newValues.findIndex(v => v === '');
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[length - 1]?.focus();
    }

    // Check if complete
    if (newValues.every(v => v.length === 1)) {
      onComplete(newValues.join(''));
    }
  };

  const handlePasteEvent = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    handlePaste(pastedText, 0);
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, index) => (
        <Input
          key={index}
          ref={el => inputRefs.current[index] = el}
          type="text"
          inputMode="text"
          maxLength={1}
          value={values[index]}
          onChange={e => handleChange(index, e.target.value)}
          onKeyDown={e => handleKeyDown(index, e)}
          onPaste={handlePasteEvent}
          disabled={disabled}
          className={cn(
            "w-12 h-14 text-center text-2xl font-mono font-bold",
            "border-2 rounded-lg",
            "focus:ring-2 focus:ring-primary focus:border-primary",
            values[index] && "border-primary",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-label={`Code digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
