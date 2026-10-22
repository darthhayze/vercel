// Scenes 1 to 4 (viewBox 800x560, scene 1 is 800x480). Final frame is the drawn state; data-a describes how it gets there.
// Labels stay at or under about 14 characters a line so they hold at phone width.
import { A, T, TL, tube, bottle, plate, pipette, cycler, centrifuge, doc, shelf } from '../../components/stage/glyphs';
import { rna, cell, blob, ledger, dnaR, blk, diamond, ticks, mouse } from './molecules';

/* 1 - the 88 samples */
export const s1 = () => {
  const cards = ledger(36, 74, 30, 26, 38, 34, (r, c) => {
    const feat = r === 7 && c === 4;
    return { cls: feat ? 'card feat' : 'card', at: A(feat ? 'fade' : 'pop', 0.1 + r * 0.2 + c * 0.03, 0.55, 'out') };
  });
  const chip = (y: number, label: string, icon: string, s: number) =>
    `<g transform="translate(496 ${y})"><g${A('rise', s, 0.7)}><circle class="chip" cx="29" cy="21" r="21"/>${icon}${T(62, 30, label)}</g></g>`;
  const iProtocol = `<g transform="translate(15 6) scale(.46)">${doc(0, 0, { lines: 3 })}</g>`;
  const iSample = `<g transform="translate(18 6)"><path class="glass" d="M3 7H19V21Q19 29 11 30Q3 29 3 21Z"/><rect class="cap" x="1" y="1" width="20" height="8" rx="3"/></g>`;
  const iProbe = `<g transform="translate(14 15)">${dnaR(0, 0, 14, 'lhs')}${dnaR(15, 0, 14, 'rhs')}</g>`;
  const iTerm = `<g transform="translate(14 8)"><rect class="termi" width="30" height="26" rx="5"/><path class="termg" d="M6 9 12 14 6 19M15 19H24"/></g>`;
  return `
${T(36, 52, '88 sample cards')}
${cards}
<g${A('draw', 0.4, 1.6, 'inout')}>${mouse(536, 50)}</g>
${T(636, 196, 'Mouse study', { a: 'middle', at: A('fade', 1.6, 0.6) })}
${chip(222, 'Protocol', iProtocol, 2.0)}
${chip(270, 'Samples', iSample, 2.5)}
${chip(318, 'Probes', iProbe, 3.0)}
${chip(366, 'Cell Ranger', iTerm, 3.5)}
<g${A('draw', 5.0, 0.8, 'inout')}><line class="ld" x1="203" y1="336" x2="203" y2="392"/></g>
<g${A('pop', 5.8, 0.8, 'soft')}>${cell(203, 428, 36, { seed: 3 })}</g>
${TL(256, 424, ['One card holds', 'many cells'], { at: A('fade', 6.3, 0.7) })}`;
};

/* 2 - fix the sample */
export const s2 = () => {
  const drip = [3.4, 3.9, 4.4].map((t) => `<g${A('gone', t, 1.1, 'in', 'drip')}><circle class="dropb" cx="84" cy="112" r="5.5"/></g>`).join('');
  return `
${shelf(272, 0, 430, A('fade', 0.1, 0.5))}${shelf(532, 0, 430, A('fade', 0.1, 0.5))}
<g${A('rise', 0.1, 0.8)}>${tube(50, 95, { s: 1.7, liq: 'lq-sage', level: 0.6, cap: 'cap-off' })}</g>
<g${A('fade', 4.8, 1.4, 'inout')}>${tube(50, 95, { s: 1.7, liq: 'lq-fix', level: 0.6, cap: 'cap-off' })}</g>
<g${A('rise', 0.3, 0.8)}>${bottle(214, 121, { s: 1.35, liq: 'lq-blue' })}</g>
${TL(84, 306, ['Cells or', 'nuclei'], { a: 'middle', at: A('fade', 0.8, 0.6) })}
${T(255, 306, 'Fixative', { a: 'middle', at: A('fade', 0.9, 0.6) })}
<path id="s2-p" d="M360 40C300 30 160 56 88 82" fill="none"/>
<g${A('trip', 2.0, 3.0, 'inout', '#s2-p')}>${pipette(0, 0, { s: 0.7, liq: 'lq-blue' })}</g>
${drip}
<g${A('rise', 0.6, 0.8)}>${centrifuge(40, 362, { s: 1.0, spinA: A('spin', 5.4, 2.6, 'inout', '1080') })}</g>
${T(224, 430, 'Spin', { at: A('fade', 5.2, 0.5) })}
<g${A('rise', 7.8, 0.9, 'soft')}>${tube(300, 386, { s: 1.4, liq: 'lq-clear', level: 0.5 })}<path class="cellb pellet" d="${blob(328, 523, 12, 2, 0.15, 8)}"/><path class="cellb pellet" d="${blob(344, 528, 9, 4, 0.15, 8)}"/></g>
${T(372, 478, 'Pellet', { at: A('fade', 8.4, 0.6) })}
<g${A('draw', 4.6, 1.0, 'out')}><path class="ln arrowl" d="M432 296H462M452 286L462 296L452 306"/></g>
<g${A('fade', 4.8, 1.0)}><circle class="zoom" cx="620" cy="290" r="160"/></g>
<g${A('pop', 5.2, 0.9, 'soft')}>
  <g${A('gone', 6.6, 1.2, 'inout')}>${cell(620, 290, 112, { seed: 1, cls: 'cellb live' })}</g>
  ${cell(620, 290, 112, { seed: 1, cls: 'cellb fixed' })}
</g>
<g${A('draw', 6.2, 1.8, 'inout')}><path class="cellfix" d="${blob(620, 290, 112, 1)}"/></g>
${TL(620, 500, ['Fixed cell,', 'RNA held in place'], { a: 'middle', at: A('fade', 7.6, 0.8) })}`;
};

/* 3 - probe pairs on the RNA, custom probes added */
export const s3 = () => {
  const y0 = 440;
  const pair = (x: number, delay: number, cust = false) => `
<g${A('move', delay, 1.3, 'out', '-60,-90')}>${blk(x, y0, 24, 'hdl')}${dnaR(x + 26, y0, 120, 'lhs')}</g>
<g${A('move', delay + 0.3, 1.3, 'out', '60,-90')}>${dnaR(x + 152, y0, 120, 'rhs')}${blk(x + 274, y0, 24, 'hdl')}</g>
${ticks(x + 32, x + 268, y0 + 24, 502, 9, A('fade', delay + 1.5, 0.8))}
<g${A('fade', delay + 1.8, 0.6)}><path class="nick" d="M${x + 149} ${y0 - 6}l-6 -10h12z"/></g>
${cust ? `<g${A('pop', delay + 1.6, 0.8, 'soft')}><circle class="cust" cx="${x + 149}" cy="${y0 - 36}" r="9"/><path class="cust-p" d="M${x + 149} ${y0 - 41}v10M${x + 144} ${y0 - 36}h10"/></g>` : ''}`;
  return `
<g transform="translate(0 -26)">${shelf(240, 0, 800, A('fade', 0.1, 0.5))}
<g${A('rise', 0.1, 0.8)}>${tube(36, 115, { s: 1.2, liq: 'lq-blue', level: 0.7 })}</g>
${TL(96, 162, ['Mouse', 'panel'], { at: A('fade', 0.5, 0.6) })}
${T(300, 190, '+', { c: 'lb-big', a: 'middle', at: A('fade', 1.0, 0.5) })}
<g${A('rise', 0.5, 0.8)}>${tube(332, 115, { s: 1.2, liq: 'lq-coral', level: 0.45 })}</g>
${TL(392, 170, ['Custom', 'spike-in'], { at: A('fade', 0.9, 0.6) })}
<g${A('draw', 1.6, 0.8, 'out')}><path class="ln arrowl" d="M552 184H590M580 174L590 184L580 194"/></g>
<g${A('rise', 1.4, 0.9)}>${plate(596, 133, { s: 0.9, tint: [[0, 0, 'wt-b'], [1, 0, 'wt-b'], [2, 0, 'wt-b'], [0, 1, 'wt-b'], [1, 1, 'wt-b'], [2, 1, 'wt-b'], [3, 0, 'wt-c'], [3, 1, 'wt-c']] })}</g>
<path id="s3-p" d="M770 40C740 20 700 70 664 126" fill="none"/>
<g${A('trip', 1.6, 1.8, 'inout', '#s3-p')}>${pipette(0, 0, { s: 0.55, liq: 'lq-blue' })}</g>

</g>
<g${A('fade', 2.8, 0.9)}><rect class="cellin" x="20" y="250" width="760" height="300" rx="28"/></g>
${T(44, 304, 'Inside one fixed cell', { c: 'lb-m', at: A('fade', 3.2, 0.7) })}
${T(60, 514, '3′', { c: 'lb-s', a: 'end', at: A('fade', 3.4, 0.5) })}${T(742, 514, '5′', { c: 'lb-s', at: A('fade', 3.4, 0.5) })}
${rna(70, 740, 508, 4, 9, A('draw', 3.4, 1.8, 'inout'))}
${pair(96, 6.0)}
${pair(424, 9.2, true)}
${T(184, 412, 'LHS', { a: 'middle', at: A('fade', 7.6, 0.6) })}${T(310, 412, 'RHS', { a: 'middle', at: A('fade', 7.8, 0.6) })}
${T(573, 388, 'Custom pair', { a: 'middle', at: A('fade', 10.8, 0.6) })}
${T(404, 538, 'Target RNA', { a: 'middle', at: A('fade', 4.8, 0.6) })}`;
};

/* 4 - sample barcode oligos */
export const s4 = () => {
  const row = (yo: number, name: string, light: boolean, d0: number, d1: number) => {
    const c = light ? 'sbc2' : 'sbc';
    const dia = light ? `${diamond(592, yo + 10, 8, c)}${diamond(610, yo + 10, 8, c)}` : diamond(600, yo + 10, 9, c);
    return `
${T(24, yo + 8, name, { c: 'lb-b', at: A('fade', d0, 0.6) })}
${rna(150, 690, yo + 78, 4, 9, A('draw', d0, 1.2, 'inout'))}
<g${A('fade', d0 + 0.6, 0.8)}>
  ${blk(160, yo + 28, 24, 'hdl')}${dnaR(186, yo + 28, 104, 'lhs')}${dnaR(296, yo + 28, 104, 'rhs')}${blk(402, yo + 28, 40, 'hdl2')}
  ${ticks(190, 394, yo + 50, yo + 74, 9)}
</g>
<g${A('move', d1, 1.4, 'out', '150,-80')}>${blk(402, yo, 40, 'hdl2')}${blk(446, yo, 64, 'hdl')}${blk(514, yo, 64, c)}${dia}</g>
${ticks(406, 438, yo + 22, yo + 26, 8, A('fade', d1 + 1.6, 0.6))}
${TL(632, yo + 12, ['Sample', 'barcode'], { at: A('fade', d1 + 1.8, 0.6) })}`;
  };
  return `
${shelf(222, 0, 800, A('fade', 0.1, 0.5))}
<g${A('rise', 0.1, 0.8)}>${plate(28, 78, { s: 1.05, tint: [[0, 0, 'wt-v'], [0, 1, 'wt-v'], [0, 2, 'wt-v'], [1, 0, 'wt-v2'], [1, 1, 'wt-v2'], [1, 2, 'wt-v2'], [2, 0, 'wt-v'], [2, 1, 'wt-v2']] })}</g>
${TL(262, 150, ['Barcode', 'oligo plate'], { at: A('fade', 0.6, 0.6) })}
<path id="s4-p" d="M360 40C280 20 170 50 130 84" fill="none"/>
<g${A('trip', 0.6, 2.4, 'inout', '#s4-p')}>${pipette(0, 0, { s: 0.55, liq: 'lq-violet' })}</g>
<g${A('rise', 1.0, 0.9)}>${cycler(556, 100, { s: 0.9 })}</g>
${T(664, 84, 'Hybridise', { a: 'middle', at: A('fade', 1.6, 0.6) })}
${row(272, 'Sample A', false, 3.0, 4.4)}
${row(420, 'Sample B', true, 7.0, 8.4)}`;
};
