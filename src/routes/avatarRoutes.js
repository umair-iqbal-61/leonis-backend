import express from 'express'
import prisma from '../lib/prisma.js'
import cloudinary from '../lib/cloudinary.js'
import { petImageUpload } from '../lib/petImageUpload.js'

const router = express.Router()

// ADD/UPDATE the avatar for a pet
router.post('/avatar', petImageUpload, async (req, res) => {
  try {
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'pawpal/avatars' },
        (error, result) => error ? reject(error) : resolve(result)
      )
      stream.end(req.file.buffer)
    })

    const newAvatar = await prisma.pet.update({
      where: { id: req.pet.id },
      data: {
        avatarUrl: uploadResult.secure_url
      }
    })

    res.status(201).json({ data: newAvatar })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Something went wrong!" })
  }
})

// DELETE the avatar of a pet
router.delete('/avatar', async (req, res) => {
  try {
    await prisma.pet.update({
      where: {
        id: req.pet.id
      }, data: {
        avatarUrl: null
      }
    })

    res.json({ message: "Avatar successfully deleted!" })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Avatar not found!' })
    }
    console.error(error)
    res.status(500).json({ message: "Something went wrong!" })
  }
})

export default router
