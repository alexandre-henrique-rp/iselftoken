import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ArrowLeft, Eye, Rocket, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useCreateEmailTemplateVersion } from "~/hooks/use-create-email-template-version";
import { useEmailTemplate } from "~/hooks/use-email-template";
import { usePreviewEmailTemplateVersion } from "~/hooks/use-preview-email-template-version";
import { usePublishEmailTemplateVersion } from "~/hooks/use-publish-email-template-version";
import { useUpdateEmailTemplateVersion } from "~/hooks/use-update-email-template-version";
import { sanitizeHtmlPreview } from "~/lib/sanitize-html";
import type {
  CreateVersionPayload,
  EmailTemplateVersion,
} from "~/types/email-template";
import { EmailTemplatePreviewModal } from "./email-template-preview-modal";
import { EmailTemplateVariablesPanel } from "./email-template-variables-panel";
import { EmailTemplateVersionHistory } from "./email-template-version-history";

interface EmailTemplateEditorProps {
  slug: string;
}

type Tab = "html" | "texto" | "preview";

const FAKE_DATA = {
  userName: "João Silva",
  loginUrl: "https://app.iselftoken.com/login",
  code: "123456",
  expiresInMinutes: 10,
  validationUrl: "https://app.iselftoken.com/validate/abc",
  expiresInHours: 24,
  resetUrl: "https://app.iselftoken.com/reset/xyz",
  reason: "Documentação incompleta",
  contextUrl: "https://app.iselftoken.com/admin/kyc",
  founderName: "Maria Santos",
  startupName: "InovaTech LTDA",
  valorParcela: "R$ 12.500,00",
  intervaloDias: 30,
  numeroParcelas: 12,
  installmentNumber: 3,
  totalInstallments: 12,
  valor: "R$ 12.500,00",
  scheduledDate: "15/09/2026",
  rejectionReason: "Alocação não soma 100%",
  resubmitUrl: "https://app.iselftoken.com/founder/campaigns/1/financeiro",
  paidAt: "20/08/2026 14:35",
  txidC6: "C6BANK123456789",
  comprovanteUrl: "https://app.iselftoken.com/comprovante/123",
  recipientName: "Equipe Financeira",
  valorTotalPago: "R$ 150.000,00",
  reviewUrl: "https://app.iselftoken.com/financeiro/repasse/1",
  dashboardUrl: "https://app.iselftoken.com/founder/campaigns/1/financeiro",
  allocationPercents: {
    marketing: 30,
    desenvolvimento: 40,
    infraestrutura: 10,
    pessoal: 15,
    juridico: 2,
    operacional: 2,
    reservaCaixa: 1,
  },
};

export function EmailTemplateEditor({ slug }: EmailTemplateEditorProps) {
  const [activeTab, setActiveTab] = useState<Tab>("html");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [textContent, setTextContent] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [selectedVersion, setSelectedVersion] =
    useState<EmailTemplateVersion | null>(null);

  const { data: template, isLoading } = useEmailTemplate(slug);
  const createMutation = useCreateEmailTemplateVersion(slug);
  const updateMutation = useUpdateEmailTemplateVersion(slug);
  const publishMutation = usePublishEmailTemplateVersion(slug);
  const previewMutation = usePreviewEmailTemplateVersion(
    slug,
    selectedVersion?.id ?? "",
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Digite o conteúdo do email..." }),
    ],
    content: htmlContent,
    onUpdate: ({ editor }) => {
      setHtmlContent(editor.getHTML());
    },
  });

  useEffect(() => {
    if (template?.currentVersion) {
      const cv = template.currentVersion;
      setSubject(cv.subject);
      setSelectedVersion(template.versions.find((v) => v.id === cv.id) ?? null);
    }
  }, [template]);

  useEffect(() => {
    if (selectedVersion) {
      setSubject(selectedVersion.subject);
      setHtmlContent(selectedVersion.htmlTemplate);
      setTextContent(selectedVersion.textTemplate);
      editor?.commands.setContent(selectedVersion.htmlTemplate);
    }
  }, [selectedVersion, editor]);

  const handleInsertVariable = useCallback(
    (variable: string) => {
      if (editor) {
        editor.chain().focus().insertContent(variable).run();
      }
    },
    [editor],
  );

  const handleSaveDraft = useCallback(() => {
    const payload: CreateVersionPayload = {
      subject,
      htmlTemplate: htmlContent,
      textTemplate: textContent,
      variablesSchema: {
        type: "object",
        properties: {},
        required: [],
      },
      changeNote: changeNote || undefined,
    };

    if (selectedVersion && selectedVersion.status === "DRAFT") {
      updateMutation.mutate({ versionId: selectedVersion.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }, [
    subject,
    htmlContent,
    textContent,
    changeNote,
    selectedVersion,
    createMutation,
    updateMutation,
  ]);

  const handlePublish = useCallback(() => {
    if (!selectedVersion) {
      toast.error("Selecione uma versão para publicar");
      return;
    }
    if (selectedVersion.status !== "DRAFT") {
      toast.error("Apenas versões DRAFT podem ser publicadas");
      return;
    }
    publishMutation.mutate(selectedVersion.id);
  }, [selectedVersion, publishMutation]);

  const handlePreview = useCallback(() => {
    if (!selectedVersion) {
      toast.error("Selecione uma versão para visualizar");
      return;
    }
    setShowPreview(true);
    previewMutation.mutate(FAKE_DATA);
  }, [selectedVersion, previewMutation]);

  const handleSelectVersion = useCallback(
    (version: EmailTemplateVersion) => {
      setSelectedVersion(version);
      setSubject(version.subject);
      setHtmlContent(version.htmlTemplate);
      setTextContent(version.textTemplate);
      editor?.commands.setContent(version.htmlTemplate);
    },
    [editor],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Template não encontrado.
      </div>
    );
  }

  const variablesSchema = selectedVersion?.variablesSchema ?? {
    type: "object",
    properties: {},
    required: [],
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link
          to="/admin/email-templates"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <h1 className="text-2xl font-bold">Template: {template.name}</h1>
      </div>

      {/* LGPD Warning */}
      <div
        className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3"
        role="alert"
      >
        <strong className="text-amber-400">⚠️ LGPD:</strong>
        <span className="ml-2 text-sm text-amber-200">
          Não inclua dados pessoais (CPF, email, telefone) hardcoded. Use
          variáveis dinâmicas no formato{" "}
          <code className="bg-amber-500/20 px-1 rounded">{"{{variavel}}"}</code>
          . O backend detecta e bloqueia salvar PII hardcoded.
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium mb-1">
              Assunto:
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Assunto do email..."
            />
          </div>

          <div className="space-y-2">
            <div className="flex gap-1 border-b border-border">
              {(["html", "texto", "preview"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "html"
                    ? "HTML"
                    : tab === "texto"
                      ? "Texto"
                      : "Preview"}
                </button>
              ))}
            </div>

            {activeTab === "html" && editor && (
              <div className="border border-border rounded-md overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 border-b border-border flex gap-2">
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`px-2 py-1 text-sm rounded ${editor.isActive("bold") ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`px-2 py-1 text-sm rounded italic ${editor.isActive("italic") ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`px-2 py-1 text-sm rounded line-through ${editor.isActive("strike") ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    S
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      editor.chain().focus().toggleBulletList().run()
                    }
                    className={`px-2 py-1 text-sm rounded ${editor.isActive("bulletList") ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    •
                  </button>
                </div>
                <EditorContent
                  editor={editor}
                  className="prose prose-sm max-w-none p-4 min-h-[300px]"
                />
              </div>
            )}

            {activeTab === "texto" && (
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono min-h-[300px]"
                placeholder="Versão texto do email..."
              />
            )}

            {activeTab === "preview" && (
              <div className="border border-border rounded-md p-4 min-h-[300px] bg-white text-black">
                <div className="mb-4">
                  <strong>Assunto:</strong> {subject || "(sem assunto)"}
                </div>
                <div
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtmlPreview(
                      htmlContent || "<p>(sem conteúdo)</p>",
                    ),
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="changeNote"
              className="block text-sm font-medium mb-1"
            >
              Nota de alteração (opcional):
            </label>
            <textarea
              id="changeNote"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Descreva as alterações..."
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={!selectedVersion || previewMutation.isPending}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Salvar Draft
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={
                !selectedVersion ||
                selectedVersion.status !== "DRAFT" ||
                publishMutation.isPending
              }
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Rocket className="h-4 w-4" />
              Publicar
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <EmailTemplateVariablesPanel
            variablesSchema={variablesSchema}
            onInsertVariable={handleInsertVariable}
          />

          <EmailTemplateVersionHistory
            versions={template.versions ?? []}
            selectedVersionId={selectedVersion?.id ?? null}
            onSelectVersion={handleSelectVersion}
          />
        </div>
      </div>

      {showPreview && (
        <EmailTemplatePreviewModal
          rendered={previewMutation.data ?? null}
          isLoading={previewMutation.isPending}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
