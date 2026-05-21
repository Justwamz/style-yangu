interface BadgeProps {
  label: string
  variant?: 'default' | 'sponsored' | 'discount' | 'sold_out'
}

export default function Badge({ label, variant = 'default' }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    sponsored: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    discount: 'bg-red-50 text-red-600',
    sold_out: 'bg-gray-200 text-gray-500',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[variant]}`}>
      {label}
    </span>
  )
}
