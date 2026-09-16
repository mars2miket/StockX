import { useState, useEffect, useRef } from 'react';
import { FLOAT_UNIT, FLOAT_INPUT_MAX } from './constants';

function sharesToMillions(shares) {
  return Math.floor(Number(shares) / FLOAT_UNIT);
}

export default function FloatFilterInput({ value, onCommit }) {
  const [text, setText] = useState(String(sharesToMillions(value)));
  const textRef = useRef(text);

  useEffect(() => {
    const next = String(sharesToMillions(value));
    setText(next);
    textRef.current = next;
  }, [value]);

  function commit() {
    const raw = textRef.current;
    const millions = raw === '' ? 0 : Number(raw);
    const clamped = Math.min(Math.max(millions, 0), FLOAT_INPUT_MAX);
    const shares = clamped * FLOAT_UNIT;
    const display = String(clamped);
    setText(display);
    textRef.current = display;
    onCommit(shares);
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={5}
        value={text}
        aria-label="Max float in millions"
        onChange={e => {
          const next = e.target.value.replace(/\D/g, '').slice(0, 5);
          textRef.current = next;
          setText(next);
        }}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        style={{
          width: '5ch',
          padding: '2px 4px',
          fontSize: '12px',
          fontWeight: 400,
          letterSpacing: 0,
          textTransform: 'none',
          color: '#e0e0e0',
          background: '#121212',
          border: '1px solid #444',
          borderRadius: '4px',
          outline: 'none',
          boxSizing: 'content-box',
        }}
      />
      <span style={{ color: '#e0e0e0', fontWeight: 400, fontSize: '12px', letterSpacing: 0, textTransform: 'none' }}>
        mil
      </span>
    </span>
  );
}
