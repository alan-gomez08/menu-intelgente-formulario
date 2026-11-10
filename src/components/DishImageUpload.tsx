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
        <div className="relative w-full h-44 sm:h-52 rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 group shadow-xs">
          <img
            src={value}
            alt={dishName || 'Plato'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* OVERLAY SUTIL OSCURO PARA RESALTAR BOTONES */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/40 pointer-events-none" />

          {/* BADGE INFERIOR: ESTADO DE FOTO CARGADA */}
          <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md text-white text-xs font-bold flex items-center gap-2 shadow-md pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Foto de plato lista</span>
          </div>

          {/* ACCIONES SUPERIORES (CAMBIAR Y ELIMINAR FOTO) */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            {/* BOTÓN CAMBIAR FOTO */}
            <label
              className="px-3.5 py-1.5 rounded-xl bg-white/95 hover:bg-white text-slate-900 backdrop-blur-md text-xs font-bold flex items-center gap-1.5 shadow-md hover:scale-105 active:scale-95 cursor-pointer transition-all border border-slate-200/80"
              title="Cambiar fotografía"
            >
              <Camera size={13} className="text-slate-700" />
              <span>Cambiar foto</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleChange}
                disabled={isUploading}
              />
            </label>

            {/* BOTÓN QUITAR FOTO */}
            <button
              type="button"
              onClick={() => onChange('')}
              className="w-8 h-8 rounded-xl bg-white/95 hover:bg-rose-50 text-slate-500 hover:text-rose-600 backdrop-blur-md shadow-md flex items-center justify-center hover:scale-105 active:scale-95 cursor-pointer transition-all border border-slate-200/80"
              title="Quitar fotografía"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ) : (
        <label
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative w-full h-40 sm:h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2.5 transition-all select-none ${
            isDragging
              ? 'border-slate-900 bg-slate-100 scale-[1.005]'
              : 'border-slate-300 bg-slate-50/70 hover:bg-slate-100/90 hover:border-slate-400'
          } ${isUploading ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
          title="Subir foto para este plato"
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center gap-2.5 text-slate-700 p-4">
              <Loader2 size={26} className="animate-spin text-slate-900" />
              <span className="text-xs sm:text-sm font-bold text-slate-800">Subiendo fotografía a Cloudinary...</span>
              <span className="text-[11px] text-slate-500">Optimizando calidad y formato web</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-700 group-hover:scale-110 transition-transform">
                <Camera size={22} className="text-slate-800" />
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  Subir foto del plato
                </span>
                <span className="text-[11px] text-slate-500 max-w-[280px]">
                  Tocá para seleccionar de tu galería o cámara (PNG o JPG)
                </span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 mt-0.5">
                ✨ +40% de atracción visual para tus clientes
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

