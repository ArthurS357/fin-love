'use client';

import { useState, useEffect } from 'react';
import {
  User, Lock, Trash2, Save, LogOut, ShieldCheck,
  Trophy, Medal, Star, Sparkles, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  updateProfileNameAction,
  updatePasswordAction,
  deleteAccountAction,
  getBadgesAction,
  logoutUser
} from '@/app/actions';

interface ProfileTabProps {
  userName: string;
  userEmail: string;
}

export default function ProfileTab({ userName, userEmail }: ProfileTabProps) {
  const router = useRouter();
  const [badges, setBadges] = useState<any[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    getBadgesAction().then(data => {
      setBadges(data);
      setLoadingBadges(false);
    });
  }, []);

  // Lógica de Nível Baseada em Conquistas
  const userLevel = badges.length >= 5 ? 'Lendário' : badges.length >= 3 ? 'Expert' : 'Iniciante';

  // Cor do nível
  const levelColor = badges.length >= 5 ? 'text-yellow-400' : badges.length >= 3 ? 'text-purple-400' : 'text-blue-400';
  const levelBorder = badges.length >= 5 ? 'border-yellow-500/20 bg-yellow-500/10' : badges.length >= 3 ? 'border-purple-500/20 bg-purple-500/10' : 'border-blue-500/20 bg-blue-500/10';

  const handleUpdateName = async (formData: FormData) => {
    setSavingName(true);
    const res = await updateProfileNameAction(formData);
    setSavingName(false);
    if (res.error) toast.error(res.error);
    else toast.success('Nome atualizado!');
  };

  const handleUpdatePassword = async (formData: FormData) => {
    setSavingPass(true);
    const res = await updatePasswordAction(formData);
    setSavingPass(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success('Senha alterada! Faça login novamente.');
      router.push('/login');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("TEM CERTEZA? Essa ação é irreversível e apagará todos os seus dados.")) return;

    setIsDeleting(true);
    const res = await deleteAccountAction();
    if (res?.error) {
      setIsDeleting(false);
      toast.error(res.error);
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* HEADER DO PERFIL */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Meu Perfil</h2>
          <p className="text-gray-400 text-sm">Gerencie suas conquistas e segurança.</p>
        </div>

        {/* CARD DE NÍVEL (Usa Medal e Sparkles) */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg backdrop-blur-md ${levelBorder}`}>
          <div className="relative">
            <Medal size={18} className={levelColor} />
            <Sparkles size={10} className="absolute -top-1 -right-1 text-white animate-pulse" />
          </div>
          <span className={`text-xs font-bold uppercase tracking-wider ${levelColor}`}>
            Nível {userLevel}
          </span>
        </div>
      </div>

      {/* SEÇÃO 1: GAMIFICAÇÃO (Usa Trophy e Star) */}
      <div className="bg-gradient-to-br from-[#1f1630] to-[#2d2440] p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden group">
        {/* Efeito de fundo */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-all duration-700 group-hover:bg-yellow-500/20"></div>

        <div className="flex items-center gap-3 mb-6 relative z-10 border-b border-white/5 pb-4">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <Trophy className="text-yellow-400" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">Sala de Troféus</h2>
            <p className="text-xs text-gray-400">{badges.length} conquista(s) desbloqueada(s)</p>
          </div>
        </div>

        {loadingBadges ? (
          <div className="h-24 flex items-center justify-center text-gray-500 text-sm animate-pulse bg-white/5 rounded-2xl">
            <Loader2 className="animate-spin mr-2" size={18} /> Carregando...
          </div>
        ) : badges.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm bg-black/20 rounded-2xl border border-dashed border-white/10 flex flex-col items-center gap-3">
            <div className="p-3 bg-white/5 rounded-full">
              <Star className="text-gray-600" size={24} />
            </div>
            <div>
              <p className="font-medium text-gray-300">Sua estante está vazia.</p>
              <p className="text-xs mt-1 text-gray-500">Use o app para desbloquear prêmios!</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 relative z-10">
            {badges.map((badge) => (
              <div key={badge.id} className="bg-[#130b20]/80 p-4 rounded-2xl border border-white/5 flex flex-col items-center text-center gap-3 hover:bg-white/10 transition-all group/badge hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/10 duration-300">
                <div className="text-3xl drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover/badge:scale-110 transition-transform duration-300">
                  {badge.icon}
                </div>
                <div>
                  <p className="font-bold text-xs text-white group-hover/badge:text-yellow-300 transition-colors">{badge.name}</p>
                  <p className="text-[10px] text-gray-400 leading-tight mt-1 opacity-80">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SEÇÃO 2: DADOS PESSOAIS */}
      <div className="bg-[#1f1630] p-6 rounded-3xl border border-white/5 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <User className="text-purple-400" size={20} /> Dados Pessoais
        </h3>

        <form action={handleUpdateName} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Email</label>
            <input
              disabled
              value={userEmail}
              className="mt-1 w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nome de Exibição</label>
            <div className="flex gap-2 mt-1">
              <input
                name="name"
                defaultValue={userName}
                required
                className="w-full bg-[#130b20] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition text-sm"
              />
              <button
                type="submit"
                disabled={savingName}
                className="bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-xl transition disabled:opacity-50 active:scale-95 shadow-lg shadow-purple-500/20"
              >
                {savingName ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* SEÇÃO 3: SEGURANÇA */}
      <div className="bg-[#1f1630] p-6 rounded-3xl border border-white/5 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <ShieldCheck className="text-emerald-400" size={20} /> Segurança
        </h3>

        <form action={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Senha Atual</label>
            <input
              type="password"
              name="currentPassword"
              required
              placeholder="••••••"
              className="mt-1 w-full bg-[#130b20] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nova Senha</label>
            <input
              type="password"
              name="newPassword"
              required
              placeholder="••••••"
              className="mt-1 w-full bg-[#130b20] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={savingPass}
            className="w-full bg-white/5 hover:bg-white/10 text-white font-medium py-3 rounded-xl border border-white/5 transition flex justify-center gap-2 active:scale-[0.98]"
          >
            {savingPass ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />}
            Atualizar Senha
          </button>
        </form>
      </div>

      {/* SEÇÃO 4: AÇÕES FINAIS (Logout e Excluir) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => logoutUser()}
          className="w-full bg-[#1f1630] hover:bg-white/5 text-gray-300 font-bold py-4 rounded-3xl border border-white/5 transition flex items-center justify-center gap-2 group hover:text-white"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" /> Sair da Conta
        </button>

        <button
          onClick={handleDeleteAccount}
          disabled={isDeleting}
          className="w-full bg-red-500/5 hover:bg-red-500/10 text-red-400 font-bold py-4 rounded-3xl border border-red-500/20 transition flex items-center justify-center gap-2 active:scale-[0.98] hover:shadow-lg hover:shadow-red-500/10"
        >
          {isDeleting ? <Loader2 className="animate-spin" /> : <><Trash2 size={20} /> Excluir Conta</>}
        </button>
      </div>
    </div>
  );
}