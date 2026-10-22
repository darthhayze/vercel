// Tiny C-like tokenizer for Arduino / Processing source. Build-time only; no libraries.
export type Tok = { t: 'kw' | 'ty' | 'fn' | 'num' | 'str' | 'cm' | 'pp' | 'tx'; s: string };
const KW = new Set('if else for while do switch case break continue return default new class extends import static final public private void true false null this const volatile unsigned signed struct enum typedef sizeof boolean'.split(' '));
const TY = new Set('int long short char byte float double bool boolean String PImage PFont PVector color size_t uint8_t uint16_t uint32_t int8_t int16_t int32_t word Serial File'.split(' '));
const FN = new Set('setup loop draw pinMode digitalWrite digitalRead analogRead analogWrite delay delayMicroseconds millis micros begin print println available read write readStringUntil map constrain min max abs size fill stroke noStroke background ellipse rect line point text textSize textAlign frameRate loadImage image println printArray trim parseInt parseFloat parseInt split serialEvent keyPressed mousePressed random sin cos sqrt tone noTone'.split(' '));
export function tokenizeLines(lines: string[], _lang = 'arduino'): Tok[][] {
  let inBlock = false;
  return lines.map((line) => {
    const out: Tok[] = [];
    let i = 0, buf = '';
    const flush = () => { if (buf) { out.push({ t: 'tx', s: buf }); buf = ''; } };
    const push = (t: Tok['t'], s: string) => { flush(); out.push({ t, s }); };
    if (/^\s*#/.test(line) && !inBlock) { push('pp', line); return out; }
    while (i < line.length) {
      const c = line[i], n = line[i + 1];
      if (inBlock) { const e = line.indexOf('*/', i); if (e < 0) { push('cm', line.slice(i)); i = line.length; } else { push('cm', line.slice(i, e + 2)); i = e + 2; inBlock = false; } continue; }
      if (c === '/' && n === '/') { push('cm', line.slice(i)); i = line.length; continue; }
      if (c === '/' && n === '*') { const e = line.indexOf('*/', i + 2); if (e < 0) { push('cm', line.slice(i)); inBlock = true; i = line.length; } else { push('cm', line.slice(i, e + 2)); i = e + 2; } continue; }
      if (c === '"' || c === "'") {
        let j = i + 1; while (j < line.length && line[j] !== c) { if (line[j] === '\\') j++; j++; }
        push('str', line.slice(i, j + 1)); i = j + 1; continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(n ?? ''))) {
        const m = /^(0x[0-9a-fA-F]+|[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?[fFuUlL]*)/.exec(line.slice(i));
        if (m) { push('num', m[0]); i += m[0].length; continue; }
      }
      if (/[A-Za-z_]/.test(c)) {
        const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(line.slice(i))!; const w = m[0];
        const after = line.slice(i + w.length).trimStart()[0];
        if (KW.has(w)) push('kw', w); else if (TY.has(w)) push('ty', w); else if (FN.has(w) || after === '(') push('fn', w); else buf += w;
        i += w.length; continue;
      }
      buf += c; i++;
    }
    flush();
    return out;
  });
}
