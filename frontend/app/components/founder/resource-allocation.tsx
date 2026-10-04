import React, { useState } from "react";

const initialAllocation = [
  { label: "Marketing & Growth", value: 45 },
  { label: "Operações & Escala", value: 25 },
  { label: "P&D / Tecnologia", value: 20 },
  { label: "Legal & CX", value: 10 },
];

export function ResourceAllocation() {
  const [allocation, setAllocation] = useState(initialAllocation);

  const handleUpdate = (index: number, newValue: number) => {
    const next = [...allocation];
    next[index].value = newValue;
    setAllocation(next);
  };

  return (
    <div className="glass-card p-8 lg:p-10 rounded-3xl space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground italic">Alocação de Recursos</h2>
          <p className="text-muted-foreground text-sm font-medium mt-1">Distribuição estratégica do capital aportado</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black uppercase text-primary tracking-widest block mb-1">Total Disponível</span>
          <div className="text-2xl font-black text-foreground tracking-tighter">R$ 2.450.000</div>
        </div>
      </div>

      <div className="space-y-10">
        {allocation.map((item, index) => (
          <div key={item.label} className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">{item.label}</label>
              <span className="text-primary font-black text-sm">{item.value}%</span>
            </div>
            <input 
              className="w-full h-1.5 bg-accent rounded-full appearance-none cursor-pointer accent-primary" 
              type="range" 
              min="0" 
              max="100" 
              value={item.value} 
              onChange={(e) => handleUpdate(index, parseInt(e.target.value))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
