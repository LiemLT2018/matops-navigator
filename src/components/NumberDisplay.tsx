import { formatNumber } from '@/utils/formatNumber';

interface Props {
  value: number | string | null | undefined;
  decimals?: number;
  className?: string;
}

export function NumberDisplay({ value, decimals = 0, className }: Props) {
  return (
    <span className={`font-mono ${className ?? ''}`}>
      {formatNumber(value, decimals)}
    </span>
  );
}
