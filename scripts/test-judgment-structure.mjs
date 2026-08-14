import { extractStructureFromDump, generateHandoffFromStructure, generatePrincipleFromStructure } from '../lib/judgment-structure.js';

const cases = [
  {
    id: 1,
    dump: '新しい事業を立ち上げ、3年以内に収益の柱にしたい。',
    expect: (s) => s.desiredOutcome.includes('事業') && s.protectedValues.length === 0 && s.boundaryConditions.length === 0 && !s.needsFollowup
  },
  {
    id: 2,
    dump: '新規顧客を増やしたい。ただし、既存顧客との信頼は損ないたくない。',
    expect: (s) => /新規顧客/.test(s.desiredOutcome) && s.protectedValues.some((p) => /既存顧客/.test(p)) && !s.boundaryConditions.length
  },
  {
    id: 3,
    dump: '社会的に意味のある事業をしたい。ただし、赤字が長期間続くなら継続できない。',
    expect: (s) => /事業/.test(s.desiredOutcome) && s.protectedValues.length === 0 && s.boundaryConditions.length > 0 && !/避けるための/.test(generateHandoffFromStructure(s))
  },
  {
    id: 4,
    dump: '社員から反発されたくない。',
    expect: (s) => !s.desiredOutcome && s.needsFollowup && s.followupReason === 'desired_outcome_missing'
  },
  {
    id: 5,
    dump: '社会貢献もしたい。高い収益も必要。自分の専門性からも離れたくない。',
    expect: (s) => s.needsFollowup && s.followupReason === 'criteria_tension_boundary_unclear'
  },
  {
    id: 6,
    dump: '利益が多少下がっても構わないが、顧客を欺く方法は絶対に採らない。',
    expect: (s) => s.boundaryConditions.length > 0 && !s.needsFollowup
  },
  {
    id: 7,
    dump: '自分の時間を何に使うのが後悔しないか。社会に貢献でき、自分の追求してきたことと一貫する事業を行い、十分な収益を生みたい。収益が得られず、貢献だけすることになれば後悔する。',
    expect: (s) => /貢献/.test(s.desiredOutcome) && /収益/.test(s.desiredOutcome) && s.boundaryConditions.length > 0 && !s.protectedValues.some((p) => /貢献だけ/.test(p)) && !/避けるための選択肢/.test(generateHandoffFromStructure(s))
  }
];

let failed = 0;
for (const c of cases) {
  const s = extractStructureFromDump(c.dump);
  const ok = c.expect(s);
  if (!ok) {
    failed += 1;
    console.log('FAIL', c.id, JSON.stringify(s, null, 2));
    console.log('--- principle ---', generatePrincipleFromStructure(s));
    console.log('--- handoff ---', generateHandoffFromStructure(s));
  } else {
    console.log('PASS', c.id, {
      outcome: s.desiredOutcome,
      protect: s.protectedValues,
      boundary: s.boundaryConditions,
      follow: s.followupReason
    });
  }
}
if (failed) {
  console.error(`failed ${failed}`);
  process.exit(1);
}
console.log('all passed');
