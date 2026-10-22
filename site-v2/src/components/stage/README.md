# Stage kit

Staged scroll explainers in one flat-vector lab style: a sticky SVG stage per step, a numbered progress rail, one caption (22 words or fewer), a legend, and Play stage / Pause / Replay stage controls. Built for the Flex v2 world; reusable for any project world.

```
StageExplainer.astro   component (props below)
stage-player.ts        scroll scrub, rail, Play / Pause / Replay (imported by the component)
stage.css              shell + svg vocabulary, tokens from the surrounding world
types.ts               StageDef, StageLegend, StageCtx
glyphs/                core, lab, electronics, data, software, sound, paper (pure functions returning SVG strings)
```

## Use

```astro
---
import StageExplainer from '../../components/stage/StageExplainer.astro';
import { A, T, shelf, tube, pipette, flow } from '../../components/stage/glyphs';
import { pcb, scope, ecgTrace } from '../../components/stage/glyphs';   // any mix of libraries
const stages = [
  { id: 'demo', title: 'Pick up the signal', caption: 'Electrodes pick up the heart signal and send it to the board.',
    duration: 8, length: 'm', legend: [{ swatch: '1', label: 'Signal' }], note: 'Illustrative drawing.',
    desc: 'Plain description for screen readers.',
    scene: () => shelf(300) + pcb(300, 150, { at: A('rise', 0.4, 0.8) }) + T(400, 360, 'Board', { a: 'middle' }) },
];
---
<StageExplainer stages={stages} demoId="demo" eyebrow="ECG board">
  <header slot="intro">...your hero...</header>
</StageExplainer>
```

Props: `stages` (required), `demoId` (id of stage 1, the story demo anchor, default `demo`), `eyebrow`, `railLabel`, `footnote` (shown ONCE under the stage list, not per stage; default "Illustrative workflow; not study data."; pass `''` to drop it). Slot `intro` renders above the rail.

Stage fields: `id`, `title`, `caption` (22 words or fewer), `legend[{swatch,label}]`, `note`, `files[]` (mono names), `scene(ctx)`, `duration` (seconds of animation), `length` (`s|m|l` scroll length), `viewHeight` (default 560), `desc` (screen reader text), `reducedFinalFrame(ctx)` (optional alternate static drawing).

Legend `swatch`: `1` to `6` (palette slots) or `ring`, `line`, `file`; a world may define its own `.sw-name` class.

## Palette and tokens

The kit reads the world variables `--ground --fg --acc --acc2 --mute --on-acc --body --display --mono`. Six semantic colours `--stg-c1..c6` default to the world accent, second accent, violet, blue, amber, slate. A world overrides them in its own CSS:

```css
.world-ecg .stg { --stg-c1: #39FF88; --stg-c2: #FFD60A; --stg-ink: #111; }
```

Classes `fill-1..6`, `tint-1..6`, `w-1..6` (wires) pull from those slots. Keep one meaning per colour inside a project (for example c1 is always the signal). Define world-only vocabulary (molecules, probes) in the world's own CSS under `.world-x .stg .name`.

## Authoring rules

1. Draw the scene in its final frame (800 wide, 560 tall). With no JS and with reduced motion the final frame is what shows.
2. Add motion with `A(kind, start, dur, ease, param)` on a wrapper: `fade`, `rise`, `drop`, `pop`, `move "dx,dy"`, `zoom "dx,dy,scale"`, `spin "deg"`, `draw` (stroke draws on), `gone` (visible at first, hidden at the end), `trip "#pathId"` (travels a path, hidden at the end). Eases: `out` (arrivals), `inout` (camera, travel), `in` (exits), `soft` (small overshoot), `lin`.
3. Never put `transform` on an element that has `data-a`. Position with a wrapper `<g transform>`, animate the child. Glyph functions already do this.
4. Waterfall: stagger by 0.15 to 0.3 s, overlap the next beat at 30 to 50 percent. Arrivals are slower than exits. No looping bobbing.
5. One idea per stage. Text in the SVG: short nouns, at most 14 characters a line (labels are 34 user units at phone width, 22 on tablet, 20 on desktop; keep each label to about 12 characters). Use leader lines or numbered badges for anything longer. Put anything longer in `note`.
6. Equipment sits on `shelf(y)`; molecular or zoomed views sit in a `zoomr` frame. Use `sc(cx, cy, k, inner)` to enlarge a sparse composition.
7. Do not use inline `style` attributes or inline scripts (CSP). Colour only via classes.

## Glyphs

Every glyph is `name(x, y, opts)` returning an SVG string; opts: `s` scale, `at` (a `data-a` string from `A()`), `cls` (`g-enter`, `g-travel`, `g-pulse`, `g-flow` hooks for use without the player), `label` (centred name under the glyph, for wrap-based glyphs). Line weight 2px (2.4px on equipment), rounded joins, tokens only.

- LAB: tube, strip, bottle, plate, pipette, cycler, centrifuge, rack, chip, instrument (chromium), bioanalyzer, flowcell, microscope, beaker, terminal, doc
- ELECTRONICS: pcb, mcuBoard, resistor, capacitor, icChip, electrodePad, wire, scope (+ ecgTrace), laptop, monitor, breadboard, signalPath
- DATA: table, fileRows, spreadsheet, chartAxes (+ histogram, volcano as plot children), funnel, person, people, splitGroups
- SOFTWARE: database, worker, queue, apiArrow, shield, key, browserWindow, document_, terminal
- SOUND: waveformBars, spectrogram, lungs, speaker, microphone
- PAPER: journalStack, highlight, figureThumbs
- CORE: A, T (label), L (leader), flow (arrow), shelf, sc, wrap, at, G

Use the Flex v2 world to check the stage shell at desktop and phone widths.

## Behaviour

- Scroll: each stage pins; its time runs from entering the viewport to 80 percent of the pinned distance, then holds the final frame. Play runs the same time on a real clock and moves the scroll with it; any manual scroll pauses it. Replay restarts.
- Rail: numbered links on tablet and desktop; a compact bar with previous / next on phones. Links and buttons are native, keyboard operable, 44px targets.
- Reduced motion, or no JS: no animation is built, the tracks are plain stacked sections showing final frames with captions.
- Engine: Web Animations driven by scroll position (no scroll-timeline dependency, so it behaves the same in every browser). The layout lint treats the pinned `.stg-stage` (`data-stage-pin`) as intentional.

## Style guide

Do: one palette meaning per colour, a 2px outline, rounded shapes, labelled equipment, final frame first, a legend of at most four items, captions as one plain sentence.
Don't: gradients, glows, drop shadows, bobbing loops, tiny text, claims beyond the project's facts, real data in a drawing marked illustrative.

## Standalone use (bespoke shells)

The kit's parts import without `StageExplainer`:
- `glyphs/*` are pure functions returning SVG strings; put them in any container (`A`, `T`, `TL` multi-line label, `L`, `sc`, `shelf`, `wrap`, `flow`).
- `engine.ts` exports `prepare(svgOrGroup)` (one paused Web Animation per `data-a`, returns `{ setTime(seconds), duration, finish() }`), `EASE`, `keyframes`, `num` and `LABEL_UNITS` (34 / 22 / 20 / 18 label units).
- `stage.css` rules are scoped under `.stg` (vocabulary: `.fill-*`, `.lb`, `.ln`, swatches `.sw-*` with a zero-specificity base). Wrap your SVG in any element with class `stg` to use them; the `stg-*` shell classes are optional.
- `stage-player.ts` stays the scroll scrubber for `StageExplainer` only.
