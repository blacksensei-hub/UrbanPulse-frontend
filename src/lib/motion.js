// ─── Springs, in Apple's two parameters ────────────────────────────────────
// Apple describes a spring by its damping ratio (1 = settles with no
// overshoot, below 1 = overshoots) and its response (roughly how many
// seconds it takes to arrive). Framer Motion takes the same two ideas as
// `visualDuration` and `bounce`, where bounce = 1 - dampingRatio.
//
// House rule, from Apple's fluid-interface guidance: nothing overshoots
// unless the user threw it. Things that open, appear or move on their own
// are critically damped. Bounce is reserved for the moment a drag or flick
// is released, and even then only a little (damping 0.8).
//
// The old presets ran at damping ratios of 0.5-0.72, so drawers, sheets and
// the wishlist heart wobbled after a simple tap.
export const appleSpring = (response, dampingRatio = 1) => ({
  type: 'spring',
  visualDuration: response,
  bounce: 1 - dampingRatio,
});

export const spring       = appleSpring(0.35);       // default: anything that opens or moves on its own
export const springSnappy = appleSpring(0.25);       // small controls: toggles, pills, indicators
export const springSoft   = appleSpring(0.5);        // large surfaces settling, progress fills
export const morph        = appleSpring(0.4);        // shared-element moves (Apple: reposition 1.0 / 0.4)
export const springFlick  = appleSpring(0.3, 0.8);   // ONLY after a drag or flick is released (Apple: sheet 0.8 / 0.3)

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

// Enter and leave along the same path: a drawer that slides in from the
// right leaves to the right.
export const drawerVariants = {
  hidden: { x: '100%', transition: spring },
  visible: { x: 0, transition: spring },
};

export const bottomSheetVariants = {
  hidden: { y: '100%', transition: spring },
  visible: { y: 0, transition: spring },
};

export const scalePop = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: spring },
  exit:    { opacity: 0, scale: 0.96, transition: { duration: 0.15 } },
};

export const easeOut = { type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.4 };

export const revealStagger = { staggerChildren: 0.08, delayChildren: 0.05 };

export const cardHover = { scale: 1.02, y: -4, transition: springSnappy };
