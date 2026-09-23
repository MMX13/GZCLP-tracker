export interface Quote {
  id: string;
  text: string;
  by: string;
  builtIn: boolean;
}

/**
 * Motivation and self-improvement lines from lifters, athletes, coaches and writers. Only quotes with a
 * reliable source; popular misattributions are left out or credited to the real author.
 * Ids are stable - hidden quotes are stored by id.
 */
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
  { id: 'q16', text: 'Hard choices, easy life. Easy choices, hard life.', by: 'Jerzy Gregorek' },
  { id: 'q17', text: 'Associate with people who are likely to improve you.', by: 'Seneca' },
  { id: 'q18', text: 'I don\'t count my sit-ups. I only start counting when it starts hurting.', by: 'Muhammad Ali' },
  { id: 'q19', text: 'Discipline equals freedom.', by: 'Jocko Willink' },
  { id: 'q20', text: 'Stay hard.', by: 'David Goggins' },
  { id: 'q21', text: 'Nobody cares. Work harder.', by: 'Cameron Hanes' },
  { id: 'q22', text: 'Motivation is what gets you started. Habit is what keeps you going.', by: 'Jim Ryun' },
  { id: 'q23', text: 'You do not rise to the level of your goals. You fall to the level of your systems.', by: 'James Clear' },
  { id: 'q24', text: 'Every action you take is a vote for the type of person you wish to become.', by: 'James Clear' },
  { id: 'q25', text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', by: 'Will Durant' },
  { id: 'q26', text: 'What stands in the way becomes the way.', by: 'Marcus Aurelius' },
  { id: 'q27', text: 'Waste no more time arguing what a good man should be. Be one.', by: 'Marcus Aurelius' },
  { id: 'q28', text: 'We suffer more often in imagination than in reality.', by: 'Seneca' },
  { id: 'q29', text: 'Difficulties strengthen the mind, as labour does the body.', by: 'Seneca' },
  { id: 'q30', text: 'First say to yourself what you would be; and then do what you have to do.', by: 'Epictetus' },
  { id: 'q31', text: 'No man is free who is not master of himself.', by: 'Epictetus' },
  { id: 'q32', text: 'A journey of a thousand miles begins with a single step.', by: 'Lao Tzu' },
  { id: 'q33', text: 'Knowing is not enough, we must apply. Willing is not enough, we must do.', by: 'Bruce Lee' },
  { id: 'q34', text: 'Perfection is not attainable, but if we chase perfection we can catch excellence.', by: 'Vince Lombardi' },
  { id: 'q35', text: 'Champions keep playing until they get it right.', by: 'Billie Jean King' },
  { id: 'q36', text: 'I\'ve failed over and over and over again in my life. And that is why I succeed.', by: 'Michael Jordan' },
  { id: 'q37', text: 'You miss 100% of the shots you don\'t take.', by: 'Wayne Gretzky' },
  { id: 'q38', text: 'Everybody has a plan until they get punched in the mouth.', by: 'Mike Tyson' },
  { id: 'q39', text: 'Excellence is the gradual result of always striving to do better.', by: 'Pat Riley' },
  { id: 'q40', text: 'Success isn\'t always about greatness. It\'s about consistency.', by: 'Dwayne Johnson' },
  { id: 'q41', text: 'Well done is better than well said.', by: 'Benjamin Franklin' },
  { id: 'q42', text: 'Energy and persistence conquer all things.', by: 'Benjamin Franklin' },
  { id: 'q43', text: 'Man cannot remake himself without suffering, for he is both the marble and the sculptor.', by: 'Alexis Carrel' },
  { id: 'q44', text: 'Mastery is not a function of genius or talent. It is a function of time and intense focus.', by: 'Robert Greene' },
  { id: 'q45', text: 'Small deeds done are better than great deeds planned.', by: 'Peter Marshall' },
  { id: 'q46', text: 'If there is no struggle, there is no progress.', by: 'Frederick Douglass' },
  { id: 'q47', text: 'The only way of discovering the limits of the possible is to venture a little way past them into the impossible.', by: 'Arthur C. Clarke' },
  { id: 'q48', text: 'Do the work.', by: 'Steven Pressfield' },
  { id: 'q49', text: 'Fall seven times, stand up eight.', by: 'Japanese proverb' },
  { id: 'q50', text: 'The best time to plant a tree was twenty years ago. The second best time is now.', by: 'Proverb' },
  { id: 'q51', text: 'Slow is smooth, and smooth is fast.', by: 'Military saying' },
  { id: 'q52', text: 'Strength is a skill.', by: 'Pavel Tsatsouline' },
  { id: 'q53', text: 'Do what you can, with what you have, where you are.', by: 'Theodore Roosevelt' },
  { id: 'q54', text: 'The man who moves a mountain begins by carrying away small stones.', by: 'Chinese proverb' },
  { id: 'q55', text: 'It\'s not whether you get knocked down, it\'s whether you get up.', by: 'Vince Lombardi' },
].map((q) => ({ ...q, builtIn: true }));

/** Faint "erased" words that sit behind a quote on the chalkboard. */
export const GHOST_WORDS = ['5 x 5', 'deload wk', 'PR day', 'legs', 'T1 T2 T3', 'no excuses', 'AMRAP', 'rest 3:00', '3 x 10'];
