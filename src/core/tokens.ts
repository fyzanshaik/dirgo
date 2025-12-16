export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function formatTokens(count: number): string {
  if (count < 1000) return `~${count} tokens`;
  return `~${(count / 1000).toFixed(1)}k tokens`;
}


