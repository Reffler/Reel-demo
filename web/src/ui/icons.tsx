import type { JSX } from "solid-js";

type P = { size?: number };
// The paths are built once, so each icon on the page gets its own copy (a DOM node can only be in one place).
const clone = (n: JSX.Element): JSX.Element => Array.isArray(n) ? n.map(clone) : n instanceof Node ? n.cloneNode(true) : n;
const svg = (path: JSX.Element, viewBox = "0 0 24 24") => (p: P) => (
  <svg
    width={p.size ?? 18}
    height={p.size ?? 18}
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    {clone(path)}
  </svg>
);

export const IconPlus = svg(<path d="M12 5v14M5 12h14" />);
export const IconArrowLeft = svg(<path d="M19 12H5M11 18l-6-6 6-6" />);
export const IconArrowRight = svg(<path d="M5 12h14M13 6l6 6-6 6" />);
export const IconCheck = svg(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const IconX = svg(<path d="M6 6l12 12M18 6L6 18" />);
export const IconSun = svg(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>,
);
export const IconMoon = svg(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />);
export const IconVideo = svg(
  <>
    <rect x="3" y="6" width="13" height="12" rx="2.5" />
    <path d="M16 10.5l5-3v9l-5-3" />
  </>,
);
export const IconFilm = svg(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
  </>,
);
export const IconImage = svg(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="M21 16l-5-5-9 9" />
  </>,
);
export const IconBadge = svg(
  <>
    <path d="M12 3l2.6 2 3.3-.2.9 3.2 2.7 1.9-1.2 3.1 1.2 3.1-2.7 1.9-.9 3.2-3.3-.2L12 21l-2.6-2-3.3.2-.9-3.2L2.5 14.1l1.2-3.1-1.2-3.1L5.2 6l.9-3.2 3.3.2z" />
  </>,
);
export const IconMusic = svg(
  <>
    <path d="M9 18V5l11-2v13" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="17.5" cy="16" r="2.5" />
  </>,
);
export const IconSpark = svg(
  <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
);
export const IconUpload = svg(<path d="M12 16V4M7 9l5-5 5 5M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" />);
export const IconDownload = svg(<path d="M12 4v12M7 11l5 5 5-5M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" />);
export const IconTrash = svg(<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />);
export const IconRefresh = svg(<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4" />);
export const IconGauge = svg(
  <>
    <path d="M4.5 18a9 9 0 1 1 15 0" />
    <path d="M12 13l4-4" />
    <circle cx="12" cy="13" r="1.2" />
  </>,
);
export const IconLogout = svg(<path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15M10 16l-4-4 4-4M6 12h10" />);
export const IconWand = svg(<path d="M4 20L15 9M17 3v3M15.5 4.5h3M20 8v2M19 9h2M12 4v2M11 5h2M14 6l4 4" />);
export const IconSliders = svg(
  <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4" />,
);
export const IconPlay = svg(<path d="M7 4.5v15l13-7.5z" />);
export const IconInfo = svg(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </>,
);
export const IconKey = svg(
  <>
    <circle cx="8" cy="15" r="4" />
    <path d="M11 12l9-9M17 6l3 3M15 8l2 2" />
  </>,
);
export const IconMore = svg(
  <>
    <circle cx="5" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
  </>,
);
export const IconPencil = svg(<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3zM14.5 7.5l3 3" />);
export const IconUndo = svg(<path d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />);
export const IconSwap = svg(<path d="M7 4L3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7" />);
export const IconUnlink = svg(<path d="M9.5 14.5l-1.8 1.8a3 3 0 0 1-4.2-4.2l3-3a3 3 0 0 1 4.2 0M14.5 9.5l1.8-1.8a3 3 0 0 1 4.2 4.2l-3 3a3 3 0 0 1-4.2 0M4 4l2 2M18 18l2 2" />);
export const IconFolder = svg(<path d="M3 7V5.5A1.5 1.5 0 0 1 4.5 4H9l2 2.5h8.5A1.5 1.5 0 0 1 21 8v10.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />);
export const IconFiles = svg(<path d="M8 3h7l4 4v10.5a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 8 3zM15 3v4h4M3.5 8v12A1.5 1.5 0 0 0 5 21.5h9" />);
export const IconFrame = svg(<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />);
export const IconStory = svg(<path d="M4 6h3M4 12h3M4 18h3M11 6h9M11 12h9M11 18h6" />);
export const IconCaptions = svg(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M7 14h4M13 14h4M7 10.5h10" />
  </>,
);
export const IconChat = svg(<path d="M5 18.5V6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v8a1.5 1.5 0 0 1-1.5 1.5H8.5L5 18.5zM9 9.5h6M9 12.5h4" />);
export const IconLayers = svg(<path d="M12 4l9 4.5-9 4.5-9-4.5zM3 12.5l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5" />);
