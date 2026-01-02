'use client'

import { useState, useEffect } from 'react';
import { User, Mail, Shield, LogOut, Award, Star } from 'lucide-react';
import { logoutUser, updateSpendingLimitAction, updatePasswordAction, getBadgesAction, checkBadgesAction } from '@/app/actions';
import { toast } from 'sonner';

interface ProfileTabProps {
  userName: string;
  userEmail: string;
}

export default function ProfileTab({ userName, userEmail }: ProfileTabProps) {
  const [badges, setBadges] = useState<any[]>([]);
  const [loadingPass, setLoadingPass] = useState(false);

  // Carregar medalhas e verificar novas
  useEffect(() => {
    // Verifica se ganhou algo novo ao entrar no perfil
    checkBadgesAction().then((res) => {
      if (res?.success && res.newBadges) {
        res.newBadges.forEach(b => toast.success(`Nova Conquista: ${b.name}!`));
      }
      loadBadges();
    });
  }, []);

  const loadBadges = async () => {
    const data = await getBadgesAction();
    setBadges(data);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingPass(true);
    const formData = new FormData(e.target as HTMLFormElement);
    const res = await updatePasswordAction(formData);
    if (res.success) toast.success('Senha alterada!');
    else toast.error(res.error);
    setLoadingPass(false);
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Card do Usuário */}
      <div className="bg-[#1f1630] p-6 rounded-3xl border border-white/5 flex items-center gap-4 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-inner border-2 border-[#130b20]">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{userName}</h2>
          <p className="text-sm text-gray-400 flex items-center gap-1">
            <Mail size={12} /> {userEmail}
          </p>
        </div>
      </div>

      {/* Área de Conquistas (Gamificação) */}
      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Award size={16} className="text-yellow-500" /> Suas Conquistas
        </h3>
        
        <div className="bg-[#1f1630] p-5 rounded-3xl border border-white/5 min-h-[120px]">
          {badges.length === 0 ? (
            <div className="text-center py-6">
              <Star className="mx-auto text-gray-600 mb-2 opacity-50" size={32} />
              <p className="text-gray-500 text-sm">Use o app para desbloquear medalhas!</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
              {badges.map((badge) => (
                <div key={badge.id} className="flex flex-col items-center gap-1 group relative">
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-2xl border border-white/5 group-hover:border-yellow-500/50 group-hover:bg-yellow-500/10 transition-all cursor-help shadow-lg">
                    {badge.icon}
                  </div>
                  {/* Tooltip simples */}
                  <div className="absolute bottom-full mb-2 bg-black/90 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10 border border-white/10">
                    <p className="font-bold">{badge.name}</p>
                    <p className="text-[10px] text-gray-400">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alterar Senha */}
      <div className="bg-[#1f1630] p-6 rounded-3xl border border-white/5">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Shield size={18} className="text-purple-400" /> Segurança
        </h3>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <input
            name="currentPassword"
            type="password"
            placeholder="Senha atual"
            required
            className="w-full bg-[#130b20] text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-purple-500 outline-none transition text-sm"
          />
          <input
            name="newPassword"
            type="password"
            placeholder="Nova senha"
            required
            className="w-full bg-[#130b20] text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-purple-500 outline-none transition text-sm"
          />
          <button
            type="submit"
            disabled={loadingPass}
            className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition text-sm border border-white/5"
          >
            {loadingPass ? 'Alterando...' : 'Atualizar Senha'}
          </button>
        </form>
      </div>

      <button
        onClick={() => logoutUser()}
        className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 border border-red-500/20"
      >
        <LogOut size={18} /> Sair da Conta
      </button>
    </div>
  );
}