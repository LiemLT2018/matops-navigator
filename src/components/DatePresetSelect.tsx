import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type DatePresetKey } from '@/types/api';
import { getDateRange, type DateRange } from '@/utils/dateRange';

const presets: DatePresetKey[] = [
  'today', 'yesterday', 'this_week', 'last_week', '7_days',
  'this_month', 'last_month', 'this_year', 'last_year',
];

interface Props {
  value: DatePresetKey;
  onChange: (preset: DatePresetKey, range: DateRange) => void;
}

export function DatePresetSelect({ value, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <Select
      value={value}
      onValueChange={(v: DatePresetKey) => onChange(v, getDateRange(v))}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {presets.map((p) => (
          <SelectItem key={p} value={p}>
            {t(`datePreset.${p}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
