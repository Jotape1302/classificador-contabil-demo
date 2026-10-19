export type AcademyQuestion = {
  question_key: string;
  prompt: string;
  options: Record<string, string>;
};

export type LessonSummary = {
  lesson_key: string;
  title: string;
  order: number;
  estimated_minutes: number;
  passing_score: number;
  status: "locked" | "in_progress" | "completed";
  is_unlocked: boolean;
  score?: number | null;
  passed?: boolean | null;
};


export type AcademyCourse = {
  course_key: string;
  version: string;
  title: string;
  description: string;
  estimated_duration_minutes: number;
  modules: Array<{
    module_key: string;
    title: string;
    description: string;
    order: number;
    lessons: LessonSummary[];
  }>;
  progress: {
    total_lessons: number;
    completed_lessons: number;
    percentage: number;
    is_complete: boolean;
    continue_lesson_key: string | null;
  };
  final_quiz: {
    quiz_key: string;
    title: string;
    passing_score: number;
    is_unlocked: boolean;
    questions: AcademyQuestion[];
  };
};

export type AcademyLesson = {
  lesson_key: string;
  module_key: string;
  module_title: string;
  title: string;
  estimated_minutes: number;
  passing_score: number;
  content_markdown: string;
  questions: AcademyQuestion[];
};

export type QuizResult = {
  kind: "lesson" | "final";
  lesson_key: string | null;
  attempt_token: string;
  score: number;
  passing_score: number;
  passed: boolean;
  is_new_attempt: boolean;
  feedback: Array<{ question_key: string; correct: boolean; explanation: string }>;
  next_lesson_key: string | null;
  certificate_id: number | null;
  certificate_code: string | null;
};

export type AcademyCertificate = {
  id: number;
  status: "valid" | "revoked";
  public_code: string;
  recipient_name: string;
  course_title: string;
  course_version: string;
  score: number;
  duration_minutes: number;
  issued_at: string;
  validation_path: string;
};

export type PublicCertificate = Pick<
  AcademyCertificate,
  "status" | "public_code" | "recipient_name" | "course_title" | "issued_at" | "duration_minutes"
>;
