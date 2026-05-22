// components/layout/PageTransition.jsx
// Wraps any page in a consistent fade-and-slide so route changes feel
// continuous. AnimatePresence in AppRoutes triggers the exit animation,
// the motion.main here drives entry/exit.

import { motion } from 'framer-motion';

const variants = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function PageTransition({ children, className = '' }) {
  return (
    <motion.main
      className={`page ${className}`}
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {children}
    </motion.main>
  );
}
