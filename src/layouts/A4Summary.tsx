interface A4SummaryProps {
  summary: string;
}

export function A4Summary({ summary }: A4SummaryProps) {
  return (
    <div className="a4-summary">
      {summary}
    </div>
  );
}
