import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#130b20] p-4 md:p-8 space-y-8">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div className="space-y-2 w-full md:w-auto">
          {/* Título */}
          <Skeleton className="h-8 w-48 bg-white/5" />
          {/* Subtítulo */}
          <Skeleton className="h-4 w-32 bg-white/5" />
        </div>
        
        {/* Seletor de Data */}
        <div className="flex items-center gap-2 bg-[#1f1630] p-1 rounded-full border border-white/5">
           <Skeleton className="h-8 w-8 rounded-full bg-white/10" />
           <Skeleton className="h-6 w-32 bg-white/5 mx-2 rounded" />
           <Skeleton className="h-8 w-8 rounded-full bg-white/10" />
        </div>
      </div>

      {/* Cards Principais (Totais) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#1a1025] border border-white/5 p-6 rounded-2xl h-32 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <Skeleton className="h-12 w-12 rounded-full bg-white" />
             </div>
             <div className="space-y-4 relative z-10">
                <Skeleton className="h-4 w-24 bg-white/10" />
                <Skeleton className="h-8 w-3/4 bg-white/10" />
             </div>
          </div>
        ))}
      </div>

      {/* Área Principal (Gráficos e Listas) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* Gráfico de Barras */}
         <div className="lg:col-span-2 bg-[#1a1025] border border-white/5 p-6 rounded-3xl h-[400px]">
            <div className="flex justify-between mb-6">
               <Skeleton className="h-6 w-32 bg-white/10" />
               <Skeleton className="h-6 w-6 rounded-full bg-white/10" />
            </div>
            {/* Barras do Gráfico */}
            <div className="flex items-end gap-4 h-64 mt-8 px-4">
               {[...Array(6)].map((_, i) => (
                  <Skeleton 
                    key={i} 
                    className="w-full bg-purple-500/10 rounded-t-lg" 
                    style={{ height: `${Math.random() * 80 + 20}%` }} 
                  />
               ))}
            </div>
         </div>

         {/* Lista Lateral (Histórico Recente) */}
         <div className="bg-[#1a1025] border border-white/5 p-6 rounded-3xl h-[400px]">
            <Skeleton className="h-6 w-40 bg-white/10 mb-6" />
            
            <div className="space-y-4">
               {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border-b border-white/5 last:border-0">
                     <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full bg-white/5" />
                        <div className="space-y-1">
                           <Skeleton className="h-3 w-24 bg-white/10" />
                           <Skeleton className="h-2 w-16 bg-white/5" />
                        </div>
                     </div>
                     <Skeleton className="h-4 w-16 bg-white/10" />
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}