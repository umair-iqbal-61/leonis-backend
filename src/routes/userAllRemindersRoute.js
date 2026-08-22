import express from 'express'
import prisma from '../lib/prisma.js'

const router = express.Router()

router.get('/reminders', async (req, res) => {
  try {
    const allReminders = await prisma.reminder.findMany({
      where: {
        pet: {
          userId: req.user.userId
        },
        isActive: true
      },
      include: {
        pet: {
          select: {
            name: true
          }
        }
      }
    })

    res.json({ data: allReminders })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Something went wrong!' })
  }
})

export default router