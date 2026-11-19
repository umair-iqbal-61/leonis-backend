import assert from 'node:assert/strict'
import { test } from 'node:test'
import { signupWorkspace, workspaceInput } from '../src/account/workspaces.js'
const current = { workspaces: ['PETS', 'LIVESTOCK'], activeWorkspace: 'PETS' }
test('signup supports pets, livestock and both without changing legacy callers', () => {
  assert.deepEqual(signupWorkspace(), { workspaces: ['PETS'], activeWorkspace: 'PETS' })
  assert.deepEqual(signupWorkspace('LIVESTOCK'), { workspaces: ['LIVESTOCK'], activeWorkspace: 'LIVESTOCK' })
  assert.deepEqual(signupWorkspace('BOTH'), current)
  for (const value of [null, [], {}, 'ADMIN', '', 'pets']) assert.equal(signupWorkspace(value), null)
})
test('workspace preference changes validate both enabled and active values', () => {
  assert.deepEqual(workspaceInput({ activeWorkspace: 'LIVESTOCK' }, current), { ...current, activeWorkspace: 'LIVESTOCK' })
  assert.deepEqual(workspaceInput({ workspaces: ['LIVESTOCK'] }, current), { workspaces: ['LIVESTOCK'], activeWorkspace: 'LIVESTOCK' })
  for (const body of [null, [], { workspaces: [] }, { workspaces: ['PETS', 'PETS'] }, { workspaces: ['ADMIN'] }, { activeWorkspace: 'BOTH' }, { workspaces: ['PETS'], activeWorkspace: 'LIVESTOCK' }]) assert.equal(workspaceInput(body, current), null)
})
test('preference input never grants roles or modifies other users', () => {
  const input = workspaceInput({ workspaces: ['PETS'], activeWorkspace: 'PETS', id: 99, userId: 99, isStoreAdmin: true, username: 'other' }, current)
  assert.deepEqual(input, { workspaces: ['PETS'], activeWorkspace: 'PETS' })
})
