export default function Loading() {
  return (
    <div className="min-h-screen bg-[#130b20] p-4 md:p-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="h-20 w-full bg-white/5 rounded-2xl mb-8" />
      
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Title Skeleton */}
        <div className="flex justify-between items-center mb-6">
          <div className="h-10 w-48 bg-white/5 rounded-lg" />
          <div className="h-10 w-32 bg-white/5 rounded-full" />
        </div>

        {/* Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-40 bg-white/5 rounded-3xl" />
          <div className="h-40 bg-white/5 rounded-3xl" />
          <div className="h-40 bg-white/5 rounded-3xl" />
        </div>

        {/* Charts/Content Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="h-80 bg-white/5 rounded-3xl" />
          <div className="h-80 bg-white/5 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}