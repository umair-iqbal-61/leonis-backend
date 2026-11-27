import multer from 'multer'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1 } }).single('photo')
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

export function petImageUpload(req, res, next) {
  upload(req, res, error => {
    const bytes = req.file?.buffer
    const supported = bytes && (
      (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) || bytes.subarray(0, 8).equals(png) ||
      (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP')
    )
    if (error || !supported) {
      return res.status(400).json({ code: 'INVALID_PET_IMAGE', message: 'Choose a JPG, PNG, or WebP image no larger than 5 MB.' })
    }
    next()
  })
}
