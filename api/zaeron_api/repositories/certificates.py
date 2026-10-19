"""Consulta somente leitura de certificados legados."""

from sqlalchemy.orm import Session

from api.zaeron_api.models.academy import AcademyCertificate


class CertificateRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_by_public_code(self, public_code: str) -> AcademyCertificate | None:
        return (
            self.session.query(AcademyCertificate)
            .filter(AcademyCertificate.public_code == public_code)
            .first()
        )
