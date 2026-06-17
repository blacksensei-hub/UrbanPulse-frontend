export const pageTransition = {
  initial: { opacity: 0, scale: 0.985 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, scale: 0.985, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } },
};

export const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
};

export const spring = { type: 'spring', stiffness: 300, damping: 25 };
export const springSoft = { type: 'spring', stiffness: 220, damping: 28 };
export const morph = { type: 'spring', stiffness: 240, damping: 28 };

export const drawerVariants = {
  hidden: { x: '100%', transition: spring },
  visible: { x: 0, transition: spring },
};

export const bottomSheetVariants = {
  hidden: { y: '100%', transition: spring },
  visible: { y: 0, transition: spring },
};

export const scalePop = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1, transition: spring },
  exit:    { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export const springSnappy = { type: 'spring', stiffness: 380, damping: 30 };

export const easeOut = { type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.4 };

export const revealStagger = { staggerChildren: 0.08, delayChildren: 0.05 };

export const cardHover = { scale: 1.02, y: -4, transition: springSnappy };
