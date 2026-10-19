import { useState } from "react";
import { CheckCircle2, LoaderCircle, RotateCcw, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { useQuizSubmit } from "./hooks";
import type { AcademyQuestion, QuizResult } from "./types";

type Props = {
  kind: "lesson" | "final";
  lessonKey?: string;
  questions: AcademyQuestion[];
  passingScore: number;
  onPassed?: (result: QuizResult) => void;
};

export function InteractiveQuiz({ kind, lessonKey, questions, passingScore, onPassed }: Props) {
  const navigate = useNavigate();
  const submit = useQuizSubmit();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [token, setToken] = useState(() => crypto.randomUUID());
  const result = submit.data;
  const complete = questions.every((question) => Boolean(answers[question.question_key]));

  const retry = () => {
    setAnswers({});
    setToken(crypto.randomUUID());
    submit.reset();
  };

  return (
    <section className="mt-8 border-t border-border pt-8" aria-labelledby="quiz-title">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-copper">
            {kind === "lesson" ? "Mini-quiz da aula" : "Avaliação final"}
          </p>
          <h2 id="quiz-title" className="mt-1 text-xl font-semibold">Valide seu aprendizado</h2>
          <p className="mt-1 text-sm text-muted">Aproveitamento mínimo: {passingScore}%.</p>
        </div>
        <span className="rounded-full border border-border bg-sidebar px-3 py-1 text-xs text-muted">
          {Object.keys(answers).length}/{questions.length} respondidas
        </span>
      </div>

      <div className="space-y-5">
        {questions.map((question, questionIndex) => {
          const feedback = result?.feedback.find((item) => item.question_key === question.question_key);
          return (
            <fieldset key={question.question_key} disabled={Boolean(result)} className="rounded-xl border border-border bg-sidebar/70 p-4 sm:p-5">
              <legend className="px-2 text-sm font-semibold text-title">
                {questionIndex + 1}. {question.prompt}
              </legend>
              <div className="mt-3 grid gap-2">
                {Object.entries(question.options).map(([key, label]) => {
                  const checked = answers[question.question_key] === key;
                  return (
                    <label key={key} className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors duration-150",
                      checked ? "border-copper bg-copper/10 text-title" : "border-border text-muted hover:border-copper/50 hover:text-title",
                    )}>
                      <input
                        type="radio"
                        name={question.question_key}
                        value={key}
                        checked={checked}
                        onChange={() => setAnswers((current) => ({ ...current, [question.question_key]: key }))}
                        className="mt-0.5 accent-[#F08A3E]"
                      />
                      <span><strong className="mr-2 text-copper">{key.toUpperCase()}</strong>{label}</span>
                    </label>
                  );
                })}
              </div>
              {feedback && (
                <div className={cn("mt-3 flex gap-2 rounded-lg px-3 py-2 text-xs", feedback.correct ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                  {feedback.correct ? <CheckCircle2 className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />}
                  <span>{feedback.explanation}</span>
                </div>
              )}
            </fieldset>
          );
        })}
      </div>

      {submit.isError && (
        <p role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {submit.error.message}
        </p>
      )}
      {result && (
        <div role="status" className={cn("mt-5 rounded-xl border p-5", result.passed ? "border-success/40 bg-success/10" : "border-warning/40 bg-warning/10")}>
          <div className="flex items-center gap-3">
            {result.passed ? <CheckCircle2 className="size-6 text-success" /> : <XCircle className="size-6 text-warning" />}
            <div>
              <p className="font-semibold">{result.passed ? "Aprovado" : "Revise o conteúdo e tente novamente"}</p>
              <p className="text-sm text-muted">Pontuação: {result.score.toFixed(0)}% de {result.passing_score.toFixed(0)}% necessários.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {!result.passed && <Button variant="secondary" onClick={retry}><RotateCcw className="size-4" />Tentar novamente</Button>}
            {result.passed && result.certificate_id && (
              <Button onClick={() => navigate(`/certificates/${result.certificate_id}`)}>Ver certificado</Button>
            )}
            {result.passed && result.next_lesson_key && (
              <Button onClick={() => { onPassed?.(result); navigate(`/academy/lessons/${result.next_lesson_key}`); }}>Próxima aula</Button>
            )}
            {result.passed && !result.next_lesson_key && kind === "lesson" && (
              <Button onClick={() => { onPassed?.(result); navigate("/academy/final"); }}>Ir ao quiz final</Button>
            )}
          </div>
        </div>
      )}
      {!result && (
        <Button
          className="mt-5"
          disabled={!complete || submit.isPending}
          onClick={() => submit.mutate({ kind, lesson_key: lessonKey, attempt_token: token, answers }, { onSuccess: (value) => value.passed && onPassed?.(value) })}
        >
          {submit.isPending && <LoaderCircle className="size-4 animate-spin" />}
          {submit.isPending ? "Corrigindo…" : "Enviar respostas"}
        </Button>
      )}
    </section>
  );
}
