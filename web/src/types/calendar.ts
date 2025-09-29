export interface KeyResult {
  id: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  completed: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: "note" | "task" | "reminder" | "okr";
  completed?: boolean;
  objective?: string;
  keyResults?: KeyResult[];
  quarter?: string;
  progress?: number;
}
