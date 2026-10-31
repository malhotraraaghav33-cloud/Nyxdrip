import React, { useState, useRef } from 'react';
import { X, Upload, Trash2, Plus, AlertCircle, Image as ImageIcon, Check } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { uploadProductImage } from '../../lib/storage';
import { invalidateProductsCache } from '../../services/productService';
import { useProducts } from '../../context/ProductContext';
import { useToast } from '../../context/ToastContext';

interface ProductModalProps {
  product?: any | null; // If null, mode is 'add', else 'edit'
  categories: Array<{ name: string; slug: string }>;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  categories,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { refreshProducts } = useProducts();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(product);

  const [name, setName] = useState(product?.name || '');
  const [slug, setSlug] = useState(product?.slug || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState<string>(product?.price ? String(product.price) : '');
  const [originalPrice, setOriginalPrice] = useState<string>(product?.originalPrice ? String(product.originalPrice) : '');
  const [categoryName, setCategoryName] = useState(product?.category || categories[0]?.name || 'Pendants');
  const [style, setStyle] = useState(product?.style || 'Gothic');
  const [materials, setMaterials] = useState(product?.materials || '316L Surgical Stainless Steel');
  const [colors, setColors] = useState(Array.isArray(product?.colors) ? product.colors.join(', ') : (product?.color || 'Silver'));
  const [stock, setStock] = useState<string>(product?.stock !== undefined ? String(product.stock) : '20');
  const [badge, setBadge] = useState<string>(product?.badge || '');
  const [isActive, setIsActive] = useState<boolean>(product?.is_active !== undefined ? product.is_active : true);
  const [isNewArrival, setIsNewArrival] = useState<boolean>(product?.isNewArrival || product?.is_new_arrival || false);
  const [isBestSeller, setIsBestSeller] = useState<boolean>(product?.isBestSeller || product?.is_best_seller || false);

  // Images list: can be URLs or storage relative paths
  const [images, setImages] = useState<string[]>(Array.isArray(product?.images) ? product.images : []);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing && (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setUploadError(null);

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadProductImage(file, categoryName);
        if (res.error) {
          throw new Error(res.error);
        }
        if (res.publicUrl) {
          newUrls.push(res.publicUrl);
        } else if (res.path) {
          newUrls.push(res.path);
        }
      }

      setImages((prev) => [...prev, ...newUrls]);
      showToast('Image Uploaded', `${newUrls.length} image(s) uploaded to Supabase Storage.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Image upload failed';
      setUploadError(msg);
      showToast('Upload Error', msg, 'error');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSetPrimaryImage = (indexToPrimary: number) => {
    setImages((prev) => {
      const target = prev[indexToPrimary];
      const others = prev.filter((_, idx) => idx !== indexToPrimary);
      return [target, ...others];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Error', 'Product name is required.', 'error');
      return;
    }
    const cleanSlug = slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      showToast('Error', 'Please enter a valid price.', 'error');
      return;
    }

    const origPriceNum = originalPrice ? parseFloat(originalPrice) : null;
    const stockNum = parseInt(stock, 10) || 0;
    const colorsArray = colors
      .split(',')
      .map((c: string) => c.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        slug: cleanSlug,
        description: description.trim(),
        price: priceNum,
        original_price: origPriceNum,
        category_name: categoryName,
        style: style.trim() || 'Gothic',
        materials: materials.trim() || '316L Surgical Stainless Steel',
        colors: colorsArray.length > 0 ? colorsArray : ['Silver'],
        stock: stockNum,
        badge: badge ? badge : null,
        images: images,
        is_active: isActive,
        is_new_arrival: isNewArrival,
        is_best_seller: isBestSeller,
        updated_at: new Date().toISOString(),
      };

      if (isEditing) {
        // Update product
        const { error: updateError } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product.id);

        if (updateError) throw updateError;

        // Upsert inventory
        try {
          await supabase
            .from('inventory')
            .upsert({
              product_id: product.id,
              quantity: stockNum,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'product_id' });
        } catch {
          // Inventory safeguard
        }

        showToast('Product Updated', `${name} changes have been applied.`, 'success');
      } else {
        // Insert new product
        const { data: newProd, error: insertError } = await supabase
          .from('products')
          .insert(payload)
          .select()
          .single();

        if (insertError) throw insertError;

        // Insert inventory
        if (newProd?.id) {
          try {
            await supabase
              .from('inventory')
              .insert({
                product_id: newProd.id,
                quantity: stockNum,
              });
          } catch {
            // Inventory safeguard
          }
        }

        showToast('Product Added', `${name} is now in the database.`, 'success');
      }

      // Invalidate frontend cache and refresh storefront catalog immediately
      invalidateProductsCache();
      await refreshProducts();

      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database operation failed.';
      showToast('Save Failed', msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#15151B] border border-[#2A2A32] shadow-2xl my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#2A2A32] shrink-0">
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#8B5CF6] font-semibold">
              CATALOGUE ARCHIVE MANAGEMENT
            </span>
            <h2 className="font-display text-lg sm:text-xl font-bold uppercase text-white mt-0.5">
              {isEditing ? `Edit Piece: ${product.name}` : 'Add New Product'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#9A9AA3] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Row 1: Name and Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#9A9AA3] font-semibold mb-1.5">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Chrome Earbuds (C Type)"
                className="w-full bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white px-3.5 py-2.5 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#9A9AA3] font-semibold mb-1.5">
                URL Slug *
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
                placeholder="e.g. chrome-earbuds-c-type"
                className="w-full bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white px-3.5 py-2.5 focus:outline-none font-mono-numbers"
              />
            </div>
          </div>

          {/* Row 2: Price, Original Price, Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#9A9AA3] font-semibold mb-1.5">
                Price (₹ INR) *
              </label>
              <input
                type="number"
                required
                step="1"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="499"
                className="w-full bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white px-3.5 py-2.5 focus:outline-none font-mono-numbers"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#9A9AA3] font-semibold mb-1.5">
                Original Price (₹ Crossed out)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="999"
                className="w-full bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white px-3.5 py-2.5 focus:outline-none font-mono-numbers"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#9A9AA3] font-semibold mb-1.5">
                Stock Quantity *
              </label>
              <input
                type="number"
                required
                step="1"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="20"
                className="w-full bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white px-3.5 py-2.5 focus:outline-none font-mono-numbers"
              />
            </div>
          </div>

          {/* Row 3: Category, Style, Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#9A9AA3] font-semibold mb-1.5">
                Category
              </label>
              <select
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white px-3 py-2.5 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
                {!categories.some((c) => c.name.toLowerCase() === categoryName.toLowerCase()) && (
                  <option value={categoryName}>{categoryName}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#9A9AA3] font-semibold mb-1.5">
                Style Archetype
              </label>
              <input
                type="text"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="Gothic / Y2K / Industrial"
                className="w-full bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white px-3.5 py-2.5 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#9A9AA3] font-semibold mb-1.5">
                Badge
              </label>
              <select
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="w-full bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white px-3 py-2.5 focus:outline-none"
              >
                <option value="">None</option>
                <option value="NEW">NEW</option>
                <option value="BESTSELLER">BESTSELLER</option>
                <option value="LIMITED">LIMITED</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#9A9AA3] font-semibold mb-1.5">
              Product Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of hardware, dimensions, styling aesthetics..."
              className="w-full bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white p-3 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Materials & Colors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#9A9AA3] font-semibold mb-1.5">
                Materials
              </label>
              <input
                type="text"
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                placeholder="316L Surgical Stainless Steel"
                className="w-full bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white px-3.5 py-2.5 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#9A9AA3] font-semibold mb-1.5">
                Colors (comma-separated)
              </label>
              <input
                type="text"
                value={colors}
                onChange={(e) => setColors(e.target.value)}
                placeholder="Silver, Chrome, Matte Black"
                className="w-full bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white px-3.5 py-2.5 focus:outline-none"
              />
            </div>
          </div>

          {/* Device Image Upload directly to Supabase Storage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] uppercase tracking-wider text-[#9A9AA3] font-semibold">
                Product Images ({images.length})
              </label>
              <span className="text-[10px] text-[#00D9FF] font-mono-numbers">
                Manual uploads only (Supabase Storage: /products)
              </span>
            </div>

            {/* Images Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {images.map((imgUrl, idx) => (
                <div key={idx} className="relative group aspect-square bg-[#0A0A0D] border border-[#2A2A32] overflow-hidden">
                  <img
                    src={imgUrl}
                    alt={`Image ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {idx === 0 && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-[#8B5CF6] text-white text-[9px] font-bold uppercase tracking-wider">
                      PRIMARY
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(idx)}
                        className="p-1.5 bg-[#15151B] hover:bg-[#8B5CF6] text-white rounded text-[10px] transition-colors"
                        title="Set as Primary"
                      >
                        <Check size={12} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="p-1.5 bg-red-950/80 hover:bg-red-700 text-red-200 rounded transition-colors"
                      title="Remove image"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Upload Drop Button */}
              <button
                type="button"
                disabled={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square border border-dashed border-[#2A2A32] hover:border-[#8B5CF6] bg-[#0A0A0D]/60 hover:bg-[#15151B] transition-colors flex flex-col items-center justify-center text-center p-3 text-[#9A9AA3] hover:text-[#00D9FF]"
              >
                {uploadingImage ? (
                  <span className="w-5 h-5 border-2 border-[#8B5CF6]/30 border-t-[#8B5CF6] rounded-full animate-spin mb-2" />
                ) : (
                  <Upload size={18} className="mb-1.5" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {uploadingImage ? 'Uploading...' : 'Upload Image'}
                </span>
                <span className="text-[9px] text-[#9A9AA3]/60 mt-0.5">JPG, PNG, WEBP</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {uploadError && (
              <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                <span>{uploadError}</span>
              </p>
            )}
          </div>

          {/* Visibility & Badges Toggles */}
          <div className="pt-2 border-t border-[#2A2A32] grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-center gap-2.5 p-3 bg-[#0A0A0D] border border-[#2A2A32] cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-[#2A2A32] text-[#8B5CF6] focus:ring-0 bg-[#15151B]"
              />
              <span className="text-xs font-semibold text-[#F5F5F7]">
                Publish on Website
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-3 bg-[#0A0A0D] border border-[#2A2A32] cursor-pointer">
              <input
                type="checkbox"
                checked={isNewArrival}
                onChange={(e) => setIsNewArrival(e.target.checked)}
                className="w-4 h-4 rounded border-[#2A2A32] text-[#8B5CF6] focus:ring-0 bg-[#15151B]"
              />
              <span className="text-xs font-semibold text-[#F5F5F7]">
                Mark as New Drop
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-3 bg-[#0A0A0D] border border-[#2A2A32] cursor-pointer">
              <input
                type="checkbox"
                checked={isBestSeller}
                onChange={(e) => setIsBestSeller(e.target.checked)}
                className="w-4 h-4 rounded border-[#2A2A32] text-[#8B5CF6] focus:ring-0 bg-[#15151B]"
              />
              <span className="text-xs font-semibold text-[#F5F5F7]">
                Mark as Bestseller
              </span>
            </label>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-5 sm:p-6 border-t border-[#2A2A32] shrink-0 bg-[#15151B]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-[#2A2A32] hover:border-[#9A9AA3] text-[#9A9AA3] hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-[#8B5CF6] hover:bg-[#7c4def] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest transition-colors shadow-lg shadow-[#8B5CF6]/20 flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Syncing Database...</span>
              </>
            ) : (
              <span>{isEditing ? 'Save Changes' : 'Publish Product'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
