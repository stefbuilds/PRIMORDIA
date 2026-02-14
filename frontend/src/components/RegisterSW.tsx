'use client';

import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        if (reg.installing) reg.installing.addEventListener('statechange', () => {});
      })
      .catch(() => {});
  }, []);
  return null;
}
