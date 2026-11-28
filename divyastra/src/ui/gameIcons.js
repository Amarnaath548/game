// Painted game-style icons (filled gradients, dark outline, highlight). 64x64 viewBox.
let uid = 0;
const INK = '#1a1226';
const wrap = (size, body) =>
  `<svg viewBox="0 0 64 64" width="${size}" height="${size}" class="dv-icon dv-icon-paint" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

// vertical gradient helper: returns [defsString, urlRef]
const grad = (id, top, bot, mid) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/>${mid ? `<stop offset=".5" stop-color="${mid}"/>` : ''}<stop offset="1" stop-color="${bot}"/></linearGradient>`;
const shine = (d) => `<path d="${d}" fill="#fff" opacity=".55"/>`;

const GOLD = ['#FFE9A0', '#E3A12B', '#F6C85A'];

const ICONS = {
  heart: (g) => `<defs>${grad(g, '#FF8F7A', '#B81E34', '#E5384A')}</defs>
    <path d="M32 57C11 42 5 28 9 19 13 10 26 9 32 18 38 9 51 10 55 19 59 28 53 42 32 57Z" fill="url(#${g})" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    ${shine('M14 21c1-5 6-7 10-5-5 0-8 3-8 8-1-1-2-2-2-3Z')}<circle cx="46" cy="22" r="2.2" fill="#fff" opacity=".5"/>`,

  boot: (g) => `<defs>${grad(g, '#D9965A', '#6E3A18')}${grad(g + 'w', '#FFFFFF', '#8EE4F0')}</defs>
    <path d="M20 8h18v26l13 6c4 2 6 5 6 9v6H11v-9l9-6Z" fill="url(#${g})" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    <rect x="20" y="8" width="18" height="8" fill="#F2C14E" stroke="${INK}" stroke-width="3"/>
    <path d="M11 49h46v6H11Z" fill="#3a2414" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M22 4c-7-1-14 3-16 10 5-2 9-1 12 1-4 0-7 3-8 6 5-1 9 0 12 3Z" fill="url(#${g}w)" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    ${shine('M23 20h4v14h-4Z')}`,

  magnet: (g) => `<defs>${grad(g, '#FF7B6A', '#A81C2C')}${grad(g + 's', '#FFFFFF', '#9AA6B8')}</defs>
    <path d="M17 14v19a15 15 0 0 0 30 0V14" fill="none" stroke="${INK}" stroke-width="19" stroke-linecap="butt"/>
    <path d="M17 14v19a15 15 0 0 0 30 0V14" fill="none" stroke="url(#${g})" stroke-width="12.5"/>
    <path d="M12.5 8h9v17h-9Z M42.5 8h9v17h-9Z" fill="url(#${g}s)" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M14 33a13 13 0 0 0 5 10" fill="none" stroke="#fff" stroke-width="2.5" opacity=".55" stroke-linecap="round"/>
    <path d="M28 4l-3 7h4l-3 7M38 4l-3 7h4l-3 7" fill="none" stroke="#7FE3F0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>`,

  flame: (g) => `<defs>${grad(g, '#FFE070', '#E4401E', '#FF9A2E')}${grad(g + 'i', '#FFFBD0', '#FFC53D')}</defs>
    <path d="M32 4c3 11 18 17 18 35 0 11-8 19-18 19S14 50 14 39c0-7 5-11 7-17 4 5 7 5 8 0 1-6 1-11 3-18Z" fill="url(#${g})" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M32 28c2 6 9 9 9 17 0 6-4 10-9 10s-9-4-9-10c0-4 3-6 4-9 2 3 4 3 5-1Z" fill="url(#${g}i)" stroke="#C8431E" stroke-width="1.5" stroke-linejoin="round"/>`,

  clock: (g) => `<defs>${grad(g, GOLD[0], '#B9741A', GOLD[1])}</defs>
    <circle cx="32" cy="34" r="23" fill="url(#${g})" stroke="${INK}" stroke-width="3.5"/>
    <circle cx="32" cy="34" r="16.5" fill="#FFF1CC" stroke="#8A5412" stroke-width="2"/>
    <path d="M32 22v12l8 5" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="32" cy="34" r="2.6" fill="#C8431E" stroke="${INK}" stroke-width="1.5"/>
    <path d="M26 6h12v7H26Z" fill="url(#${g})" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    ${shine('M14 28c2-7 8-11 14-12-6 3-10 7-12 14Z')}`,

  shield: (g) => `<defs>${grad(g, '#8FC3F5', '#2A4F95', '#4F86D6')}${grad(g + 'g', GOLD[0], '#B9741A', GOLD[1])}</defs>
    <path d="M32 4l23 8v20c0 14-10 22-23 28C19 54 9 46 9 32V12Z" fill="url(#${g}g)" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M32 11l16 5.5V32c0 10-7 16-16 21-9-5-16-11-16-21V16.5Z" fill="url(#${g})" stroke="${INK}" stroke-width="2"/>
    <path d="M32 21l4 8h-8Zm0 22l-5-10h10Z" fill="#FFE9A0" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
    ${shine('M20 19l8-3v8l-8 4Z')}`,

  dash: (g) => `<defs>${grad(g, '#E8FFFF', '#25A9D8', '#7FE3F0')}</defs>
    <path d="M4 22h12M2 32h10M4 42h12" stroke="#7FE3F0" stroke-width="3.5" stroke-linecap="round" opacity=".9"/>
    <path d="M22 12l20 20-20 20" fill="none" stroke="${INK}" stroke-width="17" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M38 12l20 20-20 20" fill="none" stroke="${INK}" stroke-width="17" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M22 12l20 20-20 20" fill="none" stroke="url(#${g})" stroke-width="10.5" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M38 12l20 20-20 20" fill="none" stroke="url(#${g})" stroke-width="10.5" stroke-linejoin="round" stroke-linecap="round"/>`,

  coin: (g) => `<defs>${grad(g, GOLD[0], '#B9741A', GOLD[1])}</defs>
    <ellipse cx="32" cy="52" rx="20" ry="6" fill="#B9741A" stroke="${INK}" stroke-width="3"/>
    <circle cx="32" cy="30" r="23" fill="url(#${g})" stroke="${INK}" stroke-width="3.5"/>
    <circle cx="32" cy="30" r="16.5" fill="#F0B232" stroke="#9A5E12" stroke-width="2.2"/>
    <path d="M32 17l3.5 9.5L45 30l-9.5 3.5L32 43l-3.5-9.5L19 30l9.5-3.5Z" fill="#FFE9A0" stroke="#9A5E12" stroke-width="1.8" stroke-linejoin="round"/>
    ${shine('M14 24c2-7 8-11 15-12-7 3-11 7-13 14Z')}`,

  book: (g) => `<defs>${grad(g, '#FFF6DC', '#E0C48A')}${grad(g + 'c', '#5C79D6', '#25358A')}</defs>
    <path d="M6 20c8-3 18-2 26 4 8-6 18-7 26-4v32c-8-3-18-2-26 4-8-6-18-7-26-4Z" fill="url(#${g}c)" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M10 22c7-2 15-1 22 4v26c-7-5-15-6-22-4Zm44 0c-7-2-15-1-22 4v26c7-5 15-6 22-4Z" fill="url(#${g})" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M15 30h12M15 36h12M37 30h12M37 36h12" stroke="#8A5412" stroke-width="2" stroke-linecap="round" opacity=".7"/>
    <path d="M32 3l2.6 6.4L41 12l-6.4 2.6L32 21l-2.6-6.4L23 12l6.4-2.6Z" fill="#FFE070" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`
};

export const paintIcon = (name, size = 40) => {
  const fn = ICONS[name];
  if (!fn) return '';
  uid += 1;
  return wrap(size, fn(`pg${uid}`));
};
