import axios from 'axios';

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', process.env.REACT_APP_CLOUDINARY_PRESET);

  try {
    // CHANGED: 'auto' handles images, videos, and raw files (pdf, docs)
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/auto/upload`,
      formData
    );
    
    // Return a structured object, not just the URL
    return {
      url: response.data.secure_url,
      name: file.name,
      type: file.type // e.g., 'image/jpeg' or 'application/pdf'
    };
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
};