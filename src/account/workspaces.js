export const workspaces = ['PETS', 'LIVESTOCK']
export function signupWorkspace(value = 'PETS') {
  if (!['PETS', 'LIVESTOCK', 'BOTH'].includes(value)) return null
  return { workspaces: value === 'BOTH' ? [...workspaces] : [value], activeWorkspace: value === 'LIVESTOCK' ? 'LIVESTOCK' : 'PETS' }
}
export function workspaceInput(body, current) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const enabled = body.workspaces === undefined ? current.workspaces : body.workspaces
  if (!Array.isArray(enabled) || !enabled.length || enabled.length > 2 || new Set(enabled).size !== enabled.length || !enabled.every(value => workspaces.includes(value))) return null
  const active = body.activeWorkspace === undefined ? enabled.includes(current.activeWorkspace) ? current.activeWorkspace : enabled[0] : body.activeWorkspace
  if (!enabled.includes(active)) return null
  return { workspaces: workspaces.filter(value => enabled.includes(value)), activeWorkspace: active }
}
export const workspaceSelect = { id: true, workspaces: true, activeWorkspace: true }
