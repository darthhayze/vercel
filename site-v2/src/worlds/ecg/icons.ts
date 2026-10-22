// Chain-strip icons: one small schematic per probe point. 56x40, 2px strokes, currentColor (the strip sets the colour).
const svg = (inner: string) => `<svg class="ch-i" viewBox="0 0 56 40" width="56" height="40" aria-hidden="true" focusable="false">${inner}</svg>`;

export const ICONS: string[] = [
  // electrode pad with snap and lead
  svg('<circle cx="20" cy="20" r="13"/><circle class="fl" cx="20" cy="20" r="5"/><path d="M33 20H52"/>'),
  // board: chip, traces, header pins along the bottom
  svg('<rect x="5" y="4" width="46" height="28" rx="4"/><rect class="fl" x="21" y="11" width="14" height="12" rx="2"/><path d="M8 14H21M8 21H21M35 14H48M35 21H44"/><path d="M14 32V37M24 32V37M34 32V37M44 32V37"/>'),
  // header pin row, third pin (A1) filled
  svg('<path d="M4 30H52"/><rect x="7" y="8" width="6" height="22" rx="2"/><rect x="18" y="8" width="6" height="22" rx="2"/><rect class="fl" x="29" y="8" width="6" height="22" rx="2"/><rect x="40" y="8" width="6" height="22" rx="2"/><path d="M4 30V35H52V30"/>'),
  // loop arrow with a clock hand
  svg('<path d="M39 11A15 15 0 1 0 43 24"/><path d="M33 9L40 11L38 18"/><path d="M28 14V21L33 24"/>'),
  // serial: plug, cable, bytes
  svg('<rect x="4" y="9" width="17" height="22" rx="3"/><path d="M9 16V24M16 16V24"/><path d="M21 20H50"/><path d="M45 14L51 20L45 26"/><path d="M28 14V26M34 17V23M40 14V26" class="bt"/>'),
  // monitor with a trace
  svg('<rect x="5" y="3" width="46" height="27" rx="4"/><path d="M21 37H35M28 30V37"/><path class="tr-i" d="M10 18H19L22 9L27 25L30 18H46"/>'),
  // threshold line, a peak crossing it, a flag
  svg('<path class="dsh" d="M4 18H52"/><path d="M4 33H16L21 8L27 36L31 28H40"/><path class="fl" d="M45 4V16M45 4H54L50.5 8L54 12H45"/>'),
];
