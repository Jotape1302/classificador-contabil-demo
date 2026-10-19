"""Testes de progresso e continuidade do curso."""

import datetime
import unittest

from api.zaeron_api.models.academy import AcademyLessonProgress
from api.zaeron_api.services.academy import (
    AcademyService,
    calculate_progress,
    get_continue_destination,
    load_course,
    ordered_lessons,
)
from tests.academy.helpers import create_test_context, create_user


class AcademyProgressTest(unittest.TestCase):
    def setUp(self):
        self.engine, self.session_factory, self.repository = create_test_context()
        self.user = create_user(self.session_factory)
        self.course = load_course()
        self.lessons = ordered_lessons(self.course)

    def tearDown(self):
        self.engine.dispose()

    def test_dynamic_progress_ignores_unknown_keys(self):
        empty = calculate_progress(self.course, set())
        self.assertEqual(empty["percentage"], 0.0)
        self.assertFalse(empty["is_complete"])

        partial = calculate_progress(
            self.course,
            {self.lessons[0]["lesson_key"], "aula_inexistente"},
        )
        self.assertEqual(partial["completed_lessons"], 1)
        self.assertAlmostEqual(
            partial["percentage"],
            round(100 / len(self.lessons), 2),
        )

        complete = calculate_progress(
            self.course,
            {lesson["lesson_key"] for lesson in self.lessons},
        )
        self.assertEqual(complete["percentage"], 100.0)
        self.assertTrue(complete["is_complete"])

    def test_continue_returns_oldest_pending_then_quiz(self):
        first = get_continue_destination(self.course, set())
        self.assertEqual(first["kind"], "lesson")
        self.assertEqual(first["lesson_key"], self.lessons[0]["lesson_key"])

        completed = {lesson["lesson_key"] for lesson in self.lessons[:-1]}
        last = get_continue_destination(self.course, completed)
        self.assertEqual(last["lesson_key"], self.lessons[-1]["lesson_key"])

        finished = get_continue_destination(
            self.course,
            {lesson["lesson_key"] for lesson in self.lessons},
        )
        self.assertEqual(finished, {"kind": "quiz", "lesson_key": None})

    def test_approved_attempt_preserves_start_and_marks_completion(self):
        lesson_key = self.lessons[0]["lesson_key"]
        first_access = datetime.datetime(2026, 1, 10, 9, 0, 0)
        completion = datetime.datetime(2026, 1, 10, 10, 0, 0)

        first = self.repository.upsert_lesson_progress(
            self.user.id,
            self.course["course_key"],
            self.course["version"],
            lesson_key,
            accessed_at=first_access,
        )
        attempt, is_new = self.repository.record_lesson_quiz_attempt(
            user_id=self.user.id,
            course_key=self.course["course_key"],
            course_version=self.course["version"],
            lesson_key=lesson_key,
            attempt_token="progress-approved",
            total_questions=5,
            correct_answers=3,
            score=60.0,
            passed=True,
            answers_json="{}",
            submitted_at=completion,
        )
        completed = self.repository.get_lesson_progress(
            self.user.id,
            self.course["course_key"],
            self.course["version"],
            lesson_key,
        )

        self.assertTrue(is_new)
        self.assertTrue(attempt.passed)
        self.assertEqual(first.id, completed.id)
        self.assertEqual(completed.started_at, first_access)
        self.assertEqual(completed.last_accessed_at, completion)
        self.assertEqual(completed.completed_at, completion)

        session = self.session_factory()
        try:
            count = session.query(AcademyLessonProgress).count()
        finally:
            session.close()
        self.assertEqual(count, 1)

    def test_service_advances_after_quiz_approval(self):
        service = AcademyService(repository=self.repository)
        first = self.lessons[0]
        service.access_lesson(self.user.id, first["lesson_key"])
        self.assertEqual(
            service.get_continue_destination(self.user.id)["lesson_key"],
            first["lesson_key"],
        )

        answers = {
            question["question_key"]: question["correct_option"]
            for question in first["questions"][:3]
        }
        result = service.submit_lesson_quiz(
            user_id=self.user.id,
            lesson_key=first["lesson_key"],
            answers=answers,
            attempt_token="progress-service-approved",
        )
        self.assertTrue(result.passed)
        self.assertEqual(
            service.get_continue_destination(self.user.id)["lesson_key"],
            self.lessons[1]["lesson_key"],
        )


if __name__ == "__main__":
    unittest.main()
