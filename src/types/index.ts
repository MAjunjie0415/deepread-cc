// Core types for DeepRead application

export interface TranscriptSegment {
  segment_id: string;
  start: number;
  end: number;
  timestamp: string;
  text: string;
}

export interface Interest {
  label: string;
  weight: number;
}

export interface MainLine {
  id: number;
  title: string;
  definition: string;
  key_points: Array<{
    point: string;
    evidence: {
      segment_id: string;
      timestamp: string;
      quote: string;
      evidence_found: boolean;
    };
  }>;
  score: {
    total: number;
    breakdown: {
      relevance: number;
      novelty: number;
      actionability: number;
      credibility: number;
    };
  };
  unsupported: string[];
}

export interface FlashCard {
  q: string;
  a: string;
  source_segment: string;
}

export interface TopSegment {
  segment_id: string;
  start: number;
  end: number;
  reason_to_review: string;
}

export interface DeepReadingResponse {
  meta: {
    word_count: number;
    paragraph_count: number;
    timestamps_present: boolean;
  };
  main_lines: MainLine[];
  top_segments: TopSegment[];
  flashcards: FlashCard[];
  followup_questions: string[];
  human_note: string;
}

export interface DrillDownResponse {
  long_form: string;
  teaching_outline: string[];
  key_slides: string[];
}

export interface AppState {
  // URL and transcript
  youtubeUrl: string;
  transcript: TranscriptSegment[];
  isPullingTranscript: boolean;
  
  // Interests and configuration
  interests: Interest[];
  maxMainLines: number;
  scoringWeights: {
    relevance: number;
    novelty: number;
    actionability: number;
    credibility: number;
  };
  
  // Analysis results
  deepReadingResult: DeepReadingResponse | null;
  isAnalyzing: boolean;
  
  // Notes and drill down
  humanNote: string;
  drillDownResult: DrillDownResponse | null;
  isDrillingDown: boolean;
  
  // UI state
  selectedMainLine: number | null;
  activeTab: 'flashcards' | 'segments' | 'questions';
  lang: 'en' | 'zh';
}
