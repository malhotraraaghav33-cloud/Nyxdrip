import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useProducts } from '../../context/ProductContext';
import { useToast } from '../../context/ToastContext';

interface CategoryModalProps {
  category?: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  category,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { refreshProducts } = useProducts();
  const { showToast } = useToast();

  const isEditing = Boolean(category);

  const [name, setName] = useState(category?.name || '');
  const [slug, setSlug] = useState(category?.slug || '');
  const [description, setDescription] = useState(category?.description || '');
  const [imageUrl, setImageUrl] = useState(category?.image || category?.image_url || '');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing && (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Error', 'Category name is required.', 'error');
      return;
    }

    const cleanSlug = slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: cleanSlug,
        description: description.trim(),
        image_url: imageUrl.trim() || null,
      };

      if (isEditing && category.id) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', category.id);
        if (error) throw error;
        showToast('Category Updated', `${name} has been updated.`, 'success');
      } else {
        const { error } = await supabase
          .from('categories')
          .insert(payload);
        if (error) throw error;
        showToast('Category Created', `${name} is now available.`, 'success');
      }

      await refreshProducts();
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database error';
      if (msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('categories')) {
        showToast(
          'Product-Driven Categories',
          `In NYXDRIP, categories are assigned directly to individual pieces via the Category dropdown. You can assign "${name}" to any piece in the Products tab.`,
          'info'
        );
        onClose();
      } else {
        showToast('Error', msg, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#15151B] border border-[#2A2A32] shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#2A2A32]">
          <h3 className="font-display text-base font-bold text-white uppercase">
            {isEditing ? `Edit Category: ${category.name}` : 'Add New Category'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9A9AA3] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#9A9AA3] font-semibold mb-1.5">
              Category Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Earwear"
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
              placeholder="e.g. earwear"
              className="w-full bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white px-3.5 py-2.5 focus:outline-none font-mono-numbers"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#9A9AA3] font-semibold mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Category curation statement..."
              className="w-full bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white p-3 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#9A9AA3] font-semibold mb-1.5">
              Banner / Cover Image URL
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://... or /assets/..."
              className="w-full bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white px-3.5 py-2.5 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2A2A32]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#2A2A32] text-xs font-semibold text-[#9A9AA3] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7c4def] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition-colors"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
