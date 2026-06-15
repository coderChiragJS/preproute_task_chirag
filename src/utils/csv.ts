export interface ParsedQuestion {
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: 'option1' | 'option2' | 'option3' | 'option4';
  explanation: string;
  difficulty: string;
}

function splitRow(row: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (quoted) {
      if (ch === '"' && row[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map(c => c.trim());
}

function normalizeCorrect(raw: string): ParsedQuestion['correct_option'] {
  const v = raw.trim().toLowerCase();
  if (v === '1' || v === 'a' || v === 'option1') return 'option1';
  if (v === '2' || v === 'b' || v === 'option2') return 'option2';
  if (v === '3' || v === 'c' || v === 'option3') return 'option3';
  if (v === '4' || v === 'd' || v === 'option4') return 'option4';
  return 'option1';
}

export function parseQuestionsCsv(text: string): ParsedQuestion[] {
  const rows = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter(r => r.trim().length > 0);
  if (rows.length === 0) return [];

  const header = splitRow(rows[0]).map(h => h.toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const hasHeader = idx('question') !== -1;

  const col = {
    question: hasHeader ? idx('question') : 0,
    option1: hasHeader ? idx('option1') : 1,
    option2: hasHeader ? idx('option2') : 2,
    option3: hasHeader ? idx('option3') : 3,
    option4: hasHeader ? idx('option4') : 4,
    correct: hasHeader ? idx('correct_option') : 5,
    explanation: hasHeader ? idx('explanation') : 6,
    difficulty: hasHeader ? idx('difficulty') : 7,
  };

  const dataRows = hasHeader ? rows.slice(1) : rows;
  const get = (cells: string[], i: number) => (i >= 0 && i < cells.length ? cells[i] : '');

  return dataRows
    .map(splitRow)
    .filter(cells => get(cells, col.question).length > 0)
    .map(cells => ({
      question: get(cells, col.question),
      option1: get(cells, col.option1),
      option2: get(cells, col.option2),
      option3: get(cells, col.option3),
      option4: get(cells, col.option4),
      correct_option: normalizeCorrect(get(cells, col.correct)),
      explanation: get(cells, col.explanation),
      difficulty: get(cells, col.difficulty).toLowerCase(),
    }));
}

export const SAMPLE_CSV =
  'question,option1,option2,option3,option4,correct_option,explanation,difficulty\n' +
  'What is 2 + 2?,3,4,5,6,option2,Basic addition,easy\n' +
  'Capital of France?,Paris,Rome,Berlin,Madrid,option1,France capital,medium\n';
