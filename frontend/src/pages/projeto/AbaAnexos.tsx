import { Cartao } from "@/components/ui";
import { ListaAnexos } from "@/components/anexos";
import { CHAVES } from "@/hooks";
import { Paperclip } from "lucide-react";

/* ==========================================================================
   Aba Anexos — arquivos do projeto (RF-11)
   ========================================================================== */

export function AbaAnexos({ projetoId }: { projetoId: number }) {
  return (
    <Cartao
      titulo="Anexos do projeto"
      subtitulo="Documentos, imagens e evidências compartilhados com a equipe"
      icone={Paperclip}
      corIcone="#0891B2"
    >
      <ListaAnexos
        entidade="portfolio.project"
        objetoId={projetoId}
        chaveInvalidar={CHAVES.projeto(projetoId)}
      />
    </Cartao>
  );
}
