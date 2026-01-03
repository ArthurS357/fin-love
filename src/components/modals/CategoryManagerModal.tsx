'use client'

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Tag, Check } from 'lucide-react';
import { getCategoriesAction, createCategoryAction, deleteCategoryAction } from '@/app/actions';
import { toast } from 'sonner';

const COLORS = [
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#EC4899', // Rose
];

export default function CategoryManagerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) loadCategories();
  }, [isOpen]);

  const loadCategories = async () => {
    const res = await getCategoriesAction();
    if (res.success) setCategories(res.data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('name', newCategory);
    formData.append('color', selectedColor); // Envia a cor escolhida
    formData.append('icon', 'Tag');

    const res = await createCategoryAction(formData);

    if (res.success) {
      toast.success('Categoria criada!');
      setNewCategory('');
      loadCategories();
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza? Isso não apaga as transações, apenas a etiqueta.')) return;

    const res = await deleteCategoryAction(id);
    if (res.success) {
      toast.success('Categoria removida.');
      loadCategories();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#1a1025] w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">

        <div className="flex justify-between items-center p-5 border-b border-white/5 bg-[#1f1630]">
          <h3 className="font-bold text-white">Gerenciar Categorias</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 border-b border-white/5 space-y-4">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-1 mb-1.5 block">Nome da Categoria</label>
              <div className="flex gap-2">
                <input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Ex: Assinaturas"
                  className="flex-1 bg-[#130b20] text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-pink-500 outline-none transition text-sm"
                  maxLength={20}
                />
                <button
                  type="submit"
                  disabled={loading || !newCategory}
                  className="bg-pink-600 hover:bg-pink-500 text-white p-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            {/* Seletor de Cores */}
            <div>
              <label className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-1 mb-2 block">Cor da Etiqueta</label>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center transition-transform hover:scale-110 ${selectedColor === color ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
                    style={{ backgroundColor: color }}
                  >
                    {selectedColor === color && <Check size={14} className="text-white drop-shadow-md" />}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">Nenhuma categoria personalizada.</div>
          ) : (
            <div className="space-y-1">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl group transition">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 shadow-sm"
                      style={{ backgroundColor: cat.color || '#374151' }}
                    >
                      <Tag size={14} />
                    </div>
                    <span className="text-gray-200 text-sm font-medium">{cat.name}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}