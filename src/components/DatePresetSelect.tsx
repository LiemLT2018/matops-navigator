import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type DatePresetKey } from '@/types/api';
import { getDateRange, type DateRange } from '@/utils/dateRange';

const presets: (DatePresetKey | 'all')[] = [
  'all', 'today', 'yesterday', 'this_week', 'last_week', '7_days',
  'this_month', 'last_month', 'this_year', 'last_year',
];

interface Props {
  value: DatePresetKey | 'all';
  onChange: (preset: DatePresetKey | 'all', range: DateRange | null) => void;
  showAll?: boolean;
}

export function DatePresetSelect({ value, onChange, showAll = false }: Props) {
  const { t } = useTranslation();
  const items = showAll ? presets : presets.filter(p => p !== 'all');

  return (
    <Select
      value={value}
      onValueChange={(v: string) => {
        if (v === 'all') onChange('all', null);
        else onChange(v as DatePresetKey, getDateRange(v as DatePresetKey));
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((p) => (
          <SelectItem key={p} value={p}>
            {p === 'all' ? t('common.all') : t(`datePreset.${p}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
