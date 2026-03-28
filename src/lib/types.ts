export interface Task {
  id: number
  text: string
  priority: 'high' | 'medium' | 'low'
  done: boolean
  time: string
  _ed?: boolean
}

export interface Block {
  id: number
  start: string
  end: string
  name: string
  col: boolean
  tasks: Task[]
  _ed?: boolean
}
