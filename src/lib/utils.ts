import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classes Tailwind de forma inteligente (ex: p-4 sobrescreve p-2)
 * Requer: npm install clsx tailwind-merge
 * Se não quiser instalar agora, use apenas: return classes.filter(Boolean).join(" ")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata valores numéricos para BRL (Real Brasileiro)
 * Ex: 2000 -> R$ 2.000,00
 */
export function formatCurrency(value: number | string): string {
  const numberValue = Number(value);

  if (isNaN(numberValue)) return "R$ 0,00";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numberValue);
}

/**
 * Formata datas para o padrão brasileiro
 * Ex: Date -> 01/01/2026
 */
export function formatDate(date: Date | string): string {
  if (!date) return "--/--/----";
  const d = new Date(date);
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

/**
 * Corrige imprecisões de ponto flutuante em JavaScript (ex: 0.1 + 0.2 = 0.3000004)
 * Essencial para cálculos financeiros quando o banco usa Float.
 * Arredonda para 2 casas decimais.
 */
export function safeMath(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}