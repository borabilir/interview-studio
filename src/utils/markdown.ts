export function appendMarkdownBlock(value: string, block: string) {
  const current = value.trimEnd()
  return current ? `${current}\n\n${block}\n` : `${block}\n`
}
