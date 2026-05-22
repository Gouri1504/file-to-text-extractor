// components/documents/Dropzone.jsx
// Animated drag-and-drop zone. Accepts a single file (PDF or image) and
// hands it to the parent via onFile. The parent owns upload progress and
// network state; this component just deals with selection + visuals.

import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';

export default function Dropzone({ onFile, disabled = false }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && onFile(files[0]),
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.tiff', '.webp'],
    },
    maxFiles: 1,
    disabled,
  });

  return (
    <motion.div
      {...getRootProps()}
      className={`dropzone ${isDragActive ? 'dropzone--active' : ''} ${disabled ? 'dropzone--disabled' : ''}`}
      whileHover={disabled ? {} : { scale: 1.01 }}
      whileTap={disabled ? {} : { scale: 0.99 }}
    >
      <input {...getInputProps()} />
      <div className="dropzone__icon" aria-hidden>+</div>
      <h3 className="dropzone__title">
        {isDragActive ? 'Drop the file to upload' : 'Drop a PDF or image here'}
      </h3>
      <p className="dropzone__sub">or click to browse - max 10 MB</p>
      <p className="dropzone__hint">PDF, JPG, PNG, GIF, BMP, TIFF, WebP</p>
    </motion.div>
  );
}
