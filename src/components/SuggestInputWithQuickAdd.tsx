import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SuggestInputText } from '@/components/SuggestInputText';
import { QuickAddDialog, type QuickAddType } from '@/components/QuickAddDialog';
import type { SuggestData } from '@/api/suggestApi';
import type { DictItem } from '@/utils/excelParser';
import { cn } from '@/lib/utils';

interface SuggestInputWithQuickAddProps {
  value: string;
  selectedUuid?: string;
  onChange: (value: string) => void;
  onSelect: (item: SuggestData) => void;
  onQuickAdded?: (item: DictItem) => void;
  type: string;
  quickAddType: QuickAddType;
  /** Required for specification - the material UUID */
  materialUuid?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
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
  placeholder,
  disabled,
  className,
  id,
}: SuggestInputWithQuickAddProps) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);

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
        onAdded={(addType, item) => {
          // Update via onSelect to reuse existing logic
          onSelect({ type: quickAddType, uuid: item.uuid, name: item.name, normalizedName: item.normalizedName, alias: item.aliases });
          onQuickAdded?.(item);
        }}
      />
    </div>
  );
}
