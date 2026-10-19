"""Testes da aprovação obrigatória no mini-quiz de cada aula."""

import unittest

from api.zaeron_api.models.academy import AcademyLessonQuizAttempt
from api.zaeron_api.services.academy import AcademyService, ordered_lessons
from tests.academy.helpers import create_test_context, create_user


class AcademyLessonQuizTest(unittest.TestCase):
    def setUp(self):
        self.engine, self.session_factory, self.repository = create_test_context()
        self.user = create_user(self.session_factory, "Aluno Mini Quiz")
        self.service = AcademyService(repository=self.repository)
        self.lessons = ordered_lessons(self.service.course)
        self.first = self.lessons[0]
        self.second = self.lessons[1]

    def tearDown(self):
        self.engine.dispose()

    def _correct_answers(self, count):
        return {
            question["question_key"]: question["correct_option"]
            for question in self.first["questions"][:count]
        }

    def test_failure_does_not_complete_blocks_advance_and_allows_retry(self):
        failed = self.service.submit_lesson_quiz(
            user_id=self.user.id,
            lesson_key=self.first["lesson_key"],
            answers=self._correct_answers(2),
            attempt_token="lesson-attempt-failed",
        )

        self.assertFalse(failed.passed)
        self.assertEqual(failed.correct_answers, 2)
        self.assertEqual(failed.score, 40.0)
        progress = self.service.get_user_progress(self.user.id)
        self.assertNotIn(self.first["lesson_key"], progress["completed_lesson_keys"])
        self.assertEqual(
            self.service.get_continue_destination(self.user.id)["lesson_key"],
            self.first["lesson_key"],
        )
        with self.assertRaisesRegex(ValueError, "aulas anteriores"):
            self.service.access_lesson(self.user.id, self.second["lesson_key"])

        retried = self.service.submit_lesson_quiz(
            user_id=self.user.id,
            lesson_key=self.first["lesson_key"],
            answers=self._correct_answers(5),
            attempt_token="lesson-attempt-retry-approved",
        )
        self.assertTrue(retried.passed)
        self.assertNotEqual(failed.attempt_id, retried.attempt_id)
        self.assertTrue(
            self.service.is_lesson_unlocked(self.user.id, self.second["lesson_key"])
        )

        session = self.session_factory()
        try:
            self.assertEqual(session.query(AcademyLessonQuizAttempt).count(), 2)
        finally:
            session.close()

    def test_three_correct_answers_complete_and_unlock_next_lesson(self):
        result = self.service.submit_lesson_quiz(
            user_id=self.user.id,
            lesson_key=self.first["lesson_key"],
            answers=self._correct_answers(3),
            attempt_token="lesson-attempt-minimum-pass",
        )

        self.assertTrue(result.passed)
        self.assertEqual(result.correct_answers, 3)
        self.assertEqual(result.score, 60.0)
        progress = self.service.get_user_progress(self.user.id)
        self.assertIn(self.first["lesson_key"], progress["completed_lesson_keys"])
        accessed = self.service.access_lesson(self.user.id, self.second["lesson_key"])
        self.assertEqual(accessed.lesson_key, self.second["lesson_key"])

    def test_manual_completion_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "mini-quiz"):
            self.service.complete_lesson(self.user.id, self.first["lesson_key"])


if __name__ == "__main__":
    unittest.main()
