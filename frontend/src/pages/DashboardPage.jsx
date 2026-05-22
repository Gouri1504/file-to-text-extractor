// pages/DashboardPage.jsx
// Authenticated home: dropzone on top, list of past uploads below. The
// upload flow goes "select -> POST /documents -> refresh list", with
// real upload progress driven by axios's onUploadProgress (no fake
// intervals like the original code had).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Dropzone from '../components/documents/Dropzone.jsx';
import DocumentList from '../components/documents/DocumentList.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import PageTransition from '../components/layout/PageTransition.jsx';
import useDocuments from '../hooks/useDocuments.js';
import { apiUploadDocument, apiDeleteDocument } from '../api/document.api.js';

export default function DashboardPage() {
  const { documents, loading, error, refresh } = useDocuments();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = async (file) => {
    setUploading(true);
    setProgress(0);
    const id = toast.loading('Uploading & extracting...');
    try {
      const data = await apiUploadDocument(file, setProgress);
      toast.success('Document processed', { id });
      await refresh();
      // Auto-navigate so the user immediately sees their result.
      if (data?.document?._id) navigate(`/documents/${data.document._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed', { id });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async (doc) => {
    if (!confirm(`Delete "${doc.filename}"?`)) return;
    try {
      await apiDeleteDocument(doc._id);
      toast.success('Deleted');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <PageTransition>
      <section className="container">
        <div className="page-header">
          <div>
            <h1>Your claim documents</h1>
            <p className="muted">Upload a PDF or image to extract structured data.</p>
          </div>
        </div>

        <Dropzone onFile={handleFile} disabled={uploading} />

        {uploading && (
          <div style={{ marginTop: 16 }}>
            <ProgressBar
              value={progress}
              label={progress < 100 ? `Uploading ${progress}%` : 'Analyzing with Gemini...'}
            />
          </div>
        )}

        <h2 className="section-title">History</h2>
        <DocumentList
          documents={documents}
          loading={loading}
          error={error}
          onDelete={handleDelete}
        />
      </section>
    </PageTransition>
  );
}
