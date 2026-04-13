---
trigger: always_on
---

# IselfToken global

1. todo os códigos devem ser simples e de fácil manutenção
2. utilizar o clean code
3. utilize comentários nos códigos
4. utilize funções para facilitar a manutenção
5. utilize variáveis com nomes descritivos
6. utilize funções com nomes descritivos
7. utilize tailwindcss para estilização
8. utilize shadcn/ui para componentes
9. o padrão de css esta em doc/css_padrão.md[doc/css_padrão.md], esse padrão deve ser respeitado em todos o projeto
10. evite alterar os arquivos que estão em app/components/ui[app/components/ui], a sua estilização deve ser feita quando eles for impotados ex: 
```jsx
import { Button } from "@/components/ui/button"

<Button className="bg-primary">Button</Button>
```
11. a pasta components[app/components] deve ser usada para componentes que serão usados em mais de uma rota
12. a pasta routes[app/routes] deve ser usada para rotas que serão usadas em mais de uma rota
13. a pasta public[app/public] deve ser usada para arquivos imagens ou configurações gerais que serão usados em mais de uma rota

# Documentações externas

antes de implementar uma funcionalidade, pesquise na documentação externa

1. react router v7: [https://reactrouter.com/home](https://reactrouter.com/home)
2. tailwindcss: [https://tailwindcss.com/docs](https://tailwindcss.com/docs)
3. shadcn/ui: [https://ui.shadcn.com/docs](https://ui.shadcn.com/docs)
4. axios: [https://axios-http.com/docs/intro](https://axios-http.com/docs/intro)
5. react_hook_form: [https://react-hook-form.com/docs](https://react-hook-form.com/docs)
6. zod: [https://zod.dev/docs](https://zod.dev/docs)

