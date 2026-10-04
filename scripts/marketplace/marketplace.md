# marketplace  

esse modulo é responsável por listar as startups na paginas "/" e "/home" obedecendo um critério de exibição e regras individuais para cada session, que vai listar as startups

session "/"
- Rodadas em Destaque
- Recém-Adicionadas
- Oportunidades de Investimento

session "/home"
- Rodadas Quentes
- Acesso Antecipado
- Todas as Rodadas Abertas
- Picks da Semana
- Startups por Categorias


regras por session

**session** `Rodadas Quentes`e `Rodadas em Destaque`
  - essa session deve conter no máximo 15 itens
  - para listar os itens ou startups tem que ter
    1. capitação ativa 
    2. ter mais de 4 selos
  - startups com scores acima de 85 tem prioridade
  - as startups com scores acima de 85 deve ter seu posicionamento aleatório na lista
  - as startups com scores acima de 98 deve ser posicionado entre os primeiros

**session** `Recém-Adicionadas`e `Acesso Antecipado`
  - essa session deve conter no máximo 15 itens
  - para listar os itens ou startups tem que ter
    1. capitação ativa 
    2. a capitação deve ter seu inicio abaixo de 20 dias
  - a ordenação da lista vai ser selos do maior para o menor

**session** `Picks da Semana`
  - essa session deve conter no máximo 15 itens
  - para listar os itens ou startups tem que ter
    1. capitação ativa 
    2. a capitação deve ter seu inicio nos últimos 7 dias
  - a ordenação da lista vai ser capitação mais antiga primeiro 


