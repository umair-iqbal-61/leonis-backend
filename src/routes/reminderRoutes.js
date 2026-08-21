import express from 'express'
import prisma from '../lib/prisma.js'
import { parseTime } from '../lib/parseTime.js'

const router = express.Router()

// CREATE a reminder for specific pet
router.post('/reminders', async (req, res) => {
  const { title, type, remindAt, days, isActive } = req.body

  if (!title || !type || !remindAt || days.length === 0) return res.status(400).json({ message: "Please fill all the fields!" })

  const parsedTime = parseTime(remindAt)
  if (remindAt && parsedTime === null) {
    return res.status(400).json({ message: "Invalid remindAt format" })
  }

  try {
    const newReminder = await prisma.reminder.create({
      data: {
        title,
        type,
        remindAt: parsedTime,
        days,
        isActive,
        petId: req.pet.id
      }
    })

    res.status(201).json({ data: newReminder })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Something went wrong!" })
  }
})

// SEE all reminders for specific pet
router.get('/reminders', async (req, res) => {

  try {
    const allReminders = await prisma.reminder.findMany({
      where: {
        petId: req.pet.id
      }
    })

    res.json({ data: allReminders })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Something went wrong!" })
  }
})

// SEE a specific reminder for specific pet
router.get('/reminders/:reminderId', async (req, res) => {
  try {
    const reminder = await prisma.reminder.findUnique({
      where: {
        id: parseInt(req.params.reminderId),
        petId: req.pet.id
      }
    })

    if (!reminder) return res.status(404).json({ message: 'Reminder not found!' })


    res.json({ data: reminder })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Something went wrong!" })
  }
})

// UPDATE a reminder for specific pet
router.patch('/reminders/:reminderId', async (req, res) => {
  const { title, type, remindAt, days, isActive } = req.body

  const parsedTime = parseTime(remindAt)
  if (remindAt && parsedTime === null) {
    return res.status(400).json({ message: "Invalid remindAt format" })
  }

  try {
    const updateReminder = await prisma.reminder.update({
      where: {
        id: parseInt(req.params.reminderId),
        petId: req.pet.id
      },
      data: {
        title,
        type,
        remindAt: parsedTime,
        days,
        isActive
      }
    })

    res.json({ message: "Reminder successfully updated!", data: updateReminder })
  } catch (error) {
    console.error(error)
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Reminder not found!' })
    }
    res.status(500).json({ message: 'Something went wrong' })
  }
})

// DELETE a reminder for specific pet
router.delete('/reminders/:reminderId', async (req, res) => {
  try {
    await prisma.reminder.delete({
      where: {
        id: parseInt(req.params.reminderId),
        petId: req.pet.id
      }
    })

    res.json({ message: 'Reminder successfully deleted!' })
  } catch (error) {
    console.error(error)
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Reminder not found!' })
    }
    res.status(500).json({ message: 'Something went wrong' })
  }
})

export default router