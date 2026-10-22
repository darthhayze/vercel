// JobHub system map: one world, nodes with ports, labelled wires, and the camera frames that visit them.
// Everything is in world pixels. Wide screens visit 9 frames; narrow screens split a frame into smaller ones at run time.
// Copy stays inside src/content/jobhub.json. Each node lists the fact ids it leans on; the inspector prints their source paths.

export type Rect = { x: number; y: number; w: number; h: number };
export type Tone = 'shared' | 'private' | 'ai' | 'code' | 'plain';

export interface NodeDef {
  id: string;
  region: string;
  kind: string; // what it is, small line above the title
  title: string;
  sub: string; // one line shown on the box
  tone: Tone;
  rect: Rect;
  shape?: 'db' | 'wall' | 'shot' | 'board';
  what: string; // inspector: what it is
  points: string[]; // inspector: stores / does
  facts: string[]; // ids in jobhub.json
}

export interface WireDef {
  from: string; // node or decor id, then ".side" (l r t b)
  to: string;
  label?: string; // "\n" splits lines
  lp?: number; // label position along its segment, 0 to 1
  tone: Tone;
}

export interface FrameDef {
  id: string;
  name: string;
  nodes: string[];
  decor?: string[];
  focus?: string;
  max?: number; // scale cap
}

const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
const o = (ox: number, oy: number, r: Rect): Rect => R(ox + r.x, oy + r.y, r.w, r.h);

// Region origins on the map. Row one flows right, row two flows left.
const ROW2 = 1150;
const COLLECT = [0, 0], STORE = [1500, 0], AI = [3000, 0], RULES = [4500, 540];
const LADDER = [3000, ROW2], GATE = [1500, ROW2], APP = [0, ROW2];

export const NODES: NodeDef[] = [
  {
    id: 'providers', region: 'collect', kind: 'Provider APIs', title: 'Eight providers', sub: 'Official public APIs only', tone: 'shared',
    rect: o(COLLECT[0], COLLECT[1], R(40, 110, 340, 300)),
    what: 'The collector reads job boards through eight configured providers.',
    points: ['greenhouse, lever, ashby, smartrecruiters, recruitee, workable, adzuna and usajobs.', 'Collector rule 1: use only official public job APIs, and never use AI to discover or choose jobs.', 'Eight rules are written in code as COLLECTOR_RULES.'],
    facts: ['job-providers', 'collector-rules'],
  },
  {
    id: 'collector', region: 'collect', kind: 'Worker, scheduled', title: 'Collector', sub: 'Runs every eight hours', tone: 'shared',
    rect: o(COLLECT[0], COLLECT[1], R(520, 95, 360, 330)),
    what: 'A scheduled Worker pulls postings from the providers, stays inside a per-run budget and writes the result to the job-data database.',
    points: [
      'Per run: 20 external requests, 25 D1 statements, 20 work items and 10 pages. Each response stops at 1,800,000 bytes.',
      'budgetedFetch counts every external request. statementBudget counts every D1 statement and refuses a batch larger than what is left.',
      'A page checkpoint and its postings go in one batch, so a cursor never moves past rows that were not stored.',
      'A failing source backs off alone: 30 seconds, doubled per failure, capped at 6 hours.',
      'A posting closes after 2 complete cycles of absence. Closed postings are deleted after 30 days.',
    ],
    facts: ['collector-budget', 'collector-clamp', 'budget-wrappers', 'checkpoint-atomic', 'source-isolation', 'closure-rule', 'prune', 'worker-crons'],
  },
  {
    id: 'jobdb', region: 'store', kind: 'D1 database, JOBDATA', title: 'Job-data database', sub: 'Shared postings. No user_id.', tone: 'shared', shape: 'db',
    rect: o(STORE[0], STORE[1], R(20, 260, 320, 290)),
    what: 'Holds the collected postings and the collector’s own state. Any account can be matched against it, and none of its tables belongs to one person.',
    points: [
      '19 tables across 9 migrations. No migration has a user_id column.',
      'Written by the collector and the owner-only operations routes. The finder and the catalogue only read it.',
      'A posting is identified by provider ID plus canonical HTTPS URL. A URL change is kept as an alias and a changed source text as a revision.',
    ],
    facts: ['job-data-tables', 'migrations-job-data', 'db-split', 'identity'],
  },
  {
    id: 'wall', region: 'store', kind: 'Boundary', title: 'The wall', sub: 'Two databases, two owners', tone: 'plain', shape: 'wall',
    rect: o(STORE[0], STORE[1], R(440, 215, 140, 380)),
    what: 'DB and JOBDATA are separate D1 bindings. Job-data carries no user_id, so nothing in it points at a person.',
    points: ['wrangler.toml binds DB for accounts and JOBDATA for collected postings.', 'A search for user_id across the nine job-data migration files finds nothing.', 'The finder reads postings on one side and writes that account’s own rows on the other.'],
    facts: ['db-split', 'finder-copy'],
  },
  {
    id: 'finder', region: 'store', kind: 'Worker, daily', title: 'Finder', sub: 'Reads postings, writes your rows', tone: 'code',
    rect: o(STORE[0], STORE[1], R(340, 20, 340, 160)),
    what: 'The finder reads open postings from JOBDATA and writes the account’s own rows (jobs, seen, job_extras) into DB.',
    points: ['A Worker timer runs it daily at 10:40 UTC.', 'It shortlists candidates, assembles evidence, asks the model bounded questions and scores the answers in code.', 'At most 10 assessments per run.'],
    facts: ['finder-copy', 'cron-roles', 'match-limits'],
  },
  {
    id: 'accdb', region: 'store', kind: 'D1 database, DB', title: 'Accounts database', sub: 'Everything per person', tone: 'private', shape: 'db',
    rect: o(STORE[0], STORE[1], R(680, 260, 320, 290)),
    what: 'Holds account data. Per-person tables carry user_id, and several use a composite primary key that starts with it.',
    points: [
      '28 tables across 8 migrations.',
      'meta, seen, job_extras, plan_tasks and calendar_accounts use a composite key that starts with user_id.',
      'Passwords are hashed with PBKDF2-SHA-256, 100,000 iterations.',
    ],
    facts: ['accounts-tables', 'migrations-accounts', 'composite-keys', 'password-hash'],
  },
  {
    id: 'shortlist', region: 'ai', kind: 'Retrieval step', title: 'Shortlist', sub: 'Keyword plus vector search', tone: 'code',
    rect: o(AI[0], AI[1], R(20, 20, 290, 170)),
    what: 'Before any model call, the finder narrows the open postings to a candidate pool.',
    points: ['Keyword search through an FTS5 MATCH, up to 1000 rows.', 'Up to 100 semantic neighbours from Vectorize, as the methodology document states.', 'The candidate pool is cached for 8 hours.'],
    facts: ['fts-shortlist'],
  },
  {
    id: 'evidence', region: 'ai', kind: 'Prompt input', title: 'Evidence', sub: 'What the model gets to read', tone: 'code',
    rect: o(AI[0], AI[1], R(20, 295, 290, 150)),
    what: 'Each assessment samples requirements from the posting and excerpts from the résumé.',
    points: ['Up to 8 requirements and 4 evidence excerpts per assessment.', 'Up to 10 assessments per run and 50 per click.'],
    facts: ['match-limits'],
  },
  {
    id: 'fence', region: 'ai', kind: 'Input control', title: 'Fenced input', sub: 'Text goes in as data', tone: 'ai',
    rect: o(AI[0], AI[1], R(460, 280, 330, 180)),
    what: 'Posting and résumé text is untrusted. It is marked that way and wrapped in delimiters before it reaches the model.',
    points: ['UNTRUSTED_RULE, fence() and stripMarkers() are defined in jev-api.js.', 'UNTRUSTED_RULE appears on 9 lines across lib/.'],
    facts: ['untrusted-text-fence'],
  },
  {
    id: 'injection', region: 'ai', kind: 'Input check', title: 'Injection check', sub: 'looksLikeInstructions()', tone: 'ai',
    rect: o(AI[0], AI[1], R(460, 530, 330, 170)),
    what: 'Postings and résumés pass through looksLikeInstructions() before they go to Jev.',
    points: ['It matches 8 fixed phrase patterns.', 'A reworded attack can get past a fixed list. The fence and the closed answer types still apply.', 'It is called in finder.js and resume-review.js.'],
    facts: ['injection-check', 'injection-patterns'],
  },
  {
    id: 'jev', region: 'ai', kind: 'Language model', title: 'Jev', sub: 'Answers questions, writes nothing', tone: 'ai',
    rect: o(AI[0], AI[1], R(460, 770, 330, 150)),
    what: 'The documented design limits Jev to structured answers: yes or no, a pick from a fixed list, or a score from 0 to 4. The interface supplies every word the user reads.',
    points: ['Rules live in docs/JEV-RULES.md, with fixed replies in lib/note-sort.js.', 'The assessment cache holds allowlisted choices, scores and source IDs, and no résumé or posting prose.'],
    facts: ['ai-bounded', 'answer-shapes', 'assessment-cache'],
  },
  {
    id: 'answers', region: 'ai', kind: 'Output contract', title: 'Fixed answers', sub: 'Three shapes only', tone: 'ai',
    rect: o(AI[0], AI[1], R(960, 675, 310, 340)),
    what: 'Whatever the model returns is reduced to one of three shapes before code uses it.',
    points: ['A yes counts at a threshold between 0.6 and 0.8, depending on the call.', 'Scores are clamped to 0 to 4.', 'An unknown choice falls back to a safe default.'],
    facts: ['answer-shapes'],
  },
  {
    id: 'rules', region: 'rules', kind: 'Permission board', title: 'AI rules', sub: 'Switch what the model may do', tone: 'ai', shape: 'board',
    rect: o(RULES[0], RULES[1], R(40, 80, 380, 450)),
    what: 'Two permissions can be switched off. Two are locked off in the design. No model runs on this page.',
    points: ['Classify and score are the only things Jev is asked to do.', 'Collectors never use AI to discover or choose jobs.', 'The interface supplies the text the user reads.'],
    facts: ['ai-bounded', 'collector-rules', 'answer-shapes'],
  },
  {
    id: 'recompute', region: 'ladder', kind: 'Code', title: 'Coverage in code', sub: 'Code overrides the model', tone: 'code',
    rect: o(LADDER[0], LADDER[1], R(560, 35, 340, 270)),
    what: 'Coverage is recomputed from the per-requirement classifications. It overrides the model’s global answer.',
    points: ['A positive classification without a cited source is downgraded to unknown.', 'capability_gap needs negation wording in the cited excerpt.'],
    facts: ['score-in-code'],
  },
  {
    id: 'ladder', region: 'ladder', kind: 'Scoring ladder, deterministic', title: 'Fit score', sub: 'Computed in code', tone: 'code',
    rect: o(LADDER[0], LADDER[1], R(40, 0, 380, 340)),
    what: 'matchDetail() maps relevance, eligibility and coverage to a level from 0 to 4.',
    points: ['Unrelated role: 0. Eligibility conflict: 1.', 'Strong coverage: 4. Partial: 3. Anything else: 2.', 'Unknown relevance caps the score at 2.'],
    facts: ['score-in-code'],
  },
  {
    id: 'session', region: 'gate', kind: 'Middleware', title: 'Session gate', sub: 'No session, no data', tone: 'private',
    rect: o(GATE[0], GATE[1], R(40, 20, 300, 190)),
    what: 'Protected /api/ requests without a session get 401 and the message “Sign in first.” Four POST routes are public.',
    points: ['PUBLIC_POSTS lists the four public exceptions.', 'A request whose Origin does not match gets 403.'],
    facts: ['auth-gate', 'tenant-checks'],
  },
  {
    id: 'scope', region: 'gate', kind: 'Query scope', title: 'Account scope', sub: 'user_id comes from the session', tone: 'private',
    rect: o(GATE[0], GATE[1], R(40, 290, 300, 190)),
    what: 'Handlers take user_id from the session and scope each account query to it.',
    points: ['AGENTS.md requires every D1 query to be scoped.', 'The pattern user_id = ? appears 88 times in functions/ and lib/. That counts the pattern and does not prove full coverage.'],
    facts: ['user-scoping', 'composite-keys'],
  },
  {
    id: 'rows', region: 'gate', kind: 'Account view', title: 'Own rows', sub: 'Only this account’s records', tone: 'private',
    rect: o(GATE[0], GATE[1], R(540, 20, 300, 200)),
    what: 'A signed-in request reads its own jobs, notes, meta, extras and résumés, and nothing else.',
    points: ['The finder writes its results into these rows.', 'The interface reads them through the API handlers.'],
    facts: ['tenant-checks', 'finder-copy'],
  },
  {
    id: 'foreign', region: 'gate', kind: 'Refusal', title: 'Foreign id', sub: '404, row unchanged', tone: 'private',
    rect: o(GATE[0], GATE[1], R(540, 290, 300, 150)),
    what: 'Asking for another account’s record id returns 404 and leaves that record unchanged.',
    points: ['Checked with two seeded accounts that each see only their own rows.'],
    facts: ['tenant-checks'],
  },
  {
    id: 'ui-roles', region: 'app', kind: 'Screen', title: 'Opportunities', sub: 'Roles grouped by company', tone: 'plain', shape: 'shot',
    rect: o(APP[0], APP[1], R(40, 150, 328, 304)),
    what: 'Roles grouped by company, with filters and source details. Picking a role opens its detail and the button that starts a preparation plan.',
    points: ['Reads through the API handlers: 25 handler files and 26 exported request handlers. That counts handlers and not URLs.'],
    facts: ['api-handler-files', 'api-handlers-by-method'],
  },
  {
    id: 'ui-prep', region: 'app', kind: 'Screen', title: 'Preparation', sub: 'A gap becomes a next step', tone: 'plain', shape: 'shot',
    rect: o(APP[0], APP[1], R(450, 150, 403, 354)),
    what: 'A requirement marked as a gap gets a concrete next step. Saving it puts the gap in the plan.',
    points: ['The fit gaps come from the scoring ladder, so the model never writes this text.'],
    facts: ['score-in-code', 'ai-bounded'],
  },
  {
    id: 'ui-plan', region: 'app', kind: 'Screen', title: 'Plan and calendar', sub: 'My plan follows the edit', tone: 'plain', shape: 'shot',
    rect: o(APP[0], APP[1], R(900, 150, 333, 288)),
    what: 'Change a session’s end time in the calendar and My plan shows the new time.',
    points: ['plan_tasks and calendar_accounts are per-account tables keyed by user_id.'],
    facts: ['composite-keys'],
  },
];

// Decor rectangles that wires and frames can point at.
export const DECOR: Record<string, Rect> = {
  'ai-fence': R(3000 + 440, 240, 370, 710),
  'ui-plate': R(0, ROW2, 1300, 660),
  'note-sample': R(40, ROW2 + 500, 360, 56),
  'note-boundary': R(840, ROW2 + 500, 420, 56),
};

export const REGION_TITLES: { id: string; text: string; x: number; y: number }[] = [
  { id: 'collect', text: 'Collect', x: 40, y: 0 },
  { id: 'store', text: 'Store', x: 1500 + 20, y: -48 },
  { id: 'ai', text: 'AI boundary', x: 3000 + 440, y: 206 },
  { id: 'rules', text: 'Rules', x: 4540, y: 585 },
  { id: 'ladder', text: 'Score', x: 3040, y: ROW2 - 58 },
  { id: 'gate', text: 'Gate', x: 1540, y: ROW2 - 36 },
];

export const WIRES: WireDef[] = [
  { from: 'providers.r', to: 'collector.l', label: 'official\npublic APIs', tone: 'shared' },
  { from: 'collector.r', to: 'jobdb.l', label: 'writes postings', tone: 'shared' },
  { from: 'jobdb.t', to: 'finder.l', label: 'reads open\npostings', tone: 'shared' },
  { from: 'finder.r', to: 'accdb.t', label: 'writes the account’s\nown rows', tone: 'private' },
  { from: 'finder.r', to: 'shortlist.l', label: 'candidate pool', tone: 'code', lp: 0.55 },
  { from: 'shortlist.b', to: 'evidence.t', label: 'top\ncandidates', tone: 'code' },
  { from: 'evidence.r', to: 'fence.l', label: 'requirements\nand excerpts', tone: 'ai' },
  { from: 'fence.b', to: 'injection.t', label: 'wrapped', tone: 'ai' },
  { from: 'injection.b', to: 'jev.t', label: 'checked', tone: 'ai' },
  { from: 'jev.r', to: 'answers.l', label: 'raw answer', tone: 'ai' },
  { from: 'answers.r', to: 'rules.l', label: 'what the model\nmay do', tone: 'ai', lp: 0.8 },
  { from: 'answers.b', to: 'recompute.t', label: 'classifications', tone: 'code', lp: 0.8 },
  { from: 'recompute.l', to: 'ladder.r', label: 'coverage,\nrelevance', tone: 'code' },
  { from: 'ladder.l', to: 'rows.r', label: 'writes fit\nand gaps', tone: 'private' },
  { from: 'ui-plate.r', to: 'session.l', label: 'API request', tone: 'private' },
  { from: 'session.b', to: 'scope.t', label: 'user_id', tone: 'private' },
  { from: 'scope.r', to: 'rows.l', label: 'own id', tone: 'private' },
  { from: 'scope.r', to: 'foreign.l', label: 'other id', tone: 'private' },
  { from: 'accdb.b', to: 'rows.t', label: 'rows live here', tone: 'private' },
];

export const FRAMES: FrameDef[] = [
  { id: 'collect', name: 'Collect', nodes: ['providers', 'collector'] },
  { id: 'store', name: 'Store', nodes: ['jobdb', 'wall', 'finder', 'accdb'], focus: 'wall' },
  { id: 'ai-in', name: 'AI boundary: input', nodes: ['shortlist', 'evidence', 'fence', 'injection'], focus: 'fence' },
  { id: 'ai-out', name: 'AI boundary: answers', nodes: ['jev', 'answers'], focus: 'jev' },
  { id: 'rules', name: 'AI rules', nodes: ['rules'], max: 1.3 },
  { id: 'ladder', name: 'Score', nodes: ['recompute', 'ladder'], focus: 'ladder' },
  { id: 'gate', name: 'Gate', nodes: ['session', 'scope', 'rows', 'foreign'], focus: 'session' },
  { id: 'ui-roles', name: 'App: Opportunities', nodes: ['ui-roles'], decor: ['note-sample'], max: 1.25 },
  { id: 'ui-prep', name: 'App: Preparation', nodes: ['ui-prep'], max: 1.25 },
  { id: 'ui-plan', name: 'App: Calendar', nodes: ['ui-plan'], decor: ['note-boundary'], max: 1.25 },
];

export const WORLD = R(-80, -110, 5160, 2000);
