import cloudinary from '../config/cloudinary.js';
import { Readable } from 'stream';
import { apiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asynchandler.js';
import multer from 'multer';

const uploadImage = asyncHandler(async (req, res) => {
  // Multer fileFilter error
  if (req.fileValidationError) {
    return res.status(400).json(new apiResponse(400, null, req.fileValidationError));
  }

  if (!req.file) {
    return res.status(400).json(new apiResponse(400, null, "No file uploaded. Please select an image file to upload"));
  }

  try {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto' },
      (error, result) => {
        if (error) {
          return res.status(500).json(new apiResponse(500, null, `Cloudinary upload failed: ${error.message}`));
        }
        return res.status(200).json(new apiResponse(200, { imageUrl: result.secure_url }, "Image uploaded successfully"));
      }
    );

    Readable.from(req.file.buffer).pipe(uploadStream);

  } catch (err) {
    console.error("Error during upload:", err);
    res.status(500).json(new apiResponse(500, null, `Image upload failed: ${err.message}`));
  }
});


export { uploadImage };
