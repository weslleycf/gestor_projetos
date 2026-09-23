import { Cartao, CarregandoBloco, Vazio, useAvisos } from "@/components/ui";
import { ListaComentarios } from "@/components/comentarios";
import { CHAVES, useLista } from "@/hooks";
import { dataHora, dataRelativa, numero } from "@/lib/format";
import type { Comentario } from "@/lib/types";
import { Activity, MessageSquare } from "lucide-react";

/* O tipo local foi mantido com o nome original do arquivo de origem; o tipo
   global de mesmo nome não é usado nesta aba. */
interface Atividade {
  id: number;
  user: number | null;
  user_nome: string;
  user_cor: string;
  verbo: string;
  entidade: string;
  entidade_id: string;
  entidade_nome: string;
  projeto_id: number | null;
  meta: Record<string, unknown>;
  criado_em: string;
}

/* ==========================================================================
   Aba Atividade — timeline de atividades e comentarios (RF-35/RF-37)
   ========================================================================== */

export function AbaAtividade({ projetoId }: { projetoId: number }) {
  const { erro: avisarErro } = useAvisos();
  const atividades = useLista<Atividade>(CHAVES.atividades, "/atividades/", { projeto_id: projetoId });
  const comentarios = useLista<Comentario>(["comentarios", projetoId], "/comentarios/", {
    entidade: "portfolio.project",
    objeto_id: projetoId,
  });
  const listaAtividades = atividades.data ?? [];
  const listaComentarios = comentarios.data ?? [];

  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_440px]">
      <Cartao titulo="Histórico de atividades" subtitulo={numero(listaAtividades.length) + " evento(s) registrados"} icone={Activity} corIcone="#2563EB">
        {atividades.isLoading && <CarregandoBloco rotulo="Carregando atividades..." />}
        {!atividades.isLoading && listaAtividades.length === 0 && (
          <Vazio icone={Activity} titulo="Sem atividades registradas" descricao="As ações no projeto aparecem aqui automaticamente." />
        )}
        <ol className="relative space-y-3 border-l border-border pl-4">
          {listaAtividades.map((item) => (
            <li key={item.id} className="relative">
              <span
                className="absolute -left-[21px] top-1.5 size-2.5 rounded-full ring-4 ring-surface"
                style={{ backgroundColor: item.user_cor || "#2563EB" }}
                aria-hidden
              />
              <div className="rounded-sgp border border-border bg-surface-2 px-2.5 py-2">
                <p className="text-xs text-fg">
                  <span className="font-semibold">{item.user_nome || "Sistema"}</span> {item.verbo}{" "}
                  <span className="text-fg-muted">{item.entidade_nome}</span>
                </p>
                <p className="mt-0.5 text-2xs text-fg-subtle">
                  {dataHora(item.criado_em)} · {dataRelativa(item.criado_em)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Cartao>

      <Cartao titulo="Comentários" subtitulo={numero(listaComentarios.length) + " conversa(s)"} icone={MessageSquare} corIcone="#8B5CF6">
        <ListaComentarios
          entidade="portfolio.project"
          objetoId={projetoId}
          chaveInvalidar={["comentarios", projetoId]}
          placeholder="Escreva um comentário para a equipe do projeto..."
          vazio="Nenhum comentário ainda. Use este espaço para alinhar decisões e riscos."
        />
      </Cartao>
    </div>
  );
}
