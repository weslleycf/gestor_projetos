import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Download,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Paperclip,
  Trash2,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import { Alerta, Botao, BotaoIcone, Dica, Esqueleto, Modal, Vazio, useAvisos } from "@/components/ui";
import { useLista, useMutacao } from "@/hooks";
import { api, mensagemErro } from "@/lib/api";
import { dataRelativa } from "@/lib/format";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Lista de anexos compartilhada (RF-11)
   --------------------------------------------------------------------------
   O AnexoViewSet aceita upload multipart, listagem por entidade e exclusao
   desde o inicio, mas nenhuma tela chamava a API — o helper api.upload existia
   sem nenhum consumidor. Este bloco e usado no painel da tarefa (Kanban e
   detalhe do projeto) e na aba Anexos do projeto, para que o mesmo
   comportamento apareca em todas as telas.
   ========================================================================== */

export interface Anexo {
  id: ID;
  nome: string;
  url: string;
  mime: string;
  tamanho: number;
  enviado_por: ID | null;
  enviado_por_nome: string;
  criado_em: string;
}

/** Converte bytes em texto legivel (B, KB, MB, GB, TB). */
export function tamanhoLegivel(bytes?: number | null): string {
  const valor = Number(bytes) || 0;
  if (valor < 1024) return valor + " B";
  const unidades = ["KB", "MB", "GB", "TB"];
  let restante = valor / 1024;
  let indice = 0;
  while (restante >= 1024 && indice < unidades.length - 1) {
    restante = restante / 1024;
    indice = indice + 1;
  }
  const casas = restante >= 10 ? 0 : 1;
  return restante.toFixed(casas) + " " + unidades[indice];
}

/** Escolhe o icone a partir do mime e, na falta dele, da extensao. */
export function iconeDoAnexo(mime?: string | null, nome?: string | null): LucideIcon {
  const tipo = (mime || "").toLowerCase();
  const partes = (nome || "").toLowerCase().split(".");
  const extensao = partes.length > 1 ? partes[partes.length - 1] : "";

  if (tipo.indexOf("image/") === 0 || ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"].indexOf(extensao) >= 0) {
    return FileImage;
  }
  if (tipo.indexOf("video/") === 0 || ["mp4", "mov", "avi", "mkv", "webm"].indexOf(extensao) >= 0) return FileVideo;
  if (tipo.indexOf("audio/") === 0 || ["mp3", "wav", "ogg", "m4a"].indexOf(extensao) >= 0) return FileAudio;
  if (
    tipo.indexOf("zip") >= 0 ||
    tipo.indexOf("compressed") >= 0 ||
    ["zip", "rar", "7z", "tar", "gz"].indexOf(extensao) >= 0
  ) {
    return FileArchive;
  }
  if (
    tipo.indexOf("spreadsheet") >= 0 ||
    tipo.indexOf("excel") >= 0 ||
    tipo.indexOf("csv") >= 0 ||
    ["xls", "xlsx", "csv", "ods"].indexOf(extensao) >= 0
  ) {
    return FileSpreadsheet;
  }
  if (
    tipo.indexOf("json") >= 0 ||
    tipo.indexOf("javascript") >= 0 ||
    tipo.indexOf("xml") >= 0 ||
    ["json", "xml", "html", "css", "js", "ts", "tsx", "py", "sql", "yml", "yaml"].indexOf(extensao) >= 0
  ) {
    return FileCode;
  }
  if (
    tipo.indexOf("pdf") >= 0 ||
    tipo.indexOf("text/") === 0 ||
    tipo.indexOf("word") >= 0 ||
    tipo.indexOf("document") >= 0 ||
    ["pdf", "doc", "docx", "odt", "txt", "md", "rtf"].indexOf(extensao) >= 0
  ) {
    return FileText;
  }
  return File;
}

export function ListaAnexos({
  entidade,
  objetoId,
  chaveInvalidar,
  className,
  compacto = false,
}: {
  /** Identificador da entidade dona do anexo, ex.: "tasks.task". */
  entidade: string;
  objetoId: number | string;
  /** Chave de cache do bloco que hospeda a lista, invalidada a cada alteracao. */
  chaveInvalidar: readonly unknown[];
  className?: string;
  compacto?: boolean;
}) {
  const qc = useQueryClient();
  const { sucesso, erro: avisarErro } = useAvisos();
  const entradaRef = useRef<HTMLInputElement | null>(null);
  const [arrastando, definirArrastando] = useState(false);
  const [enviando, definirEnviando] = useState(false);
  const [progresso, definirProgresso] = useState({ atual: 0, total: 0 });
  const [excluindo, definirExcluindo] = useState<Anexo | null>(null);

  const chave = ["anexos", entidade, objetoId];
  const anexos = useLista<Anexo>(chave, "/anexos/", { entidade, objeto_id: objetoId, page_size: 100 });
  const lista = anexos.data ?? [];

  const excluir = useMutacao<{ id: ID }, unknown>({
    metodo: "delete",
    url: (v) => "/anexos/" + v.id + "/",
    invalidar: [chave, chaveInvalidar],
    mensagemSucesso: "Anexo excluído",
  });

  const enviarArquivos = async (selecionados: FileList | File[]) => {
    const arquivos: File[] = [];
    for (let i = 0; i < selecionados.length; i = i + 1) arquivos.push(selecionados[i]);
    if (arquivos.length === 0) return;

    definirEnviando(true);
    let enviados = 0;
    for (let i = 0; i < arquivos.length; i = i + 1) {
      definirProgresso({ atual: i + 1, total: arquivos.length });
      const dados = new FormData();
      dados.append("arquivo", arquivos[i]);
      dados.append("entidade", entidade);
      dados.append("objeto_id", String(objetoId));
      try {
        await api.upload<Anexo>("/anexos/", dados);
        enviados = enviados + 1;
      } catch (falha) {
        avisarErro("Não foi possível enviar " + arquivos[i].name, mensagemErro(falha));
      }
    }
    definirEnviando(false);
    definirProgresso({ atual: 0, total: 0 });
    await qc.invalidateQueries({ queryKey: chave });
    if (chaveInvalidar.length) await qc.invalidateQueries({ queryKey: chaveInvalidar });
    if (enviados > 0) {
      sucesso(enviados === 1 ? "Anexo enviado" : enviados + " anexos enviados");
    }
  };

  const confirmarExclusao = async () => {
    if (!excluindo) return;
    try {
      await excluir.mutateAsync({ id: excluindo.id });
      definirExcluindo(null);
    } catch (falha) {
      avisarErro("Não foi possível excluir o anexo", mensagemErro(falha));
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        onDragOver={(evento) => {
          evento.preventDefault();
          definirArrastando(true);
        }}
        onDragLeave={() => definirArrastando(false)}
        onDrop={(evento) => {
          evento.preventDefault();
          definirArrastando(false);
          if (evento.dataTransfer && evento.dataTransfer.files) enviarArquivos(evento.dataTransfer.files);
        }}
        className={cn(
          "rounded-sgp border border-dashed px-3 text-center transition-colors",
          compacto ? "py-3" : "py-4",
          arrastando ? "border-brand bg-brand-soft/40" : "border-border-strong bg-surface-2"
        )}
      >
        <input
          ref={entradaRef}
          type="file"
          multiple
          className="hidden"
          aria-label="Selecionar arquivos para anexar"
          onChange={(evento) => {
            if (evento.target.files) enviarArquivos(evento.target.files);
            evento.target.value = "";
          }}
        />
        <UploadCloud className={cn("mx-auto text-fg-subtle", compacto ? "size-4" : "size-5")} aria-hidden />
        <p className="mt-1.5 text-2xs text-fg-muted">
          {arrastando ? "Solte os arquivos para anexar" : "Arraste os arquivos aqui ou selecione do computador"}
        </p>
        <Botao
          variante="secundario"
          tamanho="sm"
          icone={Paperclip}
          carregando={enviando}
          className="mt-2"
          onClick={() => {
            if (entradaRef.current) entradaRef.current.click();
          }}
        >
          Selecionar arquivos
        </Botao>
        {enviando && progresso.total > 0 && (
          <p className="mt-1.5 text-[10px] text-fg-subtle">
            Enviando {progresso.atual} de {progresso.total}...
          </p>
        )}
      </div>

      {anexos.isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar os anexos">
          {mensagemErro(anexos.error)}
        </Alerta>
      )}

      {anexos.isLoading ? (
        <Esqueleto linhas={2} />
      ) : lista.length === 0 ? (
        <Vazio
          icone={Paperclip}
          titulo="Nenhum anexo"
          descricao="Envie documentos, imagens ou evidências para deixá-los junto deste registro."
          className="py-6"
        />
      ) : (
        <ul className="space-y-1.5">
          {lista.map((anexo) => {
            const Icone = iconeDoAnexo(anexo.mime, anexo.nome);
            return (
              <li
                key={anexo.id}
                className="flex items-center gap-2.5 rounded-sgp border border-border bg-surface-2 px-2.5 py-2"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-sgp bg-surface-3 text-fg-muted">
                  <Icone className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <a
                    href={anexo.url}
                    download={anexo.nome}
                    target="_blank"
                    rel="noreferrer"
                    title={"Baixar " + anexo.nome}
                    className="block truncate text-xs font-medium text-fg transition-colors hover:text-brand hover:underline"
                  >
                    {anexo.nome}
                  </a>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-fg-subtle">
                    <span className="tabular-nums">{tamanhoLegivel(anexo.tamanho)}</span>
                    {anexo.enviado_por_nome && <span>· enviado por {anexo.enviado_por_nome}</span>}
                    <span>· {dataRelativa(anexo.criado_em)}</span>
                  </span>
                </span>
                <Dica texto="Baixar arquivo">
                  <a
                    href={anexo.url}
                    download={anexo.nome}
                    target="_blank"
                    rel="noreferrer"
                    title={"Baixar " + anexo.nome}
                    aria-label={"Baixar " + anexo.nome}
                    className="inline-flex size-8 items-center justify-center rounded-sgp text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
                  >
                    <Download className="size-4" aria-hidden />
                  </a>
                </Dica>
                <Dica texto="Excluir anexo">
                  <BotaoIcone
                    icone={Trash2}
                    rotulo={"Excluir " + anexo.nome}
                    tamanho="sm"
                    className="hover:text-danger"
                    onClick={() => definirExcluindo(anexo)}
                  />
                </Dica>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        aberto={excluindo !== null}
        onFechar={() => definirExcluindo(null)}
        titulo="Excluir anexo"
        subtitulo="Esta ação não pode ser desfeita."
        largura="sm"
        rodape={
          <div className="flex justify-end gap-2">
            <Botao variante="fantasma" onClick={() => definirExcluindo(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluir.isPending}
              onClick={confirmarExclusao}
            >
              Excluir anexo
            </Botao>
          </div>
        }
      >
        <p className="text-xs text-fg-muted">
          O arquivo <strong className="text-fg">{excluindo ? excluindo.nome : ""}</strong> será removido deste registro e
          não poderá ser recuperado.
        </p>
      </Modal>
    </div>
  );
}
