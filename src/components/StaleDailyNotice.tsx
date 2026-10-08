interface StaleDailyNoticeProps {
  // The daily being played, and today's day number.
  day: number;
  today: number;
  onDismiss: () => void;
}

// An earlier day's daily is kept while it's under way, so say so: otherwise
// "Daily #7" quietly disagrees with the #8 friends are playing.
export function StaleDailyNotice({
  day,
  today,
  onDismiss,
}: StaleDailyNoticeProps) {
  const which =
    today - day === 1 ? `yesterday's daily (#${day})` : `Daily #${day}`;
  return (
    <div className="notice">
      <p role="status">
        You're finishing {which}. Today's (#{today}) starts when you're done.
      </p>
      <button
        type="button"
        className="icon-button"
        aria-label="Dismiss notice"
        // Like the on-screen keys: never hold focus, so Enter can't re-press it.
        onMouseDown={(e) => e.preventDefault()}
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
}
