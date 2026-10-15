'use strict';
// הערכים המותרים לשאלות המבט. הממשק מציג להם תוויות; השרת מקבל רק אותם.
const ROUNDS = [1, 2, 3];
const AXES = ['identity', 'goals', 'agency', 'other'];
const KINDS = ['notebook', 'complex', 'grades', 'parents', 'deep', 'other'];
const FEELINGS = ['inspired', 'good', 'neutral', 'thoughtful', 'frustrated', 'heavy'];
const NONE_REASONS = ['holiday', 'sick', 'load', 'other'];
const FOLDERS = ['identity', 'goals', 'agency'];

const SCHOOLS = [
  { slug: 'kiryat-motzkin', name: 'תיכון אורט קריית מוצקין', order: 1 },
  { slug: 'naomi-shemer', name: 'תיכון אורט גן יבנה נעמי שמר', order: 2 },
  { slug: 'rabin', name: 'תיכון אורט גן יבנה יצחק רבין', order: 3 },
  { slug: 'demo-school', name: 'בית ספר מדגים', order: 4 },
];

module.exports = { ROUNDS, AXES, KINDS, FEELINGS, NONE_REASONS, FOLDERS, SCHOOLS };

// תוויות בעברית לייצוא (הממשק מחזיק עותק משלו לתצוגה)
const LABELS = {
  round: { 1: 'סבב ראשון', 2: 'סבב שני', 3: 'סבב שלישי' },
  axis: { identity: 'זהות וחוזקות', goals: 'יעדים ומטרות', agency: "אג'נסי", other: 'אחר' },
  kind: { notebook: 'שיחת מחברת', complex: 'שיחה מורכבת', grades: 'הערכה לקראת תעודות', parents: 'יום הורים', deep: 'שיחת עומק', other: 'אחר' },
  feeling: { inspired: 'מעורר השראה', good: 'טוב ומספק', neutral: 'רגיל', thoughtful: 'מעורר מחשבות', frustrated: 'מתסכל', heavy: 'כבד' },
  none: { holiday: 'חג או חופשה', sick: 'היעדרות', load: 'עומס', other: 'אחר' },
};
module.exports.LABELS = LABELS;
