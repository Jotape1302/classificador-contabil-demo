import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Lock,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { cn } from "../../lib/utils";
import { AcademyNavigation } from "./AcademyNavigation";
import { InteractiveQuiz } from "./InteractiveQuiz";
import { useCertificates, useCourse, useLesson } from "./hooks";

function LoadingAcademy() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-80 space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </main>
  );
}

export function AcademyPlayer({ final = false }: { final?: boolean }) {
  const { lessonKey } = useParams();
  const courseQuery = useCourse();
  const certsQuery = useCertificates();
  const lessonQuery = useLesson(final ? undefined : lessonKey);

  if (courseQuery.isLoading) return <LoadingAcademy />;
  if (courseQuery.isError || !courseQuery.data) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-[4px] border border-danger/30 bg-danger/10 p-5 text-danger text-xs">
          <AlertCircle className="mb-2 size-5" />
          Não foi possível carregar a Academy.
        </div>
      </main>
    );
  }
  const course = courseQuery.data;
  const certificates = certsQuery.data?.certificates ?? [];

  // Cálculos de desempenho em tempo real
  const totalLessons = course.progress.total_lessons || 1;
  const completedLessons = course.progress.completed_lessons || 0;
  const progressPct = course.progress.percentage || 0;

  // Carga horária calculada
  let completedMinutes = 0;
  let completedModulesCount = 0;

  course.modules.forEach((mod) => {
    const allModCompleted =
      mod.lessons.length > 0 && mod.lessons.every((l) => l.status === "completed");
    if (allModCompleted) completedModulesCount++;
    mod.lessons.forEach((l) => {
      if (l.status === "completed") {
        completedMinutes += l.estimated_minutes || 15;
      }
    });
  });

  const completedHours = Math.floor(completedMinutes / 60);
  const completedMins = completedMinutes % 60;
  const completedFormatted =
    completedHours > 0 ? `${completedHours}h ${completedMins}min` : `${completedMins}min`;

  const hasCertificate = certificates.length > 0;


  return (
    <div className="min-h-screen lg:flex">
      <AcademyNavigation course={course} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-4xl">
          {!lessonKey && !final && (
            <section className="space-y-8">
              {/* Header do Curso */}
              <div className="border-b border-border pb-6">
                <div className="flex items-center gap-2">
                  <Badge tone="copper">FORMAÇÃO PROFISSIONAL</Badge>
                  {hasCertificate && (
                    <span className="inline-flex items-center gap-1 rounded-[2px] border border-success/40 bg-success/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-success">
                      <Award className="size-3" /> Certificado Emitido
                    </span>
                  )}
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-4xl text-title">
                  {course.title}
                </h1>
                <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed text-muted">
                  {course.description}
                </p>
              </div>

              {/* DASHBOARD EDITORIAL DE PROGRESSO (Redesenhado) */}
              <div className="rounded-[4px] border border-border bg-sidebar/80 p-6 sm:p-8 space-y-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
                  <div>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-copper">
                      Status da Formação
                    </span>
                    <p className="font-mono text-3xl font-extrabold text-title mt-0.5">
                      {progressPct.toFixed(0)}%
                    </p>
                  </div>
                  <div className="text-left sm:text-right text-xs font-mono text-muted space-y-1">
                    <div>
                      <strong className="text-title">{completedModulesCount}</strong> /{" "}
                      {course.modules.length} módulos concluídos
                    </div>
                    <div>
                      <strong className="text-title">{completedLessons}</strong> /{" "}
                      {totalLessons} aulas • {completedFormatted} concluídas
                    </div>
                  </div>
                </div>

                {/* Barra de Progresso Estrutural */}
                <div className="space-y-1.5">
                  <div className="h-2 w-full overflow-hidden rounded-[2px] bg-canvas border border-border/60">
                    <div
                      className="h-full rounded-[2px] bg-copper transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Próximo Passo / Ação Principal */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                  <div className="text-xs">
                    <span className="text-muted block">Próximo conteúdo:</span>
                    <strong className="text-title text-sm">
                      {course.progress.is_complete
                        ? "Avaliação Final Oficial"
                        : "Classificação Contábil & Regras de Memória"}
                    </strong>
                  </div>

                  <Link
                    to={
                      course.progress.is_complete
                        ? "/academy/final"
                        : `/academy/lessons/${course.progress.continue_lesson_key}`
                    }
                  >
                    <Button className="h-9">
                      {course.progress.is_complete ? "Iniciar Avaliação Final" : "Continuar Formação"}
                      <ArrowRight className="size-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* TRILHA ESPACIAL DE MÓDULOS CONECTADOS (Spatial Learning Roadmap) */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-copper" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-title">
                      Trilha de Especialização Contábil
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-muted">
                    {course.modules.length} módulos estruturados
                  </span>
                </div>

                <div className="space-y-0 pt-2">
                  {course.modules.map((mod, idx) => {
                    const isLast = idx === course.modules.length - 1;
                    const completedInMod = mod.lessons.filter(
                      (l) => l.status === "completed"
                    ).length;
                    const isModCompleted =
                      mod.lessons.length > 0 && completedInMod === mod.lessons.length;
                    const isModUnlocked = mod.lessons.some((l) => l.is_unlocked);
                    const isCurrentActive = isModUnlocked && !isModCompleted;

                    return (
                      <div key={mod.module_key} className="flex items-stretch gap-3 sm:gap-4">
                        {/* Eixo Vertical da Linha / Node Spatial Timeline */}
                        <div className="flex flex-col items-center shrink-0 w-8 sm:w-10">
                          {/* Node Icon Indicator */}
                          <div
                            className={cn(
                              "relative z-10 flex size-8 sm:size-9 items-center justify-center rounded-[4px] font-mono text-xs font-bold transition-all duration-300 shadow-sm",
                              isModCompleted
                                ? "bg-success/20 text-success border border-success/50 shadow-[0_0_12px_rgba(53,180,122,0.2)]"
                                : isCurrentActive
                                ? "bg-copper text-white border border-action shadow-[0_0_16px_rgba(200,117,61,0.4)] scale-105"
                                : "bg-elevated text-muted border border-border/70"
                            )}
                            aria-label={`Módulo ${idx + 1}: ${isModCompleted ? "Concluído" : isCurrentActive ? "Em andamento" : "Bloqueado"}`}
                          >
                            {isModCompleted ? (
                              <CheckCircle2 className="size-4 text-success" />
                            ) : (
                              <span>{String(idx + 1).padStart(2, "0")}</span>
                            )}
                          </div>

                          {/* Conector Linear Vertical Independente (Não atravessa o card) */}
                          {!isLast && (
                            <div
                              className={cn(
                                "w-[2px] grow min-h-[24px] my-1 rounded-full transition-colors duration-300",
                                isModCompleted
                                  ? "bg-gradient-to-b from-success/60 to-copper/60"
                                  : isCurrentActive
                                  ? "bg-gradient-to-b from-copper/60 to-border/40"
                                  : "bg-border/40"
                              )}
                              aria-hidden="true"
                            />
                          )}
                        </div>

                        {/* Card do Módulo com Espaço Isolado */}
                        <div
                          className={cn(
                            "flex-1 mb-5 sm:mb-6 rounded-[4px] border p-4 sm:p-5 transition-all duration-200",
                            isModCompleted
                              ? "border-success/30 bg-sidebar/70 hover:border-success/50"
                              : isCurrentActive
                              ? "border-copper/70 bg-sidebar/95 shadow-lg shadow-black/20 hover:border-copper"
                              : "border-border/50 bg-sidebar/30 opacity-75"
                          )}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-semibold text-sm text-title">
                                  {mod.title}
                                </h4>
                                {isCurrentActive && (
                                  <Badge tone="copper">VOCÊ ESTÁ AQUI</Badge>
                                )}
                                {isModCompleted && (
                                  <span className="font-mono text-[10px] font-semibold text-success uppercase tracking-wider">
                                    Concluído
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted mt-1 leading-relaxed">
                                {mod.description}
                              </p>
                            </div>

                            <span className="font-mono text-xs text-muted shrink-0 self-start">
                              <strong className={isModCompleted ? "text-success" : isCurrentActive ? "text-copper" : "text-muted"}>
                                {completedInMod}
                              </strong>{" "}
                              / {mod.lessons.length} aulas
                            </span>
                          </div>

                          {/* Grade de Aulas do Módulo */}
                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            {mod.lessons.map((lesson) => (
                              <Link
                                key={lesson.lesson_key}
                                to={
                                  lesson.is_unlocked
                                    ? `/academy/lessons/${lesson.lesson_key}`
                                    : "#"
                                }
                                className={cn(
                                  "flex items-center justify-between rounded-[3px] border px-3 py-2.5 text-xs transition-all duration-150 gap-2",
                                  lesson.status === "completed"
                                    ? "border-success/30 bg-canvas/80 text-title hover:border-success/60"
                                    : lesson.is_unlocked
                                    ? "border-border bg-canvas text-title hover:border-copper/70 hover:text-action"
                                    : "cursor-not-allowed border-transparent bg-sidebar/20 text-muted/40"
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-1">
                                  {lesson.status === "completed" ? (
                                    <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                                  ) : lesson.is_unlocked ? (
                                    <PlayCircle className="size-3.5 shrink-0 text-copper" />
                                  ) : (
                                    <Lock className="size-3 shrink-0 text-muted" />
                                  )}
                                  <span className="truncate font-medium">{lesson.title}</span>
                                </div>

                                {lesson.score !== undefined && lesson.score !== null ? (
                                  <div className="flex flex-col items-end shrink-0 pl-1 text-right">
                                    <span className="font-mono text-[11px] font-bold text-title leading-tight">
                                      {(lesson.score / 10).toLocaleString("pt-BR", {
                                        minimumFractionDigits: 1,
                                        maximumFractionDigits: 1,
                                      })}
                                    </span>
                                    <span
                                      className={cn(
                                        "font-mono text-[9px] font-semibold uppercase tracking-wider leading-tight",
                                        lesson.passed ? "text-success" : "text-warning"
                                      )}
                                    >
                                      {lesson.passed ? "Aprovado" : "Refazer"}
                                    </span>
                                  </div>
                                ) : lesson.status === "completed" ? (
                                  <span className="font-mono text-[10px] font-medium text-success shrink-0">
                                    Concluído
                                  </span>
                                ) : null}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {lessonKey && (
            lessonQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-7 w-44" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-96 w-full" />
              </div>
            ) : lessonQuery.isError || !lessonQuery.data ? (
              <div
                role="alert"
                className="rounded-[4px] border border-danger/30 bg-danger/10 p-5 text-danger text-xs"
              >
                <AlertCircle className="mb-2 size-5" />
                {lessonQuery.error?.message ?? "Aula indisponível."}
              </div>
            ) : (
              <article className="space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <Link
                    to="/academy"
                    className="group inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-copper transition-colors duration-150"
                  >
                    <ArrowLeft className="size-3.5 transition-transform duration-150 group-hover:-translate-x-1 text-copper" />
                    <span>Voltar ao progresso</span>
                  </Link>

                  <div className="flex items-center gap-2">
                    <Badge tone="copper">{lessonQuery.data.module_title}</Badge>
                    <span className="flex items-center gap-1 font-mono text-xs text-muted">
                      <Clock3 className="size-3.5" />
                      {lessonQuery.data.estimated_minutes} min
                    </span>
                  </div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-title">
                  {lessonQuery.data.title}
                </h1>
                <div className="academy-markdown rounded-[4px] border border-border bg-sidebar/80 p-6 sm:p-8">
                  <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                    {lessonQuery.data.content_markdown}
                  </ReactMarkdown>
                </div>
                <InteractiveQuiz
                  kind="lesson"
                  lessonKey={lessonQuery.data.lesson_key}
                  questions={lessonQuery.data.questions}
                  passingScore={lessonQuery.data.passing_score}
                />
              </article>
            )
          )}

          {final && (
            !course.final_quiz.is_unlocked ? (
              <div className="rounded-[4px] border border-warning/30 bg-warning/10 p-5 text-warning text-xs space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4" />
                  <span>Conclua todas as aulas teóricas e práticas antes de acessar a avaliação final.</span>
                </div>
                <Link
                  to="/academy"
                  className="group inline-flex items-center gap-1.5 text-xs font-medium text-copper hover:text-action transition-colors"
                >
                  <ArrowLeft className="size-3.5 transition-transform duration-150 group-hover:-translate-x-1" />
                  <span>Voltar ao progresso</span>
                </Link>
              </div>
            ) : (
              <section className="space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <Link
                    to="/academy"
                    className="group inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-copper transition-colors duration-150"
                  >
                    <ArrowLeft className="size-3.5 transition-transform duration-150 group-hover:-translate-x-1 text-copper" />
                    <span>Voltar ao progresso</span>
                  </Link>

                  <Badge tone="copper">AVALIAÇÃO FINAL DE CERTIFICAÇÃO</Badge>
                </div>

                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-title">
                  {course.final_quiz.title}
                </h1>
                <p className="text-xs text-muted">
                  Atingimento mínimo de 70% para emissão do certificado digital verificável Zaeron Certified.
                </p>
                {course.final_quiz.questions.length ? (
                  <InteractiveQuiz
                    kind="final"
                    questions={course.final_quiz.questions}
                    passingScore={course.final_quiz.passing_score}
                  />
                ) : (
                  <LoaderCircle className="mt-8 size-6 animate-spin text-copper" />
                )}
              </section>
            )
          )}
        </div>
      </main>
    </div>
  );
}
