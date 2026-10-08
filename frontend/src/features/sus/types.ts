export interface SusPayload {
  userId?: string;
  question: string;
  score: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  agreeStatement?: 'agree' | 'disagree';
}

export interface SusSubmission {
  id: string;
  createdAt: string;
}
