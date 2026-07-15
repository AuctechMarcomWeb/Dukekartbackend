import { Router } from "express";
import { uploadImage } from '../controllers/uploadController.js';
import upload from '../config/multerConfig.js';
import { apiResponse } from '../utils/apiResponse.js';

const routes = Router();

routes.post('/uploadImage', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json(new apiResponse(400, null, err.message));
    }
    next();
  });
}, uploadImage);

export default routes;
