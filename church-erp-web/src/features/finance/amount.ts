export function normalizeLocalizedAmountInput(value: string): string | null {
  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed.includes("-")) {
    return null;
  }

  const cleaned = trimmed.replace(/\s+/g, "").replace(/[^\d.,]/g, "");

  if (cleaned.length === 0) {
    return null;
  }

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const hasComma = lastComma >= 0;
  const hasDot = lastDot >= 0;

  let normalized = cleaned;

  if (hasComma && hasDot) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";

    normalized = normalized.replaceAll(thousandsSeparator, "");
    const parts = normalized.split(decimalSeparator);
    const decimalPart = parts.pop();

    if (!decimalPart || decimalPart.length > 2) {
      return null;
    }

    normalized = `${parts.join("")}.${decimalPart}`;
  } else if (hasComma || hasDot) {
    const separator = hasComma ? "," : ".";
    const lastSeparator = hasComma ? lastComma : lastDot;
    const digitsAfterSeparator = cleaned.length - lastSeparator - 1;
    const segments = cleaned.split(separator);
    const wholePartCandidate = segments[0] ?? "";

    if (digitsAfterSeparator >= 1 && digitsAfterSeparator <= 2) {
      const decimalPart = segments.pop();

      if (!decimalPart || decimalPart.length > 2) {
        return null;
      }

      normalized = `${segments.join("")}.${decimalPart}`;
    } else {
      const looksLikeThousandsSeparator =
        segments.length > 2
        || (
          segments.length === 2
          && digitsAfterSeparator === 3
          && Number(wholePartCandidate) > 0
        );

      if (!looksLikeThousandsSeparator) {
        return null;
      }

      normalized = cleaned.replaceAll(separator, "");
    }
  }

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return null;
  }

  const [rawWholePart, rawDecimalPart = ""] = normalized.split(".");

  if (rawDecimalPart.length > 2) {
    return null;
  }

  const wholePart = rawWholePart.replace(/^0+(?=\d)/, "") || "0";
  const decimalPart = rawDecimalPart.padEnd(2, "0");

  if (wholePart === "0" && decimalPart === "00") {
    return null;
  }

  return `${wholePart}.${decimalPart}`;
}

export function formatDecimalAmountForDisplay(value: string): string {
  if (/^\d+\.\d{2}$/.test(value)) {
    return value.replace(".", ",");
  }

  const normalized = normalizeLocalizedAmountInput(value);

  if (!normalized) {
    return value;
  }

  return normalized.replace(".", ",");
}
