export const chapters = [
  { id: 'paper', label: 'Paper (2025)', doc: 'ijms-26-02262', title: 'Plasma proteins', subtitle: 'International Journal of Molecular Sciences · Peer-reviewed', art: 'proteins', notes: [
    { page: 1, x: 28, w: 66, y: 58, h: 24, title: 'The question', text: 'The authors compared plasma proteins in people with obesity and no diagnosed metabolic disease with lean controls.', region: 'Abstract' },
    { page: 4, x: 12, w: 82, y: 43, h: 34, title: 'The comparison', text: 'Each heatmap column represents a person. Each volcano-plot dot represents a protein. The authors report differences in 24 of the 184 proteins measured.', region: 'Figure 2' },
    { page: 11, x: 28, w: 66, y: 29, h: 9, title: 'My contribution', text: 'The paper credits me and six co-authors with leading cohort sample collection, processing and ethical approvals.', region: 'Author contributions' },
  ] },
  { id: 'preprint', label: 'Preprint (2024)', doc: 'metabolites-transcriptome-preprint-web', title: 'Metabolites and gene activity', subtitle: 'Research Square · October 2024 · Not peer-reviewed', art: 'metabolites', notes: [
    { page: 2, x: 4, w: 91, y: 7, h: 67, title: 'Two measurements', text: 'The authors compared serum metabolites and whole-blood gene activity between an obesity group and lean controls.', region: 'Abstract' },
    { page: 8, x: 4, w: 91, y: 17, h: 23, title: 'Exploratory findings', text: 'The authors report 116 of 711 metabolites at p < 0.05 before correction for multiple testing. These comparisons are exploratory.', region: 'Metabolite results' },
    { page: 12, x: 4, w: 91, y: 68, h: 7, title: 'My contribution', text: 'The preprint credits me and five co-authors with collecting, purifying and harmonizing samples.', region: 'Author contributions' },
  ] },
  { id: 'review', label: 'TENS review', doc: 'tens-literature-review', title: 'Wearable TENS systems', subtitle: 'University of Cincinnati · Course literature review', art: 'tens', notes: [
    { page: 1, x: 10, w: 80, y: 5, h: 22, title: 'The device', text: 'TENS sends electrical pulses through skin electrodes. Our review examines the unit through its human, biological, mechanical, electrical and chemical systems.', region: 'Introduction' },
    { page: 6, x: 9, w: 83, y: 8, h: 86, title: 'The system diagram', text: 'Follow the signal from user settings through the electronics and electrodes to the skin and nerves.', region: 'Systems and interactions' },
    { page: 8, x: 10, w: 80, y: 5, h: 69, title: 'The garment proposal', text: 'We proposed putting electrodes and electronics into a garment to reduce loose wires and repeated pad placement. We completed no prototype or clinical test.', region: 'Design proposal' },
  ] },
  { id: 'poster', label: 'Poster', doc: 'tens-poster', title: 'The TENS poster', subtitle: 'University of Cincinnati · Course poster', art: 'poster', notes: [
    { page: 1, y: 20, h: 29, title: 'The problem', text: 'Our poster brings the review onto one page: wires, pad placement and a separate controller complicate using a TENS unit.', region: 'Problem and concept', x: 2, w: 22 },
    { page: 1, y: 43, h: 31, title: 'Electrode placement', text: 'The garment sketch places electrodes on the chest, upper back and trapezius. It illustrates the proposed layout.', region: 'Garment sketch', x: 76, w: 22 },
    { page: 1, y: 51, h: 46, title: 'The interactions', text: 'The lower diagram connects the systems discussed in the review. Open page 6 of the review for the larger version.', region: 'Systems diagram', x: 2, w: 22 },
  ] },
];
export const docs = chapters.map(({doc, label}) => ({doc, label}));
