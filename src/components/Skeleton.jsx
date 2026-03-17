import './Skeleton.css';

export default function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = '8px',
}) {
  return (
    <div
      className="skeleton"
      aria-hidden="true"
      style={{ width, height, borderRadius }}
    />
  );
}
