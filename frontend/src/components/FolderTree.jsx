export default function FolderTree({ folders, onNavigate, onDelete }) {
  if (folders.length === 0) return null

  return (
    <div className="space-y-1">
      {folders.map((folder) => (
        <div
          key={folder.id}
          className="flex items-center justify-between group px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer"
        >
          <button
            className="flex items-center gap-2 text-sm text-gray-700 font-medium flex-1 text-left"
            onClick={() => onNavigate(folder)}
          >
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            {folder.name}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(folder.id) }}
            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs px-1"
            title="Delete folder"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
