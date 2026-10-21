'use strict';
// הערכים המותרים לשאלות המבט. הממשק מציג להם תוויות; השרת מקבל רק אותם.
const ROUNDS = [1, 2, 3];
const AXES = ['identity', 'goals', 'agency', 'other'];
const KINDS = ['intro', 'notebook', 'complex', 'grades', 'parents', 'other'];
// שתי שאלות על ציר, בסולם של 1 עד 5: אופי השיחה (1 אינפורמטיבית ... 5 מעמיקה) וחלוקת הדיבור (1 אני דיברתי הרבה יותר ... 5 התלמיד/ה דיברו הרבה יותר)
const SCALE = [1, 2, 3, 4, 5];
// כלים שמותר לדווח עליהם שנעשה בהם שימוש (רק עצם הפתיחה, בלי שום תוכן)
const USAGE_TOOLS = ['mapping'];
const FEELINGS = ['inspired', 'good', 'neutral', 'thoughtful', 'frustrated', 'heavy'];
const NONE_REASONS = ['holiday', 'sick', 'load', 'other'];
const FOLDERS = ['identity', 'goals', 'agency'];

const SCHOOLS = [
  { slug: 'kiryat-motzkin', name: 'תיכון אורט קריית מוצקין', order: 1 },
  { slug: 'naomi-shemer', name: 'תיכון אורט גן יבנה נעמי שמר', order: 2 },
  { slug: 'rabin', name: 'תיכון אורט גן יבנה יצחק רבין', order: 3 },
  { slug: 'demo-school', name: 'בית ספר מדגים', order: 4 },
];

module.exports = { ROUNDS, AXES, KINDS, SCALE, USAGE_TOOLS, FEELINGS, NONE_REASONS, FOLDERS, SCHOOLS };

// תוויות בעברית לייצוא (הממשק מחזיק עותק משלו לתצוגה)
const LABELS = {
  round: { 1: 'סבב ראשון', 2: 'סבב שני', 3: 'סבב שלישי' },
  axis: { identity: 'זהות וחוזקות', goals: 'יעדים ומטרות', agency: "אג'נסי", other: 'אחר' },
  kind: { intro: 'שיחת היכרות', notebook: 'שיחת מחברת', complex: 'שיחה מורכבת', grades: 'הערכה לקראת תעודות', parents: 'לקראת יום הורים', deep: 'שיחת עומק (ישן)', other: 'אחר' },
  depth: { 1: 'אינפורמטיבית מאוד', 2: 'יותר אינפורמטיבית', 3: 'באמצע', 4: 'יותר מעמיקה', 5: 'מעמיקה מאוד' },
  talk: { 1: 'אני דיברתי הרבה יותר', 2: 'אני דיברתי קצת יותר', 3: 'חלוקה שווה בערך', 4: 'התלמיד/ה דיברו קצת יותר', 5: 'התלמיד/ה דיברו הרבה יותר' },
  feeling: { inspired: 'מעורר השראה', good: 'טוב ומספק', neutral: 'רגיל', thoughtful: 'מעורר מחשבות', frustrated: 'מתסכל', heavy: 'כבד' },
  none: { holiday: 'חג או חופשה', sick: 'היעדרות', load: 'עומס', other: 'אחר' },
};
module.exports.LABELS = LABELS;
