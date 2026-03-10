interface MetricCardProps {
  label: string;
  value: string | number;
}

export default function MetricCard(props: MetricCardProps) {
  return (
    <article class="metric-card">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}
