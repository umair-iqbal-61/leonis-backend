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
import chatRoutes from './src/routes/chatRoutes.js'

const app = express()
const PORT = process.env.PORT || 7461

app.use(cors())

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

app.use('/api', validateToken, userAllRemindersRoute)

app.listen(PORT, () => {
  console.log(`Server is listening on PORT ${PORT}`)
})