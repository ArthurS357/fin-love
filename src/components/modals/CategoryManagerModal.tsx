'use client'

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Tag } from 'lucide-react';
import { createCategoryAction, deleteCategoryAction, getCategoriesAction } from '@/app/actions';
import { toast } from 'sonner';

// Paleta de cores pré-definida (Tailwind)
const COLORS = [
  { name: 'Rosa', value: '#ec4899', bg: 'bg-pink-500' },
  { name: 'Roxo', value: '#8b5cf6', bg: 'bg-violet-500' },
  { name: 'Azul', value: '#3b82f6', bg: 'bg-blue-500' },
  { name: 'Verde', value: '#10b981', bg: 'bg-emerald-500' },
  { name: 'Amarelo', value: '#f59e0b', bg: 'bg-amber-500' },
  { name: 'Vermelho', value: '#ef4444', bg: 'bg-red-500' },
  { name: 'Cinza', value: '#6b7280', bg: 'bg-gray-500' },
];

interface Category {
  id: string;
  name: string;
  color: string;
}

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CategoryManagerModal({ isOpen, onClose }: CategoryManagerModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);

  // Carregar categorias ao abrir
  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    const res = await getCategoriesAction();
    if (res.success) setCategories(res.data as Category[]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('name', newName);
    formData.append('color', selectedColor.value); // Salvamos o HEX

    const res = await createCategoryAction(formData);
    if (res.success) {
      toast.success('Categoria criada!');
      setNewName('');
      loadCategories(); // Recarrega a lista
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta categoria?')) return;
    const res = await deleteCategoryAction(id);
    if (res.success) {
      toast.success('Removida!');
      loadCategories();
    } else {
      toast.error(res.error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1a1025] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#1f1630]">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Tag size={20} className="text-pink-500" /> Categorias
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition p-1 rounded-full hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Formulário de Criação */}
          <form onSubmit={handleCreate} className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/5">
            <div>
              <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Nome</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Jogos, Mercado..."
                className="w-full bg-[#130b20] text-white px-3 py-2 rounded-xl border border-gray-700 focus:border-pink-500 outline-none transition text-sm"
              />
            </div>
            
            <div>
              <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full ${color.bg} transition-transform hover:scale-110 flex items-center justify-center ring-2 ${selectedColor.value === color.value ? 'ring-white' : 'ring-transparent'}`}
                    title={color.name}
                  >
                    {selectedColor.value === color.value && <Check size={14} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-2 rounded-xl text-sm flex items-center justify-center gap-2 transition"
            >
              {loading ? '...' : <><Plus size={16} /> Criar Categoria</>}
            </button>
          </form>

          {/* Lista de Categorias */}
          <div>
            <h4 className="text-sm text-gray-400 font-bold mb-3 uppercase">Suas Categorias</h4>
            <div className="space-y-2">
              {categories.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-4">Nenhuma categoria criada.</p>
              ) : (
                categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-white font-medium">{cat.name}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="text-gray-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}