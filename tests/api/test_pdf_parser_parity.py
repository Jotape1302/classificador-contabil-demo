"""Paridade real do parser PDF com uma página de texto selecionável."""

import io

from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from api.zaeron_api.adapters.parsers import ler_extrato_pdf
from api.zaeron_api.adapters.parser_adapter import parse_statement


def _text_pdf() -> bytes:
    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    font = DictionaryObject(
        {
            NameObject("/Type"): NameObject("/Font"),
            NameObject("/Subtype"): NameObject("/Type1"),
            NameObject("/BaseFont"): NameObject("/Helvetica"),
        }
    )
    page[NameObject("/Resources")] = DictionaryObject(
        {
            NameObject("/Font"): DictionaryObject(
                {NameObject("/F1"): writer._add_object(font)}
            )
        }
    )
    stream = DecodedStreamObject()
    stream.set_data(
        b"BT /F1 12 Tf 50 740 Td (10/08/2026 COPEL ENERGIA -450,00 D) Tj ET"
    )
    page[NameObject("/Contents")] = writer._add_object(stream)
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


def test_pdf_adapter_matches_real_legacy_parser_output():
    content = _text_pdf()
    legacy, error = ler_extrato_pdf(content, user_id=None)
    adapted = parse_statement("extrato.pdf", content, user_id=17)

    assert error is None
    assert len(legacy) == len(adapted.transactions) == 1
    assert adapted.transactions[0]["date"].isoformat() == legacy.iloc[0]["Data"]
    assert adapted.transactions[0]["clean_description"] == legacy.iloc[0]["Descricao_Limpa"]
    assert adapted.transactions[0]["amount"] == legacy.iloc[0]["Valor"]
