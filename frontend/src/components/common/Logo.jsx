import React from 'react';
import logoSrc from '../../assets/xorbit-logo.png';

const Logo = ({ className = "w-8 h-8" }) => (
  <img
    src={logoSrc}
    alt="Xorbits logo"
    className={`${className} object-contain`}
    style={{ mixBlendMode: 'screen' }}
  />
);

export default Logo;