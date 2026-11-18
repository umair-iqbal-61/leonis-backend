import { changeAnimal } from '../quality/service.js'
import express from 'express'
import prisma from '../lib/prisma.js'
import { parseDate } from '../lib/parseDate.js'

const router = express.Router()

// CREATE a vetvisit for specific pet
router.post('/vetvisits', async (req, res) => {
  const { reason, vetName, visitDate, nextVisit, notes } = req.body

  if (!reason || !visitDate) return res.status(400).json({ message: "Reason and visit date is required!" })

  const parsedVisitDate = parseDate(visitDate)
  if (visitDate && parsedVisitDate === null) {
    return res.status(400).json({ message: "Invalid visitDate format" })
  }
  
  const parsedNextVisit = parseDate(nextVisit)
  if (nextVisit && parsedNextVisit === null) {
    return res.status(400).json({ message: "Invalid nextVisit format" })
  }

  try {
    const newVetVisit = await changeAnimal(req.pet.id, tx => tx.vetVisit.create({
      data: {
        reason,
        vetName,
        visitDate: parsedVisitDate,
        nextVisit: parsedNextVisit,
        notes,
        petId: req.pet.id
      }
    }))

    res.status(201).json({ data: newVetVisit })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Something went wrong!" })
  }
})

// GET all vetvisits for specific pet
router.get('/vetvisits', async (req, res) => {

  try {
    const allVetVisits = await prisma.vetVisit.findMany({
      where: {
        petId: req.pet.id
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ data: allVetVisits })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Something went wrong!" })
  }
})

// GET a specific vetvisit for specific pet
router.get('/vetvisits/:vetVisitId', async (req, res) => {
  try {
    const vetVisit = await prisma.vetVisit.findUnique({
      where: {
        id: parseInt(req.params.vetVisitId),
        petId: req.pet.id
      }
    })

    if (!vetVisit) return res.status(404).json({ message: 'Vet visit not found!' })


    res.json({ data: vetVisit })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Something went wrong!" })
  }
})

// UPDATE a vetvisit for specific pet
router.patch('/vetvisits/:vetVisitId', async (req, res) => {
  const { reason, vetName, visitDate, nextVisit, notes } = req.body

  const parsedVisitDate = parseDate(visitDate)
  if (visitDate && parsedVisitDate === null) {
    return res.status(400).json({ message: "Invalid visitDate format" })
  }
  
  const parsedNextVisit = parseDate(nextVisit)
  if (nextVisit && parsedNextVisit === null) {
    return res.status(400).json({ message: "Invalid nextVisit format" })
  }

  try {
    const updateVetVisit = await changeAnimal(req.pet.id, tx => tx.vetVisit.update({
      where: {
        id: parseInt(req.params.vetVisitId),
        petId: req.pet.id
      },
      data: {
        reason,
        vetName,
        visitDate: parsedVisitDate,
        nextVisit: parsedNextVisit,
        notes,
      }
    }))

    res.json({ message: "Vet visit successfully updated!", data: updateVetVisit })
  } catch (error) {
    console.error(error)
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Vet visit not found!' })
    }
    res.status(500).json({ message: 'Something went wrong' })
  }
})

// DELETE a vetvisit for specific pet
router.delete('/vetvisits/:vetVisitId', async (req, res) => {
  try {
    await changeAnimal(req.pet.id, tx => tx.vetVisit.delete({
      where: {
        id: parseInt(req.params.vetVisitId),
        petId: req.pet.id
      }
    }))

    res.json({ message: 'Vet visit successfully deleted!' })
  } catch (error) {
    console.error(error)
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Vet visit not found!' })
    }
    res.status(500).json({ message: 'Something went wrong' })
  }
})

export default router