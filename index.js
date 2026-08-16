import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import authRoutes from './src/routes/authRoutes.js'

const app = express()
const PORT = process.env.PORT || 7461

app.use(express.json())

app.use('/api/auth', authRoutes)

app.listen(PORT, () => {
  console.log(`Server is listening on PORT ${PORT}`)
})