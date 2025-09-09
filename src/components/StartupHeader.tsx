import Image from 'next/image';

interface StartupHeaderProps {
  logo: string;
  name: string;
  subtitle: string;
}

export default function StartupHeader({ logo, name, subtitle }: StartupHeaderProps) {
  return (
    <header className="flex items-center gap-6">
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
        <Image 
          src={logo} 
          alt={`Logo da ${name}`} 
          fill
          className="object-contain"
        />
      </div>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{name}</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">{subtitle}</p>
      </div>
    </header>
  );
}
