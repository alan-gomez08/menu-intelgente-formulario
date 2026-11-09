import { useState, useCallback } from 'react';
import { FileText, FileSpreadsheet, File, Image, X, Loader2, CheckCircle2, UploadCloud } from 'lucide-react';

interface Props {
  label?: string;
  subLabel?: string;
  value?: string;
  fileName?: string;
  onChange: (fileUrl: string, fileName: string) => void;
  userId?: string;
  clientFolder?: string;
}

export default function FileUpload({
  label,
  subLabel,
  value,
  fileName,
  onChange,
  userId,
  clientFolder
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 't8nl8hwm';
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'portal_imagenes';

  const uploadFile = useCallback(async (file: File) => {
    if (!CLOUD_NAME) {
      alert('Falta configurar el servidor de almacenamiento.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const BASE_FOLDER = import.meta.env.VITE_CLOUDINARY_BASE_FOLDER || 'Menu Inteligente - Onboarding';
    const rawFolder = (clientFolder || userId || 'cliente_general').trim();
    const safeFolder = rawFolder
      .replace(/[<>:"/\\|?*#]+/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');

    formData.append('folder', `${BASE_FOLDER}/${safeFolder}`);
    formData.append('public_id', `menu_lista_precios_${Date.now()}`);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.secure_url) {
        onChange(data.secure_url, file.name);
      } else {
        console.error('Error Cloudinary:', data);
        alert(data.error?.message || 'Error al subir el archivo del menú. Intentá nuevamente.');
      }
    } catch (error) {
      console.error('Error subiendo archivo:', error);
      alert('Hubo un problema de conexión al subir el archivo.');
    } finally {
      setIsUploading(false);
    }
  }, [CLOUD_NAME, UPLOAD_PRESET, clientFolder, userId, onChange]);

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
      uploadFile(e.dataTransfer.files[0]);
    }
  }, [uploadFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const clearFile = () => {
    onChange('', '');
  };

  const getFileIcon = (name: string = '') => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText size={24} className="text-red-500 shrink-0" />;
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet size={24} className="text-emerald-600 shrink-0" />;
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) return <Image size={24} className="text-blue-500 shrink-0" />;
    return <File size={24} className="text-slate-600 shrink-0" />;
  };

  return (
    <div className="w-full flex flex-col gap-2">
      {(label || subLabel) && (
        <div className="flex flex-col">
          {label && <span className="text-xs sm:text-sm font-bold text-slate-700">{label}</span>}
          {subLabel && <span className="text-xs text-slate-500">{subLabel}</span>}
        </div>
      )}

      {value ? (
        <div className="w-full p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
              {getFileIcon(fileName)}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-900 truncate max-w-[260px] sm:max-w-md">
                  {fileName || 'Menú actual subido'}
                </span>
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              </div>
              <span className="text-xs text-slate-500">
                Archivo recibido · <strong className="text-slate-700 font-semibold">Nosotros nos encargamos de tipear todo</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition-all"
            >
              Ver archivo
            </a>
            <button
              type="button"
              onClick={clearFile}
              className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
              title="Eliminar archivo"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ) : (
        <label
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center w-full h-44 border border-dashed rounded-2xl transition-all duration-200 select-none
            ${isDragging ? 'border-slate-900 bg-slate-50 scale-[1.01]' : 'border-slate-300 bg-white hover:bg-slate-50/80 hover:border-slate-400'}
            ${isUploading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center gap-2.5 text-slate-600">
              <Loader2 size={26} className="animate-spin text-slate-700" />
              <span className="font-medium text-xs text-slate-600">Subiendo lista de precios...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2.5 p-4 text-center">
              <div className={`p-3 rounded-xl transition-colors duration-200 ${isDragging ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200/80'}`}>
                <UploadCloud size={24} strokeWidth={1.8} />
              </div>
              <div className="flex flex-col items-center">
                <p className="text-xs sm:text-sm font-bold text-slate-800 mb-0.5">
                  Subí tu archivo de menú o lista de precios
                </p>
                <p className="text-[11px] text-slate-500">
                  Acepta PDF, Excel, Word o fotos nítidas del menú físico
                </p>
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  ✨ Nosotros nos encargamos de tipear todo
                </span>
              </div>
            </div>
          )}
          <input
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,image/*"
            onChange={handleChange}
            disabled={isUploading}
          />
        </label>
      )}
    </div>
  );
}
