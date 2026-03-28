import { Block } from './types'

export async function fetchBlocks(day: string): Promise<Block[]> {
  const res = await fetch(`/api/blocks?day=${day}`)
  if (!res.ok) return []
  const data = await res.json()
  return data.blocks || []
}

export async function saveBlocks(day: string, blocks: Block[]): Promise<boolean> {
  // Strip internal editing state before saving
  const clean = blocks.map(b => ({
    ...b, _ed: undefined,
    tasks: b.tasks.map(t => ({ ...t, _ed: undefined }))
  }))
  const res = await fetch('/api/blocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ day, blocks: clean }),
  })
  return res.ok
}
