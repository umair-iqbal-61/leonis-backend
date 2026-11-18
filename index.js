import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import authRoutes from './src/routes/authRoutes.js'
import validateToken from './src/middleware/validateToken.js'
import petRoutes from './src/routes/petRoutes.js'
import verifyPetOwnership from './src/middleware/verifyPetOwnership.js'
import mealRoutes from './src/routes/mealRoutes.js'
import weightRoutes from './src/routes/weightRoutes.js'
import vetVisitRoutes from './src/routes/vetVisitRoutes.js'
import reminderRoutes from './src/routes/reminderRoutes.js'
import userAllRemindersRoute from './src/routes/userAllRemindersRoute.js'
import photoRoutes from './src/routes/photoRoutes.js'
import avatarRoutes from './src/routes/avatarRoutes.js'
import qualityRoutes from './src/routes/qualityRoutes.js'
import dairyRoutes from './src/routes/dairyRoutes.js'
import chatRoutes from './src/routes/chatRoutes.js'

const app = express()
const PORT = process.env.PORT || 7461

app.use(cors({
  origin: ['https://pawpal.umairiqbal.tech', 'http://localhost:5173']
}))

app.use(express.json())

app.use('/api/auth', authRoutes)

app.use('/api', validateToken, petRoutes)

app.use('/api/pets/:petId', validateToken, verifyPetOwnership, mealRoutes)
app.use('/api/pets/:petId', validateToken, verifyPetOwnership, weightRoutes)
app.use('/api/pets/:petId', validateToken, verifyPetOwnership, vetVisitRoutes)
app.use('/api/pets/:petId', validateToken, verifyPetOwnership, reminderRoutes)

app.use('/api/pets/:petId', validateToken, verifyPetOwnership, photoRoutes)
app.use('/api/pets/:petId', validateToken, verifyPetOwnership, avatarRoutes)

app.use('/api/pets/:petId', validateToken, verifyPetOwnership, chatRoutes)
app.use('/api/pets/:petId', validateToken, verifyPetOwnership, dairyRoutes, qualityRoutes)

app.use('/api', validateToken, userAllRemindersRoute)

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error)
  console.error(error)
  res.status(500).json({ message: 'Something went wrong!' })
})

app.listen(PORT, () => {
  console.log(`Server is listening on PORT ${PORT}`)
})