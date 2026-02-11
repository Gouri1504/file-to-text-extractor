import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?worker';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

pdfjsLib.GlobalWorkerOptions.workerPort = new pdfWorker();

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_AI_KEY);

function App() {
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  const convertPDFToImages = async (file) => {
    const pdfData = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const imageList = [];
    const totalPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      setLoadingProgress(Math.floor((pageNum / totalPages) * 50)); // First 50% for PDF processing
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport }).promise;
      imageList.push(canvas.toDataURL('image/png'));
    }

    return imageList;
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setMarkdown('');
    setImages([]);
    setErrorMessage('');
    setLoadingProgress(0);

    try {
      let imgList = [];

      if (file.type === 'application/pdf') {
        imgList = await convertPDFToImages(file);
      } else if (file.type.startsWith('image/')) {
        const img = await fileToBase64(file);
        imgList = [img];
        setLoadingProgress(50); // Set to 50% when image is processed
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or image file.');
      }

      setImages(imgList);

      const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

      const result = await model.generateContent({
        contents: [
          {
            parts: [
              {
                text: `
You are a medical claim document parser. Your task is to extract structured information from the image of a medical insurance claim document.

IMPORTANT INSTRUCTIONS:
1. DO NOT include any introductory text like "Here's the information..." or "Based on the image..."
2. DO NOT include any concluding remarks like "I hope this helps" or "Let me know if you need anything else"
3. Start DIRECTLY with the markdown headers and content
4. Format tables with proper markdown syntax and alignment
5. Do not mention anything about image quality or visibility challenges

Extract all available information and organize it into these sections:

## 📄 Claim Information
- Claim Number: [value]
- Date of Claim: [value]
- Type of Claim: [value]
- Status: [value]

## 👤 Patient Details
- Full Name: [value]
- Gender: [value]
- Age/DOB: [value]
- Contact Info: [value]
- Address: [value]

## 🏥 Hospital/Clinic Information
- Hospital/Clinic Name: [value]
- Address: [value]
- Doctor Name: [value]
- Specialization / Department: [value]

## 📋 Diagnosis & Treatment
- Diagnosis / ICD Code: [value]
- Description of Illness: [value]
- Procedures / Treatments: [value]
- Date(s) of Treatment: [value]

## 💳 Insurance Policy Details
- Insurer Name: [value]
- Policy Number: [value]
- TPA Name: [value]
- Coverage Details: [value]

## 💵 Billing Breakdown
| # | Item/Service | Date | Cost |
|---|-------------|------|------|
| 1 | [value] | [value] | [value] |
| 2 | [value] | [value] | [value] |
| 3 | [value] | [value] | [value] |

## 🧾 Summary
- Total Amount Billed: [value]
- Co-pay or Deductible: [value]
- Amount Claimed: [value]
- Amount Approved: [value]
- Remarks: [value]

Replace [value] with the actual information from the document. If any information is missing or unclear, use \`[Not Present]\` or \`[Not Clear]\`.

REMEMBER:
- Start DIRECTLY with the first header (## 📄 Claim Information)
- Do NOT include ANY prefacing text
- Use proper markdown formatting throughout
- Ensure tables are properly aligned
`
              },
              ...imgList.map((img) => ({
                inlineData: {
                  data: img.split(',')[1],
                  mimeType: 'image/png',
                },
              })),
            ],
          },
        ],
      });

      // Simulate progress during AI analysis
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 1;
        });
      }, 100);

      const response = await result.response;
      const text = response.text();

      clearInterval(progressInterval);
      setLoadingProgress(100);

      setTimeout(() => {
        setMarkdown(text);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }, 500);

    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Error occurred while processing the file.');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.tiff']
    },
    maxFiles: 1
  });

  const handleManualFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const nextPage = () => {
    if (currentPage < images.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(markdown);
    alert('Markdown copied to clipboard!');
  };

  const downloadMarkdown = () => {
    const element = document.createElement('a');
    const file = new Blob([markdown], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = 'claim-analysis.md';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadImage = () => {
    if (images.length === 0) return;

    const link = document.createElement('a');
    link.href = images[currentPage];
    link.download = `claim-image-${currentPage + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Medical Claim Document Text Extractor </h1>
      </header>

      <div className="main-content">
        <div className="upload-section">
          <h2>Upload Insurance Claim Document</h2>

          <motion.div
            className={`dropzone ${isDragActive || isDragging ? 'active' : ''}`}
            {...getRootProps()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDrop={() => setIsDragging(false)}
          >
            <input {...getInputProps()} ref={fileInputRef} onChange={handleManualFileSelect} />
            <div className="dropzone-content">
              <i className="upload-icon">📄</i>
              <p>Drag & drop your PDF or image here</p>
              <p className="dropzone-subtext">or click to select file</p>
              <button className="browse-button" onClick={() => fileInputRef.current.click()}>
                Browse Files
              </button>
              <p className="file-types">Supported formats: PDF, JPG, PNG</p>
            </div>
          </motion.div>

          {errorMessage && (
            <motion.div
              className="error-message"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {errorMessage}
            </motion.div>
          )}

          {loading && (
            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="progress-text">{loadingProgress < 100 ? 'Processing...' : 'Complete!'}</p>
            </div>
          )}

          <AnimatePresence>
            {showSuccess && (
              <motion.div
                className="success-message"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                Document processed successfully!
              </motion.div>
            )}
          </AnimatePresence>

          {images.length > 0 && (
            <motion.div
              className="image-preview-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h3>Document Preview</h3>
              <div className="image-display">
                <motion.img
                  key={currentPage}
                  src={images[currentPage]}
                  alt={`Page ${currentPage + 1}`}
                  className="preview-image"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />

                {images.length > 1 && (
                  <div className="page-controls">
                    <button
                      onClick={prevPage}
                      disabled={currentPage === 0}
                      className="page-button"
                    >
                      ← Previous
                    </button>
                    <span className="page-indicator">
                      {currentPage + 1} / {images.length}
                    </span>
                    <button
                      onClick={nextPage}
                      disabled={currentPage === images.length - 1}
                      className="page-button"
                    >
                      Next →
                    </button>
                  </div>
                )}

                <button className="download-button" onClick={downloadImage}>
                  Download Image
                </button>
              </div>
            </motion.div>
          )}
        </div>

        <div className="result-section">
          <div className="result-header">
            <h2>Analysis Result</h2>
            {markdown && (
              <div className="result-actions">
                <button onClick={copyToClipboard} className="action-button">
                  Copy Text
                </button>
                <button onClick={downloadMarkdown} className="action-button">
                  Download MD
                </button>
              </div>
            )}
          </div>

          <div className="markdown-container">
            {loading ? (
              <div className="loading-placeholder">
                <div className="spinner"></div>
                <p>Analyzing document...</p>
              </div>
            ) : markdown ? (
              <motion.div
                className="markdown-body"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <ReactMarkdown children={markdown} remarkPlugins={[remarkGfm]} />
              </motion.div>
            ) : (
              <div className="empty-state">
                <p>Upload a document to see the analysis here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
