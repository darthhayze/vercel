// Scenes 5 to 8.
import { A, T, TL, tube, strip, pipette, cycler, centrifuge, chip, chromium, shelf, sc } from '../../components/stage/glyphs';
import { rna, cell, dnaR, blk, diamond, square, ticks, gem, bead } from './molecules';

/* 5 - wash, then pool */
export const s5 = () => {
  const caps = ['cap-v', 'cap-v2', 'cap-v3'];
  const fill = ['sbc', 'sbc2', 'sbc3'];
  const tubes = caps.map((cp, i) => `<g${A('rise', 0.1 + i * 0.2, 0.7)}>${tube(40 + i * 62, 122, { s: 1.1, liq: 'lq-sage', level: 0.5, cap: cp })}</g>${T(62 + i * 62, 108, 'ABC'[i], { a: 'middle', c: 'lb-b', at: A('fade', 0.7 + i * 0.2, 0.5) })}`).join('');
  const lane = caps.map((_, i) => {
    const x = 62 + i * 62;
    return `<path id="s5-l${i}" d="M${x} 196V264H628V196" fill="none"/><g${A('trip', 6.6 + i * 0.5, 2.6, 'inout', `#s5-l${i}`)}><circle class="dotm ${fill[i]}" r="9"/></g>`;
  }).join('');
  const marks = [[150, 330], [250, 352], [340, 356], [46, 366], [190, 380], [290, 322], [360, 404], [60, 330]]
    .map(([x, y], i) => `<g${A('gone', 4.2 + i * 0.35, 1.4, 'in', `${i % 2 ? 50 : -40},${-60 - (i % 3) * 14}`)}><rect class="seg ${i % 2 ? 'rhs' : 'lhs'}" x="${x}" y="${y}" width="24" height="10" rx="3"/></g>`).join('');
  const mark = (cx: number, cy: number, r: number, k: number) => {
    let s = '';
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + k; const px = cx + Math.cos(a) * (r + 1), py = cy + Math.sin(a) * (r + 1); s += `<rect class="seg ${i % 2 ? 'rhs' : 'lhs'}" x="${(px - 7).toFixed(1)}" y="${(py - 3.5).toFixed(1)}" width="14" height="7" rx="2" transform="rotate(${((a * 180) / Math.PI + 90).toFixed(0)} ${px.toFixed(1)} ${py.toFixed(1)})"/>`; }
    return s;
  };
  const wc = [[112, 432, 36, 1], [214, 458, 32, 2], [316, 428, 36, 3]];
  const wash = wc.map(([x, y, r, k], i) => `<g${A('pop', 3.2 + i * 0.2, 0.7, 'soft')}>${cell(x, y, r, { seed: k, squig: false, nuc: false })}${mark(x, y, r, k)}</g>`).join('');
  const pc = [[490, 372, 'sbc'], [572, 424, 'sbc2'], [654, 364, 'sbc3'], [722, 432, 'sbc'], [532, 450, 'sbc3'], [624, 456, 'sbc2']] as const;
  const pooled = pc.map(([x, y, c], i) => `<g${A('pop', 9.4 + i * 0.28, 0.7, 'soft')}>${cell(x, y, 28, { seed: i + 2, squig: false, nuc: false })}<g transform="translate(${x + 21} ${y - 21})">${diamond(0, 0, 9, c)}</g></g>`).join('');
  return `
${shelf(236, 0, 800, A('fade', 0.1, 0.5))}
${T(371, 62, 'Centrifuge', { a: 'middle', c: 'lb-b', at: A('fade', 2.4, 0.6) })}
${tubes}
<g${A('draw', 1.0, 0.8, 'out')}><path class="ln arrowl" d="M236 164H274M264 154L274 164L264 174"/></g>
<g${A('rise', 0.4, 0.8)}>${centrifuge(290, 74, { s: 0.95, spinA: A('spin', 3.0, 3.0, 'inout', '1440') })}</g>
<g${A('draw', 5.6, 0.8, 'out')}><path class="ln arrowl" d="M466 164H576M566 154L576 164L566 174"/></g>
<g${A('rise', 0.8, 0.8)}>${tube(600, 90, { s: 1.4, liq: 'lq-sage', level: 0.6, cap: 'cap-v' })}</g>
${T(628, 74, 'Pool', { a: 'middle', c: 'lb-b', at: A('fade', 9.0, 0.6) })}
${lane}
<g${A('fade', 3.0, 0.8)}><rect class="zoomr" x="24" y="290" width="752" height="258" rx="22"/><line class="dash" x1="400" y1="306" x2="400" y2="532"/></g>
${marks}
${wash}
${T(44, 532, 'Unbound probes', { at: A('fade', 5.4, 0.6) })}
<g${A('fade', 9.0, 0.8)}><rect class="pool" x="430" y="314" width="320" height="180" rx="54"/></g>
${pooled}
${T(430, 532, 'Mixed samples', { at: A('fade', 11.0, 0.6) })}`;
};

/* 6 - chip loading and GEMs */
export const s6 = () => {
  const ch = (id: string, d: string, cls: string) => ({ id, d, cls });
  const paths = [
    ch('s6-bp', 'M430 108H500L550 170', 'ci-bead'),
    ch('s6-cp', 'M430 232H500L550 170', 'ci-cell'),
    ch('s6-mp', 'M550 170H600', 'ci-aq'),
    ch('s6-ot', 'M600 56V170', 'ci-oil'),
    ch('s6-ob', 'M600 284V170', 'ci-oil'),
    ch('s6-out', 'M600 170H766', 'ci-oil'),
  ];
  const outlines = paths.map((p) => `<path class="chO" d="${p.d}"/>`).join('');
  const inners = paths.map((p) => `<path id="${p.id}" class="chI ${p.cls}" d="${p.d}"/>`).join('');
  const beads = [0, 1, 2, 3].map((i) => `<g${A('trip', 7.6 + i * 0.85, 1.9, 'inout', '#s6-bp')}>${bead(0, 0, 7)}</g>`).join('');
  const cells = [0, 1, 2, 3].map((i) => `<g${A('trip', 8.0 + i * 0.85, 1.9, 'inout', '#s6-cp')}>${cell(0, 0, 7, { squig: false, nuc: false })}</g>`).join('');
  const oils = [0, 1].map((i) => `<g${A('trip', 8.4 + i, 1.6, 'inout', i ? '#s6-ob' : '#s6-ot')}><circle class="oildot" r="4.5"/></g>`).join('');
  const gems = [[650, true, true, 9.6], [702, false, false, 10.2], [754, true, true, 10.8]] as const;
  const gm = gems.map(([x, b, c, t]) => `<g${A('move', t, 0.9, 'out', '-52,0')}>${gem(x, 170, 18, { bead: b, cell: c })}</g>`).join('');
  return `
<g transform="translate(26 30)">${sc(200, 185, 1.0, `${shelf(250, -30, 372, A('fade', 0.1, 0.5))}
<g${A('rise', 0.1, 0.9)}>${chromium(24, 60, { s: 1.2 })}</g>
${TL(192, 286, ['Chromium', 'instrument'], { a: 'middle', at: A('fade', 0.8, 0.6) })}
<g transform="translate(215 137) scale(.72)"><g${A('zoom', 4.2, 2.8, 'inout', '-136,349,1.944')}>${chip(0, 0, {})}</g></g>
<path id="s6-pp" d="M330 340C280 330 220 340 171 384" fill="none"/>
<g${A('trip', 0.9, 3.0, 'inout', '#s6-pp')}>${pipette(0, 0, { s: 0.6, liq: 'lq-sage' })}</g>
`)}</g>
${[['Cells', 'lq-sage', 62], ['Beads', 'lq-bead', 190], ['Oil', 'lq-oil', 318]].map(([n, l, x], i) => `<g${A('rise', 0.5 + i * 0.2, 0.7)}>${tube(x as number, 388, { s: 1.0, liq: l as string, level: 0.55 })}</g>${T((x as number) + 20, 538, n as string, { a: 'middle', at: A('fade', 1.0 + i * 0.2, 0.5) })}`).join('')}
${shelf(490, 0, 400, A('gone', 7.0, 0.8))}
<g${A('fade', 6.4, 0.8)}><rect class="zoomr" x="410" y="40" width="370" height="302" rx="20"/></g>
<g${A('draw', 7.0, 1.6, 'inout')}>${outlines}</g>
<g${A('fade', 7.2, 1.2)}>${inners}</g>
${beads}${cells}${oils}${gm}
${T(702, 236, 'GEM', { a: 'middle', c: 'lb-b', at: A('fade', 11.4, 0.6) })}
<g${A('fade', 11.0, 0.9)}><rect class="zoomr" x="410" y="362" width="370" height="186" rx="20"/>
${gem(494, 455, 58, { bead: true, cell: true, cell2: true })}
<g transform="translate(516 440)">${diamond(0, 0, 7, 'sbc')}</g><g transform="translate(506 482)">${diamond(0, 0, 7, 'sbc2')}</g>
${TL(556, 430, ['Two samples', 'can share', 'a GEM'])}</g>`;
};

/* 7 - ligation inside the GEM */
export const s7 = () => {
  const marker = (x: number, y: number, symbol: string, d: number) => `<g${A('pop', d, 0.6, 'soft')}><text class="lb-b" x="${x}" y="${y + 6}" text-anchor="middle">${symbol}</text></g>`;
  const primers = [[-30, -24], [24, -30], [34, 14], [-36, 22], [2, 38], [-8, -42]].map(([dx, dy], i) => `<g${A('pop', 4.0 + i * 0.15, 0.7, 'out')}><g transform="translate(${470 + dx} ${214 + dy})"><rect class="seg gbc" x="-6" y="-3.5" width="11" height="7" rx="2"/><rect class="seg umi" x="6" y="-3.5" width="9" height="7" rx="2"/></g></g>`).join('');
  const gemBody = `
<circle class="gemc big" cx="550" cy="300" r="170"${A('pop', 1.8, 1.2, 'out')}/>
<g${A('gone', 3.6, 1.4, 'inout')}>${bead(470, 214, 28)}</g>
<g${A('fade', 4.0, 1.0)}><circle class="ghost" cx="470" cy="214" r="28"/></g>
${primers}
<g${A('gone', 5.0, 1.2, 'inout')}>${cell(640, 236, 48, { seed: 2, cls: 'cellb', squig: false })}</g>
<g${A('fade', 5.6, 1.2)}>${cell(640, 236, 48, { seed: 2, cls: 'cellb open', squig: false })}</g>
${rna(420, 680, 392, 4, 9, A('fade', 1.8, 0.8))}
<g${A('fade', 2.2, 0.8)}>
  ${blk(430, 344, 18, 'hdl')}${dnaR(450, 344, 64, 'lhs')}${dnaR(520, 344, 64, 'rhs')}${blk(586, 344, 26, 'hdl2')}
  ${blk(586, 316, 26, 'hdl2')}${blk(616, 316, 36, 'hdl')}${blk(656, 316, 30, 'sbc')}${diamond(698, 326, 8, 'sbc')}
  ${ticks(456, 580, 366, 388, 9)}
</g>
<g${A('pop', 8.2, 0.6, 'soft')}><rect class="joinr" x="512" y="346" width="10" height="16" rx="2"/></g>
<g${A('pop', 9.4, 0.6, 'soft')}><rect class="joinr" x="594" y="336" width="14" height="8" rx="2"/></g>
${marker(432, 186, "◆", 4.0)}${marker(590, 192, "○", 5.6)}${marker(517, 326, "+", 8.0)}`;
  const li = (y: number, symbol: string, t: string, d: number) => `<g${A('fade', d, 0.6)}><text class="lb-b" x="38" y="${y + 6}" text-anchor="middle">${symbol}</text>${T(64, y + 8, t)}</g>`;
  return `
${shelf(222, 0, 300, A('fade', 0.1, 0.5))}
<g${A('drop', 0.1, 0.9, 'out')}>${strip(62, 90, 8, { liq: 'lq-blue' })}</g>
<g${A('rise', 0.1, 0.8)}>${cycler(24, 92)}</g>
${T(144, 268, 'Thermal cycler', { a: 'middle', at: A('fade', 0.9, 0.6) })}
<g${A('draw', 1.4, 0.8, 'out')}><path class="ln arrowl" d="M300 162H340M330 152L340 162L330 172"/></g>
<g transform="translate(20 20)">${sc(550, 300, 1.12, gemBody)}</g>
${li(350, "◆", 'Bead dissolves', 3.8)}${li(406, "○", 'Cell opens', 5.4)}${li(462, "+", 'Gaps close', 7.8)}`;
};

/* 8 - capture and extension add GEM barcode and UMI */
export const s8 = () => {
  const primer = (y: number, u: [string, string, string]) => `${blk(30, y, 32, 'hdl')}${blk(66, y, 60, 'gbc')}${square(138, y + 10, 7, 'gbc')}${blk(150, y, 16, u[0])}${blk(170, y, 16, u[1])}${blk(190, y, 18, u[2])}`;
  // the product is drawn in a scaled group; its brackets scale with it, the labels are set outside it at the true label size
  const K = 1.15, CX = 345, DY = 36;
  const PX = (x: number) => CX + (x - CX) * K;
  const PY = (y: number) => 330 + DY + (y - 330) * K;
  const g = (x1: number, x2: number, d: number) =>
    `<g${A('fade', d, 0.6)}><path class="brk" d="M${x1} 372v8H${x2}v-8"/></g>`;
  const lab = (x1: number, x2: number, lines: string[], d: number) => TL(+((PX(x1) + PX(x2)) / 2).toFixed(1), +(PY(380) + 40).toFixed(1), lines, { a: 'middle', at: A('fade', d + 0.1, 0.6) });
  const prod = `
<g${A('fade', 1.0, 0.8)}>
  ${dnaR(70, 300, 110, 'lhs')}${dnaR(184, 300, 110, 'rhs')}<rect class="joinr" x="178" y="302" width="10" height="16" rx="2"/>${blk(298, 300, 26, 'hdl2')}${blk(328, 300, 64, 'sbc')}${diamond(404, 310, 8, 'sbc')}${blk(418, 300, 48, 'hdl')}
</g>
<g${A('move', 2.6, 1.6, 'inout', '-346,-183')}>${blk(470, 300, 64, 'gbc')}${square(546, 310, 7, 'gbc')}${blk(562, 300, 16, 'umi')}${blk(582, 300, 16, 'umi2')}${blk(602, 300, 18, 'umi3')}</g>
<path id="s8-e" d="M620 340H70" fill="none"/>
<g${A('draw', 4.6, 3.6, 'inout')}><path class="ext" d="M620 340H70"/></g>
<g${A('trip', 4.6, 3.6, 'inout', '#s8-e')}><g transform="translate(0 -4)"><rect class="pol" x="-25" y="-16" width="50" height="32" rx="15"/><text class="bn" x="0" y="6" text-anchor="middle">Pol</text></g></g>
${g(70, 294, 8.4)}${g(328, 412, 8.7)}${g(470, 554, 9.0)}${g(562, 620, 9.3)}`;
  const prim = (y: number, u: [string, string, string], d: number) => `<g${A('rise', d, 0.7)}>${primer(y, u)}</g>`;
  return `
${T(30, 56, 'Bead primers', { c: 'lb-m', at: A('fade', 0.2, 0.6) })}
<g transform="translate(14 -2) scale(1.6)">
${prim(46, ['umi', 'umi2', 'umi3'], 0.2)}
${prim(80, ['umi3', 'umi', 'umi2'], 0.4)}
${prim(114, ['umi2', 'umi3', 'umi'], 0.6)}
</g>
<g${A('fade', 1.2, 0.6)}><path class="brk" d="M372 106h12v132h-12M384 172h24"/></g>
${TL(424, 164, ['Same GEM barcode,', 'varying UMIs'], { at: A('fade', 1.4, 0.6) })}
<g transform="translate(0 ${DY})">${sc(CX, 330, K, prod)}</g>
${lab(70, 294, ['Probe', 'insert'], 8.4)}${lab(328, 412, ['Sample', 'barcode'], 8.7)}${lab(470, 554, ['GEM', 'barcode'], 9.0)}${TL(+(PX(620) + 40).toFixed(1), +(PY(380) + 40).toFixed(1), ['UMI'], { a: 'end', at: A('fade', 9.4, 0.6) })}`;
};
