import React from "react";

export function AconEmblemSvg({ className = "w-8 h-8", opacity = 1 }: { className?: string; opacity?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={{ opacity }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Circle with dashed/wreath border */}
      <circle cx="50" cy="50" r="46" stroke="#16a34a" strokeWidth="2.5" strokeDasharray="3 1.5" />
      <circle cx="50" cy="50" r="41" stroke="#223875" strokeWidth="1.2" />

      {/* College circular text track */}
      <path
        id="aconCircleTrack"
        d="M 18,50 A 32,32 0 1,1 82,50"
        fill="none"
      />
      <text fill="#16a34a" fontSize="7" fontWeight="bold" letterSpacing="0.8">
        <textPath href="#aconCircleTrack" startOffset="50%" textAnchor="middle">
          ACME COLLEGE OF NURSING
        </textPath>
      </text>

      {/* Center Caduceus / Rod of Asclepius with Wings */}
      <g transform="translate(50, 48) scale(0.9)">
        {/* Open Book Base */}
        <path
          d="M -16,14 C -8,11 -2,12 0,14 C 2,12 8,11 16,14 L 14,21 C 7,19 2,20 0,21 C -2,20 -7,19 -14,21 Z"
          fill="#3b82f6"
          opacity="0.8"
        />
        <path
          d="M 0,14 L 0,21"
          stroke="#1e3a8a"
          strokeWidth="1.2"
        />

        {/* Central Staff */}
        <line x1="0" y1="-26" x2="0" y2="15" stroke="#1e3a8a" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="0" cy="-27" r="3" fill="#f59e0b" />

        {/* Angel Wings */}
        <path
          d="M 0,-18 C -8,-28 -22,-22 -20,-10 C -15,-13 -7,-14 0,-13 Z"
          fill="#2563eb"
          opacity="0.9"
        />
        <path
          d="M 0,-18 C 8,-28 22,-22 20,-10 C 15,-13 7,-14 0,-13 Z"
          fill="#2563eb"
          opacity="0.9"
        />

        {/* Coiled Serpents */}
        <path
          d="M -6,-15 C 6,-11 6,-5 -5,-2 C -10,1 -6,7 5,10"
          stroke="#10b981"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 6,-15 C -6,-11 -6,-5 5,-2 C 10,1 6,7 -5,10"
          stroke="#059669"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* Estd Ribbon at bottom */}
      <path
        d="M 32,82 L 50,77 L 68,82 L 64,88 L 50,85 L 36,88 Z"
        fill="#1e3a8a"
      />
      <text x="50" y="83.5" fill="#ffffff" fontSize="4.5" fontWeight="bold" textAnchor="middle">
        ACON ESTD 2024
      </text>
    </svg>
  );
}

export function AconPrincipalSignatureSvg({ className = "w-28 h-8", color = "#ffffff" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 160 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cursive cursive stroke representing authentic principal signature */}
      <path
        d="M 15,32 C 18,12 24,6 28,24 C 31,34 33,18 38,20 C 44,22 47,31 52,22 C 55,16 57,28 62,25 C 68,21 72,14 74,27 C 77,32 82,19 86,22 C 92,26 98,12 101,23 C 104,29 110,18 116,21 C 122,24 135,19 146,28 M 22,25 L 85,25 M 60,35 Q 105,37 150,33"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FacebookIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function InstagramIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

export function MailIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
