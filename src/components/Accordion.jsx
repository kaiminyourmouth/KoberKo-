import { useState } from 'react';
import './Accordion.css';

export default function Accordion({ title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className={`accordion${isOpen ? ' accordion--open' : ''}`}>
      <button
        type="button"
        className="accordion__trigger"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span>{title}</span>
        <span className="accordion__icon" aria-hidden="true">
          {isOpen ? '−' : '+'}
        </span>
      </button>

      {isOpen ? <div className="accordion__content">{children}</div> : null}
    </section>
  );
}
