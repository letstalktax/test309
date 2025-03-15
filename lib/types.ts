import { type Message } from 'ai';

export interface DataStreamWriter {
  append: (chunk: any) => void;
}

export interface AppendableStream {
  append: (chunk: any) => void;
}

export interface MatchResult {
  id: string;
  score: number;
  metadata: any;
}

export interface Tool<TInput, TOutput> {
  (input: TInput): Promise<TOutput>;
}