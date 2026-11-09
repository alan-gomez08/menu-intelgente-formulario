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
    <div className="shrink-0">
      {value ? (
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-200 bg-white group shadow-2xs">
          <img src={value} alt={dishName || 'Plato'} className="w-full h-full object-cover" />

          {/* BOTÓN MÓVIL VISIBLE SIEMPRE (SIN DEPENDER DE HOVER) */}
          <button
            type="button"
            onClick={() => onChange('')}
            className="sm:hidden absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-950/85 text-white flex items-center justify-center shadow-md active:scale-90 z-10"
            title="Quitar foto"
          >
            <X size={12} />
          </button>

          {/* OVERLAY DESKTOP CON HOVER */}
          <div className="hidden sm:flex absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center">
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1 rounded-full bg-white text-red-600 hover:scale-110 transition-transform cursor-pointer shadow-sm"
              title="Quitar foto"
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
          className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-dashed flex flex-col items-center justify-center gap-1 transition-all select-none ${
            isDragging
              ? 'border-slate-900 bg-slate-100'
              : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400'
          } ${isUploading ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
          title="Subir foto para este plato"
        >
          {isUploading ? (
            <Loader2 size={18} className="animate-spin text-slate-800" />
          ) : (
            <>
              <Camera size={18} className="text-slate-400 group-hover:text-slate-700" />
              <span className="text-[10px] font-bold text-slate-500">+ Foto</span>
            </>
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

