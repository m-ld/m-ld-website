export interface BotBrain {
  respond(message: string, topMessages: string[]): Promise<Answer>;
}

export interface Answer {
  message: string | null,
  sentiment: Sentiment[]
}

export enum Sentiment {
  START_CHAT,
  STOP_CHAT  
}

export function selectRandom<T>(first: T | T[], ...rest: T[]) {
  const selection = ([] as T[]).concat(first).concat(rest);
  return selection[Math.floor(Math.random() * selection.length)];
}
