import express from 'express'
import prisma from '../lib/prisma.js'
import cloudinary from '../lib/cloudinary.js'
import { petImageUpload } from '../lib/petImageUpload.js'

const router = express.Router()

// ADD a photo to the pet
router.post('/photos', petImageUpload, async (req, res) => {
  try {
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'pawpal' },
        (error, result) => error ? reject(error) : resolve(result)
      )
      stream.end(req.file.buffer)
    })

    const newPhoto = await prisma.photo.create({
      data: {
        url: uploadResult.secure_url,
        storageKey: uploadResult.public_id,
        title: req.body.title || null,
        size: req.file.size,
        petId: req.pet.id
      }
    })

    res.status(201).json({ data: newPhoto })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Something went wrong!" })
  }
})

// GET all photos for a pet
router.get('/photos', async (req, res) => {
  try {
    const allPhotos = await prisma.photo.findMany({
      where: {
        petId: req.pet.id
      }
    })

    res.json({ data: allPhotos })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Something went wrong!" })
  }
})

// DELETE  a photo of a pet
router.delete('/photos/:photoId', async (req, res) => {
  try {
    const photo = await prisma.photo.delete({
      where: {
        id: parseInt(req.params.photoId),
        petId: req.pet.id
      }
    })

    const publicId = photo.storageKey

    await cloudinary.uploader.destroy(publicId)

    res.json({ message: "Photo successfully deleted!" })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Photo not found!' })
    }
    console.error(error)
    res.status(500).json({ message: "Something went wrong!" })
  }
})

export default router
