import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { academyApi } from "./api";

export function useCourse() {
  return useQuery({ queryKey: ["academy-course"], queryFn: academyApi.course });
}

export function useLesson(lessonKey?: string) {
  return useQuery({
    queryKey: ["academy-lesson", lessonKey],
    queryFn: () => academyApi.lesson(lessonKey!),
    enabled: Boolean(lessonKey),
  });
}

export function useQuizSubmit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: academyApi.submitQuiz,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["academy-course"] }),
  });
}

export function useCertificates() {
  return useQuery({ queryKey: ["academy-certificates"], queryFn: academyApi.certificates });
}

export function useCertificate(id?: number) {
  return useQuery({
    queryKey: ["academy-certificate", id],
    queryFn: () => academyApi.certificate(id!),
    enabled: Number.isInteger(id),
  });
}
