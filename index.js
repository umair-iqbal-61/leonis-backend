import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import authRoutes from './src/routes/authRoutes.js'
import validateToken from './src/middleware/validateToken.js'
import petRoutes from './src/routes/petRoutes.js'
import verifyPetOwnership from './src/middleware/verifyPetOwnership.js'
import mealRoutes from './src/routes/mealRoutes.js'

const app = express()
const PORT = process.env.PORT || 7461

app.use(cors())

app.use(express.json())

app.use('/api/auth', authRoutes)

app.use('/api', validateToken, petRoutes)

app.use('/api/pets/:petId', validateToken, verifyPetOwnership, mealRoutes)

app.listen(PORT, () => {
  console.log(`Server is listening on PORT ${PORT}`)
})