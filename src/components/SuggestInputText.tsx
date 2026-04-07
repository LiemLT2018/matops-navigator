import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { suggestSearch, type SuggestData } from '@/api/suggestApi';
import { Loader2 } from 'lucide-react';

interface SuggestInputTextProps {
  value: string;
  selectedUuid?: string;
  onChange: (value: string) => void;
  onSelect: (item: SuggestData) => void;
  type: string;
  id?: string;
  placeholder?: string;
  minChars?: number;
  debounceMs?: number;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
}

const removeViDiacritics = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

interface CacheEntry {
  query: string;
  items: SuggestData[];
  hasMore: boolean;
}

export function SuggestInputText({
  value,
  selectedUuid,
  onChange,
  onSelect,
  type,
  id,
  placeholder,
  minChars = 2,
  debounceMs = 300,
  disabled = false,
  readOnly = false,
  className,
}: SuggestInputTextProps) {
  const [suggestions, setSuggestions] = useState<SuggestData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const activeChipRef = useRef<HTMLButtonElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();
  const cacheRef = useRef<CacheEntry[]>([]);

  useEffect(() => {
    if (activeChipRef.current && tooltipRef.current) {
      activeChipRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeIndex]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        tooltipRef.current && !tooltipRef.current.contains(target) &&
        inputRef.current && !inputRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const tryLocalFilter = useCallback((query: string): SuggestData[] | null => {
    const norm = removeViDiacritics(query);
    for (let i = cacheRef.current.length - 1; i >= 0; i--) {
      const entry = cacheRef.current[i];
      const entryNorm = removeViDiacritics(entry.query);
      if (norm.startsWith(entryNorm)) {
        if (!entry.hasMore) {
          return entry.items.filter(item => {
            if (item.normalizedName.includes(norm)) return true;
            if (removeViDiacritics(item.name).includes(norm)) return true;
            return item.alias.some(a => removeViDiacritics(a).includes(norm));
          });
        }
        return null;
      }
    }
    return null;
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < minChars) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const localResult = tryLocalFilter(query);
    if (localResult !== null) {
      setSuggestions(localResult);
      setActiveIndex(0);
      setIsOpen(localResult.length > 0);
      return;
    }

    setIsLoading(true);
    try {
      const res = await suggestSearch(query, type);
      cacheRef.current.push({ query, items: res.items, hasMore: res.hasMore });
      if (cacheRef.current.length > 20) cacheRef.current.shift();

      setSuggestions(res.items);
      setActiveIndex(0);
      setIsOpen(res.items.length > 0);
    } finally {
      setIsLoading(false);
    }
  }, [type, minChars, tryLocalFilter]);

  const handleChange = useCallback((newValue: string) => {
    onChange(newValue);
    clearTimeout(debounceTimer.current);

    if (newValue.length < minChars) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const localResult = tryLocalFilter(newValue);
    if (localResult !== null && localResult.length > 0) {
      setSuggestions(localResult);
      setActiveIndex(0);
      setIsOpen(true);
    }

    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, debounceMs);
  }, [onChange, minChars, debounceMs, fetchSuggestions, tryLocalFilter]);

  const selectItem = useCallback((item: SuggestData) => {
    onChange(item.name);
    onSelect(item);
    setSuggestions([]);
    setIsOpen(false);
  }, [onChange, onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Tab') {
      if (suggestions[activeIndex]) {
        selectItem(suggestions[activeIndex]);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[activeIndex]) {
        selectItem(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  }, [isOpen, suggestions, activeIndex, selectItem]);

  useEffect(() => {
    return () => clearTimeout(debounceTimer.current);
  }, []);

  return (
    <div className="relative">
      {isOpen && suggestions.length > 0 && (
        <div
          ref={tooltipRef}
          className="absolute z-50 bottom-full left-0 mb-1 max-w-[400px] min-w-[200px] rounded-md border bg-popover shadow-md"
        >
          <div className="flex items-center gap-1 p-1.5 overflow-x-auto scrollbar-thin">
            {suggestions.map((item, idx) => (
              <button
                key={item.uuid}
                ref={idx === activeIndex ? activeChipRef : undefined}
                type="button"
                className={cn(
                  'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors shrink-0 cursor-pointer border',
                  idx === activeIndex
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-muted/50 text-foreground border-border hover:bg-accent hover:text-accent-foreground'
                )}
                onClick={() => selectItem(item)}
                onMouseEnter={() => setActiveIndex(idx)}
                tabIndex={-1}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <Input
          id={id}
          ref={inputRef}
          value={value}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (value.length >= minChars && suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={cn('h-8 text-sm', className)}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
