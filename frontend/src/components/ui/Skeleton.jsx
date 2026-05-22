// components/ui/Skeleton.jsx
// Shimmer placeholder used while lists/details are loading. The pulse
// animation lives in animations.css.

export default function Skeleton({ width = '100%', height = 16, radius = 6, style }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden
    />
  );
}
