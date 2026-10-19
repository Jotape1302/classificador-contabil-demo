"""Testes isolados do schema SQLAlchemy da Zaeron Academy."""

import unittest
from unittest.mock import patch

from sqlalchemy import create_engine, inspect

from api.zaeron_api.core import database
from api.zaeron_api.models import classifier, users  # noqa: F401
from api.zaeron_api.models.academy import (
    AcademyCertificate,
    AcademyLessonProgress,
    AcademyLessonQuizAttempt,
    AcademyQuizAttempt,
)


class AcademyModelsSchemaTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        database.Base.metadata.create_all(bind=self.engine)
        self.inspector = inspect(self.engine)

    def tearDown(self):
        self.engine.dispose()

    def _unique_constraint_names(self, table_name):
        return {
            constraint["name"]
            for constraint in self.inspector.get_unique_constraints(table_name)
        }

    def _foreign_key_by_column(self, table_name):
        result = {}
        for foreign_key in self.inspector.get_foreign_keys(table_name):
            for column in foreign_key["constrained_columns"]:
                result[column] = foreign_key
        return result

    def test_expected_tables_are_registered_and_created(self):
        expected = {
            "academy_lesson_progress",
            "academy_lesson_quiz_attempts",
            "academy_quiz_attempts",
            "academy_certificates",
        }
        self.assertTrue(expected.issubset(set(self.inspector.get_table_names())))
        self.assertIs(
            database.Base.metadata.tables["academy_lesson_progress"],
            AcademyLessonProgress.__table__,
        )
        self.assertIs(
            database.Base.metadata.tables["academy_lesson_quiz_attempts"],
            AcademyLessonQuizAttempt.__table__,
        )
        self.assertIs(
            database.Base.metadata.tables["academy_quiz_attempts"],
            AcademyQuizAttempt.__table__,
        )
        self.assertIs(
            database.Base.metadata.tables["academy_certificates"],
            AcademyCertificate.__table__,
        )

    def test_lesson_progress_unique_constraint_and_cascade(self):
        names = self._unique_constraint_names("academy_lesson_progress")
        self.assertIn(
            "uq_academy_progress_user_course_version_lesson",
            names,
        )
        foreign_key = self._foreign_key_by_column("academy_lesson_progress")["user_id"]
        self.assertEqual(foreign_key["referred_table"], "users")
        self.assertEqual(foreign_key["options"].get("ondelete"), "CASCADE")

    def test_lesson_quiz_attempt_token_and_user_cascade(self):
        names = self._unique_constraint_names("academy_lesson_quiz_attempts")
        self.assertIn("uq_academy_lesson_quiz_attempt_token", names)
        foreign_key = self._foreign_key_by_column(
            "academy_lesson_quiz_attempts"
        )["user_id"]
        self.assertEqual(foreign_key["referred_table"], "users")
        self.assertEqual(foreign_key["options"].get("ondelete"), "CASCADE")

    def test_quiz_attempt_token_and_user_cascade(self):
        names = self._unique_constraint_names("academy_quiz_attempts")
        self.assertIn("uq_academy_quiz_attempt_token", names)
        foreign_key = self._foreign_key_by_column("academy_quiz_attempts")["user_id"]
        self.assertEqual(foreign_key["referred_table"], "users")
        self.assertEqual(foreign_key["options"].get("ondelete"), "CASCADE")

    def test_certificate_constraints_and_set_null_relations(self):
        names = self._unique_constraint_names("academy_certificates")
        self.assertIn("uq_academy_certificate_public_code", names)
        self.assertIn("uq_academy_certificate_user_course_version", names)

        foreign_keys = self._foreign_key_by_column("academy_certificates")
        self.assertEqual(foreign_keys["user_id"]["referred_table"], "users")
        self.assertEqual(
            foreign_keys["user_id"]["options"].get("ondelete"),
            "SET NULL",
        )
        self.assertEqual(
            foreign_keys["attempt_id"]["referred_table"],
            "academy_quiz_attempts",
        )
        self.assertEqual(
            foreign_keys["attempt_id"]["options"].get("ondelete"),
            "SET NULL",
        )

    def test_init_db_registers_academy_models_on_isolated_engine(self):
        isolated_engine = create_engine("sqlite:///:memory:")
        try:
            with patch.object(database, "engine", isolated_engine):
                self.assertTrue(database.init_db())
            tables = set(inspect(isolated_engine).get_table_names())
            self.assertIn("academy_lesson_progress", tables)
            self.assertIn("academy_lesson_quiz_attempts", tables)
            self.assertIn("academy_quiz_attempts", tables)
            self.assertIn("academy_certificates", tables)
        finally:
            isolated_engine.dispose()


if __name__ == "__main__":
    unittest.main()
