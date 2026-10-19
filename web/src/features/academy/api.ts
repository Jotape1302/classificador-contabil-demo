import { ApiError } from "../../lib/api";
import type {
  AcademyCertificate,
  AcademyCourse,
  AcademyLesson,
  PublicCertificate,
  QuizResult,
} from "./types";

async function academyRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (import.meta.env.VITE_DEMO === "true") return (await import("../../demo/mock-api")).demoRequest<T>(path, init);
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { detail?: string; code?: string };
    throw new ApiError(body.detail ?? "Não foi possível concluir a operação.", response.status, body.code);
  }
  return response.json() as Promise<T>;
}

export const academyApi = {
  course: () => academyRequest<AcademyCourse>("/api/academy/course"),
  lesson: (lessonKey: string) =>
    academyRequest<AcademyLesson>(`/api/academy/lessons/${encodeURIComponent(lessonKey)}`),
  submitQuiz: (payload: {
    kind: "lesson" | "final";
    lesson_key?: string;
    attempt_token: string;
    answers: Record<string, string>;
  }) => academyRequest<QuizResult>("/api/academy/quiz/submit", { method: "POST", body: JSON.stringify(payload) }),
  certificates: () =>
    academyRequest<{ certificates: AcademyCertificate[] }>("/api/academy/certificates"),
  certificate: (id: number) => academyRequest<AcademyCertificate>(`/api/academy/certificates/${id}`),
  publicCertificate: (code: string) =>
    academyRequest<PublicCertificate>(`/api/public/certificates/${encodeURIComponent(code)}`),
};
