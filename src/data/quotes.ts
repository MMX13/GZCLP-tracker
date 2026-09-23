export interface Quote {
  id: string;
  text: string;
  by: string;
  builtIn: boolean;
}

/** Well-attributed lines from lifters, coaches and athletes. */
export const BUILT_IN_QUOTES: Quote[] = [
  { id: 'q1', text: 'The Iron never lies to you.', by: 'Henry Rollins' },
  { id: 'q2', text: 'The Iron is the best antidepressant I have ever found.', by: 'Henry Rollins' },
  { id: 'q3', text: 'The last three or four reps is what makes the muscle grow.', by: 'Arnold Schwarzenegger' },
  { id: 'q4', text: 'Strength does not come from winning. Your struggles develop your strengths.', by: 'Arnold Schwarzenegger' },
  { id: 'q5', text: 'Strong people are harder to kill than weak people, and more useful in general.', by: 'Mark Rippetoe' },
  { id: 'q6', text: 'Light weight, baby!', by: 'Ronnie Coleman' },
  { id: 'q7', text: "Everybody wants to be a bodybuilder, but nobody wants to lift no heavy-ass weights.", by: 'Ronnie Coleman' },
  { id: 'q8', text: 'The goal is to keep the goal the goal.', by: 'Dan John' },
  { id: 'q9', text: "If it's important, do it every day.", by: 'Dan John' },
  { id: 'q10', text: "Hard work beats talent when talent doesn't work hard.", by: 'Tim Notke' },
  { id: 'q11', text: 'Start too light.', by: 'Jim Wendler' },
  { id: 'q12', text: 'Fatigue makes cowards of us all.', by: 'Vince Lombardi' },
  { id: 'q13', text: "Don't quit. Suffer now and live the rest of your life as a champion.", by: 'Muhammad Ali' },
  { id: 'q14', text: 'There are no limits. There are only plateaus, and you must not stay there, you must go beyond them.', by: 'Bruce Lee' },
  {
    id: 'q15',
    text: "Gold medals aren't really made of gold. They're made of sweat, determination, and a hard-to-find alloy called guts.",
    by: 'Dan Gable',
  },
].map((q) => ({ ...q, builtIn: true }));

/** Faint "erased" words that sit behind a quote on the chalkboard. */
export const GHOST_WORDS = ['5 x 5', 'deload wk', 'PR day', 'legs', 'T1 T2 T3', 'no excuses', 'AMRAP', 'rest 3:00', '3 x 10'];
