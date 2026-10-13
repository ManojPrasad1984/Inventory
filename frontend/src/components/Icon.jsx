// Small stroke icon set (24x24, drawn for this app). Usage: <Icon name="truck" size={18} />
const PATHS = {
  home: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>,
  truck: <><path d="M2 6h11v10H2z" /><path d="M13 9h4l4 4v3h-8" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  box: <><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></>,
  inbox: <><path d="M3 13l3-8h12l3 8v6H3z" /><path d="M3 13h5l1 3h6l1-3h5" /></>,
  store: <><path d="M4 9l1-5h14l1 5" /><path d="M4 9c0 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0 1 2 4 2 4 0" /><path d="M5 12v8h14v-8" /><path d="M10 20v-5h4v5" /></>,
  factory: <><path d="M3 20V9l6 4V9l6 4V5h6v15z" /><path d="M8 20v-3M13 20v-3M18 20v-3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  alert: <><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.5" /></>,
  logout: <><path d="M10 4H5v16h5" /><path d="M15 8l4 4-4 4M19 12H9" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  printer: <><path d="M7 9V3h10v6" /><path d="M7 17H4v-7h16v7h-3" /><path d="M7 14h10v7H7z" /></>,
  back: <path d="M14 6l-6 6 6 6" />,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /></>,
  trash: <><path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13" /></>,
  wallet: <><path d="M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path d="M3 7l12-3v3" /><circle cx="17" cy="13.5" r="1" /></>,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />,
  more: <><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></>,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  flag: <><path d="M5 21V4" /><path d="M5 4h12l-2 4 2 4H5" /></>,
};

export default function Icon({ name, size = 18, className = '' }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] || null}
    </svg>
  );
}
