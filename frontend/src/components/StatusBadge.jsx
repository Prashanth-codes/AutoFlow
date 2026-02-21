export default function StatusBadge({ status, size = 'md' }) {
  const getStatusClass = () => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
      case 'processed':
      case 'posted':
      case 'delivered':
      case 'active':
        return 'badge-success';
      case 'pending':
      case 'scheduled':
      case 'received':
        return 'badge-warning';
      case 'failed':
      case 'cancelled':
        return 'badge-danger';
      case 'partial':
      case 'shipped':
        return 'badge-info';
      default:
        return 'badge-default';
    }
  };

  return (
    <span className={`status-badge ${getStatusClass()} badge-${size}`}>
      {status || 'Unknown'}
    </span>
  );
}
