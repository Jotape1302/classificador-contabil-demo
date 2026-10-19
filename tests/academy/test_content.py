"""Testes de integridade do manifesto e das aulas da Academy."""

import json
import unittest
from pathlib import Path


class AcademyContentIntegrityTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.repository_root = Path(__file__).resolve().parents[2]
        cls.course_root = (
            cls.repository_root
            / "api"
            / "zaeron_api"
            / "content"
            / "ia_rotina_contabil"
        )
        cls.manifest_path = cls.course_root / "course.json"
        cls.manifest = json.loads(cls.manifest_path.read_text(encoding="utf-8"))

    def test_course_required_fields_and_version(self):
        required = {
            "course_key",
            "version",
            "title",
            "description",
            "passing_score",
            "modules",
            "quiz",
        }
        self.assertTrue(required.issubset(self.manifest))
        self.assertEqual(self.manifest["course_key"], "ia_rotina_contabil")
        self.assertEqual(self.manifest["version"], "1.0.0")
        self.assertEqual(self.manifest["passing_score"], 70)
        self.assertEqual(len(self.manifest["modules"]), 7)

    def test_module_and_lesson_keys_are_unique(self):
        module_keys = []
        lesson_keys = []
        module_orders = []

        for module in self.manifest["modules"]:
            self.assertTrue(
                {"module_key", "order", "title", "description", "lessons"}.issubset(module)
            )
            self.assertTrue(module["lessons"])
            module_keys.append(module["module_key"])
            module_orders.append(module["order"])

            lesson_orders = []
            for lesson in module["lessons"]:
                self.assertTrue(
                    {
                        "lesson_key",
                        "order",
                        "title",
                        "content_path",
                        "estimated_minutes",
                        "passing_score",
                        "questions",
                    }.issubset(lesson)
                )
                self.assertEqual(lesson["passing_score"], 60)
                self.assertEqual(len(lesson["questions"]), 5)
                lesson_keys.append(lesson["lesson_key"])
                lesson_orders.append(lesson["order"])

            self.assertEqual(len(lesson_orders), len(set(lesson_orders)))

        self.assertEqual(len(module_keys), len(set(module_keys)))
        self.assertEqual(len(lesson_keys), len(set(lesson_keys)))
        self.assertEqual(len(module_orders), len(set(module_orders)))

    def test_each_lesson_has_five_valid_quiz_questions(self):
        for module in self.manifest["modules"]:
            for lesson in module["lessons"]:
                question_keys = []
                self.assertEqual(len(lesson["questions"]), 5)
                self.assertEqual(lesson["passing_score"], 60)
                for question in lesson["questions"]:
                    self.assertTrue(
                        {
                            "question_key",
                            "prompt",
                            "options",
                            "correct_option",
                            "explanation",
                        }.issubset(question)
                    )
                    question_keys.append(question["question_key"])
                    self.assertEqual(len(question["options"]), 4)
                    self.assertIn(question["correct_option"], question["options"])
                    self.assertTrue(question["prompt"].strip())
                    self.assertTrue(question["explanation"].strip())
                self.assertEqual(len(question_keys), len(set(question_keys)))

    def test_all_referenced_markdown_files_exist(self):
        referenced_files = []

        for module in self.manifest["modules"]:
            for lesson in module["lessons"]:
                lesson_path = (self.course_root / lesson["content_path"]).resolve()
                self.assertTrue(lesson_path.is_relative_to(self.course_root.resolve()))
                self.assertEqual(lesson_path.suffix.lower(), ".md")
                self.assertTrue(lesson_path.is_file(), lesson_path)
                content = lesson_path.read_text(encoding="utf-8").strip()
                self.assertTrue(content.startswith("# "))
                self.assertGreater(len(content), 500)
                referenced_files.append(lesson_path)

        physical_files = sorted((self.course_root / "lessons").glob("*.md"))
        self.assertEqual(sorted(referenced_files), physical_files)

    def test_quiz_questions_are_consistent(self):
        quiz = self.manifest["quiz"]
        self.assertTrue({"quiz_key", "title", "questions"}.issubset(quiz))
        self.assertTrue(0 <= self.manifest["passing_score"] <= 100)
        self.assertGreaterEqual(len(quiz["questions"]), 5)

        question_keys = []
        for question in quiz["questions"]:
            self.assertTrue(
                {
                    "question_key",
                    "prompt",
                    "options",
                    "correct_option",
                    "explanation",
                }.issubset(question)
            )
            question_keys.append(question["question_key"])
            self.assertIsInstance(question["options"], dict)
            self.assertGreaterEqual(len(question["options"]), 2)
            self.assertIn(question["correct_option"], question["options"])
            self.assertTrue(all(question["options"].values()))
            self.assertTrue(question["prompt"].strip())
            self.assertTrue(question["explanation"].strip())

        self.assertEqual(len(question_keys), len(set(question_keys)))


if __name__ == "__main__":
    unittest.main()
