import { useState, useCallback } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';

interface Props {
  value?: string;
  onChange: (url: string) => void;
  clientFolder?: string;
  dishName?: string;
}

export default function DishImageUpload({ value, onChange, clientFolder, dishName }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 't8nl8hwm';
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'Menu inteligente - Web app';

  const uploadFile = useCallback(
    async (file: File) => {
      if (!CLOUD_NAME) {
        alert('Falta configurar Cloudinary.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Por favor, seleccioná un archivo de imagen (PNG o JPG).');
        return;
      }

      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);

      const BASE_FOLDER = import.meta.env.VITE_CLOUDINARY_BASE_FOLDER || 'Menu inteligente';
      const safeFolder = (clientFolder || 'local_gastronomico')
        .replace(/[<>:"/\\|?*#]+/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_');

      formData.append('folder', `${BASE_FOLDER}/${safeFolder}/platos`);

      const safeDishSlug = (dishName || 'plato')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .slice(0, 20);
      formData.append('public_id', `${safeDishSlug}_${Date.now()}`);

      try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (data.secure_url) {
          onChange(data.secure_url);
        } else {
          console.error('Error Cloudinary:', data);
          alert(data.error?.message || 'Error al subir la imagen del plato.');
        }
      } catch (err) {
        console.error('Error subiendo imagen:', err);
        alert('Hubo un problema de conexión al subir la imagen.');
      } finally {
        setIsUploading(false);
      }
    },
    [CLOUD_NAME, UPLOAD_PRESET, clientFolder, dishName, onChange]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
    else if (e.type === 'dragleave') setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        uploadFile(e.dataTransfer.files[0]);
      }
    },
    [uploadFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      {value ? (
        <div className="relative w-full h-36 sm:h-44 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group">
          <img
            src={value}
            alt={dishName || 'Plato'}
            className="w-full h-full object-cover"
          />

          {/* ACCIONES SUPERIORES (CAMBIAR Y ELIMINAR FOTO) */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-2 z-10">
            <label
              className="px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors border border-slate-200/80"
              title="Cambiar fotografía"
            >
              <Camera size={13} className="text-slate-600" />
              <span>Cambiar foto</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleChange}
                disabled={isUploading}
              />
            </label>

            <button
              type="button"
              onClick={() => onChange('')}
              className="w-7 h-7 rounded-lg bg-white/90 hover:bg-rose-50 text-slate-600 hover:text-rose-600 shadow-sm flex items-center justify-center cursor-pointer transition-colors border border-slate-200/80"
              title="Quitar fotografía"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <label
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative w-full h-32 sm:h-36 rounded-xl border border-dashed flex flex-col items-center justify-center gap-2 transition-all select-none ${
            isDragging
              ? 'border-slate-900 bg-slate-100'
              : 'border-slate-300 bg-slate-50/60 hover:bg-slate-100/70 hover:border-slate-400'
          } ${isUploading ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
          title="Subir foto para este plato"
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center gap-2 text-slate-600 p-4">
              <Loader2 size={22} className="animate-spin text-slate-800" />
              <span className="text-xs font-semibold text-slate-800">Subiendo imagen...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1.5 p-3 text-center">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-600">
                <Camera size={18} />
              </div>
              <span className="text-xs font-bold text-slate-800">
                Subir foto del plato
              </span>
              <span className="text-[11px] text-slate-400">
                Tocá para seleccionar de tu galería o cámara (opcional)
              </span>
            </div>
          )}
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleChange}
            disabled={isUploading}
          />
        </label>
      )}
    </div>
  );
}

