// Gesture math from Apple's "Designing Fluid Interfaces" (WWDC 2018),
// used by useSwipe and everything built on it.

// Where a flick is going. Exponential decay, the same curve as native scroll
// deceleration; 0.998 is the normal scroll rate, 0.99 feels snappier.
// (Not the textbook v²/2a: this is the form Apple ships.)
export function project(velocity /* px/s */, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

// Soft boundary: the further past an edge, the less the element follows.
// Real things slow down before they stop; a hard stop reads as frozen.
export function rubberband(overshoot, dimension, constant = 0.55) {
  if (!dimension) return overshoot * constant;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export function nearest(value, points) {
  return points.reduce((best, p) => (Math.abs(p - value) < Math.abs(best - value) ? p : best), points[0]);
}

// Commit or cancel a two-state gesture (open/closed, keep/remove).
// A decisive flick wins by its direction, even if the finger barely moved;
// otherwise the projected resting point decides.
export function decide({ projected, threshold, velocity, flickSpeed = 500, direction = 1 }) {
  if (Math.abs(velocity) > flickSpeed) return Math.sign(velocity) === Math.sign(direction);
  return direction > 0 ? projected > threshold : projected < threshold;
}
