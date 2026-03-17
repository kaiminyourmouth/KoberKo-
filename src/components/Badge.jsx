import './Badge.css';

export default function Badge({ variant = 'neutral', size = 'md', children }) {
  return (
    <span className={`badge badge--${variant} badge--${size}`}>
      {children}
    </span>
  );
}
