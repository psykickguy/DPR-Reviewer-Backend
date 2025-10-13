import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "documents", // The folder name in your Cloudinary account
    resource_type: "raw", // To allow any file type (pdf, docx, etc.)
    public_id: (_req, file) => `${Date.now()}-${file.originalname}`,
  },
});

const upload = multer({ storage: storage });

export default upload;
