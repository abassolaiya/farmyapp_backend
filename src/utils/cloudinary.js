import { v2 as cloudinary1 } from "cloudinary";

const configureCloudinary = (cloud_name, api_key, api_secret) => {
  cloudinary1.config({
    cloud_name: cloud_name,
    api_key: api_key,
    api_secret: api_secret,
  });
};

const cloudinary = (file) => {
  const result = cloudinary1.uploader.upload(file);
  return result;
};

export { configureCloudinary, cloudinary };
