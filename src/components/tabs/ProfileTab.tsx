'use client';

import { useState, useEffect } from 'react';
import {
  User, Lock, Trash2, Save, LogOut, ShieldCheck,
  Trophy, Medal, Star, Sparkles, Loader2, Mail, Key
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

  // Lógica de Nível
  const userLevel = badges.length >= 5 ? 'Lendário' : badges.length >= 3 ? 'Expert' : 'Iniciante';

  // Cores dinâmicas para o nível
  const getLevelStyles = () => {
    if (badges.length >= 5) return { color: 'text-yellow-400', bg: 'bg-yellow-500', border: 'border-yellow-500/50', shadow: 'shadow-yellow-500/20' };
    if (badges.length >= 3) return { color: 'text-purple-400', bg: 'bg-purple-500', border: 'border-purple-500/50', shadow: 'shadow-purple-500/20' };
    return { color: 'text-blue-400', bg: 'bg-blue-500', border: 'border-blue-500/50', shadow: 'shadow-blue-500/20' };
  };

  const levelStyle = getLevelStyles();

  const handleUpdateName = async (formData: FormData) => {
    setSavingName(true);
    const res = await updateProfileNameAction(formData);
    setSavingName(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Nome atualizado!');
      // --- CORREÇÃO IMPORTANTE: Força a atualização da interface ---
      router.refresh();
    }
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

  // Avatar baseado nas iniciais
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-6 pb-24 md:pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* --- HEADER COM STATUS --- */}
      <div className="bg-[#1f1630] rounded-3xl p-6 border border-white/5 relative overflow-hidden shadow-xl">
        <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none ${levelStyle.bg}`} />

        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          {/* Avatar Grande */}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold border-2 ${levelStyle.border} bg-white/5 text-white shadow-[0_0_30px_rgba(0,0,0,0.3)]`}>
            {initials}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div>
              <h2 className="text-2xl font-bold text-white">{userName}</h2>
              <p className="text-gray-400 text-sm flex items-center justify-center sm:justify-start gap-1.5">
                <Mail size={14} /> {userEmail}
              </p>
            </div>

            {/* Badge de Nível */}
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-black/20 backdrop-blur-md ${levelStyle.border} ${levelStyle.shadow} shadow-lg`}>
              <Medal size={14} className={levelStyle.color} />
              <span className={`text-xs font-bold uppercase tracking-wider ${levelStyle.color}`}>
                Nível {userLevel}
              </span>
              <Sparkles size={10} className="text-white animate-pulse" />
            </div>
          </div>

          {/* Botão Sair Rápido */}
          <button
            onClick={() => logoutUser()}
            className="p-3 rounded-xl bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition border border-white/5 hover:border-red-500/20 group"
            title="Sair"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* --- COLUNA 1: CONQUISTAS (GAMIFICAÇÃO) --- */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#1f1630] p-6 rounded-3xl border border-white/5 shadow-lg h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
              <div className="p-2 bg-yellow-500/10 rounded-xl">
                <Trophy className="text-yellow-400" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white">Conquistas</h3>
                <p className="text-xs text-gray-400">{badges.length} desbloqueadas</p>
              </div>
            </div>

            {loadingBadges ? (
              <div className="flex-1 flex items-center justify-center py-10">
                <Loader2 className="animate-spin text-purple-500" size={24} />
              </div>
            ) : badges.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8 opacity-60">
                <div className="p-4 bg-white/5 rounded-full mb-3">
                  <Star className="text-gray-400" size={24} />
                </div>
                <p className="text-sm text-gray-300 font-medium">Sem troféus ainda</p>
                <p className="text-xs text-gray-500 max-w-[200px]">Use o app para desbloquear prêmios incríveis!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 content-start">
                {badges.map((badge) => (
                  <div key={badge.id} className="group relative bg-[#130b20] p-3 rounded-2xl border border-white/5 hover:border-yellow-500/30 transition-all duration-300 hover:shadow-[0_0_15px_rgba(234,179,8,0.1)] flex flex-col items-center text-center gap-2">
                    <div className="text-2xl filter drop-shadow-md group-hover:scale-110 transition-transform duration-300">
                      {badge.icon}
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-[10px] text-white uppercase tracking-wide group-hover:text-yellow-400 transition-colors">
                        {badge.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* --- COLUNA 2: FORMULÁRIOS DE EDIÇÃO --- */}
        <div className="lg:col-span-2 space-y-6">

          {/* Card Dados Pessoais */}
          <div className="bg-[#1f1630] p-6 rounded-3xl border border-white/5 shadow-lg">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User size={16} /> Informações Básicas
            </h3>

            <form action={handleUpdateName} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  name="name"
                  defaultValue={userName}
                  required
                  className="w-full bg-[#130b20] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition text-sm font-medium"
                  placeholder="Seu nome"
                />
              </div>
              <button
                type="submit"
                disabled={savingName}
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition shadow-lg shadow-purple-900/20 active:scale-95 flex items-center justify-center gap-2 min-w-[120px]"
              >
                {savingName ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Salvar
              </button>
            </form>
          </div>

          {/* Card Segurança */}
          <div className="bg-[#1f1630] p-6 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden">
            {/* Decorativo de fundo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[60px] pointer-events-none" />

            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck size={16} /> Alterar Senha
            </h3>

            <form action={handleUpdatePassword} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="password"
                    name="currentPassword"
                    required
                    placeholder="Senha atual"
                    className="w-full bg-[#130b20] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white focus:border-emerald-500 outline-none transition text-sm"
                  />
                </div>
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="password"
                    name="newPassword"
                    required
                    placeholder="Nova senha"
                    className="w-full bg-[#130b20] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white focus:border-emerald-500 outline-none transition text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingPass}
                  className="bg-[#130b20] hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 px-6 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  {savingPass ? <Loader2 className="animate-spin" size={16} /> : <CheckIcon />}
                  Atualizar Senha
                </button>
              </div>
            </form>
          </div>

          {/* Zona de Perigo */}
          <div className="mt-8 pt-6 border-t border-white/5">
            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="flex items-center gap-2 text-xs font-bold text-red-400/60 hover:text-red-400 transition hover:underline"
            >
              {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Excluir minha conta permanentemente
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// Pequeno helper para ícone
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);