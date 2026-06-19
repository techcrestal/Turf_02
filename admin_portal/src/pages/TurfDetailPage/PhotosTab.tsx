import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminTurfs } from '../../api/adminTurfs';
import { uploadPhoto, deleteStoragePhoto } from '../../api/client';

interface Props { turfId: string; }

export default function PhotosTab({ turfId }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['admin-turf-photos', turfId],
    queryFn: () => adminTurfs.listPhotos(turfId),
  });

  const deleteMutation = useMutation({
    mutationFn: async (photo: { id: string; url: string }) => {
      await deleteStoragePhoto(photo.url);
      await adminTurfs.deletePhoto(turfId, photo.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-turf-photos', turfId] }),
  });

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadErr('');
    try {
      for (const file of Array.from(files)) {
        const url = await uploadPhoto(file, turfId);
        const isPrimary = photos.length === 0;
        await adminTurfs.addPhoto(turfId, url, isPrimary);
      }
      qc.invalidateQueries({ queryKey: ['admin-turf-photos', turfId] });
    } catch {
      setUploadErr('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-slate-700">Photos</h2>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : '+ Upload Photos'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleUpload(e.target.files)}
        />
      </div>

      {uploadErr && <p className="text-red-500 text-sm mb-4">{uploadErr}</p>}

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="aspect-video bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : photos.length === 0 ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-xl p-16 text-center cursor-pointer hover:border-indigo-400 transition-colors"
        >
          <p className="text-slate-400 text-sm">No photos yet — click to upload</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map(photo => (
            <div key={photo.id} className="relative group rounded-xl overflow-hidden bg-slate-100 aspect-video">
              <img src={photo.url} alt="" className="w-full h-full object-cover" />
              {photo.is_primary && (
                <span className="absolute top-2 left-2 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                  Primary
                </span>
              )}
              <button
                onClick={() => {
                  if (confirm('Delete this photo?')) deleteMutation.mutate(photo);
                }}
                className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm font-bold"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
