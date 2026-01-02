'use client'

import React, { useState } from 'react';
import { User, Lock, Save, LogOut } from 'lucide-react';
import { updatePasswordAction, logoutUser } from '@/app/actions';
import { toast } from 'sonner';

interface ProfileTabProps {
  userName: string;
  userEmail: string;
}

export default function ProfileTab({ userName, userEmail }: ProfileTabProps) {
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const res = await updatePasswordAction(formData);
    
    if (res.success) {
      toast.success(res.message);
      (e.target as HTMLFormElement).reset();
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-0">
      
      {/* Header do Perfil */}
      <div className="flex flex-col items-center text-center space-y-2 py-6">
        <div className="w-24 h-24 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.3)] mb-4">
          <span className="text-4xl font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
        </div>
        <h2 className="text-2xl font-bold text-white">{userName}</h2>
        <p className="text-gray-400">{userEmail}</p>
      </div>

      {/* Alterar Senha */}
      <div className="bg-[#1f1630] p-6 md:p-8 rounded-3xl border border-white/5 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Lock className="text-purple-400" size={20} />
          Segurança
        </h3>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Senha Atual</label>
            <input 
              name="currentPassword" 
              type="password" 
              required 
              className="w-full bg-[#130b20] text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-purple-500 outline-none transition"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Nova Senha</label>
            <input 
              name="newPassword" 
              type="password" 
              required 
              className="w-full bg-[#130b20] text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-purple-500 outline-none transition"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 active:scale-[0.98]"
          >
            {loading ? 'Atualizando...' : 'Atualizar Senha'} <Save size={18} />
          </button>
        </form>
      </div>

      <button 
        onClick={() => logoutUser()}
        className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 p-4 rounded-xl transition border border-transparent hover:border-red-500/20"
      >
        <LogOut size={20} /> Sair da Conta
      </button>
    </div>
  );
}