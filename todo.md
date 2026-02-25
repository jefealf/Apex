🏁 ApexMind: Engenharia & Estratégia - Backlog
1. Módulo: Vehicle Health (Saúde do Carro)
O foco aqui é leitura rápida. Visual > Numérico.

[ ] Car Silhouette Component (SVG Dinâmico):

[ ] Criar silhueta "top-down" do carro.

[ ] Mapear zonas de dano (Asa, Suspensão, Assoalho) que mudam de cor (Amarelo/Vermelho) baseadas na "Meatball Flag" ou parâmetros de suspensão.

[ ] Tires & Brakes (4 Cantos):

[ ] Temp Visualizer: Gradiente de cor nas rodas (Azul=Frio, Verde=Janela, Vermelho=Overheat) baseado na Surface Temp.

[ ] Pressure Monitor: Valor numérico que muda de cor se sair da janela ideal (ex: <20psi ou >27psi).

[ ] Wear Indicator: Barra de progresso ou anel circular indicando vida útil restante (estimada ou last pit).

[ ] Brake Temp Alert: Ícone de disco que acende/pisca se superar o limite térmico.

[ ] Powertrain Stats:

[ ] Fluids (Oil/Water): Barras horizontais simples (Barra Cinza -> Vermelha se Crítico). Nada de números piscando desnecessariamente.

[ ] Fuel Status: Destaque para "Laps Remaining" (Cálculo: Ltr Restantes / Consumo Médio Última Volta).

[ ] Controls Overlay:

[ ] Mostrar Brake Bias atual, Fuel Map e TC/ABS setting.

Layout: Centralizado. Uma silhueta de carro em "Wireframe" (linhas finas, cinza escuro #333) vista de cima.

A. Pneus (The Contact Patch)
Em vez de caixas quadradas, usamos a forma do pneu.

Visualização Principal (Temp): O retângulo do pneu é preenchido com um Gradiente Radial.

Centro: Temperatura da Carcaça (Mudança lenta).

Borda: Temperatura da Superfície (Mudança rápida).

Cores:

❄️ Frio: Azul Gelo (#3B82F6) com opacidade baixa.

✅ Janela Ideal: Verde Neon (#10B981) pulsante suave.

🔥 Overheat: Vermelho Alerta (#EF4444) brilhante/saturado.

Desgaste (Wear): Uma barra fina e curva ao redor do pneu (como um arco de 270 graus).

Começa cheia (Branca). Conforme desce de 100%, vai encurtando e mudando para Amarelo -> Vermelho.

Interação: Se o mouse passar em cima (hover), um tooltip preto aparece com os dados detalhados: "Pressão: 23.5 psi | Camber: -3.5".

B. Freios
Visual: Um pequeno arco ou linha interna ao pneu.

Comportamento: Invisível quando frio/normal.

Alerta: Quando aquece, acende em Laranja Brilhante (#F59E0B). Se crítico, pisca. Isso chama a atenção apenas quando necessário.

C. Motor & Fluidos (Minimalismo)
Localizado no centro da silhueta do carro (sobre o motor).

Design: Duas barras horizontais finas (espessura de 4px).

Label: Ícones minúsculos (Gota de Óleo / Termômetro de Água).

Lógica de Cor:

Tudo cinza escuro (#4B5563) enquanto estiver normal.

Ficou crítico? A barra fica Vermelha Sólida e o ícone pisca.


2. Módulo: Race Strategy (O Cérebro)
O diferencial competitivo. Onde o "Engenheiro" trabalha.

[ ] Intelligent Relative (A "Golden Feature"):

[ ] Filtro de Classe: Mostrar apenas competidores diretos (mesma classe).

[ ] Filtro de Ameaça: Mostrar carros de outras classes apenas se gap < 1.5s (Blue Flag ou Ultrapassagem iminente).

[ ] Battle Gap Trend (Delta Dinâmico):

[ ] Calcular a tendência de ritmo nas últimas 3 voltas.

[ ] Visualização: Setas ou Cores de Fundo.

Verde: Você é mais rápido (Catching).

Vermelho: Ele é mais rápido (Running Away/Attacking).

Cinza: Ritmo estabilizado.

[ ] Fuel Calculator & Management:

[ ] Delta to Finish: Comparativo (Combustível Restante - Necessário p/ Fim).

Negativo: Alerta vermelho ("Save Fuel").

Positivo: Indicador verde ("Push/Rich Mix").

[ ] Pit Window Prediction:

[ ] Traffic Rejoin: Estimativa de onde volta se parar agora (Ar limpo vs. Tráfego).

[ ] Projected iRating (Streamer Feature):

[ ] Cálculo em tempo real de ganho/perda de iRating baseado na posição atual e SoF.

Layout: Lista vertical (List View) altamente estilizada.

A. O "Intelligent Relative" (A Joia da Coroa)
Cada linha é um "Card" retangular com cantos levemente arredondados.

O Card do Piloto (Você): Fundo sutilmente iluminado (#1F2937) e borda esquerda Ciano Neon (#06B6D4).

Os Oponentes: Fundo transparente, borda inferior fina (separador).

Visualização do "Gap Trend" (Delta Dinâmico):

Em vez de apenas números, usamos Backgrounds de Célula.

A coluna do tempo do gap tem um fundo condicional:

Ganhando Tempo (Catching): Fundo Verde Translúcido (rgba(16, 185, 129, 0.1)).

Perdendo Tempo (Bleeding): Fundo Vermelho Translúcido (rgba(239, 68, 68, 0.1)).

Ícone: Uma pequena seta ▲ ou ▼ ao lado do delta.

B. Fuel Strategy
Uma barra de progresso horizontal grossa na parte inferior do módulo.

Barra Principal: Quantidade atual (Amarelo Ouro).

"Ghost Bar" (A Meta): Uma linha vertical branca sobre a barra que indica "Combustível Necessário para Terminar".

Visualização de Erro:

Se a barra Amarela passar a linha Branca = SAFE (Texto verde: "+2.4 Laps").

Se a barra Amarela não chegar na linha Branca = DANGER (A parte que falta fica preenchida com padrão listrado vermelho/preto).

3. Módulo: Pace Analysis (Performance do Piloto)
Contexto de longo prazo, não instantâneo.

[ ] Lap Time History (Gráfico):

[ ] Plotar últimas 10-15 voltas (Lib sugerida: Recharts).

[ ] Linha de referência (Média do Stint ou Líder da Classe).

[ ] Consistency Check:

[ ] Comparativo: Optimal Lap (Soma dos melhores setores) vs Best Lap.

[ ] Insight visual: "Potencial de 0.3s a ganhar".

Layout: Gráfico de Barras (Histograma).

Eixo X: Voltas (L1, L2, L3...).

Eixo Y: Tempo.

Estilo das Barras:

Barras finas, espaçamento leve.

Cores Semânticas:

Roxo (#8B5CF6): Volta Mais Rápida Pessoal.

Verde (#10B981): Dentro de 101% do melhor tempo.

Amarelo (#F59E0B): Volta lenta / Erro.

Cinza (#374151): Voltas inválidas/Box.

A "Linha Fantasma": Uma linha pontilhada horizontal atravessando o gráfico representando o Ritmo Médio do Líder.

Insight Visual: Se suas barras estão acima da linha pontilhada, você está perdendo terreno. Se estão abaixo, você está tirando diferença.

4. Módulo: Track Map (O Spotter Visual)
Consciência situacional.

[ ] Live Traffic Overlay:

[ ] Renderizar "dots" dos oponentes na pista.

[ ] Color Coding: Branco (Fight), Azul (Lapped/Lento), Vermelho (Classe Rápida).

[ ] Wind Indicators:

[ ] Seta grande indicando direção do vento em relação ao norte da pista ou trecho específico.

[ ] Track State:

[ ] Indicador de % de uso da pista (Rubber level) se a API disponibilizar.

Layout: Mapa vetorial de alto contraste.

A Pista: Linha cinza claro (#9CA3AF) com espessura média. Fundo totalmente preto para contraste máximo.

Os "Dots" (Carros):

Não use apenas círculos. Use formas para distinguir classes.

Círculo: Mesma classe.

Triângulo: Outra classe.

Seu Carro: Um "Puck" maior, branco brilhante com um anel pulsante ao redor (efeito de sonar).

Áreas de Perigo: Se houver uma Bandeira Amarela Local (Yellow Flag), o setor da pista no mapa muda de cor para Amarelo Piscante. O engenheiro vê onde está o acidente antes de você chegar.

Vento: Não apenas uma seta num canto. Uma série de setas translúcidas ("Flow Lines") sobre o mapa, indicando o fluxo de vento na reta principal.

5. Tech & Architecture (Dev Notes)
[ ] State Management: Criar Hooks específicos (useFuelData, useOpponentGap) para não renderizar o componente inteiro a cada milissegundo.

[ ] Alert System: Criar um sistema de "Toast Notifications" para eventos críticos (ex: "Motor Crítico", "Pit Window Aberta", "Blue Flag").