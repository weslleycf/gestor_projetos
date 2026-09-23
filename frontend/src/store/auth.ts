import { create } from "zustand";
import { api, registrarExpiracao, tokens, type RespostaLogin, type RespostaMe } from "@/lib/api";
import { useUi } from "@/store/ui";
import type { Usuario } from "@/lib/types";

interface EstadoAuth {
  usuario: Usuario | null;
  permissoes: string[];
  config: RespostaMe["config"] | null;
  naoLidas: number;
  carregando: boolean;
  erro: string | null;
  entrar: (email: string, senha: string, manterSessao?: boolean) => Promise<void>;
  sair: () => void;
  carregarSessao: () => Promise<boolean>;
  atualizarPerfil: (dados: Partial<Usuario>) => Promise<void>;
  pode: (permissao: string) => boolean;
  atualizarNaoLidas: (valor: number) => void;
}

export const useAuth = create<EstadoAuth>((set, get) => ({
  usuario: null,
  permissoes: [],
  config: null,
  naoLidas: 0,
  carregando: Boolean(tokens.access),
  erro: null,

  entrar: async (email, senha, manterSessao = true) => {
    set({ erro: null });
    const dados = await api.post<RespostaLogin>("/auth/token/", { email, password: senha });
    tokens.salvar(dados.access, dados.refresh, manterSessao);
    set({ usuario: dados.usuario, permissoes: dados.permissoes });
    const me = await api.get<RespostaMe>("/auth/me/");
    set({ config: me.config, naoLidas: me.nao_lidas, permissoes: me.permissoes, usuario: me.usuario });
    useUi.getState().sincronizar({
      tema: me.usuario.tema,
      paleta: me.usuario.paleta,
      tema_custom: me.usuario.tema_custom,
      densidade: me.usuario.densidade,
    });
  },

  sair: () => {
    api.post("/auth/logout/").catch(() => undefined);
    tokens.limpar();
    set({ usuario: null, permissoes: [], config: null, naoLidas: 0, erro: null });
  },

  carregarSessao: async () => {
    if (!tokens.access) {
      set({ carregando: false });
      return false;
    }
    try {
      const me = await api.get<RespostaMe>("/auth/me/");
      set({
        usuario: me.usuario,
        permissoes: me.permissoes,
        config: me.config,
        naoLidas: me.nao_lidas,
        carregando: false,
      });
      useUi.getState().sincronizar({
        tema: me.usuario.tema,
        paleta: me.usuario.paleta,
        tema_custom: me.usuario.tema_custom,
        densidade: me.usuario.densidade,
      });
      return true;
    } catch {
      tokens.limpar();
      set({ usuario: null, permissoes: [], carregando: false });
      return false;
    }
  },

  atualizarPerfil: async (dados) => {
    const atualizado = await api.patch<Usuario>("/auth/me/", dados);
    set({ usuario: atualizado });
  },

  pode: (permissao) => {
    const { permissoes } = get();
    if (permissoes.includes("*") || permissoes.includes(permissao)) return true;
    const recurso = permissao.split(".")[0];
    return permissoes.includes(recurso + ".*");
  },

  atualizarNaoLidas: (valor) => set({ naoLidas: valor }),
}));

registrarExpiracao(() => {
  useAuth.setState({ usuario: null, permissoes: [], naoLidas: 0, carregando: false });
});
