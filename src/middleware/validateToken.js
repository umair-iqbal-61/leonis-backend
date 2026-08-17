import jwt from 'jsonwebtoken'

function validateToken(req, res, next) {

  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(400).json({ err: "Invalid or expired token" })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(400).json({ err: "Invalid or expired token!" })

    req.user = decoded
    next()
  })
}

export default validateToken