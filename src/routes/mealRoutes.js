import express from 'express'
import prisma from '../lib/prisma.js'

const router = express.Router()

// CREATE a meal for specific pet
router.post('/meals', async (req, res) => {
  const { name, amount, notes } = req.body

  if (!name) return res.status(400).json({ message: "Name is required!" })

  try {
    const meal = await prisma.meal.create({
      data: {
        name,
        amount,
        notes,
        petId: req.pet.id
      }
    })

    res.status(201).json({ data: meal })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Something went wrong!" })
  }
})

// GET all meals for specific pet
router.get('/meals', async (req, res) => {

  try {
    const meals = await prisma.meal.findMany({
      where: {
        petId: req.pet.id
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ data: meals })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Something went wrong!" })
  }
})

// GET a specific meal for specific pet
router.get('/meals/:mealId', async (req, res) => {
  try {
    const meal = await prisma.meal.findUnique({
      where: {
        id: parseInt(req.params.mealId),
        petId: req.pet.id
      }
    })

    if (!meal) return res.status(404).json({ message: 'Meal not found!' })


    res.json({ data: meal })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Something went wrong!" })
  }
})

// UPDATE a meal for specific pet
router.patch('/meals/:mealId', async (req, res) => {
  const { name, amount, notes } = req.body

  try {
    const updateMeal = await prisma.meal.update({
      where: {
        id: parseInt(req.params.mealId),
        petId: req.pet.id
      },
      data: { name, amount, notes }
    })

    res.json({ message: "Meal successfully updated!", data: updateMeal })
  } catch (error) {
    console.error(error)
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Meal not found!' })
    }
    res.status(500).json({ message: 'Something went wrong' })
  }
})

// DELETE a meal for specific pet
router.delete('/meals/:mealId', async (req, res) => {
  try {
    await prisma.meal.delete({
      where: {
        id: parseInt(req.params.mealId),
        petId: req.pet.id
      }
    })

    res.json({ message: 'Meal successfully deleted!' })
  } catch (error) {
    console.error(error)
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Meal not found!' })
    }
    res.status(500).json({ message: 'Something went wrong' })
  }
})

export default router