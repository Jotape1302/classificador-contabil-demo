"""Validações estritas de documentos brasileiros (CPF, CNPJ) e CEP."""

import re


def clean_digits(value: str | None) -> str:
    """Extrai apenas os dígitos numéricos de uma string."""
    if not value:
        return ""
    return re.sub(r"\D", "", str(value))


def validate_cpf(cpf: str) -> bool:
    """
    Valida um número de CPF calculando os dois dígitos verificadores.
    Rejeita sequências repetidas (ex: 111.111.111-11, 000.000.000-00).
    """
    digits = clean_digits(cpf)
    if len(digits) != 11:
        return False

    # Rejeita dígitos todos iguais
    if digits == digits[0] * 11:
        return False

    # Primeiro dígito verificador
    sum_1 = sum(int(digits[i]) * (10 - i) for i in range(9))
    rem_1 = (sum_1 * 10) % 11
    d1 = 0 if rem_1 == 10 else rem_1
    if int(digits[9]) != d1:
        return False

    # Segundo dígito verificador
    sum_2 = sum(int(digits[i]) * (11 - i) for i in range(10))
    rem_2 = (sum_2 * 10) % 11
    d2 = 0 if rem_2 == 10 else rem_2
    if int(digits[10]) != d2:
        return False

    return True


def validate_cnpj(cnpj: str) -> bool:
    """
    Valida um número de CNPJ calculando os dois dígitos verificadores.
    Rejeita sequências repetidas.
    """
    digits = clean_digits(cnpj)
    if len(digits) != 14:
        return False

    # Rejeita dígitos todos iguais
    if digits == digits[0] * 14:
        return False

    # Primeiro dígito verificador
    weights_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    sum_1 = sum(int(digits[i]) * weights_1[i] for i in range(12))
    rem_1 = sum_1 % 11
    d1 = 0 if rem_1 < 2 else 11 - rem_1
    if int(digits[12]) != d1:
        return False

    # Segundo dígito verificador
    weights_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    sum_2 = sum(int(digits[i]) * weights_2[i] for i in range(13))
    rem_2 = sum_2 % 11
    d2 = 0 if rem_2 < 2 else 11 - rem_2
    if int(digits[13]) != d2:
        return False

    return True


def validate_document(doc: str) -> tuple[bool, str, str]:
    """
    Valida CPF ou CNPJ.
    Retorna (is_valid, cleaned_digits, doc_type), onde doc_type é 'cpf', 'cnpj' ou ''.
    """
    digits = clean_digits(doc)
    if len(digits) == 11:
        is_valid = validate_cpf(digits)
        return is_valid, digits, "cpf" if is_valid else ""
    if len(digits) == 14:
        is_valid = validate_cnpj(digits)
        return is_valid, digits, "cnpj" if is_valid else ""
    return False, digits, ""


def validate_cep(cep: str) -> bool:
    """Valida formato de CEP (8 dígitos numéricos)."""
    digits = clean_digits(cep)
    return len(digits) == 8


def format_cep(cep: str) -> str:
    """Formata CEP para o padrão 00000-000."""
    digits = clean_digits(cep)
    if len(digits) == 8:
        return f"{digits[:5]}-{digits[5:]}"
    return digits
