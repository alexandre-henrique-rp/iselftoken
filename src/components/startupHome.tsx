import { ChartAreaInteractive } from './chart-area-interactive';
import { DataTable } from './data-table';
import { SectionCards } from './section-cards';
import { z } from 'zod';
import { schema } from './data-table';

interface StartupHomeProps {
  // Lista de itens da tabela conforme schema compartilhado
  data: z.infer<typeof schema>[];
}

export default function StartupHome({ data }: StartupHomeProps) {
  return (
    <div>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <SectionCards />
            <div className="px-4 lg:px-6">
              <ChartAreaInteractive />
            </div>
            <DataTable data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
