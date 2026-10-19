import { ArrowLeft, CheckCircle2, CircleDot, LockKeyhole } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";
import type { AcademyCourse } from "./types";

export function AcademyNavigation({ course }: { course: AcademyCourse }) {
  return (
    <aside className="scrollbar-subtle w-full border-b border-border bg-sidebar lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="border-b border-border p-5 space-y-4">
        <NavLink
          to="/"
          className="group inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors duration-150 hover:text-title"
        >
          <ArrowLeft className="size-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
          <span>Voltar ao Classificador</span>
        </NavLink>

        <NavLink to="/" className="block">
          <img
            src={`${import.meta.env.BASE_URL}assets/logo.png`}
            alt="Zaeron"
            className="h-9 w-auto max-w-[150px] object-contain object-left"
          />
        </NavLink>

        <div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-copper">
            Zaeron Academy
          </span>
          <p className="mt-0.5 text-xs font-semibold text-title leading-snug">{course.title}</p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted">Progresso geral</span>
            <span className="font-mono font-bold text-copper">
              {course.progress.percentage.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-[2px] bg-elevated border border-border/40">
            <div
              className="h-full rounded-[2px] bg-copper transition-all duration-300"
              style={{ width: `${course.progress.percentage}%` }}
            />
          </div>
          <p className="text-[10px] text-muted font-mono">
            {course.progress.completed_lessons} de {course.progress.total_lessons} aulas concluídas
          </p>
        </div>
      </div>

      <nav className="space-y-5 p-3" aria-label="Módulos do curso">
        {course.modules.map((module, idx) => (
          <section key={module.module_key} className="space-y-1.5">
            <div className="flex items-center gap-1.5 px-3">
              <span className="font-mono text-[10px] text-copper font-semibold">
                M{String(idx + 1).padStart(2, "0")}
              </span>
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted truncate">
                {module.title}
              </h2>
            </div>
            <div className="space-y-0.5">
              {module.lessons.map((lesson) => {
                const Icon =
                  lesson.status === "completed"
                    ? CheckCircle2
                    : lesson.is_unlocked
                    ? CircleDot
                    : LockKeyhole;
                return lesson.is_unlocked ? (
                  <NavLink
                    key={lesson.lesson_key}
                    to={`/academy/lessons/${lesson.lesson_key}`}
                    className={({ isActive }) =>
                      cn(
                        "flex items-start gap-2.5 rounded-[4px] px-3 py-2 text-xs transition-colors duration-150",
                        isActive
                          ? "bg-copper/15 text-action font-medium border border-copper/30"
                          : "text-muted hover:bg-elevated hover:text-title border border-transparent"
                      )
                    }
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        lesson.status === "completed" ? "text-success" : "text-copper"
                      )}
                    />
                    <span className="leading-snug">{lesson.title}</span>
                  </NavLink>
                ) : (
                  <div
                    key={lesson.lesson_key}
                    className="flex items-start gap-2.5 px-3 py-2 text-xs text-muted/50"
                    title="Conclua a aula anterior para desbloquear"
                  >
                    <Icon className="mt-0.5 size-3.5 shrink-0" />
                    <span className="leading-snug">{lesson.title}</span>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div className="pt-2 border-t border-border/80 space-y-1">
          <NavLink
            to="/academy/final"
            aria-disabled={!course.final_quiz.is_unlocked}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-[4px] border px-3 py-2.5 text-xs font-medium",
                course.final_quiz.is_unlocked
                  ? isActive
                    ? "border-copper bg-copper/15 text-title"
                    : "border-border text-muted hover:border-copper/50 hover:text-title"
                  : "pointer-events-none border-border/40 text-muted/40"
              )
            }
          >
            {course.final_quiz.is_unlocked ? (
              <CheckCircle2 className="size-3.5 text-copper" />
            ) : (
              <LockKeyhole className="size-3.5 text-muted" />
            )}
            <span>Avaliação & Quiz Final</span>
          </NavLink>
          <NavLink
            to="/certificates"
            className="block px-3 py-1.5 text-xs text-copper hover:text-action transition-colors"
          >
            Meus Certificados Oficiais →
          </NavLink>
        </div>
      </nav>
    </aside>
  );
}
