import type { CSSProperties } from 'react';

type P = { size?: number; color?: string; style?: CSSProperties; strokeWidth?: number };

const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const });

export const IconStar = ({ size = 20, color = 'currentColor', style }: P) => (
  <svg {...base(size)} style={style}>
    <path d="M12 2.5l2.7 6.1 6.6.6-5 4.4 1.5 6.5L12 16.9 6.2 20.6l1.5-6.5-5-4.4 6.6-.6z"
      fill={color} stroke={color} strokeWidth="1" strokeLinejoin="round" />
  </svg>
);

export const IconEye = ({ size = 18, color = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconEyeOff = ({ size = 18, color = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.9 17.9A10.4 10.4 0 0 1 12 19c-7 0-11-7-11-7a19 19 0 0 1 5.1-5.9m3.2-1.5A10.4 10.4 0 0 1 12 5c7 0 11 7 11 7a19 19 0 0 1-2.3 3.3M1 1l22 22" />
  </svg>
);

export const IconPin = ({ size = 15, color = 'currentColor' }: P) => (
  <svg {...base(size)} fill={color}>
    <path d="M14.4 2.6a1 1 0 0 0-1.5 0l-.3.3a2 2 0 0 0-.5 2l-3.4 2.3-2.4-.3a1 1 0 0 0-.8 1.7l3 3-4 4a1 1 0 1 0 1.4 1.4l4-4 3 3a1 1 0 0 0 1.7-.8l-.3-2.4 2.3-3.4a2 2 0 0 0 2-.5l.3-.3a1 1 0 0 0 0-1.5z" />
  </svg>
);

export const IconSearch = ({ size = 16, color = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
  </svg>
);

export const IconEdit = ({ size = 15, color = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);

export const IconInbox = ({ size = 40, color = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.5z" />
  </svg>
);

export const IconCheck = ({ size = 15, color = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const IconPlus = ({ size = 15, color = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconTrash = ({ size = 15, color = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
  </svg>
);

export const IconMenu = ({ size = 22, color = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);

export const IconClose = ({ size = 20, color = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
