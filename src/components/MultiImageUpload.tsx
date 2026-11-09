import { useState, useCallback } from 'react';
import { X, ImagePlus, Loader2 } from 'lucide-react';

interface Props {
  label?: string;
  subLabel?: string;
  values: string[];
  onChange: (urls: string[]) => void;
  userId?: string;
  clientFolder?: string;
}

export default function MultiImageUpload({
  label,
  subLabel,
  values,
  onChange,
  userId,
  clientFolder
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 't8nl8hwm';
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'portal_imagenes';

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!CLOUD_NAME) {
      alert('Falta configurar Cloudinary.');
      return;
    }

    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: imageFiles.length });

    const BASE_FOLDER = import.meta.env.VITE_CLOUDINARY_BASE_FOLDER || 'Menu Inteligente - Onboarding';
    const rawFolder = (clientFolder || userId || 'cliente_general').trim();
    const safeFolder = rawFolder
      .replace(/[<>:"/\\|?*#]+/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');

    const newUrls: string[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      setUploadProgress({ current: i + 1, total: imageFiles.length });
      const file = imageFiles[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', `${BASE_FOLDER}/${safeFolder}/platos`);
      formData.append('public_id', `plato_${Date.now()}_${i}`);

      try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (data.secure_url) {
          newUrls.push(data.secure_url);
        }
      } catch (err) {
        console.error('Error subiendo foto:', err);
      }
    }

    onChange([...values, ...newUrls]);
    setIsUploading(false);
    setUploadProgress(null);
  }, [CLOUD_NAME, UPLOAD_PRESET, clientFolder, onChange, userId, values]);

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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(Array.from(e.dataTransfer.files));
    }
  }, [uploadFiles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files));
    }
  };

  const removePhoto = (indexToRemove: number) => {
    onChange(values.filter((_, i) => i !== indexToRemove));
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {(label || subLabel) && (
        <div className="flex flex-col">
          {label && (
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-slate-700">{label}</span>
              {values.length > 0 && (
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {values.length} {values.length === 1 ? 'foto subida' : 'fotos subidas'}
                </span>
              )}
            </div>
          )}
          {subLabel && <span className="text-xs text-slate-500">{subLabel}</span>}
        </div>
      )}

      {/* Grid de miniaturas cargadas */}
      {values.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
          {values.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white shadow-2xs"
            >
              <img src={url} alt={`Plato ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-950/70 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
                title="Eliminar foto"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropzone para agregar más fotos */}
      <label
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center w-full py-6 px-4 border border-dashed rounded-2xl transition-all duration-200 select-none
          ${isDragging ? 'border-slate-900 bg-slate-50 scale-[1.005]' : 'border-slate-300 bg-white hover:bg-slate-50/80 hover:border-slate-400'}
          ${isUploading ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center justify-center gap-2 text-slate-600">
            <Loader2 size={24} className="animate-spin text-slate-800" />
            <span className="font-semibold text-xs text-slate-700">
              Subiendo fotos ({uploadProgress?.current || 0} de {uploadProgress?.total || 0})...
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
              <ImagePlus size={18} strokeWidth={1.8} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                {values.length > 0 ? '+ Agregar más fotos de platos' : 'Subir fotos de tus platos (Opcional)'}
              </span>
              <span className="text-[11px] text-slate-400">
                Seleccioná una o varias fotos a la vez (PNG, JPG)
              </span>
            </div>
          </div>
        )}
        <input
          type="file"
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleChange}
          disabled={isUploading}
        />
      </label>
    </div>
  );
}
