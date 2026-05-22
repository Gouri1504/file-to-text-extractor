// components/ui/ProgressBar.jsx
// Determinate progress bar. The fill width is driven by the `value` prop.

import { motion } from 'framer-motion';

export default function ProgressBar({ value = 0, label }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="progress" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <motion.div
        className="progress__fill"
        animate={{ width: `${v}%` }}
        transition={{ ease: 'easeOut', duration: 0.3 }}
      />
      {label && <div className="progress__label">{label}</div>}
    </div>
  );
}
