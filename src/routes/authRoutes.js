import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'

const router = express.Router()

router.post('/register', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required!" })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword
      }
    })

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' })
    res.json({ token })

  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Username already taken' })
    }
    res.status(500).json({ message: 'Something went wrong' })
  }
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required!" })
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        username
      }
    })

    if (!user) {
      res.status(400).json({ message: 'Invalid credentials!' })
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials, Nigga!" })
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' })
    res.json({ token })
  } catch (error) {
    res.status(400).json({ message: 'Something went wrong' })
  }
})

export default router