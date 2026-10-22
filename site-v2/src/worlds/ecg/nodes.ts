// The seven probe points along the signal chain: copy, readout labels and the code block each one opens in the drawer.
// Captions are plain sentences. Numbers come from the source files (A1, 0 to 1023, 10 ms, 9600 baud, 450, 430, 300 to 2000 ms).
export interface CodeRef { doc: 'arduino' | 'processing'; seg: string; label: string }
export interface Node {
  id: string;
  /** short name under the icon in the chain strip (kept to 7 characters for phone width) */
  name: string;
  title: string;
  caption: string;
  /** readout cells: probe point, what the screen shows */
  at: string;
  shows: string;
  /** label of the live value (filled by the client) */
  live: string;
  /** plain description of the screen for screen readers and the no-JS list */
  desc: string;
  code: CodeRef[];
  /** drawer text when no code runs at this point */
  nocode?: string;
}

export const NODES: Node[] = [
  {
    id: 'skin', name: 'Skin', title: 'The electrodes',
    caption: 'Three electrodes on the skin pick up the heart signal. At this point it is small, noisy and drifting.',
    at: 'Electrode leads', shows: 'Raw analog voltage', live: 'Signal',
    desc: 'The scope screen shows a thin, jittery green trace with a slow drift. Small beat spikes are buried in the noise.',
    code: [], nocode: 'No code runs at the electrodes. The Arduino sketch starts at pin A1.',
  },
  {
    id: 'board', name: 'Board', title: 'The Ninetales board',
    caption: 'I soldered and tested this board. It amplifies and filters the electrode signal, then puts it on header pin A1.',
    at: 'Board output', shows: 'Amplified, filtered', live: 'Signal',
    desc: 'The same beat now draws as a clean, tall trace. A dim copy of the noisy input sits behind it.',
    code: [{ doc: 'arduino', seg: 'pin', label: 'Which pin' }],
  },
  {
    id: 'pin', name: 'A1', title: 'Arduino pin A1',
    caption: 'analogRead turns the voltage on the pin into a whole number from 0 to 1023, a count.',
    at: 'Pin A1', shows: 'ADC counts', live: 'Count',
    desc: 'The trace is drawn in counts. A dashed line runs from the newest point to a vertical gauge that fills from 0 to 1023.',
    code: [{ doc: 'arduino', seg: 'read', label: 'analogRead' }],
  },
  {
    id: 'loop', name: 'Loop', title: 'The sampling loop',
    caption: 'loop() reads, sends, then waits delay(10). That is about 100 samples a second, nominal. I did not measure the real rate.',
    at: 'Inside loop()', shows: 'One dot per read', live: 'Reading',
    desc: 'The screen zooms in on one heartbeat. Dots mark each reading, 10 ms apart, joined by a stepped line. A strip below lights analogRead, println and delay in turn.',
    code: [{ doc: 'arduino', seg: 'delay', label: 'delay(10)' }],
  },
  {
    id: 'serial', name: 'Serial', title: 'Serial at 9600 baud',
    caption: 'Each reading leaves as text: its digits, then a line break. Both programs have to use 9600 baud.',
    at: 'USB serial line', shows: 'Bytes, one bar each', live: 'Latest line',
    desc: 'A tape of byte cells moves from the Arduino toward Processing. Each reading is three digit bars and two short bars for the line break.',
    code: [{ doc: 'arduino', seg: 'write', label: 'println' }, { doc: 'arduino', seg: 'setup', label: 'begin 9600' }, { doc: 'processing', seg: 'serial-open', label: 'Open the port' }, { doc: 'processing', seg: 'serial-event', label: 'serialEvent' }],
  },
  {
    id: 'monitor', name: 'Plot', title: 'The Processing monitor',
    caption: 'serialEvent stores the newest number. draw() maps 300 to 600 onto the window height and plots one point per frame.',
    at: 'Processing window', shows: 'Plotted trace', live: 'Raw signal',
    desc: 'A dark window styled like the monitor program: a trace sweeps left to right with an erase bar ahead of it, and a side panel shows the raw value and the threshold.',
    code: [{ doc: 'processing', seg: 'trace', label: 'Trace line' }, { doc: 'processing', seg: 'trace-area', label: 'Erase bar' }, { doc: 'processing', seg: 'serial-event', label: 'serialEvent' }],
  },
  {
    id: 'beats', name: 'Beats', title: 'The beat detector',
    caption: 'A reading at or above the threshold sets a flag, then the detector re-arms 20 counts below. Gaps from 300 to 2000 ms give the rate.',
    at: 'Detector', shows: 'Threshold and flags', live: 'Rate',
    desc: 'The trace with a threshold line and a dimmer re-arm line 20 counts lower. Flags mark each crossing and brackets show the gaps between them.',
    code: [{ doc: 'processing', seg: 'beat', label: 'Beat and rate' }, { doc: 'processing', seg: 'flash', label: 'Flash' }, { doc: 'processing', seg: 'readout', label: 'Readout' }],
  },
];
