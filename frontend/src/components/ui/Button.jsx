// components/ui/Button.jsx
// Stylable button with three variants. Centralizes the disabled/loading
// pattern so every form doesn't reinvent it.

import { motion } from 'framer-motion';

export default function Button({
  variant = 'primary',
  loading = false,
  children,
  className = '',
  disabled,
  ...rest
}) {
  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      className={`btn btn--${variant} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="btn__spinner" aria-hidden /> : children}
    </motion.button>
  );
}
