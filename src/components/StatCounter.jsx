import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function StatCounter({ value = 0, suffix = '', prefix = '', style = {} }) {
  const nodeRef = useRef(null);
  const prevValRef = useRef(value);

  useEffect(() => {
    const targetObj = { val: prevValRef.current };
    const targetVal = Number(value) || 0;

    const tween = gsap.to(targetObj, {
      val: targetVal,
      duration: 0.45,
      ease: 'power2.out',
      onUpdate: () => {
        if (nodeRef.current) {
          nodeRef.current.textContent = `${prefix}${Math.round(targetObj.val)}${suffix}`;
        }
      },
    });

    prevValRef.current = targetVal;

    return () => {
      tween.kill();
    };
  }, [value, prefix, suffix]);

  return (
    <span ref={nodeRef} style={{ display: 'inline-block', fontVariantNumeric: 'tabular-nums', ...style }}>
      {prefix}{value}{suffix}
    </span>
  );
}
