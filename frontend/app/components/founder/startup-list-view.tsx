import { useState } from "react";
import { StartupCard, type Startup } from "./startup-card";
import { StartupActionsCell } from "./startup-actions-cell";
import { ConfirmPauseRoundDialog } from "./confirm-pause-round-dialog";
import { ConfirmCancelRoundDialog } from "./confirm-cancel-round-dialog";
import { usePauseRoundMutation } from "~/hooks/use-pause-round-mutation";
import { useCancelRoundMutation } from "~/hooks/use-cancel-round-mutation";

interface StartupListViewProps {
  startups: Startup[];
}

export function StartupListView({ startups }: StartupListViewProps) {
  const [selectedForPause, setSelectedForPause] = useState<Startup | null>(null);
  const [selectedForCancel, setSelectedForCancel] = useState<Startup | null>(null);

  const pauseMutation = usePauseRoundMutation({
    startupId: selectedForPause?.id ?? "",
    rodadaId: "0",
    onSuccess: () => setSelectedForPause(null),
  });

  const cancelMutation = useCancelRoundMutation({
    startupId: selectedForCancel?.id ?? "",
    rodadaId: "0",
    onSuccess: () => setSelectedForCancel(null),
  });

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {startups.map((s) => (
            <StartupCard
              key={s.id}
              startup={s}
              actions={
                <StartupActionsCell
                  startupId={s.id}
                  startupSlug={s.slug}
                  campaignStatus={s.campaignStatus}
                  roundStatus={s.roundStatus}
                  platformStatus={s.platformStatus}
                  phase3Rejected={s.phase3Rejected}
                  campaignId={s.campaignId}
                  repasseConfigurado={s.repasseConfigurado}
                  onConfirmPausar={() => setSelectedForPause(s)}
                  onConfirmCancelar={() => setSelectedForCancel(s)}
                />
              }
            />
        ))}
      </div>

      {selectedForPause && (
        <ConfirmPauseRoundDialog
          startupName={selectedForPause.name}
          loading={pauseMutation.isPending}
          onClose={() => setSelectedForPause(null)}
          onConfirm={() => pauseMutation.mutate()}
        />
      )}

      {selectedForCancel && (
        <ConfirmCancelRoundDialog
          startupName={selectedForCancel.name}
          loading={cancelMutation.isPending}
          totalAmount={selectedForCancel.raised || undefined}
          onClose={() => setSelectedForCancel(null)}
          onConfirm={() => cancelMutation.mutate()}
        />
      )}
    </>
  );
}
