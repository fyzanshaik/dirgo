export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    const clipboardy = await import("clipboardy");
    await clipboardy.default.write(text);
    return true;
  } catch {
    return false;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function formatCopyStatus(
  bytes: number,
  tokens: number,
  copied: boolean
): string {
  const sizeStr = formatBytes(bytes);
  const tokenStr = `~${tokens} tokens`;
  if (copied) {
    return `[copied ${sizeStr} · ${tokenStr}]`;
  }
  return `[${sizeStr} · ${tokenStr}]`;
}


