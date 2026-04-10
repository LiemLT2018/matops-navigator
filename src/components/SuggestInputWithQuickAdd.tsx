import { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SuggestInputText } from '@/components/SuggestInputText';
import { QuickAddDialog, type QuickAddType } from '@/components/QuickAddDialog';
import type { SuggestData } from '@/api/suggestApi';
import { specificationService } from '@/api/services';
import type { DictItem } from '@/utils/excelParser';
import { cn } from '@/lib/utils';

function canonicalSpecLabel(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

function specLabelsMatch(a: string, b: string): boolean {
  return canonicalSpecLabel(a).toLowerCase() === canonicalSpecLabel(b).toLowerCase();
}

interface SuggestInputWithQuickAddProps {
  value: string;
  selectedUuid?: string;
  onChange: (value: string) => void;
  onSelect: (item: SuggestData, typedQuery?: string) => void;
  onQuickAdded?: (item: DictItem) => void;
  type: string;
  quickAddType: QuickAddType;
  /** Required for specification - the material UUID */
  materialUuid?: string;
  /** Đơn vị dòng — gửi kèm khi quick-add quy cách (default_md_uom_uuid trên md_item_spec). */
  defaultMdUomUuid?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  minChars?: number;
  /**
   * Chỉ dùng khi `type === 'specification'`: sau debounce, nếu tên trùng quy cách trong DB thì gọi với uuid;
   * không trùng / lỗi / chuỗi ngắn thì gọi với chuỗi rỗng để xóa uuid.
   */
  onSpecificationDbUuid?: (uuid: string) => void;
}

export function SuggestInputWithQuickAdd({
  value,
  selectedUuid,
  onChange,
  onSelect,
  onQuickAdded,
  type,
  quickAddType,
  materialUuid,
  defaultMdUomUuid,
  placeholder,
  disabled,
  className,
  id,
  minChars,
  onSpecificationDbUuid,
}: SuggestInputWithQuickAddProps) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const specUuidCbRef = useRef(onSpecificationDbUuid);
  specUuidCbRef.current = onSpecificationDbUuid;
  const lastEmittedSpecUuid = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (type !== 'specification' || !specUuidCbRef.current) {
      lastEmittedSpecUuid.current = undefined;
      return;
    }
    const emit = (u: string) => {
      if (lastEmittedSpecUuid.current === u) return;
      lastEmittedSpecUuid.current = u;
      specUuidCbRef.current!(u);
    };
    const t = canonicalSpecLabel(value);
    if (t.length < 2) {
      emit('');
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const hit = await specificationService.findByName(t);
        if (cancelled) return;
        if (canonicalSpecLabel(value) !== t) return;
        if (hit && specLabelsMatch(hit.name, t)) emit(hit.uuid);
        else emit('');
      } catch {
        /* Lỗi mạng: không gọi emit('') để tránh tắt xanh oan khi đã chọn/khớp trước đó. */
      }
    }, 380);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, type]);

  const hasValue = value.trim().length > 0;
  const hasUuid = !!selectedUuid;
  const showQuickAdd = hasValue && !hasUuid;

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      <div className="flex-1 min-w-0">
        <SuggestInputText
          id={id}
          value={value}
          selectedUuid={selectedUuid}
          onChange={onChange}
          onSelect={onSelect}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          minChars={minChars}
          className={cn(
            hasUuid && 'border-green-500/50 bg-green-500/5',
            !hasUuid && hasValue && 'border-yellow-500/50 bg-yellow-500/5',
          )}
        />
      </div>
      {showQuickAdd && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setQuickAddOpen(true)}
          title="Quick Add"
        >
          <Plus className="h-3 w-3" />
        </Button>
      )}
      <QuickAddDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        type={quickAddType}
        defaultName={value}
        materialUuid={materialUuid}
        defaultMdUomUuid={defaultMdUomUuid}
        onAdded={(addType, item) => {
          // Update via onSelect to reuse existing logic
          onSelect({ type: quickAddType, uuid: item.uuid, name: item.name, normalizedName: item.normalizedName, alias: item.aliases });
          onQuickAdded?.(item);
        }}
      />
    </div>
  );
}
