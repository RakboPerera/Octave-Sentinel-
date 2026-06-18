import React from 'react';

export default function OctaveLogo({ height = 16, style = {}, className = '' }) {
  return (
    <img
      src="/octave-logo.svg"
      alt="Octave"
      className={className}
      style={{ height, width: 'auto', display: 'inline-block', verticalAlign: 'middle', ...style }}
    />
  );
}
