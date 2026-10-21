import type { CSSProperties } from "react";
export type IconName =
  | "train"
  | "play"
  | "pause"
  | "stop"
  | "rotate"
  | "undo"
  | "redo"
  | "trash"
  | "save"
  | "load"
  | "sound"
  | "mute"
  | "plus"
  | "minus"
  | "fit"
  | "hand"
  | "cursor"
  | "arrow"
  | "check"
  | "help"
  | "close"
  | "leaf"
  | "spark"
  | "reverse"
  | "reset";
const paths: Record<IconName, React.ReactNode> = {
  train: (
    <>
      <rect x="5" y="3" width="14" height="15" rx="4" />
      <path d="M5 11h14M9 3v8m6-8v8M8 21l2-3m6 3-2-3" />
      <path d="M8 15h.01M16 15h.01" />
    </>
  ),
  play: <path d="m9 5 11 7-11 7Z" />,
  pause: (
    <>
      <path d="M8 5v14M16 5v14" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  rotate: (
    <>
      <path d="M5 8a8 8 0 1 1-1 7M5 3v5h5" />
    </>
  ),
  undo: (
    <>
      <path d="m8 5-5 5 5 5M3 10h10a7 7 0 0 1 7 7v2" />
    </>
  ),
  redo: (
    <>
      <path d="m16 5 5 5-5 5m5-5H11a7 7 0 0 0-7 7v2" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
    </>
  ),
  save: (
    <>
      <path d="M4 3h13l3 3v15H4Z" />
      <path d="M8 3v6h8V3M8 21v-8h8v8" />
    </>
  ),
  load: (
    <>
      <path d="M3 7h7l2 3h9l-3 10H3Z" />
      <path d="M3 7V4h7l2 3h8v3" />
    </>
  ),
  sound: (
    <>
      <path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
    </>
  ),
  mute: (
    <>
      <path d="m11 4-6 5H2v6h3l6 5ZM16 9l6 6m0-6-6 6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  fit: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
  hand: (
    <>
      <path d="M8 12V5a2 2 0 0 1 4 0v7-8a2 2 0 0 1 4 0v8-6a2 2 0 0 1 4 0v9c0 5-4 7-8 7-3 0-5-2-7-5l-3-4a2 2 0 0 1 3-2l3 3" />
    </>
  ),
  cursor: <path d="m5 3 14 10-7 1-3 7Z" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  leaf: (
    <>
      <path d="M20 3C8 1 2 8 5 15s16 5 15-12ZM5 21 16 9" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />
    </>
  ),
  reverse: (
    <>
      <path d="M4 8h15l-4-4M20 16H5l4 4" />
    </>
  ),
  reset: (
    <>
      <path d="M4 11a8 8 0 1 1 2 7M4 4v7h7" />
    </>
  ),
};
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
