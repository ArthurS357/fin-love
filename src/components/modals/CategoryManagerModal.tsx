'use client'

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Tag, Check } from 'lucide-react';
import { getCategoriesAction, createCategoryAction, deleteCategoryAction } from '@/app/actions';
import { toast } from 'sonner';

// Lista otimizada de cores únicas para etiquetas
const PREDEFINED_COLORS = [
  "#EF4444", // Red
  "#F97316", // Orange
  "#F59E0B", // Amber
  "#84CC16", // Lime
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#D946EF", // Fuchsia
  "#EC4899", // Pink (Único)
  "#F43F5E", // Rose
  "#64748B", // Slate
  "#71717A", // Zinc
  "#78716C", // Stone
];

export default function CategoryManagerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [selectedColor, setSelectedColor] = useState(PREDEFINED_COLORS[0]);
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
    formData.append('color', selectedColor);
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
      <div className="bg-[#1a1025] w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

        <div className="flex justify-between items-center p-5 border-b border-white/5 bg-[#1f1630]">
          <h3 className="font-bold text-white">Gerenciar Categorias</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 border-b border-white/5 space-y-4">
          <form onSubmit={handleCreate} className="space-y-5">
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
                  className="bg-pink-600 hover:bg-pink-500 text-white p-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-500/20"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            {/* Seletor de Cores Otimizado (Grid) */}
            <div>
              <label className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-1 mb-3 block">Cor da Etiqueta</label>
              <div className="grid grid-cols-5 gap-3 sm:grid-cols-8">
                {PREDEFINED_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm ${
                      selectedColor === color 
                        ? 'ring-2 ring-white scale-110' 
                        : 'hover:scale-110 hover:opacity-90 opacity-70'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Selecionar cor ${color}`}
                  >
                    {selectedColor === color && (
                      <div className="w-2 h-2 bg-white rounded-full shadow-sm" />
                    )}
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
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 shadow-sm ring-1 ring-white/10"
                      style={{ backgroundColor: cat.color || '#374151' }}
                    >
                      <Tag size={14} />
                    </div>
                    <span className="text-gray-200 text-sm font-medium">{cat.name}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                    title="Excluir Categoria"
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