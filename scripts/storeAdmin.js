import 'dotenv/config'
import prisma from '../src/lib/prisma.js'

const [action, username] = process.argv.slice(2)
if (!['grant', 'revoke'].includes(action) || !username) {
  console.error('Usage: node scripts/storeAdmin.js grant|revoke <existing-username>')
  process.exitCode = 1
} else {
  try {
    const user = await prisma.user.update({ where: { username }, data: { isStoreAdmin: action === 'grant' }, select: { username: true, isStoreAdmin: true } })
    console.log(`${user.username}: store admin ${user.isStoreAdmin ? 'enabled' : 'disabled'}`)
  } catch { console.error('Could not update store-admin access. Check the username and database connection.'); process.exitCode = 1 }
}
await prisma.$disconnect()
