export function cleanDigits(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}

export function validateCpf(cpf: string): boolean {
  const digits = cleanDigits(cpf);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += parseInt(digits[i], 10) * (10 - i);
  }
  const rem1 = (sum1 * 10) % 11;
  const d1 = rem1 === 10 ? 0 : rem1;
  if (parseInt(digits[9], 10) !== d1) return false;

  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    sum2 += parseInt(digits[i], 10) * (11 - i);
  }
  const rem2 = (sum2 * 10) % 11;
  const d2 = rem2 === 10 ? 0 : rem2;
  if (parseInt(digits[10], 10) !== d2) return false;

  return true;
}

export function validateCnpj(cnpj: string): boolean {
  const digits = cleanDigits(cnpj);
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += parseInt(digits[i], 10) * weights1[i];
  }
  const rem1 = sum1 % 11;
  const d1 = rem1 < 2 ? 0 : 11 - rem1;
  if (parseInt(digits[12], 10) !== d1) return false;

  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += parseInt(digits[i], 10) * weights2[i];
  }
  const rem2 = sum2 % 11;
  const d2 = rem2 < 2 ? 0 : 11 - rem2;
  if (parseInt(digits[13], 10) !== d2) return false;

  return true;
}

export function validateDocument(doc: string): {
  isValid: boolean;
  type: "cpf" | "cnpj" | null;
  clean: string;
} {
  const digits = cleanDigits(doc);
  if (digits.length === 11) {
    const isValid = validateCpf(digits);
    return { isValid, type: "cpf", clean: digits };
  }
  if (digits.length === 14) {
    const isValid = validateCnpj(digits);
    return { isValid, type: "cnpj", clean: digits };
  }
  return { isValid: false, type: null, clean: digits };
}

export function maskDocument(value: string): string {
  const digits = cleanDigits(value).slice(0, 14);
  if (digits.length <= 11) {
    // Máscara CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  // Máscara CNPJ: 00.000.000/0000-00
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function maskCep(value: string): string {
  const digits = cleanDigits(value).slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}

export async function fetchAddressByCep(cep: string): Promise<{
  street: string;
  neighborhood: string;
  city: string;
  state: string;
} | null> {
  const clean = cleanDigits(cep);
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      erro?: boolean | string;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (data.erro) return null;
    return {
      street: data.logradouro || "",
      neighborhood: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
    };
  } catch {
    return null;
  }
}
