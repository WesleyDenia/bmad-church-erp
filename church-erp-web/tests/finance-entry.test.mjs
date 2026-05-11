import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDecimalAmountForDisplay,
  normalizeLocalizedAmountInput,
} from "../src/features/finance/amount.ts";

test("amount helper normalizes localized input to the decimal contract", () => {
  assert.equal(normalizeLocalizedAmountInput("125,40"), "125.40");
  assert.equal(normalizeLocalizedAmountInput("1.234,56"), "1234.56");
  assert.equal(normalizeLocalizedAmountInput("1,234.56"), "1234.56");
  assert.equal(normalizeLocalizedAmountInput("1.234"), "1234.00");
  assert.equal(normalizeLocalizedAmountInput("1,234"), "1234.00");
  assert.equal(normalizeLocalizedAmountInput("125"), "125.00");
  assert.equal(normalizeLocalizedAmountInput("001,5"), "1.50");
});

test("amount helper rejects invalid or zero values", () => {
  assert.equal(normalizeLocalizedAmountInput(""), null);
  assert.equal(normalizeLocalizedAmountInput("abc"), null);
  assert.equal(normalizeLocalizedAmountInput("10,9999"), null);
  assert.equal(normalizeLocalizedAmountInput("0"), null);
  assert.equal(normalizeLocalizedAmountInput("0.123"), null);
  assert.equal(normalizeLocalizedAmountInput("-10"), null);
});

test("display helper keeps the human-facing amount localized", () => {
  assert.equal(formatDecimalAmountForDisplay("125.40"), "125,40");
  assert.equal(formatDecimalAmountForDisplay("125,4"), "125,40");
  assert.equal(formatDecimalAmountForDisplay("texto livre"), "texto livre");
});
