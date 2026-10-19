"""Testes de correção, aprovação e idempotência do quiz."""

import unittest

from api.zaeron_api.models.academy import AcademyCertificate, AcademyQuizAttempt
from api.zaeron_api.services.academy import AcademyService
from tests.academy.helpers import (
    complete_course,
    create_test_context,
    create_user,
)


class AcademyQuizTest(unittest.TestCase):
    def setUp(self):
        self.engine, self.session_factory, self.repository = create_test_context()
        self.user = create_user(self.session_factory, "Maria Contadora")
        self.course = complete_course(self.repository, self.user.id)
        self.service = AcademyService(repository=self.repository)
        self.correct_answers = {
            question["question_key"]: question["correct_option"]
            for question in self.course["quiz"]["questions"]
        }

    def tearDown(self):
        self.engine.dispose()

    def test_approval_emits_certificate(self):
        result = self.service.submit_quiz(
            user_id=self.user.id,
            recipient_name=self.user.name,
            answers=self.correct_answers,
            attempt_token="attempt-approved",
        )
        self.assertTrue(result.passed)
        self.assertEqual(result.score, 100.0)
        self.assertEqual(result.correct_answers, result.total_questions)
        self.assertIsNotNone(result.certificate_id)
        self.assertTrue(result.certificate_code.startswith("ZAC-"))

    def test_score_below_threshold_fails_without_certificate(self):
        other_user = create_user(self.session_factory, "Aluno Reprovado")
        complete_course(self.repository, other_user.id)
        questions = self.course["quiz"]["questions"]
        answers = {
            question["question_key"]: question["correct_option"]
            for question in questions[:6]
        }
        result = self.service.submit_quiz(
            user_id=other_user.id,
            recipient_name=other_user.name,
            answers=answers,
            attempt_token="attempt-failed",
        )
        self.assertFalse(result.passed)
        self.assertEqual(result.score, 60.0)
        self.assertIsNone(result.certificate_id)

    def test_duplicate_submission_token_reuses_original_attempt(self):
        first = self.service.submit_quiz(
            user_id=self.user.id,
            recipient_name=self.user.name,
            answers=self.correct_answers,
            attempt_token="attempt-idempotent",
        )
        second = self.service.submit_quiz(
            user_id=self.user.id,
            recipient_name=self.user.name,
            answers={},
            attempt_token="attempt-idempotent",
        )
        self.assertEqual(first.attempt_id, second.attempt_id)
        self.assertEqual(first.score, second.score)
        self.assertTrue(first.is_new_attempt)
        self.assertFalse(second.is_new_attempt)
        self.assertEqual(first.certificate_id, second.certificate_id)

        session = self.session_factory()
        try:
            self.assertEqual(session.query(AcademyQuizAttempt).count(), 1)
            self.assertEqual(session.query(AcademyCertificate).count(), 1)
        finally:
            session.close()

    def test_incomplete_course_cannot_submit_quiz(self):
        incomplete_user = create_user(self.session_factory, "Aluno Incompleto")
        with self.assertRaisesRegex(ValueError, "Conclua todas as aulas"):
            self.service.submit_quiz(
                user_id=incomplete_user.id,
                recipient_name=incomplete_user.name,
                answers=self.correct_answers,
                attempt_token="attempt-incomplete",
            )


if __name__ == "__main__":
    unittest.main()
