"""Testes de códigos, HTML e emissão idempotente de certificados."""

import datetime
import re
import unittest

from api.zaeron_api.models.academy import AcademyCertificate
from api.zaeron_api.services.certificate import (
    generate_public_code,
    render_certificate_html,
)
from tests.academy.helpers import create_test_context, create_user


class AcademyCertificatesTest(unittest.TestCase):
    def setUp(self):
        self.engine, self.session_factory, self.repository = create_test_context()
        self.user = create_user(self.session_factory, "Ana & Filhos <script>")
        self.attempt, _ = self.repository.record_quiz_attempt(
            user_id=self.user.id,
            course_key="ia_rotina_contabil",
            course_version="1.0.0",
            attempt_token="certificate-attempt",
            total_questions=10,
            correct_answers=9,
            score=90,
            passed=True,
            answers_json="{}",
        )

    def tearDown(self):
        self.engine.dispose()

    def test_generated_codes_follow_format_and_are_unique(self):
        codes = {generate_public_code() for _ in range(500)}
        self.assertEqual(len(codes), 500)
        pattern = re.compile(r"^ZAC-[23456789A-HJ-NP-Z]{4}(?:-[23456789A-HJ-NP-Z]{4}){3}$")
        self.assertTrue(all(pattern.fullmatch(code) for code in codes))

    def test_certificate_issue_is_idempotent_per_course_version(self):
        first, first_created = self.repository.issue_certificate(
            user_id=self.user.id,
            attempt_id=self.attempt.id,
            course_key="ia_rotina_contabil",
            course_version="1.0.0",
            recipient_name=self.user.name,
            course_title="IA Aplicada à Rotina Contábil",
            score=90,
            code_factory=lambda: "ZAC-AAAA-BBBB-CCCC-DDDD",
        )
        second, second_created = self.repository.issue_certificate(
            user_id=self.user.id,
            attempt_id=self.attempt.id,
            course_key="ia_rotina_contabil",
            course_version="1.0.0",
            recipient_name="Nome alterado",
            course_title="Título alterado",
            score=100,
            code_factory=lambda: "ZAC-EEEE-FFFF-GGGG-HHHH",
        )
        self.assertTrue(first_created)
        self.assertFalse(second_created)
        self.assertEqual(first.id, second.id)
        self.assertEqual(first.public_code, second.public_code)
        self.assertEqual(second.recipient_name, self.user.name)

        session = self.session_factory()
        try:
            self.assertEqual(session.query(AcademyCertificate).count(), 1)
        finally:
            session.close()

    def test_certificate_html_escapes_dynamic_values(self):
        document = render_certificate_html(
            recipient_name="<script>alert('x')</script>",
            course_title="IA & Contabilidade",
            duration_minutes=210,
            issued_at=datetime.datetime(2026, 8, 26),
            public_code="ZAC-AAAA-BBBB-CCCC-DDDD",
            course_version="1.0.0",
            verification_url="https://zaeron.example/?certificado=ZAC-AAAA",
        )
        self.assertNotIn("<script>alert", document)
        self.assertIn("&lt;script&gt;", document)
        self.assertIn("IA &amp; Contabilidade", document)
        self.assertIn("3h30", document)
        self.assertIn("26/08/2026", document)


if __name__ == "__main__":
    unittest.main()
