import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import authRoutes from './src/routes/authRoutes.js'
import validateToken from './src/middleware/validateToken.js'

const app = express()
const PORT = process.env.PORT || 7461

app.use(express.json())

app.use('/api/auth', validateToken, authRoutes)

app.listen(PORT, () => {
  console.log(`Server is listening on PORT ${PORT}`)
})