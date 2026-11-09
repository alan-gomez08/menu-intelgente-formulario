import { useState, useCallback } from 'react';
import { X, ImagePlus, Loader2, Smartphone } from 'lucide-react';

interface Props {
  label?: string;
  subLabel?: string;
  placeholderTitle?: string;
  placeholderSubtitle?: string;
  onChange: (fileUrl: string) => void;
  value?: string;
  userId?: string;
  clientFolder?: string;
  imageType?: string;
  aspectRatio?: 'vertical' | 'standard';
}

export default function ImageUpload({
  label,
  subLabel,
  placeholderTitle = 'Cargar fotografía',
  placeholderSubtitle = 'Haz clic o arrastra un archivo aquí (PNG o JPG)',
  onChange,
  value,
  userId,
  clientFolder,
  imageType,
  aspectRatio = 'standard'
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 't8nl8hwm';
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'Menu inteligente - Web app';

  const uploadToCloudinary = useCallback(async (file: File) => {
    if (!CLOUD_NAME) {
      alert('Falta configurar Cloudinary.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const BASE_FOLDER = import.meta.env.VITE_CLOUDINARY_BASE_FOLDER || 'Menu inteligente';
    const rawFolder = (clientFolder || userId || 'cliente_general').trim();
    const safeFolder = rawFolder
      .replace(/[<>:"/\\|?*#]+/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');

    formData.append('folder', `${BASE_FOLDER}/${safeFolder}`);

    if (imageType) {
      const safeType = imageType.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      formData.append('public_id', `${safeType}_${Date.now()}`);
    }

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.secure_url) {
        onChange(data.secure_url);
      } else {
        console.error('Error respuesta Cloudinary:', data);
        alert(data.error?.message || 'Error al subir la imagen. Por favor, intentá nuevamente.');
      }
    } catch (error) {
      console.error('Error subiendo a Cloudinary:', error);
      alert('Hubo un problema de conexión al subir la imagen.');
    } finally {
      setIsUploading(false);
    }
  }, [CLOUD_NAME, UPLOAD_PRESET, clientFolder, imageType, onChange, userId]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
    else if (e.type === 'dragleave') setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadToCloudinary(e.dataTransfer.files[0]);
    }
  }, [uploadToCloudinary]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      uploadToCloudinary(e.target.files[0]);
    }
  };

  const clearImage = () => onChange('');

  const heightClass = aspectRatio === 'vertical' ? 'h-64 sm:h-72 max-w-sm mx-auto' : 'h-48 sm:h-52';

  return (
    <div className="w-full flex flex-col gap-2">
      {(label || subLabel) && (
        <div className="flex flex-col">
          {label && <span className="text-xs sm:text-sm font-bold text-slate-700">{label}</span>}
          {subLabel && <span className="text-xs text-slate-500">{subLabel}</span>}
        </div>
      )}

      {value ? (
        <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-200 bg-white group flex items-center justify-center p-2 shadow-xs`}>
          <img
            src={value}
            alt="Preview"
            className={`w-full h-full ${aspectRatio === 'vertical' ? 'object-cover rounded-xl' : 'object-contain'}`}
          />
          {/* BOTÓN DE CAMBIAR IMAGEN (VISIBLE EN MOBILE, CON HOVER EN DESKTOP) */}
          <div className="absolute inset-0 bg-slate-950/40 sm:bg-slate-950/40 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-2xs">
            <button
              type="button"
              onClick={clearImage}
              className="bg-white hover:bg-red-50 text-red-600 px-4 py-2.5 rounded-xl border border-slate-200 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            >
              <X size={15} />
              <span>Cambiar imagen</span>
            </button>
          </div>
        </div>
      ) : (
        <label
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center w-full ${heightClass} border border-dashed rounded-2xl transition-all duration-200 select-none
            ${isDragging ? 'border-slate-900 bg-slate-50 scale-[1.01]' : 'border-slate-300 bg-white hover:bg-slate-50/80 hover:border-slate-400'}
            ${isUploading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center gap-2.5 text-slate-600">
              <Loader2 size={26} className="animate-spin text-slate-700" />
              <span className="font-medium text-xs text-slate-600">Subiendo imagen con calidad original...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2.5 p-4 text-center">
              <div className={`p-3 rounded-xl transition-colors duration-200 ${isDragging ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200/80'}`}>
                {aspectRatio === 'vertical' ? <Smartphone size={22} strokeWidth={1.8} /> : <ImagePlus size={22} strokeWidth={1.8} />}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-800 mb-0.5">{placeholderTitle}</p>
                <p className="text-[11px] text-slate-500">{placeholderSubtitle}</p>
              </div>
            </div>
          )}
          <input type="file" className="hidden" accept="image/png,image/jpeg,image/webp,image/jpg" onChange={handleChange} disabled={isUploading} />
        </label>
      )}
    </div>
  );
}
