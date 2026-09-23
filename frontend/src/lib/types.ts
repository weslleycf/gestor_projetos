/** Tipos do domínio SGP — espelham os serializers da API v1. */

export type ID = number;

export interface Paginado<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type PerfilUsuario =
  | "ADMIN" | "EXECUTIVO" | "PMO" | "GERENTE" | "LIDER" | "MEMBRO" | "RH" | "STAKEHOLDER";

export interface UsuarioResumo {
  id: ID;
  nome: string;
  nome_curto: string;
  email: string;
  iniciais: string;
  cor: string;
  icone: string;
  avatar_display: string;
  cargo: string;
  area: string;
  localizacao: string;
  perfil: PerfilUsuario;
  papel: string;
  disponivel_para_mentoria: boolean;
  ativo: boolean;
}

export interface Usuario extends Omit<UsuarioResumo, "papel" | "nome_curto"> {
  nome_curto: string;
  papel?: string;
  avatar: string | null;
  avatar_url: string;
  fuso_horario: string;
  gestor: ID | null;
  gestor_nome: string;
  data_admissao: string | null;
  custo_hora: number | null;
  capacidade_semanal_horas: string;
  custo_hora_visivel: boolean;
  tema: string;
  paleta: string;
  tema_custom: Record<string, unknown>;
  densidade: string;
  idioma: string;
  aceita_recomendacoes: boolean;
  interesses: string[];
  is_staff: boolean;
  is_superuser: boolean;
  criado_em: string;
  atualizado_em: string;
}

export type Saude = "VERDE" | "AMARELO" | "VERMELHO" | "CINZA";
export type Prioridade = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
export type StatusProjeto =
  | "IDEIA" | "PLANEJADO" | "EM_ANALISE" | "APROVADO" | "EM_EXECUCAO"
  | "PAUSADO" | "CONCLUIDO" | "CANCELADO" | "ARQUIVADO";

export interface ProjetoResumo {
  id: ID;
  codigo: string;
  nome: string;
  descricao: string;
  objetivo: string;
  status: StatusProjeto;
  status_rotulo: string;
  prioridade: Prioridade;
  prioridade_rotulo: string;
  saude: Saude;
  saude_rotulo: string;
  criticidade: string;
  categoria: string;
  area: string;
  tags: string[];
  data_inicio: string | null;
  data_fim: string | null;
  data_inicio_real: string | null;
  data_fim_real: string | null;
  orcamento: string;
  orcamento_capex: string;
  orcamento_opex: string;
  custo_real: string;
  receita_prevista: string;
  percentual_conclusao: number;
  progresso_planejado: number;
  icone: string;
  cor: string;
  manager: ID | null;
  manager_detalhe: UsuarioResumo | null;
  sponsor: ID | null;
  sponsor_detalhe: UsuarioResumo | null;
  program: ID | null;
  program_nome: string;
  portfolio: ID | null;
  portfolio_nome: string;
  atrasado: boolean;
  dias_restantes: number | null;
  duracao_dias: number;
  total_tarefas: number;
  arquivado: boolean;
  atualizado_em: string;
}

export interface Projeto extends ProjetoResumo {
  projeto_pai: ID | null;
  esforco_estimado_horas: string;
  progresso_manual: boolean;
  capa: string | null;
  percentual_manual?: number;
  licoes_aprendidas: string;
  criado_por: ID | null;
  criado_por_nome?: string;
  total_riscos: number;
  total_marcos: number;
  total_alocacoes: number;
  criado_em: string;
}

export type StatusTarefa =
  | "BACKLOG" | "A_FAZER" | "EM_ANDAMENTO" | "EM_REVISAO" | "BLOQUEADA" | "CONCLUIDA" | "CANCELADA";

export interface Tarefa {
  id: ID;
  project: ID;
  parent: ID | null;
  nome: string;
  wbs: string;
  descricao: string;
  responsavel: ID | null;
  responsavel_detalhe: UsuarioResumo | null;
  data_inicio: string | null;
  data_fim: string | null;
  data_inicio_real: string | null;
  data_fim_real: string | null;
  esforco_estimado: string;
  esforco_real: string;
  percentual_conclusao: number;
  status: StatusTarefa;
  status_rotulo?: string;
  prioridade: Prioridade;
  posicao_visual: number;
  ordem: number;
  nivel: number;
  is_marco: boolean;
  critica: boolean;
  folga_dias: number;
  cor: string;
  icone: string;
  tags: string[];
  atrasada?: boolean;
  duracao_dias?: number;
  progresso_planejado?: number;
  tem_filhos?: boolean;
  total_subtarefas?: number;
  project_nome?: string;
  project_cor?: string;
  checklist?: ChecklistItem[];
  requisitos_skill?: RequisitoSkillTarefa[];
}

export interface ChecklistItem {
  id: ID;
  task: ID;
  texto: string;
  concluido: boolean;
  ordem: number;
  responsavel: ID | null;
  responsavel_detalhe: UsuarioResumo | null;
}

export interface Dependencia {
  id: ID;
  predecessor: ID;
  successor: ID;
  tipo: "FS" | "SS" | "FF" | "SF";
  lag: number;
  obrigatoria: boolean;
  predecessor_nome?: string;
  successor_nome?: string;
}

export interface Marco {
  id: ID;
  project: ID;
  nome: string;
  descricao: string;
  data_prevista: string;
  data_real: string | null;
  status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO" | "ATRASADO" | "CANCELADO";
  status_rotulo: string;
  critico: boolean;
  responsavel: ID | null;
  responsavel_detalhe: UsuarioResumo | null;
  cor: string;
  icone: string;
  atrasado: boolean;
  project_nome?: string;
}

export interface Skill {
  id: ID;
  nome: string;
  descricao: string;
  categoria: ID | null;
  categoria_nome: string;
  categoria_cor: string;
  parent: ID | null;
  parent_nome: string;
  tipo: string;
  tipo_rotulo: string;
  status: string;
  status_rotulo: string;
  criticidade: string;
  criticidade_rotulo: string;
  framework_origem: string;
  codigo_externo: string;
  sinonimos: string[];
  tags: string[];
  icone: string;
  cor: string;
  peso_estrategico: number;
  substituivel: boolean;
  total_detentores: number;
  bus_factor: number;
  nivel_medio: number;
  em_risco: boolean;
}

export interface PerfilSkill {
  id: ID;
  user: ID;
  skill: ID;
  skill_detalhe: Skill;
  user_detalhe: UsuarioResumo;
  nivel_atual: number;
  nivel_validado: number;
  nivel_desejado: number;
  nivel_consolidado: number;
  nivel_efetivo: number;
  nivel_rotulo: string;
  xp_acumulado: number;
  xp_para_proximo_nivel: number;
  progresso_nivel_percentual: number;
  anos_experiencia: number;
  ultima_utilizacao: string | null;
  data_atingiu_nivel: string | null;
  dias_sem_uso: number | null;
  status: string;
  status_rotulo: string;
  visibilidade: string;
  destaque: boolean;
  gap: number;
  total_avaliacoes: number;
  total_endossos: number;
  total_evidencias: number;
  pode_editar?: boolean;
}

export interface Risco {
  id: ID;
  project: ID;
  project_nome: string;
  project_cor: string;
  codigo: string;
  descricao: string;
  causa: string;
  efeito: string;
  categoria: string;
  categoria_rotulo: string;
  probabilidade: number;
  impacto: number;
  severidade: number;
  nivel: "BAIXO" | "MEDIO" | "ALTO" | "EXTREMO";
  nivel_rotulo: string;
  cor: string;
  prob_residual: number;
  imp_residual: number;
  severidade_residual: number;
  estrategia: string;
  estrategia_rotulo: string;
  plano_resposta: string;
  contingencia: string;
  responsavel: ID | null;
  responsavel_detalhe: UsuarioResumo | null;
  status: string;
  status_rotulo: string;
  data_identificacao: string;
  data_limite: string | null;
  custo_mitigacao: string;
  valor_monetario_esperado: string;
  gatilhos: string[];
  tags: string[];
  exposicao: number;
  atrasado: boolean;
  reducao_severidade: number;
}

export interface Issue {
  id: ID;
  project: ID;
  project_nome: string;
  project_cor: string;
  risk: ID | null;
  codigo: string;
  titulo: string;
  descricao: string;
  tipo: string;
  tipo_rotulo: string;
  prioridade: Prioridade;
  prioridade_rotulo: string;
  status: string;
  status_rotulo: string;
  impacto: string;
  solucao: string;
  responsavel: ID | null;
  responsavel_detalhe: UsuarioResumo | null;
  data_abertura: string;
  data_limite: string | null;
  data_resolucao: string | null;
  esforco_estimado: string;
  custo_estimado: string;
  posicao_visual: number;
  cor: string;
  icone: string;
  tags: string[];
  idade_dias: number;
  atrasada: boolean;
}

export interface EVM {
  data_referencia: string;
  BAC: number;
  PV: number;
  EV: number;
  AC: number;
  CV: number;
  SV: number;
  CPI: number;
  SPI: number;
  EAC: number;
  ETC: number;
  VAC: number;
  TCPI: number;
  percentual_consumido: number;
  percentual_agregado: number;
  situacao_custo: Saude;
  situacao_prazo: Saude;
  projecao_final: number;
  orcamento_original: number;
}

export interface Notificacao {
  id: ID;
  titulo: string;
  mensagem: string;
  nivel: "INFO" | "SUCESSO" | "ALERTA" | "CRITICO";
  icone: string;
  cor: string;
  link: string;
  entidade: string;
  entidade_id: string;
  lida: boolean;
  canal: string;
  criado_em: string;
}

export interface Comentario {
  id: ID;
  autor: ID;
  autor_detalhe: UsuarioResumo;
  parent: ID | null;
  texto: string;
  mencoes: ID[];
  reacoes: Record<string, ID[]>;
  resolvido: boolean;
  criado_em: string;
  atualizado_em: string;
  /** Preenchido quando o comentário já foi editado. */
  editado_em?: string | null;
  editado?: boolean;
  /** O servidor informa se este usuário pode editar ou excluir. */
  pode_editar?: boolean;
  respostas: Comentario[];
}

export interface Recomendacao {
  recomendacao_id?: ID;
  user_id: ID;
  nome: string;
  iniciais: string;
  cor: string;
  cargo: string;
  area: string;
  localizacao: string;
  perfil: PerfilUsuario;
  score: number;
  posicao: number;
  componentes: Record<string, number>;
  justificativa: {
    skills_atendidas: Array<{
      skill: string; skill_id: ID; icone: string; cor: string;
      requerido: number; atual: number; peso: number; fator: number; obrigatorio: boolean;
    }>;
    gaps: Array<{
      skill: string; skill_id: ID; icone: string; cor: string; requerido: number;
      atual: number; peso: number; fator: number; obrigatorio: boolean;
      deficit?: number; acao_sugerida?: string;
    }>;
    disponibilidade: string;
    disponibilidade_percentual: number;
    custo_estimado_reais: number | null;
    custo_hora: number | null;
    modo_recomendado: string;
    carga_atual_percentual: number;
    anos_de_casa: number;
    xp_total: number;
  };
  penalidades: Array<{ motivo: string; valor: number; icone: string }>;
  elegivel: boolean;
}

export interface ResultadoMatching {
  modo: string;
  modo_descricao: string;
  pesos: Record<string, number>;
  alvo: {
    tipo: string; id: ID; nome: string; projeto: string; projeto_id: ID;
    periodo?: { inicio: string; fim: string };
  };
  requisitos: Array<{
    skill_id: ID; skill: string; icone: string; cor: string;
    nivel_minimo: number; peso: number; obrigatorio: boolean;
  }>;
  recomendacoes: Recomendacao[];
  total_avaliados: number;
  explicacao_formula: string;
  cenario?: { pesos_ajustados: Record<string, number>; ajustes: Record<string, unknown> };
  comparacao?: Array<{
    user_id: ID; nome: string; score_ajustado: number; score_original: number | null;
    posicao_ajustada: number; posicao_original: number | null;
  }>;
}

export interface Alocacao {
  id: ID;
  project: ID;
  project_nome: string;
  project_cor: string;
  task: ID | null;
  task_nome: string;
  user: ID | null;
  user_detalhe: UsuarioResumo | null;
  recurso: ID | null;
  recurso_nome: string;
  recurso_cor: string;
  recurso_icone: string;
  percentual: number;
  horas_planejadas: string;
  data_inicio: string;
  data_fim: string;
  status: string;
  status_rotulo: string;
  modalidade: string;
  modalidade_rotulo: string;
  papel: string;
  justificativa: string;
  score_matching: number | null;
  override_manual: boolean;
  horas: number;
  custo_estimado: string;
  vigente: boolean;
  dias: number;
}

export interface ConflitoAlocacao {
  user_id: ID;
  user_nome: string;
  user_cor: string;
  semana: string;
  total_percentual: number;
  excesso: number;
  severidade: "ALERTA" | "CRITICO";
  alocacoes: Array<{
    id: ID; percentual: number; projeto: string; tarefa: string; periodo: string;
  }>;
}

export interface Recurso {
  id: ID;
  nome: string;
  tipo: string;
  descricao: string;
  codigo: string;
  custo_hora: string;
  custo_unitario: string;
  unidade: string;
  quantidade_disponivel: string;
  disponibilidade_percentual: number;
  fornecedor: string;
  localizacao: string;
  ativo: boolean;
  cor: string;
  icone: string;
  atributos: Record<string, unknown>;
}

export interface Timesheet {
  id: ID;
  user: ID;
  user_detalhe: UsuarioResumo;
  task: ID | null;
  task_nome: string;
  project: ID | null;
  project_nome: string;
  project_cor: string;
  data: string;
  horas: string;
  descricao: string;
  atividade: string;
  aprovado: boolean;
  aprovador: ID | null;
  aprovador_nome: string;
  custo: string;
}

export interface Orcamento {
  id: ID;
  project: ID;
  project_nome: string;
  categoria: string;
  tipo: "CAPEX" | "OPEX";
  centro_custo: string;
  valor_planejado: string;
  valor_realizado: string;
  valor_comprometido: string;
  cor: string;
  icone: string;
  saldo: string;
  consumo_percentual: number;
  situacao: Saude;
}

export interface Lancamento {
  id: ID;
  project: ID;
  project_nome: string;
  project_cor: string;
  orcamento: ID | null;
  orcamento_categoria: string;
  tipo: "DESPESA" | "RECEITA";
  tipo_rotulo: string;
  categoria: string;
  descricao: string;
  valor: string;
  data_competencia: string;
  data_pagamento: string | null;
  status: string;
  status_rotulo: string;
  fornecedor: string;
  documento: string;
  centro_custo: string;
  criado_por_nome: string;
}

export interface PerfilNivelCriterio {
  nivel_atual: number;
  nivel_proposto: number;
  elegivel: boolean;
  progresso: number;
  checagens: Array<{
    criterio: string;
    atendido: boolean;
    atual: number;
    exigido: number;
    icone: string;
  }>;
}

export interface SugestaoPromocao {
  id: ID;
  employee_skill: ID;
  user_id: ID;
  user_nome: string;
  user_cor: string;
  skill_nome: string;
  skill_icone: string;
  skill_cor: string;
  nivel_atual: number;
  nivel_proposto: number;
  justificativa: string;
  criterios_atendidos: PerfilNivelCriterio["checagens"];
  status: string;
  validado_por_nome: string;
  criado_em: string;
}

export interface GapItem {
  skill_id: ID;
  skill: string;
  icone: string;
  cor: string;
  criticidade: string;
  nivel_minimo: number;
  nivel_desejado?: number;
  quantidade: number;
  obrigatorio?: boolean;
  peso?: number;
  atendem: number;
  deficit: number;
  severidade: "OK" | "BAIXO" | "MEDIO" | "ALTO" | "CRITICO";
  pessoas_atendem: Array<{ user_id: ID; nome: string; nivel: number }>;
  pessoas_com_gap: Array<{ user_id: ID; nome: string; nivel: number; deficit: number }>;
  acoes_sugeridas: Array<{ tipo: string; rotulo: string; icone: string; cor: string; detalhe: string }>;
}

export interface LinhaMatrizSkills {
  user_id: ID;
  nome: string;
  iniciais: string;
  cor: string;
  cargo: string;
  area: string;
  perfil: PerfilUsuario;
  total_skills: number;
  nivel_medio: number;
  celulas: Array<{
    skill_id: ID;
    nivel: number;
    consolidado: number;
    validado: number;
    desejado: number;
    xp: number;
    status: string;
    employee_skill_id: ID | null;
    visibilidade: string;
  }>;
}

export interface ColunaMatrizSkills {
  skill_id: ID;
  nome: string;
  icone: string;
  cor: string;
  tipo: string;
  criticidade: string;
  categoria: string;
  detentores: number;
  nivel_medio: number;
  bus_factor: number;
}

export interface CelulaForecast {
  periodo: string;
  demanda: number;
  oferta: number;
  gap: number;
  nivel_medio_demandado: number;
  situacao: "ESCASSEZ" | "OCIOSIDADE" | "EQUILIBRIO";
}

export interface LinhaForecast {
  skill_id: ID;
  skill: string;
  cor: string;
  icone: string;
  categoria: string;
  criticidade: string;
  bus_factor: number;
  celulas: CelulaForecast[];
  gap_total: number;
  pico_demanda: number;
}

export interface TarefaGantt {
  id: ID;
  nome: string;
  wbs: string;
  parent: ID | null;
  nivel: number;
  inicio: string | null;
  fim: string | null;
  inicio_real: string | null;
  fim_real: string | null;
  esforco: number;
  esforco_real: number;
  percentual: number;
  status: StatusTarefa;
  status_rotulo: string;
  prioridade: Prioridade;
  cor: string;
  icone: string;
  responsavel: ID | null;
  responsavel_nome: string;
  responsavel_cor: string;
  responsavel_iniciais: string;
  is_marco: boolean;
  critica: boolean;
  folga: number;
  atrasada: boolean;
  duracao: number;
  progresso_planejado: number;
  tags: string[];
  posicao: number;
  total_subtarefas: number;
}

export interface PayloadCronograma {
  projeto: Projeto;
  tarefas: TarefaGantt[];
  dependencias: Dependencia[];
  marcos: Marco[];
  baseline: { id: ID; nome: string; versao: number; data_inicio: string; data_fim: string } | null;
  caminho_critico: ID[];
}

export interface EventoCalendario {
  id: ID;
  titulo: string;
  inicio: string;
  fim: string;
  tipo: "tarefa" | "marco";
  status: string;
  cor: string;
  percentual: number;
  project_id: ID;
  projeto: string;
  responsavel: string;
  atrasada?: boolean;
  critico?: boolean;
  is_marco: boolean;
}

export interface CelulaMatrizRisco {
  probabilidade: number;
  impacto: number;
  severidade: number;
  nivel: "BAIXO" | "MEDIO" | "ALTO" | "EXTREMO";
  rotulo: string;
  cor: string;
  total: number;
  riscos: Array<{
    id: ID; codigo: string; descricao: string; nivel: string; status: string;
    cor: string; project_id: ID; projeto: string; responsavel: string;
  }>;
}

export interface PDI {
  id: ID;
  user: ID;
  user_detalhe: UsuarioResumo;
  titulo: string;
  objetivo: string;
  status: string;
  status_rotulo: string;
  data_inicio: string;
  data_fim: string | null;
  responsavel_acompanhamento: ID | null;
  acompanhamento_nome: string;
  progresso: number;
  acoes: AcaoPDI[];
}

export interface AcaoPDI {
  id: ID;
  plan: ID;
  tipo: string;
  tipo_rotulo: string;
  descricao: string;
  skill: ID | null;
  skill_nome: string;
  skill_cor: string;
  skill_icone: string;
  nivel_alvo: number;
  status: string;
  status_rotulo: string;
  prazo: string | null;
  data_conclusao: string | null;
  carga_horaria: number;
  custo: string;
  progresso: number;
  atrasada: boolean;
}

export interface Trilha {
  skill_id: ID;
  skill: string;
  icone: string;
  cor: string;
  nivel_atual: number;
  nivel_alvo: number;
  gap: number;
  status: string;
  urgencia: "ALTA" | "MEDIA" | "BAIXA";
  demanda_projetos: number;
  xp_necessario: number;
  progresso: number;
  acoes: Array<{ tipo: string; titulo: string; carga_horaria: number; fornecedor: string; url: string }>;
  mentores: Array<{
    user_id: ID; nome: string; iniciais: string; cor: string; cargo: string;
    area: string; nivel: number; skill: string; disponibilidade: number;
    mentorias_ativas: number; anos_experiencia: number; score: number; justificativa: string;
  }>;
}

export interface WidgetCatalogo {
  id: string;
  nome: string;
  tipo: string;
  categoria: string;
  icone: string;
  tamanho: string;
}

export interface WidgetLayout {
  id: string;
  tipo: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ResumoDashboard {
  total_projetos: number;
  ativos: number;
  atrasados: number;
  concluidos: number;
  em_risco: number;
  progresso_medio: number;
}

export interface RequisitoSkillTarefa {
  id: ID;
  task: ID;
  skill: ID;
  skill_nome: string;
  skill_icone: string;
  skill_cor: string;
  skill_categoria: string;
  nivel_minimo: number;
  peso: number;
  obrigatorio: boolean;
}

export interface Atividade {
  id: ID;
  user: ID | null;
  user_nome: string;
  user_cor: string;
  verbo: string;
  entidade: string;
  entidade_id: string;
  entidade_nome: string;
  projeto_id: ID | null;
  meta: Record<string, unknown>;
  criado_em: string;
}

export interface ComentarioReacao {
  [emoji: string]: ID[];
}

export interface HeatmapOcupacao {
  semanas: Array<{ semana: string; rotulo: string }>;
  linhas: Array<{
    user_id: ID;
    nome: string;
    cor: string;
    iniciais: string;
    area: string;
    celulas: Array<{ semana: string; valor: number; projetos: string[] }>;
    media: number;
  }>;
}

export interface SkillArvoreNo {
  id: ID;
  nome: string;
  icone: string;
  cor: string;
  tipo: string;
  status: string;
  criticidade: string;
  parent: ID | null;
  categoria: ID | null;
  categoria_nome: string;
  codigo_externo: string;
  framework_origem: string;
  total_detentores: number;
  filhos: SkillArvoreNo[];
}

export interface NoGrafo {
  id: ID | string;
  tipo?: string;
  nome?: string;
  titulo?: string;
  subtitulo?: string;
  icone?: string;
  cor?: string;
  criticidade?: string;
  status?: string;
  categoria?: string;
  detentores?: number;
  bus_factor?: number;
  nivel_medio?: number;
  raio?: number;
  ocupante?: string;
  risco?: string;
}

export interface ArestaGrafo {
  de: ID | string | null;
  para: ID | string;
  tipo: string;
  prontidao?: string;
  aderencia?: number;
  prioridade?: number;
}

export interface TrilhaMentor {
  user_id: ID;
  nome: string;
  iniciais: string;
  cor: string;
  cargo: string;
  area: string;
  nivel: number;
  skill: string;
  disponibilidade: number;
  mentorias_ativas: number;
  anos_experiencia: number;
  score: number;
  justificativa: string;
}

export interface AlertaBusFactor {
  skill_id: ID;
  skill: string;
  cor: string;
  icone: string;
  criticidade: string;
  quantidade_detentores: number;
  total_projetos_dependentes: number;
  recomendacao: string;
  acoes_sugeridas: Array<{ tipo: string; rotulo: string; icone: string; cor: string; detalhe: string }>;
  detentores: Array<{ user_id: ID; nome: string; nivel: number; cor: string }>;
}

export interface PainelCapacidades {
  cobertura_skills: {
    total_catalogo: number;
    ativas: number;
    colaboradores: number;
    com_perfil: number;
    cobertura_percentual: number;
    perfis_registrados: number;
    media_skills_por_pessoa: number;
  };
  gap: {
    total_requisitos: number;
    criticos: number;
    altos: number;
    medios: number;
    baixos: number;
    obrigatorios_pendentes: number;
    indice_cobertura: number;
  };
  bus_factor: { total: number; sem_detentor: number; um_detentor: number };
  desenvolvimento: {
    indice: number;
    pdis_ativos: number;
    acoes_pdi: number;
    acoes_concluidas: number;
    progresso_pdi: number;
    mentorias_ativas: number;
    skill_decay: number;
    promocoes_pendentes: number;
  };
  certificacao: { certificacoes: number; treinamentos: number; taxa: number };
  por_tipo: Array<{ tipo: string; total: number }>;
  por_criticidade: Array<{ criticidade: string; total: number }>;
  distribuicao_niveis: Array<{ nivel: number; rotulo: string; total: number }>;
  top_skills: Array<{ skill_id: ID; nome: string; cor: string; icone: string; detentores: number; nivel_medio: number; bus_factor: number }>;
  alertas_bus_factor: AlertaBusFactor[];
  gap_criticos: GapItem[];
  gerado_em: string;
}

export interface SugestaoMentor {
  user_id: ID;
  nome: string;
  iniciais: string;
  cor: string;
  cargo: string;
  area: string;
  nivel: number;
  skill: string;
  disponibilidade: number;
  mentorias_ativas: number;
  anos_experiencia: number;
  score: number;
  justificativa: string;
}

export interface Oportunidade {
  id: ID;
  titulo: string;
  descricao: string;
  tipo: string;
  tipo_rotulo: string;
  project: ID | null;
  project_nome: string;
  skills_detalhe: Skill[];
  nivel_minimo: number;
  responsavel: ID | null;
  responsavel_detalhe: UsuarioResumo | null;
  carga_horaria: number;
  data_abertura: string;
  data_limite: string | null;
  vagas: number;
  ativa: boolean;
  total_candidaturas: number;
  aderencia?: number;
  skills_atendidas?: Array<{ skill: string; skill_id: ID; requerido: number; atual: number }>;
  skills_gap?: Array<{ skill: string; skill_id: ID; requerido: number; atual: number }>;
  recomendacao?: string;
}

export interface Candidatura {
  id: ID;
  opportunity: ID;
  opportunity_titulo: string;
  user: ID;
  user_detalhe: UsuarioResumo;
  status: string;
  status_rotulo: string;
  motivacao: string;
  aderencia: number;
  skills_atendidas: Array<{ skill: string; skill_id: ID; requerido: number; atual: number }>;
  skills_gap: Array<{ skill: string; skill_id: ID; requerido: number; atual: number }>;
  criado_em: string;
}

export interface PosicaoChave {
  id: ID;
  titulo: string;
  area: string;
  ocupante: ID | null;
  ocupante_detalhe: UsuarioResumo | null;
  gestor: ID | null;
  gestor_detalhe: UsuarioResumo | null;
  skills_detalhe: Skill[];
  criticidade: string;
  risco_sucessao: string;
  observacao: string;
  total_sucessores: number;
}

export interface PlanoSucessao {
  id: ID;
  posicao: ID;
  posicao_titulo: string;
  sucessor: ID;
  sucessor_detalhe: UsuarioResumo;
  prontidao: string;
  prontidao_rotulo: string;
  aderencia: number;
  gaps: unknown[];
  plano_desenvolvimento: string;
  prioridade: number;
}

export interface Papel {
  id: ID;
  nome: string;
  descricao: string;
  permissoes: string[];
  is_sistema: boolean;
  total_vinculos: number;
}

export interface RegistroAuditoria {
  id: ID;
  user: ID | null;
  user_nome: string;
  entidade: string;
  entidade_id: string;
  acao: string;
  valores_anteriores: Record<string, unknown>;
  valores_novos: Record<string, unknown>;
  justificativa: string;
  ip: string | null;
  user_agent: string;
  timestamp: string;
}

export interface CampoCustomizado {
  id: ID;
  entidade: string;
  nome: string;
  chave: string;
  tipo: string;
  opcoes: string[];
  obrigatorio: boolean;
  valor_padrao: string;
  ajuda: string;
  ordem: number;
  largura: number;
  secao: string;
  ativo: boolean;
}

export interface EstadoWorkflow {
  id: ID;
  workflow: ID;
  nome: string;
  chave: string;
  cor: string;
  icone: string;
  ordem: number;
  wip_limit: number;
  is_inicial: boolean;
  is_final: boolean;
  posicao_x: number;
  posicao_y: number;
}

export interface TransicaoWorkflow {
  id: ID;
  workflow: ID;
  de: ID;
  de_nome: string;
  para: ID;
  para_nome: string;
  nome: string;
  requer_aprovacao: boolean;
}

export interface Workflow {
  id: ID;
  nome: string;
  entidade: string;
  descricao: string;
  is_padrao: boolean;
  estados: EstadoWorkflow[];
  transicoes: TransicaoWorkflow[];
}

export interface TokenApi {
  id: ID;
  nome: string;
  token: string;
  escopos: string[];
  ativo: boolean;
  expira_em: string | null;
  ultimo_uso: string | null;
  criado_em: string;
  expirado: boolean;
}

export interface Webhook {
  id: ID;
  nome: string;
  url: string;
  eventos: string[];
  ativo: boolean;
  secreto: string;
  criado_em: string;
}

export interface Sala {
  id: ID;
  nome: string;
  tipo: string;
  descricao: string;
  project: ID | null;
  project_nome: string;
  participantes: ID[];
  participantes_detalhe: UsuarioResumo[];
  icone: string;
  cor: string;
  arquivada: boolean;
  ultima_mensagem: { texto: string; autor: string; autor_cor: string; criado_em: string } | null;
  total_mensagens: number;
}

export interface Mensagem {
  id: ID;
  sala: ID;
  autor: ID;
  autor_detalhe: UsuarioResumo;
  texto: string;
  reply_to: ID | null;
  mencoes: ID[];
  mencoes_detalhe: UsuarioResumo[];
  reacoes: Record<string, ID[]>;
  anexo: string | null;
  anexo_url: string;
  editada: boolean;
  criado_em: string;
}

export interface ProjetoBaseline {
  id: ID;
  project: ID;
  versao: number;
  nome: string;
  descricao: string;
  data_inicio: string | null;
  data_fim: string | null;
  orcamento: string;
  ativa: boolean;
  criado_por_nome: string;
  criado_em: string;
}

export interface KPIProjeto {
  id: ID;
  project: ID;
  project_nome: string;
  nome: string;
  descricao: string;
  unidade: string;
  valor_meta: string;
  valor_atual: string;
  valor_inicial: string;
  maior_melhor: boolean;
  data_referencia: string;
  cor: string;
  historico: Array<{ data: string; valor: number }>;
  atingimento: number;
  situacao: string;
}

export interface Treinamento {
  id: ID;
  nome: string;
  descricao: string;
  skill: ID | null;
  skill_nome: string;
  skill_cor: string;
  tipo: string;
  carga_horaria: number;
  fornecedor: string;
  url: string;
  custo: string;
  nivel_alvo: number;
  xp_concedido: number;
  certificacao: boolean;
  ativo: boolean;
  total_participacoes: number;
}

export interface TreinamentoColaborador {
  id: ID;
  user: ID;
  user_detalhe: UsuarioResumo;
  training: ID;
  training_detalhe: Treinamento;
  status: string;
  status_rotulo: string;
  data_inscricao: string;
  data_conclusao: string | null;
  nota: number | null;
  certificado_url: string;
  origem: string;
}

export interface Mentoria {
  id: ID;
  mentor: ID;
  mentor_detalhe: UsuarioResumo;
  mentee: ID;
  mentee_detalhe: UsuarioResumo;
  skill: ID | null;
  skill_nome: string;
  skill_cor: string;
  objetivo: string;
  status: string;
  status_rotulo: string;
  data_inicio: string;
  data_fim: string | null;
  horas_realizadas: string;
  frequencia: string;
  avaliacao: number;
  comentario: string;
}

export interface AvaliacaoSkill {
  id: ID;
  employee_skill: ID;
  avaliador: ID | null;
  avaliador_detalhe: UsuarioResumo | null;
  tipo: string;
  tipo_rotulo: string;
  nivel_atribuido: number;
  peso: number;
  comentario: string;
  data: string;
}

export interface EndossoSkill {
  id: ID;
  employee_skill: ID;
  endorser: ID;
  endorser_detalhe: UsuarioResumo;
  comentario: string;
  nivel_sugerido: number;
  data: string;
}

export interface EvidenciaSkill {
  id: ID;
  employee_skill: ID;
  tipo: string;
  tipo_rotulo: string;
  descricao: string;
  url: string;
  arquivo: string | null;
  data: string;
  emitido_por: string;
  valida: boolean;
  validador: ID | null;
  validador_nome: string;
  validada_em: string | null;
  pode_editar?: boolean;
}

export interface HistoricoSkill {
  id: ID;
  employee_skill: ID;
  skill_nome: string;
  skill_cor: string;
  nivel_anterior: number;
  nivel_novo: number;
  xp_movimento: number;
  motivo: string;
  origem: string;
  origem_rotulo: string;
  referencia: string;
  registrado_por_nome: string;
  data: string;
}

export interface RequisitoSkillProjeto {
  id: ID;
  project: ID;
  project_nome: string;
  skill: ID;
  skill_detalhe: Skill;
  nivel_minimo: number;
  nivel_desejado: number;
  quantidade: number;
  peso: number;
  obrigatorio: boolean;
  data_necessidade: string | null;
  observacao: string;
}

export interface FiltroSalvo {
  id: ID;
  nome: string;
  modulo: string;
  criterios_json: Record<string, unknown>;
  icone: string;
  cor: string;
  compartilhado: boolean;
  criado_em: string;
}

export interface RelatorioCustomizado {
  id: ID;
  nome: string;
  descricao: string;
  widgets_json: WidgetLayout[];
  agendamento: string;
  destinatarios: string[];
  criado_em: string;
}

export interface LayoutDashboard {
  id: ID;
  nome: string;
  widgets_json: WidgetLayout[];
  is_default: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface PreferenciaVisao {
  id: ID;
  contexto: string;
  tipo_visualizacao: string;
  configuracao_json: Record<string, unknown>;
  updated_at: string;
}

export interface Portfolio {
  id: ID;
  nome: string;
  descricao: string;
  objetivo_estrategico: string;
  responsavel: ID | null;
  responsavel_detalhe: UsuarioResumo | null;
  cor: string;
  icone: string;
  status: string;
  orcamento_anual: string;
  total_projetos: number;
  total_programas: number;
  criado_em: string;
  atualizado_em: string;
}

export interface Programa {
  id: ID;
  portfolio: ID | null;
  portfolio_nome: string;
  nome: string;
  descricao: string;
  gerente: ID | null;
  gerente_detalhe: UsuarioResumo | null;
  status: string;
  data_inicio: string | null;
  data_fim: string | null;
  cor: string;
  icone: string;
  total_projetos: number;
  criado_em: string;
  atualizado_em: string;
}
