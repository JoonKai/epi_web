interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: string;
}

export default function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="text-6xl mb-4">{icon}</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-500 max-w-md">{description}</p>
        <div className="mt-6 inline-flex items-center px-4 py-2 bg-slate-100 rounded-full text-sm text-gray-500">
          준비 중입니다
        </div>
      </div>
    </div>
  );
}
