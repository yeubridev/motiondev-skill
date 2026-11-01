export type Entry = [string, string] | [string, string, string]
export type UiWords = {
  levels: Record<'beginner' | 'intermediate' | 'advanced' | 'dev', string>
  welcome: string; welcomeSub: string; askCode: string
  answers: Record<'beginner' | 'intermediate' | 'advanced' | 'dev', [string, string]>
  askLearn: string; learnNo: [string, string]; learnYes: [string, string]; skip: string
  now: string; tourTitle: string; tourStart: string; tourNext: string; tourBack: string; tourEnd: string; tourQuit: string
  of: (i: number, n: number) => string
  learn: string; image: (room: string) => string; path: string; timeline: string
  step: (i: number, n: number) => string; mastery: (n: number) => string
  quizStart: string; recallStart: string; lastTime: string; motionOff: string; motionOn: string
  nextQuestion: string; retry: string; later: string; finish: string
  right: (n: number) => string; wrong: () => string; answer: (a: string) => string; deeper: string; review: string
  xp: (n: number) => string; toNext: (n: number, next: string) => string; streak: (n: number) => string
  tally: (met: number, done: number) => string; mastered: (n: number, total: number) => string
  unlocked: (title: string) => string; masteredToast: (title: string) => string
  lesson: string; lessonLoading: string; lessonError: string; lessonCost: (n: number, cached: number) => string
  learnShow: string; learnHide: string; nothing: string; more: (n: number) => string; built: (n: number, turns: number) => string
}
export const PHRASES: Record<string, Record<string, Record<string, Entry>>>
export const TOUR: Record<string, Record<string, Record<string, Entry>>>
export const RECAP: Record<string, Record<string, string>>
export const CHAPTERS: Record<string, Record<string, string>>
export const UI: Record<'fr' | 'en', UiWords>
