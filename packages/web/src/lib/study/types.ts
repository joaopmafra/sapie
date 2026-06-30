export interface StudyCard {
  id: string;
  front: string;
  back: string;
  dueDate: Date;
  interval: number;
  repetitions: number;
  deckId: string;
  deckName: string;
  noteId: string;
}

export interface DueCardsResponse {
  cards: StudyCard[];
  totalDue: number;
}

export type StudyPhase = 'front' | 'back' | 'summary';

export interface StudyResult {
  cardId: string;
  result: 'know' | 'dont_know';
}
