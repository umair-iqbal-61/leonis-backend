import prisma from "../lib/prisma.js"

async function verifyPetOwnership(req, res, next) {
  try {
    const pet = await prisma.pet.findUnique({
      where: { id: parseInt(req.params.petId), userId: req.user.userId }
    })
    if (!pet) {
      return res.status(404).json({ message: "No pet found!" })
    }
    req.pet = pet
    next()
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Something went wrong!" })
  }
}

export default verifyPetOwnership