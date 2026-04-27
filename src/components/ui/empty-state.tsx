import { InboxIcon } from 'lucide-react'

interface Props {
  title?: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ title = 'Không tìm thấy kết quả', description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 p-4 rounded-full bg-blue-50">
        <InboxIcon size={48} className="text-blue-200" />
      </div>
      <p className="text-base font-medium text-slate-500">{title}</p>
      {description && <p className="text-sm text-slate-400 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
