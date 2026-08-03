export const CURRENCIES: { code: string; label: string }[] = [
  { code: 'UGX', label: 'Ugandan Shilling (UGX)' },
  { code: 'KES', label: 'Kenyan Shilling (KES)' },
  { code: 'TZS', label: 'Tanzanian Shilling (TZS)' },
  { code: 'RWF', label: 'Rwandan Franc (RWF)' },
  { code: 'NGN', label: 'Nigerian Naira (NGN)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
];

export function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString()}`;
}
