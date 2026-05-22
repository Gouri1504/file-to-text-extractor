// components/ui/Spinner.jsx
// Generic loading dot. Tiny CSS-driven spinner; styled in animations.css.

export default function Spinner({ size = 36 }) {
  return <div className="spinner" style={{ width: size, height: size }} aria-label="Loading" />;
}
