const PATHS = {
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 4-4 3 3 5-6" /></>,
  map: <><path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2Z" /><path d="M9 4v14M15 6v14" /></>,
  spark: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="m6.5 6.5 2.5 2.5M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.1-2.5 3.6" /><path d="M12 17.2h.01" /></>,
  user: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  left: <path d="m14.5 6-6 6 6 6" />,
  right: <path d="m9.5 6 6 6-6 6" />,
  down: <path d="m6 9.5 6 6 6-6" />,
  up: <path d="m6 14.5 6-6 6 6" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  pin: <><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  shape: <path d="M5 7.5 11.5 4 19 8l-1.5 9-8 3L4 14.5Z" />,
  sat: <><path d="m13 7 4-4 4 4-4 4" /><path d="m3 17 4-4 4 4-4 4" /><path d="m9.5 9.5 5 5" /><path d="M14 20a6 6 0 0 0 6-6" /></>,
  flame: <path d="M12 21c-3.9 0-6.5-2.7-6.5-6.2 0-3.6 2.8-5.6 3.9-8.8.4 1.9 1.4 3 2.5 3.5-.2-2.6.9-5.1 3-6.5-.2 3.1 4.6 5.4 4.6 11.2 0 3.7-3 6.8-7.5 6.8Z" />,
  sliders: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  reset: <><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4.5h4.5" /></>,
  download: <><path d="M12 4v11" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5" /><path d="M5 20h14" /></>,
  layers: <><path d="m12 4 8.5 4.5L12 13 3.5 8.5Z" /><path d="m3.5 12.5 8.5 4.5 8.5-4.5" /></>,
  sun: <><circle cx="12" cy="12" r="3.8" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  moon: <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" />,
  shield: <><path d="M12 3.5 19 6v5.5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6Z" /><path d="m9 12 2 2 4-4" /></>,
  line: <path d="m3.5 17 5-6 4 3.5 7.5-9" />,
  bars: <><path d="M6 20V11M12 20V5M18 20v-6" /></>,
  stack: <><rect x="4" y="12" width="4" height="8" rx="1" /><rect x="10" y="7" width="4" height="13" rx="1" /><rect x="16" y="10" width="4" height="10" rx="1" /><path d="M4 15h4M10 12h4M16 14h4" /></>,
  area: <><path d="M3.5 19.5V14l5-5 4 3 7.5-6.5v14Z" /></>,
  seasons: <><path d="M3.5 16c3-6 5-7 8.5-3s5.5 3 8.5-3" /><path d="M3.5 11c3-4 5-5 8.5-1.5s5.5 2 8.5-2" opacity=".55" /></>,
  cube: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z" /><path d="M12 12 4 7.5M12 12l8-4.5M12 12v9" /></>,
  table: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M3.5 14.5h17M9.5 4.5v15" /></>,
  compare: <><path d="M8 4v16M16 4v16" /><path d="m4 8 4-4 4 4M12 16l4 4 4-4" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.6h.01" /></>,
  send: <path d="M4 12 20 4l-4 16-4-6.5Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  square: <rect x="5" y="5" width="14" height="14" rx="1.5" />,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>,
  trash: <><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  bell: <><path d="M6 9a6 6 0 1 1 12 0c0 7 2 8 2 8H4s2-1 2-8" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
}

export function Icon({ name, size = 16, stroke = 1.8, className = '', title }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {PATHS[name] || PATHS.info}
    </svg>
  )
}
