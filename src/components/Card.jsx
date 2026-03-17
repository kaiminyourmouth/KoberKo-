import './Card.css';

export default function Card({ variant = 'default', children, className = '' }) {
  const classes = ['card', `card--${variant}`, className].filter(Boolean).join(' ');

  return <section className={classes}>{children}</section>;
}
