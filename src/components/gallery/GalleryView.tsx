import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePermission } from '../../hooks/usePermission';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Tag,
  Clock,
  Trash2,
  Download,
  Eye,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Share2,
  UploadCloud,
  Check,
  AlertTriangle,
  ZoomIn,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { GalleryPhoto, GalleryCategory } from '../../types';

interface GalleryViewProps {
  onOpenReceipt?: (sale: any) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = () => {
  const {
    galleryPhotos,
    artists,
    clients,
    addGalleryPhoto,
    deleteGalleryPhoto,
    setActiveTab,
  } = useStudio();

  const { guard: guardPermission } = usePermission();
  // Filters state
  const [selectedCategory, setSelectedCategory] = useState<GalleryCategory>('all');
  const [selectedArtistId, setSelectedArtistId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyHealed, setOnlyHealed] = useState(false);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<GalleryPhoto | null>(null);

  // Upload Form state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<'tattoo' | 'piercing' | 'healed' | 'flash' | 'coverup'>('tattoo');
  const [uploadArtistId, setUploadArtistId] = useState(artists[0]?.id || '');
  const [uploadClientId, setUploadClientId] = useState('');
  const [uploadCustomClientName, setUploadCustomClientName] = useState('');
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadPlacement, setUploadPlacement] = useState('');
  const [uploadStyle, setUploadStyle] = useState('');
  const [uploadSessionHours, setUploadSessionHours] = useState<number | ''>('');
  const [uploadIsHealed, setUploadIsHealed] = useState(false);
  const [uploadTags, setUploadTags] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadImageUrl, setUploadImageUrl] = useState('');
  const [uploadImageFilePreview, setUploadImageFilePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUploadModalOpen(false);
        setLightboxPhoto(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered Photos List
  const filteredPhotos = useMemo(() => {
    return galleryPhotos.filter(photo => {
      // Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'healed') {
          if (!photo.isHealed && photo.category !== 'healed') return false;
        } else if (photo.category !== selectedCategory) {
          return false;
        }
      }

      // Only healed filter
      if (onlyHealed && !photo.isHealed && photo.category !== 'healed') {
        return false;
      }

      // Artist filter
      if (selectedArtistId !== 'all' && photo.artistId !== selectedArtistId) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = photo.title.toLowerCase().includes(query);
        const matchesArtist = photo.artistName?.toLowerCase().includes(query) || false;
        const matchesClient = photo.clientName?.toLowerCase().includes(query) || false;
        const matchesPlacement = photo.bodyPlacement?.toLowerCase().includes(query) || false;
        const matchesStyle = photo.style?.toLowerCase().includes(query) || false;
        const matchesTags = photo.tags?.some(t => t.toLowerCase().includes(query)) || false;
        const matchesDesc = photo.description?.toLowerCase().includes(query) || false;

        if (!matchesTitle && !matchesArtist && !matchesClient && !matchesPlacement && !matchesStyle && !matchesTags && !matchesDesc) {
          return false;
        }
      }

      return true;
    });
  }, [galleryPhotos, selectedCategory, selectedArtistId, searchQuery, onlyHealed]);

  // KPIs
  const kpis = useMemo(() => {
    const total = galleryPhotos.length;
    const tattoos = galleryPhotos.filter(p => p.category === 'tattoo').length;
    const piercings = galleryPhotos.filter(p => p.category === 'piercing').length;
    const healed = galleryPhotos.filter(p => p.isHealed || p.category === 'healed').length;
    const flashes = galleryPhotos.filter(p => p.category === 'flash').length;
    const coverups = galleryPhotos.filter(p => p.category === 'coverup').length;

    return { total, tattoos, piercings, healed, flashes, coverups };
  }, [galleryPhotos]);

  // Handle Image File Upload (converts to base64 for instant display & persistence)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP, SVG).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('El archivo no debe exceder los 8 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setUploadImageFilePreview(base64);
      setUploadImageUrl('');
    };
    reader.readAsDataURL(file);
  };

  const handleOpenUploadModal = (prefillCategory?: 'tattoo' | 'piercing' | 'healed' | 'flash' | 'coverup') => {
    if (!guardPermission('gallery.upload')) return;
    setUploadTitle('');
    setUploadCategory(prefillCategory || (selectedCategory !== 'all' ? (selectedCategory as any) : 'tattoo'));
    setUploadArtistId(artists[0]?.id || '');
    setUploadClientId('');
    setUploadCustomClientName('');
    setUploadDate(new Date().toISOString().split('T')[0]);
    setUploadPlacement('');
    setUploadStyle('');
    setUploadSessionHours('');
    setUploadIsHealed(prefillCategory === 'healed');
    setUploadTags('');
    setUploadDescription('');
    setUploadImageUrl('');
    setUploadImageFilePreview('');
    setIsUploadModalOpen(true);
  };

  const handleSavePhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardPermission('gallery.upload')) return;

    const finalImage = uploadImageFilePreview || uploadImageUrl.trim();
    if (!finalImage) {
      alert('Por favor sube una imagen desde tu dispositivo o ingresa un enlace URL de imagen.');
      return;
    }

    const artistObj = artists.find(a => a.id === uploadArtistId);
    const clientObj = clients.find(c => c.id === uploadClientId);
    const clientNameFinal = clientObj ? clientObj.name : uploadCustomClientName.trim() || undefined;

    const tagsArray = uploadTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    addGalleryPhoto({
      title: uploadTitle.trim() || 'Obra Artística Devolution Ink',
      imageUrl: finalImage,
      category: uploadCategory,
      artistId: uploadArtistId || undefined,
      artistName: artistObj?.name || 'Artista del Estudio',
      clientId: uploadClientId || undefined,
      clientName: clientNameFinal,
      date: uploadDate || new Date().toISOString().split('T')[0],
      bodyPlacement: uploadPlacement.trim() || undefined,
      style: uploadStyle.trim() || undefined,
      sessionHours: typeof uploadSessionHours === 'number' ? uploadSessionHours : undefined,
      isHealed: uploadIsHealed || uploadCategory === 'healed',
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      description: uploadDescription.trim() || undefined,
      featured: true,
    });

    setIsUploadModalOpen(false);
  };

  const handleDeletePhoto = (id: string, title: string) => {
    if (!guardPermission('gallery.delete')) return;
    if (confirm(`¿Estás seguro de eliminar la foto "${title}" de la galería?`)) {
      deleteGalleryPhoto(id);
      if (lightboxPhoto?.id === id) {
        setLightboxPhoto(null);
      }
    }
  };

  // Lightbox Navigation
  const handleNextPhoto = () => {
    if (!lightboxPhoto) return;
    const currentIndex = filteredPhotos.findIndex(p => p.id === lightboxPhoto.id);
    if (currentIndex < filteredPhotos.length - 1) {
      setLightboxPhoto(filteredPhotos[currentIndex + 1]);
    } else {
      setLightboxPhoto(filteredPhotos[0]);
    }
  };

  const handlePrevPhoto = () => {
    if (!lightboxPhoto) return;
    const currentIndex = filteredPhotos.findIndex(p => p.id === lightboxPhoto.id);
    if (currentIndex > 0) {
      setLightboxPhoto(filteredPhotos[currentIndex - 1]);
    } else {
      setLightboxPhoto(filteredPhotos[filteredPhotos.length - 1]);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'tattoo':
        return { label: 'Tatuaje', color: 'bg-[#FF3366]/20 text-[#FF3366] border-[#FF3366]/40' };
      case 'piercing':
        return { label: 'Piercing', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
      case 'healed':
        return { label: 'Cicatrizado', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'flash':
        return { label: 'Flash / Diseño', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
      case 'coverup':
        return { label: 'Cover Up', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
      default:
        return { label: 'Arte', color: 'bg-neutral-800 text-neutral-300 border-neutral-700' };
    }
  };

  return (
    <div className="w-full p-3 sm:p-5 lg:p-6 space-y-5 max-w-7xl mx-auto animate-fadeIn">
      {/* =========================================================================
          HEADER & ACCIÓN PRINCIPAL
          ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#24242A] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF3366]/15 border border-[#FF3366]/30 flex items-center justify-center text-[#FF3366] shadow-[0_0_12px_rgba(255,51,102,0.25)]">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white uppercase flex items-center gap-2">
                <span>Galería & Portafolio de Obras</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40 normal-case">
                  Devolution Ink · Quicentro
                </span>
              </h1>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Fototeca de tatuajes, perforaciones corporales, control de curación y diseños originales para clientes.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => handleOpenUploadModal()}
          className="self-start md:self-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF3366] to-[#E62557] hover:from-[#FF4D7D] hover:to-[#FF3366] text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(255,51,102,0.3)] transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Subir Nueva Foto</span>
        </button>
      </div>

      {/* =========================================================================
          TARJETAS DE MÉTRICAS / KPIS DE LA GALERÍA
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Obras */}
        <div
          onClick={() => { setSelectedCategory('all'); setOnlyHealed(false); }}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            selectedCategory === 'all' && !onlyHealed
              ? 'bg-[#1F1F26] border-[#FF3366]/60 shadow-[0_0_12px_rgba(255,51,102,0.15)]'
              : 'bg-[#141417] border-[#25252E] hover:border-neutral-700'
          }`}
        >
          <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Total Obras</span>
          <span className="text-xl font-black text-white font-mono mt-0.5 block">{kpis.total}</span>
          <span className="text-[10px] text-neutral-500 block mt-0.5">En portafolio</span>
        </div>

        {/* Tatuajes */}
        <div
          onClick={() => { setSelectedCategory('tattoo'); setOnlyHealed(false); }}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            selectedCategory === 'tattoo' && !onlyHealed
              ? 'bg-[#1F1F26] border-[#FF3366]/60 shadow-[0_0_12px_rgba(255,51,102,0.15)]'
              : 'bg-[#141417] border-[#25252E] hover:border-neutral-700'
          }`}
        >
          <span className="text-[10px] text-[#FF3366] uppercase font-semibold block">Tatuajes</span>
          <span className="text-xl font-black text-[#FF3366] font-mono mt-0.5 block">{kpis.tattoos}</span>
          <span className="text-[10px] text-neutral-500 block mt-0.5">Realizados</span>
        </div>

        {/* Piercings */}
        <div
          onClick={() => { setSelectedCategory('piercing'); setOnlyHealed(false); }}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            selectedCategory === 'piercing' && !onlyHealed
              ? 'bg-[#1F1F26] border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
              : 'bg-[#141417] border-[#25252E] hover:border-neutral-700'
          }`}
        >
          <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Piercings</span>
          <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">{kpis.piercings}</span>
          <span className="text-[10px] text-neutral-500 block mt-0.5">Titanio & Oro</span>
        </div>

        {/* Cicatrizados (Healed) */}
        <div
          onClick={() => { setSelectedCategory('healed'); setOnlyHealed(true); }}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            selectedCategory === 'healed' || onlyHealed
              ? 'bg-[#1F1F26] border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
              : 'bg-[#141417] border-[#25252E] hover:border-neutral-700'
          }`}
        >
          <span className="text-[10px] text-amber-300 uppercase font-semibold block">Cicatrizados</span>
          <span className="text-xl font-black text-amber-300 font-mono mt-0.5 block">{kpis.healed}</span>
          <span className="text-[10px] text-neutral-500 block mt-0.5">100% Curados</span>
        </div>

        {/* Flashes / Diseños */}
        <div
          onClick={() => { setSelectedCategory('flash'); setOnlyHealed(false); }}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            selectedCategory === 'flash'
              ? 'bg-[#1F1F26] border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
              : 'bg-[#141417] border-[#25252E] hover:border-neutral-700'
          }`}
        >
          <span className="text-[10px] text-cyan-300 uppercase font-semibold block">Flashes</span>
          <span className="text-xl font-black text-cyan-300 font-mono mt-0.5 block">{kpis.flashes}</span>
          <span className="text-[10px] text-neutral-500 block mt-0.5">Disponibles</span>
        </div>

        {/* Cover Ups */}
        <div
          onClick={() => { setSelectedCategory('coverup'); setOnlyHealed(false); }}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            selectedCategory === 'coverup'
              ? 'bg-[#1F1F26] border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.15)]'
              : 'bg-[#141417] border-[#25252E] hover:border-neutral-700'
          }`}
        >
          <span className="text-[10px] text-purple-300 uppercase font-semibold block">Cover Ups</span>
          <span className="text-xl font-black text-purple-300 font-mono mt-0.5 block">{kpis.coverups}</span>
          <span className="text-[10px] text-neutral-500 block mt-0.5">Coberturas</span>
        </div>
      </div>

      {/* =========================================================================
          BARRA DE BÚSQUEDA Y FILTRADO AVANZADO
          ========================================================================= */}
      <div className="p-3.5 bg-[#141417] border border-[#24242A] rounded-2xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por obra, artista, cliente, parte del cuerpo o técnica..."
            className="w-full pl-9 pr-3 py-2 bg-[#1A1A20] border border-[#2B2B36] rounded-xl text-white placeholder-neutral-500 focus:border-[#FF3366] text-xs outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Artist Filter */}
          <div className="flex items-center gap-1.5 bg-[#1A1A20] border border-[#2B2B36] px-3 py-1.5 rounded-xl">
            <User className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={selectedArtistId}
              onChange={e => setSelectedArtistId(e.target.value)}
              className="bg-transparent text-white text-xs outline-none cursor-pointer"
            >
              <option value="all">Todos los Artistas</option>
              {artists.map(art => (
                <option key={art.id} value={art.id}>
                  {art.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-[#1A1A20] p-1 rounded-xl border border-[#2B2B36] overflow-x-auto">
            <button
              onClick={() => { setSelectedCategory('all'); setOnlyHealed(false); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                selectedCategory === 'all' && !onlyHealed
                  ? 'bg-[#FF3366] text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => { setSelectedCategory('tattoo'); setOnlyHealed(false); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                selectedCategory === 'tattoo' && !onlyHealed
                  ? 'bg-[#FF3366] text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Tatuajes
            </button>
            <button
              onClick={() => { setSelectedCategory('piercing'); setOnlyHealed(false); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                selectedCategory === 'piercing' && !onlyHealed
                  ? 'bg-[#FF3366] text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Piercings
            </button>
            <button
              onClick={() => { setSelectedCategory('healed'); setOnlyHealed(true); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                selectedCategory === 'healed' || onlyHealed
                  ? 'bg-amber-500 text-black font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Cicatrizados
            </button>
            <button
              onClick={() => { setSelectedCategory('flash'); setOnlyHealed(false); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                selectedCategory === 'flash'
                  ? 'bg-cyan-500 text-black font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Flashes
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          GRILLA DE FOTOS / OBRAS
          ========================================================================= */}
      {filteredPhotos.length === 0 ? (
        <div className="p-12 text-center bg-[#141417] border border-[#24242A] rounded-2xl space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-neutral-800/80 flex items-center justify-center text-neutral-400">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="text-white font-bold text-sm">No se encontraron fotos con los filtros seleccionados</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            {searchQuery
              ? `No hay resultados para "${searchQuery}". Intenta limpiar la búsqueda o cambiar de categoría.`
              : 'Aún no se han registrado fotos en esta categoría. Puedes subir la primera obra del portafolio.'}
          </p>
          <button
            onClick={() => handleOpenUploadModal()}
            className="mt-2 px-4 py-2 rounded-xl bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Subir Primera Foto</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map(photo => {
            const badge = getCategoryBadge(photo.category);

            return (
              <div
                key={photo.id}
                className="group relative bg-[#17171C] border border-[#272730] hover:border-[#FF3366]/50 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
              >
                {/* Image Container */}
                <div
                  onClick={() => setLightboxPhoto(photo)}
                  className="relative aspect-4/3 w-full bg-[#101014] overflow-hidden cursor-pointer"
                >
                  <img
                    src={photo.imageUrl}
                    alt={photo.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-70 group-hover:opacity-90 transition-opacity" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 z-10">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border backdrop-blur-xs ${badge.color}`}>
                      {badge.label}
                    </span>

                    {photo.isHealed && (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/90 text-black shadow-xs flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Cicatrizado</span>
                      </span>
                    )}
                  </div>

                  {/* Bottom Hover Preview Pill */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-[10px] z-10">
                    <span className="font-mono text-neutral-300 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
                      {photo.date}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#FF3366] px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1">
                      <ZoomIn className="w-3 h-3" />
                      <span>Ver Obra</span>
                    </span>
                  </div>
                </div>

                {/* Info Content */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h3
                      onClick={() => setLightboxPhoto(photo)}
                      className="font-bold text-xs text-white hover:text-[#FF3366] transition-colors line-clamp-1 cursor-pointer"
                      title={photo.title}
                    >
                      {photo.title}
                    </h3>

                    {/* Artist & Placement */}
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1">
                      <span className="truncate text-neutral-300 font-medium">
                        {photo.artistName || 'Artista'}
                      </span>
                      {photo.bodyPlacement && (
                        <span className="text-[10px] text-[#FF3366] font-mono shrink-0 ml-1.5 truncate max-w-[110px]">
                          {photo.bodyPlacement}
                        </span>
                      )}
                    </div>

                    {/* Client Tag */}
                    {photo.clientName && (
                      <div className="text-[10px] text-neutral-400 mt-1 truncate">
                        Cliente: <strong className="text-neutral-200">{photo.clientName}</strong>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-2 border-t border-[#24242C] flex items-center justify-between">
                    <span className="text-[9px] text-neutral-500 truncate font-mono">
                      {photo.style || 'Devolution Ink'}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxPhoto(photo);
                        }}
                        className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Ver detalles completos"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto(photo.id, photo.title);
                        }}
                        className="p-1 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Eliminar foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: VISOR LIGHTBOX DE ALTA RESOLUCIÓN CON DETALLES
          ========================================================================= */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-5xl bg-[#141417] border border-[#2B2B36] rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row max-h-[92vh]">
            {/* Top Close Button (Mobile & Desktop) */}
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer border border-white/20"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left: Image Canvas with Navigation Arrows */}
            <div className="relative flex-1 bg-black flex items-center justify-center min-h-[320px] sm:min-h-[420px] lg:min-h-0 select-none overflow-hidden">
              <img
                src={lightboxPhoto.imageUrl}
                alt={lightboxPhoto.title}
                className="max-h-[85vh] max-w-full object-contain p-2"
              />

              {/* Prev Arrow */}
              {filteredPhotos.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevPhoto}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all cursor-pointer border border-white/20 shadow-lg"
                  title="Foto anterior"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Next Arrow */}
              {filteredPhotos.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextPhoto}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all cursor-pointer border border-white/20 shadow-lg"
                  title="Foto siguiente"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Right: Rich Metadata Panel */}
            <div className="w-full lg:w-80 xl:w-96 p-5 sm:p-6 bg-[#17171C] border-t lg:border-t-0 lg:border-l border-[#24242C] flex flex-col justify-between overflow-y-auto space-y-4">
              <div className="space-y-4">
                {/* Header Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {(() => {
                    const badge = getCategoryBadge(lightboxPhoto.category);
                    return (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                        {badge.label}
                      </span>
                    );
                  })()}

                  {lightboxPhoto.isHealed && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Cicatrización Completa</span>
                    </span>
                  )}
                </div>

                {/* Title */}
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                    {lightboxPhoto.title}
                  </h2>
                  {lightboxPhoto.bodyPlacement && (
                    <p className="text-xs text-[#FF3366] font-semibold mt-1">
                      Ubicación: {lightboxPhoto.bodyPlacement}
                    </p>
                  )}
                </div>

                {/* Technical Meta Grid */}
                <div className="p-3 bg-[#121215] rounded-xl border border-[#25252E] space-y-2 text-xs">
                  {/* Artist */}
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Artista Autor:</span>
                    <strong className="text-white">{lightboxPhoto.artistName || 'No especificado'}</strong>
                  </div>

                  {/* Client */}
                  {lightboxPhoto.clientName && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Cliente:</span>
                      <span className="text-emerald-400 font-semibold">{lightboxPhoto.clientName}</span>
                    </div>
                  )}

                  {/* Style */}
                  {lightboxPhoto.style && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Estilo / Técnica:</span>
                      <span className="text-neutral-200 font-mono text-[11px]">{lightboxPhoto.style}</span>
                    </div>
                  )}

                  {/* Date */}
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Fecha de Realización:</span>
                    <span className="text-neutral-300 font-mono text-[11px]">{lightboxPhoto.date}</span>
                  </div>

                  {/* Session Hours */}
                  {lightboxPhoto.sessionHours !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Duración Sesión:</span>
                      <span className="text-neutral-200 font-mono text-[11px]">{lightboxPhoto.sessionHours} horas</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {lightboxPhoto.description && (
                  <div>
                    <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block mb-1">
                      Descripción de la Obra:
                    </span>
                    <p className="text-xs text-neutral-300 leading-relaxed bg-[#121215] p-3 rounded-xl border border-[#25252E]">
                      {lightboxPhoto.description}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {lightboxPhoto.tags && lightboxPhoto.tags.length > 0 && (
                  <div>
                    <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block mb-1">
                      Etiquetas:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {lightboxPhoto.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-[#121215] text-neutral-300 border border-[#25252E]"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-[#24242C] space-y-2">
                <div className="flex items-center gap-2">
                  <a
                    href={lightboxPhoto.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={`devolution_ink_${lightboxPhoto.id}.jpg`}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#22222A] hover:bg-[#2C2C36] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Imagen</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(lightboxPhoto.id, lightboxPhoto.title)}
                    className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title="Eliminar del portafolio"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: SUBIR NUEVA FOTO / OBRA AL PORTAFOLIO
          ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 bg-[#141417] border-b border-[#25252E] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FF3366]/15 border border-[#FF3366]/30 flex items-center justify-center text-[#FF3366]">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    Subir Nueva Obra al Portafolio
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Registra una foto de tatuaje, piercing o diseño vinculada al estudio.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePhoto} className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs">
              {/* Image Preview & Upload Box */}
              <div className="p-4 bg-[#121215] border border-[#272730] rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                <div className="w-36 h-28 shrink-0 rounded-xl border border-[#2B2B36] bg-[#18181D] overflow-hidden flex items-center justify-center shadow-inner relative">
                  {uploadImageFilePreview || uploadImageUrl ? (
                    <img
                      src={uploadImageFilePreview || uploadImageUrl}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-2">
                      <ImageIcon className="w-7 h-7 text-neutral-600 mx-auto mb-1" />
                      <span className="text-[10px] text-neutral-500 block">Sin Imagen</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <div>
                    <label className="block font-semibold text-neutral-300 mb-1">
                      Cargar Archivo de Imagen desde tu Dispositivo *
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-xl bg-[#22222A] hover:bg-[#2C2C36] text-white font-semibold transition-all border border-[#2B2B38] flex items-center gap-1.5 cursor-pointer text-xs"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-[#FF3366]" />
                        <span>Seleccionar Foto</span>
                      </button>
                      {uploadImageFilePreview && (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Archivo cargado</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-neutral-400 block mb-0.5">O pegar enlace URL de imagen:</span>
                    <input
                      type="url"
                      value={uploadImageUrl}
                      onChange={e => {
                        setUploadImageUrl(e.target.value);
                        setUploadImageFilePreview('');
                      }}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full px-3 py-1.5 bg-[#17171C] border border-[#272730] rounded-xl text-white font-mono text-[11px] focus:border-[#FF3366] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Grid Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Título de la obra */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Título o Nombre de la Obra *
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                    placeholder="Ej: Cuervo Nórdico en Sombras, Daga Neotradicional, Doble Hélice Titanio..."
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366] outline-none"
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Categoría de la Obra *
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={e => setUploadCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366] outline-none font-semibold cursor-pointer"
                  >
                    <option value="tattoo">Tatuaje Artístico</option>
                    <option value="piercing">Body Piercing</option>
                    <option value="healed">Cicatrizado (Healed)</option>
                    <option value="flash">Flash / Diseño Original</option>
                    <option value="coverup">Cover Up / Cobertura</option>
                  </select>
                </div>

                {/* Artista Autor */}
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Artista Autor *
                  </label>
                  <select
                    value={uploadArtistId}
                    onChange={e => setUploadArtistId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366] outline-none font-semibold cursor-pointer"
                  >
                    {artists.map(art => (
                      <option key={art.id} value={art.id}>
                        {art.name} ({art.role || 'Artista'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cliente Vinculado */}
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Cliente del Directorio (Opcional)
                  </label>
                  <select
                    value={uploadClientId}
                    onChange={e => {
                      setUploadClientId(e.target.value);
                      if (e.target.value) setUploadCustomClientName('');
                    }}
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366] outline-none cursor-pointer"
                  >
                    <option value="">-- Seleccionar de clientes registrados --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* O escribir nombre de cliente libre */}
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    O Escribir Nombre del Cliente
                  </label>
                  <input
                    type="text"
                    value={uploadCustomClientName}
                    disabled={Boolean(uploadClientId)}
                    onChange={e => setUploadCustomClientName(e.target.value)}
                    placeholder="Ej: Sofía Cárdenas"
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366] outline-none disabled:opacity-50"
                  />
                </div>

                {/* Ubicación Anatómica */}
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Ubicación en el Cuerpo / Zona
                  </label>
                  <input
                    type="text"
                    value={uploadPlacement}
                    onChange={e => setUploadPlacement(e.target.value)}
                    placeholder="Ej: Antebrazo derecho, Muslo, Cartílago hélice..."
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366] outline-none"
                  />
                </div>

                {/* Estilo / Técnica */}
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Estilo / Técnica Artística
                  </label>
                  <input
                    type="text"
                    value={uploadStyle}
                    onChange={e => setUploadStyle(e.target.value)}
                    placeholder="Ej: Blackwork, Neotradicional, Micro-Realismo, Fineline..."
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366] outline-none"
                  />
                </div>

                {/* Fecha */}
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Fecha de la Sesión
                  </label>
                  <input
                    type="date"
                    value={uploadDate}
                    onChange={e => setUploadDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366] outline-none font-mono"
                  />
                </div>

                {/* Duración Sesión (Horas) */}
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Duración Estimada (Horas)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={uploadSessionHours}
                    onChange={e => setUploadSessionHours(e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="Ej: 4.5"
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366] outline-none font-mono"
                  />
                </div>

                {/* Cicatrizado Checkbox */}
                <div className="sm:col-span-2 p-3 bg-[#121215] rounded-xl border border-[#272730] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">¿La obra está completamente cicatrizada?</span>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">
                      Activa esta casilla si es una fotografía de control post-curación (30-60 días).
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={uploadIsHealed}
                    onChange={e => setUploadIsHealed(e.target.checked)}
                    className="w-4 h-4 rounded text-[#FF3366] accent-[#FF3366] cursor-pointer"
                  />
                </div>

                {/* Etiquetas (Tags) */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Etiquetas / Tags (separados por coma)
                  </label>
                  <input
                    type="text"
                    value={uploadTags}
                    onChange={e => setUploadTags(e.target.value)}
                    placeholder="Realismo, Animales, Blackwork, Manga, Titanio..."
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366] outline-none"
                  />
                </div>

                {/* Descripción */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Descripción / Notas Técnicas
                  </label>
                  <textarea
                    rows={2}
                    value={uploadDescription}
                    onChange={e => setUploadDescription(e.target.value)}
                    placeholder="Detalles sobre agujas empleadas, pigmentos, tipo de piel o recomendaciones de cuidado..."
                    className="w-full px-3 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366] outline-none"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-3 border-t border-[#25252E] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF3366] to-[#E62557] hover:from-[#FF4D7D] hover:to-[#FF3366] text-white font-bold shadow-[0_0_12px_rgba(255,51,102,0.3)] transition-all cursor-pointer"
                >
                  Guardar en Portafolio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

