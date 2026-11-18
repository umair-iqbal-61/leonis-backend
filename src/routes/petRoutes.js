import { changeAnimal, createAnimal } from '../quality/service.js'
import express from 'express'
import prisma from '../lib/prisma.js'

const router = express.Router()

// CREATE a pet
router.post('/pets', async (req, res) => {
  const { name, species, gender, breed, age, weight, notes } = req.body

  if (!name || !species) return res.status(400).json({ message: "Name and species are required!" })

  try {
    const pet = await createAnimal(tx => tx.pet.create({
      data: {
        name,
        species,
        gender,
        breed,
        age,
        weight,
        notes,
        userId: req.user.userId
      }
    }))

    res.status(201).json({ data: pet })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Something went wrong!" })
  }
})

// GET all pets
router.get('/pets', async (req, res) => {

  try {
    const pets = await prisma.pet.findMany({
      where: {
        userId: req.user.userId
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ data: pets })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Something went wrong!" })
  }
})

// GET a pet
router.get('/pets/:id', async (req, res) => {

  try {
    const pet = await prisma.pet.findUnique({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.userId
      }
    })

    if (!pet) return res.status(404).json({ message: "Pet not found!" })

    res.json({ data: pet })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Something went wrong!" })
  }

})

// UPDATE a pet
router.patch('/pets/:id', async (req, res) => {
  const { name, species, gender, breed, age, weight, notes } = req.body

  try {
    const updatePet = await changeAnimal(parseInt(req.params.id, 10), tx => tx.pet.update({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.userId
      }, data: { name, species, gender, breed, age, weight, notes }
    }))

    res.json({ message: "Pet Successfully updated!", data: updatePet })
  } catch (error) {
    console.error(error)
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Pet not found!' })
    }
    res.status(500).json({ message: 'Something went wrong' })
  }
})

// DELETE a pet
router.delete('/pets/:id', async (req, res) => {
  try {

    await prisma.pet.delete({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.userId
      }
    })

    res.json({ message: "Pet successfully deleted!" })

  } catch (error) {
    console.error(error)
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Pet not found!' })
    }
    res.status(500).json({ message: 'Something went wrong' })
  }
})

export default router