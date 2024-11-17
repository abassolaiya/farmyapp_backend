import multer from "multer";
import path from "path";

// Multer config
const upload = multer({
  storage: multer.diskStorage({}),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image")) {
      cb(null, true);
    } else {
      cb("invalid image file!", false);
    }
  },
});

export default upload;
