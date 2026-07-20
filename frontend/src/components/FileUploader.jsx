import React, { useContext, useState, useRef } from 'react';
import { ApiContext } from '../context/ApiContext';
import { Upload, File, CheckCircle2, AlertCircle } from 'lucide-react';

const FileUploader = () => {
  const { uploadFile, isUploading } = useContext(ApiContext);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFile = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = ['pdf', 'docx', 'csv', 'sqlite', 'db', 'png', 'jpg', 'jpeg'];
    if (!allowed.includes(ext)) {
      setStatus({ 
        type: 'error', 
        message: `.${ext} not supported. Use PDF, DOCX, CSV, SQLite, or Image.` 
      });
      return false;
    }
    return true;
  };

  const processUpload = async (file) => {
    setStatus({ type: '', message: '' });
    if (!validateFile(file)) return;

    setStatus({ type: 'uploading', message: 'Uploading source data...' });
    const result = await uploadFile(file);
    
    if (result.success) {
      setStatus({ 
        type: 'success', 
        message: `"${file.name}" indexed successfully.` 
      });
      setTimeout(() => setStatus({ type: '', message: '' }), 4000);
    } else {
      setStatus({ 
        type: 'error', 
        message: result.error || 'Failed to process file.' 
      });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processUpload(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        aria-label="Upload source data file by drag and drop or clicking to browse"
        className={`w-full py-6 px-4 rounded-xl border border-dashed text-center cursor-pointer transition-all duration-200 btn-tactile focus-ring ${
          dragActive
            ? 'border-electricIndigo bg-indigo-500/10 dark:bg-indigo-500/5'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/20 dark:bg-slate-900/10'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          accept=".pdf,.docx,.csv,.sqlite,.db,.png,.jpg,.jpeg"
          disabled={isUploading}
        />
        
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors">
            <Upload size={18} className={isUploading ? 'animate-bounce text-electricIndigo' : ''} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Drag & Drop file
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              PDF, DOCX, CSV, SQLite, or Image
            </p>
          </div>
        </div>
      </button>

      {status.message && (
        <div className={`mt-3 p-3 rounded-lg border text-xs flex items-start space-x-2 ${
          status.type === 'error' 
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400' 
            : status.type === 'success'
              ? 'bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400'
              : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
        }`}>
          <div className="mt-0.5 shrink-0">
            {status.type === 'error' && <AlertCircle size={14} />}
            {status.type === 'success' && <CheckCircle2 size={14} />}
            {status.type === 'uploading' && <File size={14} className="animate-pulse" />}
          </div>
          <p className="font-medium leading-normal truncate">{status.message}</p>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
