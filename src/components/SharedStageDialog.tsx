import { Modal } from "./Modal";

interface SharedStageDialogProps {
  open: boolean;
  // The endless stage the player would abandon.
  stageNumber: number;
  onAccept: () => void;
  onKeep: () => void;
}

export function SharedStageDialog({
  open,
  stageNumber,
  onAccept,
  onKeep,
}: SharedStageDialogProps) {
  return (
    <Modal open={open} title="Play a shared stage?" onClose={onKeep}>
      <p>
        You're partway through stage {stageNumber}. Playing the shared stage
        abandons it, though words you've already finished stay in your stats.
      </p>
      <div className="modal-actions">
        <button
          type="button"
          className="primary"
          onClick={onAccept}
          data-autofocus
        >
          Play shared stage
        </button>
        <button type="button" className="secondary" onClick={onKeep}>
          Keep my stage
        </button>
      </div>
    </Modal>
  );
}
