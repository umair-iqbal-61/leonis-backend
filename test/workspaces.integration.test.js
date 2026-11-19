import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
const database = process.env.LEONIS_TEST_DATABASE_URL, api = process.env.LEONIS_TEST_API_URL

test('workspace choices persist per account without affecting records, ownership or roles', { skip: !database || !api }, async () => {
  const db = new URL(database)
  assert.ok(['localhost', '127.0.0.1'].includes(db.hostname) && db.pathname === '/leonis_smoke')
  assert.equal(api, 'http://localhost:7462/api')
  process.env.DATABASE_URL = database
  const { default: prisma } = await import('../src/lib/prisma.js')
  const users = []
  async function request(path, token, method = 'GET', body, expected = 200) {
    const response = await fetch(api + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    const data = await response.json()
    assert.equal(response.status, expected, JSON.stringify(data))
    return data.data ?? data
  }
  try {
    await request('/account/workspaces', null, 'GET', undefined, 400)
    await request('/auth/register', null, 'POST', { username: 'invalid-' + randomUUID(), password: 'disposable-password', workspace: 'ADMIN' }, 400)
    for (const workspace of ['PETS', 'LIVESTOCK', 'BOTH', undefined]) {
      const username = 'workspace-test-' + randomUUID()
      const { token } = await request('/auth/register', null, 'POST', { username, password: 'disposable-password', workspace, isStoreAdmin: true })
      const user = await prisma.user.findUniqueOrThrow({ where: { username } })
      users.push({ ...user, token })
      const data = await request('/account/workspaces', token)
      assert.deepEqual(data.workspaces, workspace === 'BOTH' ? ['PETS', 'LIVESTOCK'] : [workspace ?? 'PETS'])
      assert.equal(data.activeWorkspace, workspace === 'LIVESTOCK' ? 'LIVESTOCK' : 'PETS')
      assert.equal(user.isStoreAdmin, false)
      assert.equal(Object.hasOwn(data, 'password'), false)
    }
    const [owner, other] = users
    const cat = await request('/pets', owner.token, 'POST', { name: 'Workspace cat', species: 'cat' }, 201)
    const cow = await request('/pets', owner.token, 'POST', { name: 'Workspace cow', species: 'dairy-cattle' }, 201)
    for (const body of [{ workspaces: [] }, { workspaces: ['PETS'], activeWorkspace: 'LIVESTOCK' }, { workspaces: ['ADMIN'] }]) await request('/account/workspaces', owner.token, 'PATCH', body, 400)
    const enabled = await request('/account/workspaces', owner.token, 'PATCH', { workspaces: ['PETS', 'LIVESTOCK'], activeWorkspace: 'LIVESTOCK', id: other.id, isStoreAdmin: true })
    assert.equal(enabled.activeWorkspace, 'LIVESTOCK')
    assert.equal((await request('/account/workspaces', other.token)).activeWorkspace, 'LIVESTOCK')
    // The other account originally chose LIVESTOCK; it still has exactly that one workspace.
    assert.deepEqual((await request('/account/workspaces', other.token)).workspaces, ['LIVESTOCK'])
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: owner.id } })).isStoreAdmin, false)
    await request('/account/workspaces', owner.token, 'PATCH', { workspaces: ['PETS'], activeWorkspace: 'PETS' })
    assert.equal((await request(`/pets/${cat.id}`, owner.token)).id, cat.id)
    assert.equal((await request(`/pets/${cow.id}`, owner.token)).id, cow.id)
    assert.deepEqual((await request('/pets', owner.token)).map(item => item.id).sort((a, b) => a - b), [cat.id, cow.id].sort((a, b) => a - b))
    await request(`/pets/${cat.id}`, other.token, 'GET', undefined, 404)
    await request('/store/admin/products', owner.token, 'GET', undefined, 403)
    await request('/account/workspaces', owner.token, 'PATCH', { workspaces: ['PETS', 'LIVESTOCK'], activeWorkspace: 'LIVESTOCK' })
    const session = await request('/auth/login', null, 'POST', { username: owner.username, password: 'disposable-password' })
    assert.equal((await request('/account/workspaces', session.token)).activeWorkspace, 'LIVESTOCK')
    // The legacy all-animals API remains unchanged; workspaces organize the UI only.
    assert.equal((await request('/pets', session.token)).length, 2)
  } finally {
    await prisma.pet.deleteMany({ where: { userId: { in: users.map(user => user.id) } } })
    await prisma.user.deleteMany({ where: { id: { in: users.map(user => user.id) } } })
    await prisma.$disconnect()
  }
})
