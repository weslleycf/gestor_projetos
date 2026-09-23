import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { api, mensagemErro } from "@/lib/api";
import { useAvisos } from "@/components/ui";

/* ==========================================================================
   Camada de dados: hooks finos sobre a API v1
   ========================================================================== */

export function useConsulta<T>(
  chave: readonly unknown[],
  url: string | null,
  params?: Record<string, unknown>,
  opcoes?: Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, "queryKey" | "queryFn">
) {
  return useQuery<T, Error, T, readonly unknown[]>({
    queryKey: [...chave, params ?? {}],
    queryFn: () => api.get<T>(url as string, params),
    enabled: Boolean(url) && (opcoes?.enabled ?? true),
    staleTime: 30_000,
    ...opcoes,
  });
}

export function useLista<T>(
  chave: readonly unknown[],
  url: string | null,
  params?: Record<string, unknown>,
  opcoes?: Omit<UseQueryOptions<T[], Error, T[], readonly unknown[]>, "queryKey" | "queryFn">
) {
  return useQuery<T[], Error, T[], readonly unknown[]>({
    queryKey: [...chave, params ?? {}],
    queryFn: () => api.getLista<T>(url as string, params),
    enabled: Boolean(url) && (opcoes?.enabled ?? true),
    staleTime: 30_000,
    ...opcoes,
  });
}

interface OpcoesMutacao<TVars, TResposta> {
  metodo?: "post" | "patch" | "put" | "delete";
  url: string | ((vars: TVars) => string);
  invalidar?: ReadonlyArray<readonly unknown[]>;
  mensagemSucesso?: string | ((resposta: TResposta, vars: TVars) => string);
  aoSucesso?: (resposta: TResposta, vars: TVars) => void;
}

export function useMutacao<TVars = void, TResposta = unknown>({
  metodo = "post",
  url,
  invalidar = [],
  mensagemSucesso,
  aoSucesso,
}: OpcoesMutacao<TVars, TResposta>) {
  const qc = useQueryClient();
  const { sucesso, erro } = useAvisos();

  return useMutation<TResposta, Error, TVars>({
    mutationFn: async (vars: TVars) => {
      const destino = typeof url === "function" ? url(vars) : url;
      if (metodo === "delete") {
        await api.del(destino);
        return undefined as TResposta;
      }
      if (metodo === "patch") return api.patch<TResposta>(destino, vars);
      if (metodo === "put") return api.put<TResposta>(destino, vars);
      return api.post<TResposta>(destino, vars);
    },
    onSuccess: (resposta, vars) => {
      invalidar.forEach((chave) => qc.invalidateQueries({ queryKey: chave }));
      if (mensagemSucesso) {
        sucesso(typeof mensagemSucesso === "function" ? mensagemSucesso(resposta, vars) : mensagemSucesso);
      }
      aoSucesso?.(resposta, vars);
    },
    onError: (e) => erro("Não foi possível concluir", mensagemErro(e)),
  });
}

/** Chaves de consulta padronizadas — facilitam a invalidação. */
export const CHAVES = {
  me: ["me"] as const,
  usuarios: ["usuarios"] as const,
  projetos: ["projetos"] as const,
  projeto: (id?: number | string) => ["projeto", String(id ?? "")] as const,
  dashboardProjeto: (id?: number | string) => ["projeto", String(id ?? ""), "dashboard"] as const,
  cronograma: (id?: number | string) => ["projeto", String(id ?? ""), "cronograma"] as const,
  projetosCards: ["projetos", "cards"] as const,
  projetosTimeline: ["projetos", "timeline"] as const,
  tarefas: ["tarefas"] as const,
  kanban: (projectId?: number | string | null) => ["tarefas", "kanban", String(projectId ?? "todos")] as const,
  calendario: ["tarefas", "calendario"] as const,
  dashboardExecutivo: ["dashboard", "executivo"] as const,
  dashboardFinanceiro: ["dashboard", "financeiro"] as const,
  dashboardRiscos: ["dashboard", "riscos"] as const,
  dashboardAlocacao: ["dashboard", "alocacao"] as const,
  alocacoes: ["alocacoes"] as const,
  conflitos: ["alocacoes", "conflitos"] as const,
  ocupacao: ["alocacoes", "ocupacao"] as const,
  recursos: ["recursos"] as const,
  timesheet: ["timesheet"] as const,
  riscos: ["riscos"] as const,
  matrizRiscos: ["riscos", "matriz"] as const,
  issues: ["issues"] as const,
  skills: ["skills"] as const,
  categoriasSkill: ["skills", "categorias"] as const,
  arvoreSkills: ["skills", "arvore"] as const,
  grafoSkills: ["skills", "grafo"] as const,
  perfisSkill: ["perfis-skill"] as const,
  matrizSkills: ["perfis-skill", "matriz"] as const,
  gap: ["capacidades", "gap"] as const,
  forecast: ["capacidades", "forecast"] as const,
  busFactor: ["capacidades", "bus-factor"] as const,
  painelCapacidades: ["capacidades", "painel"] as const,
  promocoes: ["capacidades", "promocoes"] as const,
  trilhas: ["capacidades", "trilhas"] as const,
  pdis: ["capacidades", "pdi"] as const,
  mentorias: ["capacidades", "mentorias"] as const,
  oportunidades: ["capacidades", "oportunidades"] as const,
  sucessao: ["capacidades", "sucessao"] as const,
  notificacoes: ["notificacoes"] as const,
  atividades: ["atividades"] as const,
  auditoria: ["auditoria"] as const,
  relatorios: ["relatorios"] as const,
  widgets: ["widgets"] as const,
  busca: (termo: string) => ["busca", termo] as const,
  orcamentos: ["orcamentos"] as const,
  lancamentos: ["lancamentos"] as const,
  evm: (id?: number | string) => ["evm", String(id ?? "")] as const,
  papeis: ["papeis"] as const,
  workflows: ["workflows"] as const,
  camposCustomizados: ["campos-customizados"] as const,
};
