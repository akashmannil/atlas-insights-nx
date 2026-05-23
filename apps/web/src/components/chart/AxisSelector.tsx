import { memo } from 'react';
import { Select } from '@/components/ui/Select';
import { AXIS_OPTIONS, type NumericField } from '@atlas/shared-types';

interface AxisSelectorProps {
  xAxis: NumericField;
  yAxis: NumericField;
  onXChange: (field: NumericField) => void;
  onYChange: (field: NumericField) => void;
}

/**
 * Pair of dropdowns wired to the chart's X/Y axes.
 *
 * Note: this component is pure-presentational — it receives values and
 * setters via *props* (the assessment's "Props Pattern" requirement). The
 * parent reads/writes the underlying state from the Zustand store.
 */
export const AxisSelector = memo(
  ({ xAxis, yAxis, onXChange, onYChange }: AxisSelectorProps) => (
    <div className="flex flex-wrap items-end gap-3">
      <Select<NumericField>
        label="X-axis"
        value={xAxis}
        options={AXIS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        onChange={onXChange}
      />
      <Select<NumericField>
        label="Y-axis"
        value={yAxis}
        options={AXIS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        onChange={onYChange}
      />
    </div>
  ),
);
AxisSelector.displayName = 'AxisSelector';
