// Scenes 9 to 12.
import { A, T, TL, tube, bottle, strip, pipette, cycler, rack, bioanalyzer, flowcell, terminal, doc, shelf, sc } from '../../components/stage/glyphs';
import { dnaR, blk } from './molecules';

/* mini library molecule for copies, 120 wide */
const mini = (x: number, y: number, k = 1.4) => `<g transform="translate(${x} ${y}) scale(${k})">${dnaR(0, 0, 26, 'lhs')}${dnaR(28, 0, 26, 'rhs')}${blk(56, 0, 26, 'sbc')}${blk(84, 0, 20, 'gbc')}${blk(106, 0, 14, 'umi')}</g>`;

/* 9 - recover the aqueous phase, pre-amplify, clean up */
export const s9 = () => {
  const emul = Array.from({ length: 16 }, (_, i) => `<circle class="gemc sm" cx="${9 + (i % 5) * 6.6 + (Math.floor(i / 5) % 2) * 3}" cy="${50 + Math.floor(i / 5) * 12}" r="4.4"/>`).join('');
  const phases = `<path class="lq-oil" d="M5 62H35V70Q35 96 20 102Q5 96 5 70Z"/><path class="lq-blue" d="M5 34H35V62H5Z"/><line class="ln thin" x1="5" y1="62" x2="35" y2="62"/>`;
  const loose = [[10, 44], [20, 50], [30, 46], [14, 60], [26, 62], [20, 38], [32, 56], [8, 54]].map(([x, y], i) => `<circle class="mbead" cx="${x}" cy="${y}" r="2.6"${A('gone', 14.2 + i * 0.12, 1.6, 'in', `${20 - x},${44 - y + 32}`)}/>`).join('');
  const pellet = [[11, 90], [17, 94], [24, 92], [14, 84], [22, 86], [28, 80]].map(([x, y]) => `<circle class="mbead" cx="${x}" cy="${y - 4}" r="3"/>`).join('');
  const D1 = 308, D2 = 566;
  const copies = [336, 372, 408, 444].map((y, i) => `<g${A(i === 0 ? 'fade' : 'pop', [8.0, 9.2, 10.0, 10.0][i], 0.7, 'soft')}>${mini(322, y)}</g>`).join('');
  return `
${shelf(300, 0, 800, A('fade', 0.1, 0.5))}
<line class="dash" x1="${D1}" y1="24" x2="${D1}" y2="540"/><line class="dash" x1="${D2}" y1="24" x2="${D2}" y2="540"/>
${T(24, 46, 'Break GEMs', { c: 'lb-b', at: A('fade', 0.1, 0.6) })}
${T(324, 46, 'Pre-amplify', { c: 'lb-b', at: A('fade', 6.4, 0.6) })}
${T(584, 46, 'Clean up', { c: 'lb-b', at: A('fade', 12.4, 0.6) })}
<g${A('rise', 0.2, 0.8)}>${bottle(58, 188, { s: 1.0 })}</g>
${TL(88, 132, ['Recovery', 'agent'], { a: 'middle', at: A('fade', 0.6, 0.6) })}
<g${A('rise', 0.1, 0.8)}>${tube(204, 123, { s: 1.7, liq: 'lq-oil', level: 0.45, cap: 'cap-off' })}</g>
<g${A('fade', 4.2, 1.8, 'inout')}>${tube(204, 123, { s: 1.7, cap: 'cap-off', inner: phases })}</g>
<g transform="translate(204 123) scale(1.7)"><g${A('gone', 3.4, 1.4, 'inout')}>${emul}</g></g>
${TL(238, 340, ['Aqueous', 'phase'], { a: 'middle', at: A('fade', 5.4, 0.6) })}
<path id="s9-w" d="M230 270C300 300 300 400 244 446" fill="none"/>
<g${A('trip', 5.0, 1.8, 'inout', '#s9-w')}><circle class="dotm lq-oil" r="10"/></g>
<g${A('fade', 4.8, 0.6)}><path class="glass" d="M200 440H272L266 508Q266 516 258 516H214Q206 516 206 508Z"/></g>
${T(188, 492, 'Waste', { a: 'end', at: A('fade', 4.8, 0.6) })}

<g${A('drop', 6.8, 0.8)}>${strip(356, 168, 8, { s: 1, liq: 'lq-blue' })}</g>
<g${A('rise', 6.4, 0.8)}>${cycler(318, 170, { s: 1 })}</g>
${copies}
${TL(322, 506, ['Copies keep', 'the barcodes'], { at: A('fade', 10.8, 0.6) })}

<g${A('rise', 12.4, 0.8)}>${rack(584, 180, { s: 1.2 })}</g>
<g${A('rise', 12.6, 0.8)}>${tube(614, 163, { s: 0.75, liq: 'lq-blue', level: 0.6, inner: `${loose}${pellet}` })}</g>
<g${A('rise', 12.8, 0.8)}>${tube(700, 163, { s: 0.75, liq: 'lq-blue', level: 0.01 })}</g>
<g${A('fade', 17.2, 1.2)}><path class="lq-clean" d="M703 224H725V235Q725 244 714 246Q703 244 703 235Z"/></g>
<path id="s9-t" d="M630 160C630 84 718 84 718 160" fill="none"/>
<g${A('trip', 15.6, 1.8, 'inout', '#s9-t')}>${pipette(0, 0, { s: 0.5, liq: 'lq-blue' })}</g>
${TL(584, 340, ['Beads on', 'magnet'], { at: A('fade', 14.8, 0.6) })}
<g${A('fade', 17.4, 0.8)}>${mini(584, 456, 1.3)}${T(584, 520, 'Clean DNA')}</g>`;
};

/* 10 - sample index PCR, library, QC */
export const s10 = () => {
  const bar = [
    blk(40, 84, 64, 'hdl', A('rise', 0.4, 0.6)), blk(108, 84, 44, 'idx', A('rise', 0.8, 0.6)), blk(156, 84, 22, 'hdl2', A('rise', 1.1, 0.6)),
    dnaR(182, 84, 100, 'lhs', A('rise', 1.3, 0.6)), dnaR(286, 84, 100, 'rhs', A('rise', 1.5, 0.6)), blk(390, 84, 50, 'sbc', A('rise', 1.7, 0.6)),
    blk(444, 84, 46, 'gbc', A('rise', 1.9, 0.6)), blk(494, 84, 36, 'umi', A('rise', 2.1, 0.6)), blk(534, 84, 22, 'hdl2', A('rise', 2.3, 0.6)),
    blk(560, 84, 44, 'idx', A('rise', 2.5, 0.6)), blk(608, 84, 64, 'hdl', A('rise', 2.8, 0.6)),
  ].join('');
  const X = (x: number) => 40 + (x - 40) * 1.15;
  const br = (x1: number, x2: number, l1: string, l2: string, d: number) =>
    `<g${A('fade', d, 0.6)}><path class="brk" d="M${X(x1)} 124v8H${X(x2)}v-8"/>${TL((X(x1) + X(x2)) / 2, 164, [l1, l2], { a: 'middle' })}</g>`;
  const sig = (dx: number, d: number) => `<path class="curve" d="M${652 + dx} 424C${690 + dx} 424 ${696 + dx} 420 ${712 + dx} 396S${740 + dx} 346 ${766} 342" ${A('draw', d, 1.6, 'inout')}/>`;
  return `
${T(40, 56, 'Sample Index PCR', { c: 'lb-b', at: A('fade', 0.1, 0.6) })}
${sc(40, 94, 1.15, bar)}
${br(40, 152, 'i5', 'index', 3.4)}${br(182, 530, 'Probe insert with', 'barcodes and UMI', 3.7)}${br(560, 672, 'i7', 'index', 4.0)}
<g${A('fade', 5.0, 0.8)}><rect class="zoomr" x="24" y="244" width="372" height="236" rx="20"/><rect class="zoomr" x="404" y="244" width="372" height="236" rx="20"/></g>
${T(44, 282, 'Check size', { c: 'lb-b', at: A('fade', 5.4, 0.6) })}${T(424, 282, 'Measure amount', { c: 'lb-b', at: A('fade', 7.6, 0.6) })}
<g${A('rise', 5.6, 0.8)}>${bioanalyzer(42, 330, { s: 1.0 })}</g>
<g${A('fade', 6.4, 0.6)}><path class="ln thin" d="M268 440H384M268 440V318"/></g>
<path class="curve" d="M270 438C292 436 304 346 326 344C348 342 356 436 382 438" ${A('draw', 6.6, 1.8, 'inout')}/>
<g${A('rise', 7.8, 0.8)}>${cycler(420, 330, { s: 0.85, screen: '' })}</g>
<g${A('fade', 8.6, 0.6)}><path class="ln thin" d="M648 440H770M648 440V326"/></g>
${sig(-2, 8.8)}${sig(12, 9.2)}${sig(26, 9.6)}`;
};

/* 11 - flow cell, clusters, sequencing by synthesis */
export const s11 = () => {
  const lawn = Array.from({ length: 24 }, (_, i) => `<g><line class="ln thin" x1="${446 + i * 14}" y1="282" x2="${446 + i * 14}" y2="268"/><circle class="${i % 2 ? 'oligo2' : 'oligo1'}" cx="${446 + i * 14}" cy="265" r="3.6"/></g>`).join('');
  const vstrand = (x: number, d: number) => `<g${A('pop', d, 0.6, 'soft')}><rect class="seg hdl2" x="${x - 4}" y="252" width="8" height="14" rx="2"/><rect class="seg lhs" x="${x - 4}" y="234" width="8" height="16" rx="2"/><rect class="seg rhs" x="${x - 4}" y="216" width="8" height="16" rx="2"/><rect class="seg sbc" x="${x - 4}" y="202" width="8" height="12" rx="2"/><rect class="seg gbc" x="${x - 4}" y="188" width="8" height="12" rx="2"/></g>`;
  const cl = [588, 602, 616, 630, 644, 658, 672].map((x, i) => vstrand(x, 5.6 + i * 0.25)).join('');
  const lib = [0, 1, 2, 3].map((i) => `<g${A('trip', 0.4 + i * 0.5, 2.0, 'inout', '#s11-p')}><rect class="seg sbc" x="-9" y="-5" width="18" height="10" rx="3"/></g>`).join('');
  const panel = (i: number, title: string, d: number, extra: string) => {
    const x = 24 + i * 254;
    return `<g${A('fade', d, 0.7)}><rect class="zoomr" x="${x}" y="350" width="240" height="124" rx="16"/>
${T(x + 16, 384, title, { c: 'lb-b' })}
${blk(x + 22, 416, 28, 'base')}${blk(x + 54, 416, 28, 'base')}${blk(x + 86, 416, 28, 'base')}<g${i === 0 ? A('pop', d + 0.4, 0.6, 'soft') : ''}>${blk(x + 118, 416, 28, 'basen')}</g>
<g${i === 2 ? A('gone', d + 0.4, 0.8, 'inout', '0,-26') : ''}><rect class="capb" x="${x + 150}" y="416" width="12" height="20" rx="3"/></g>
<line class="ln" x1="${x + 18}" y1="454" x2="${x + 222}" y2="454"/>${extra}</g>`;
  };
  const rays = (cx: number, cy: number) => [0, 1, 2, 3, 4, 5].map((k) => `<line class="ray" x1="${cx + Math.cos(k * 1.047) * 24}" y1="${cy + Math.sin(k * 1.047) * 24}" x2="${cx + Math.cos(k * 1.047) * 36}" y2="${cy + Math.sin(k * 1.047) * 36}"/>`).join('');
  return `
<g${A('rise', 0.1, 0.9)}>${flowcell(30, 40, { s: 1.05 })}</g>
<path id="s11-p" d="M6 99H200" fill="none"/>
<g transform="translate(32 0)">${lib}</g>
${T(219, 190, 'Flow cell', { a: 'middle', at: A('fade', 0.8, 0.6) })}
<g${A('fade', 3.0, 0.9)}><rect class="zoomr" x="428" y="32" width="352" height="296" rx="20"/></g>
<g${A('fade', 3.2, 0.9)}><rect class="surf" x="444" y="282" width="328" height="14" rx="4"/>${lawn}</g>
${vstrand(488, 4.4)}
${T(446, 172, 'Template', { at: A('fade', 5.0, 0.6) })}
${cl}
<g${A('fade', 7.2, 0.8)}><ellipse class="dash-e" cx="630" cy="230" rx="58" ry="62"/></g>
${T(630, 116, 'Cluster', { a: 'middle', at: A('fade', 7.4, 0.6) })}
${panel(0, 'Add base', 7.0, '')}
${panel(1, 'Image', 9.0, `<g${A('pop', 9.4, 0.6, 'soft')}>${rays(24 + 254 + 132, 430)}</g>`)}
${panel(2, 'Unblock', 11.0, '')}
<g${A('draw', 13.0, 1.2, 'inout')}><path class="ln arrowl" d="M640 486C640 506 150 506 150 486M142 494L150 484L158 494"/></g>
${T(400, 540, 'Repeat for each base', { a: 'middle', at: A('fade', 13.4, 0.6) })}
<g${A('rise', 14.2, 0.8)}>${doc(40, 232, { s: 0.85 })}</g>${T(64, 322, 'BCL', { a: 'middle', at: A('fade', 14.4, 0.6) })}
${T(200, 262, 'Demultiplex', { a: 'middle', at: A('fade', 15.0, 0.6) })}
<g${A('draw', 15.0, 0.8, 'out')}><path class="ln arrowl" d="M100 278H298M288 268L298 278L288 288"/></g>
<g${A('rise', 15.4, 0.8)}>${doc(330, 232, { s: 0.85 })}</g>${T(354, 322, 'FASTQ', { a: 'middle', at: A('fade', 15.6, 0.6) })}`;
};

/* 12 - Cell Ranger */
export const s12 = () => {
  const mono = (y: number, t: string, d: number) => `<text class="tm" x="22" y="${y}"${A('fade', d, 0.3, 'out')}>${t}</text>`;
  const term = terminal(20, 10, 400, 216,
    `${mono(60, '$ cellranger multi \\', 2.2)}${mono(120, '  --id=flex_run \\', 2.9)}${mono(180, '  --csv=config.csv', 3.6)}<rect class="cur" x="22" y="196" width="11" height="16"${A('fade', 4.2, 0.2)}/>`, { at: A('rise', 0.2, 0.8) });
  const dcard = (x: number, label: string, d: number) => `<g${A('rise', d, 0.8)}>${doc(x, 266, { s: 0.9 })}</g>${T(x + 23, 362, label, { a: 'middle', c: 'lb-s', at: A('fade', d + 0.2, 0.6) })}`;
  let grid = '';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 12; c++) {
    const v = (r * 7 + c * 3 + ((r * c) % 5)) % 9;
    const k = v < 4 ? 'm0' : v < 6 ? 'm1' : v < 8 ? 'm2' : 'm3';
    grid += `<rect class="mc ${k}" x="${500 + c * 22}" y="${70 + r * 20}" width="20" height="18" rx="3"${A('fade', 9.4 + (c + r) * 0.1, 0.5)}/>`;
  }
  const tok = (x: number, y: number, at_ = '') => `<g${at_}><rect class="tok" x="${x}" y="${y}" width="56" height="22" rx="6"/><rect class="seg sbc" x="${x + 5}" y="${y + 5}" width="10" height="12" rx="2"/><rect class="seg gbc" x="${x + 17}" y="${y + 5}" width="10" height="12" rx="2"/><rect class="seg umi" x="${x + 29}" y="${y + 5}" width="10" height="12" rx="2"/><rect class="seg lhs" x="${x + 41}" y="${y + 5}" width="10" height="12" rx="2"/></g>`;
  const sk = (x: number, y: number, w: number) => `<rect class="skel" x="${x}" y="${y}" width="${w}" height="9" rx="4.5"/>`;
  const tiles = [0, 1, 2, 3].map((i) => `<g><rect class="tile" x="${346 + i * 108}" y="500" width="98" height="48" rx="8"/>${sk(358 + i * 108, 510, 60)}${sk(358 + i * 108, 530, 36)}</g>`).join('');
  return `
${term}
${dcard(40, 'FASTQ', 0.8)}${dcard(160, 'Config', 1.0)}${dcard(280, 'Probes', 1.2)}
<g${A('draw', 1.8, 0.8, 'out')}><path class="ln arrowl" d="M210 258V240M204 248L210 238L216 248"/></g>
<g${A('draw', 5.0, 0.8, 'out')}><path class="ln arrowl" d="M430 130H462M452 120L462 130L452 140"/></g>
${T(500, 54, 'Cell barcodes', { c: 'lb-b', at: A('fade', 9.0, 0.6) })}
<text class="lb-b" transform="translate(482 150) rotate(-90)" text-anchor="middle"${A('fade', 9.0, 0.6)}>Features</text>
${grid}
<g${A('fade', 6.6, 0.8)}>${tok(450, 262)}${tok(450, 292)}${tok(450, 322)}</g>
<g${A('draw', 7.4, 0.8, 'out')}><path class="ln arrowl" d="M520 292H556M546 282L556 292L546 302"/></g>
<g${A('pop', 8.0, 0.7, 'soft')}>${tok(566, 292)}</g>
${T(450, 386, 'Copies count once', { at: A('fade', 8.2, 0.6) })}
<g${A('rise', 13.4, 0.8)}>${doc(40, 396, { s: 0.85 })}${doc(140, 396, { s: 0.85 })}${doc(240, 396, { s: 0.85 })}</g>
${T(63, 478, 'Matrix', { a: 'middle', c: 'lb-s', at: A('fade', 13.8, 0.6) })}${T(163, 478, 'QC', { a: 'middle', c: 'lb-s', at: A('fade', 13.9, 0.6) })}${T(263, 478, 'Report', { a: 'middle', c: 'lb-s', at: A('fade', 14.0, 0.6) })}
<g${A('fade', 12.0, 0.9)}><rect class="panelw" x="330" y="436" width="446" height="120" rx="12"/><rect class="panelh" x="330" y="436" width="446" height="58" rx="12"/><rect class="panelh" x="330" y="476" width="446" height="18"/>${T(346, 478, 'Web summary', { c: 'lb-w' })}</g>
<g${A('rise', 12.6, 0.8)}>${tiles}</g>`;
};
