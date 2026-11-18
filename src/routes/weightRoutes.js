import { changeAnimal } from '../quality/service.js'
import express from 'express'
import prisma from '../lib/prisma.js'

const router = express.Router()

// CREATE a weight for specific pet
router.post('/weights', async (req, res) => {
  const { weight, notes } = req.body

  if (!weight) return res.status(400).json({ message: "Weight is required!" })

  try {
    const newWeight = await changeAnimal(req.pet.id, tx => tx.weight.create({
      data: {
        weight,
        notes,
        petId: req.pet.id
      }
    }))

    res.status(201).json({ data: newWeight })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Something went wrong!" })
  }
})

// GET all weights for specific pet
router.get('/weights', async (req, res) => {

  try {
    const weights = await prisma.weight.findMany({
      where: {
        petId: req.pet.id
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ data: weights })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Something went wrong!" })
  }
})

// GET a specific weight for specific pet
router.get('/weights/:weightId', async (req, res) => {
  try {
    const weight = await prisma.weight.findUnique({
      where: {
        id: parseInt(req.params.weightId),
        petId: req.pet.id
      }
    })

    if (!weight) return res.status(404).json({ message: 'Weight not found!' })


    res.json({ data: weight  })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Something went wrong!" })
  }
})

// UPDATE a weight for specific pet
router.patch('/weights/:weightId', async (req, res) => {
  const { weight, notes } = req.body

  try {
    const updateWeight = await changeAnimal(req.pet.id, tx => tx.weight.update({
      where: {
        id: parseInt(req.params.weightId),
        petId: req.pet.id
      },
      data: { weight, notes }
    }))

    res.json({ message: "Weight successfully updated!", data: updateWeight })
  } catch (error) {
    console.error(error)
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Weight not found!' })
    }
    res.status(500).json({ message: 'Something went wrong' })
  }
})

// DELETE a weight for specific pet
router.delete('/weights/:weightId', async (req, res) => {
  try {
    await changeAnimal(req.pet.id, tx => tx.weight.delete({
      where: {
        id: parseInt(req.params.weightId),
        petId: req.pet.id
      }
    }))

    res.json({ message: 'Weight successfully deleted!' })
  } catch (error) {
    console.error(error)
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Weight not found!' })
    }
    res.status(500).json({ message: 'Something went wrong' })
  }
})

export default router