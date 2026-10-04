import { lazy, Suspense } from "react";
import { useParams } from "react-router";

const EmailTemplateEditor = lazy(() =>
  import("~/components/admin/email-templates/email-template-editor").then((m) => ({
    default: m.EmailTemplateEditor,
  })),
);

export function meta() {
  return [{ title: "Editar Template | iSelfToken Admin" }];
}

export default function AdminEmailTemplateEditorPage() {
  const { slug } = useParams();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Suspense fallback={<div className="text-muted-foreground p-8">Carregando editor…</div>}>
        <EmailTemplateEditor slug={slug!} />
      </Suspense>
    </div>
  );
}
