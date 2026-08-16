import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'

const router = express.Router()

router.post('/register', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required!" })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword
      }
    })

    const token = jwt.sign({ user: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' })
    res.json({ token })

  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Username already taken' })
    }
    console.log(error.message)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required!" })
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        username
      }
    })

    const isMatch = await bcrypt.compare(password, user.hashedPassword)

    if (!isMatch) {
      return res.status(400).json({ error: "Nigga access your own account!" })
    } 

    const token = jwt.sign({ user: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' })
    res.json({ token })
  } catch (error) {
    console.log(error.message)
    res.status(400).json({ error: 'Something went wrong' })
  }
})

export default router