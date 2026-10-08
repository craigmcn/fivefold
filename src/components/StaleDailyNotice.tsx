interface StaleDailyNoticeProps {
  // The daily being played, and today's day number.
  day: number;
  today: number;
}

// An earlier day's daily is kept while it's under way, so say so: otherwise
// "Daily #7" quietly disagrees with the #8 friends are playing.
export function StaleDailyNotice({ day, today }: StaleDailyNoticeProps) {
  const which =
    today - day === 1 ? `yesterday's daily (#${day})` : `Daily #${day}`;
  return (
    <p className="notice" role="status">
      You're finishing {which}. Today's (#{today}) starts when you're done.
    </p>
  );
}
