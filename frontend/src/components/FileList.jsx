function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isViewable(mimeType) {
  if (!mimeType) return false
  return (
    mimeType.startsWith('image/') ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('text/') ||
    mimeType === 'application/pdf'
  )
}

function FileIcon({ mimeType }) {
  if (mimeType?.startsWith('image/')) {
    return (
      <svg className="w-5 h-5 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  }
  if (mimeType?.startsWith('video/')) {
    return (
      <svg className="w-5 h-5 text-pink-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M4 6h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
      </svg>
    )
  }
  if (mimeType === 'application/pdf') {
    return (
      <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  }
  return (
    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
}

export default function FileList({ files, onDownload, onView, onShare, onDelete }) {
  if (files.length === 0) return null

  return (
    <div className="space-y-1">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between group px-3 py-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileIcon mimeType={file.mime_type} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
              <p className="text-xs text-gray-400">
                {formatSize(file.size)} &middot; v{file.version}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 shrink-0">
            {isViewable(file.mime_type) && (
              <button
                onClick={() => onView(file.id, file.mime_type, file.name)}
                className="text-xs text-indigo-600 hover:underline"
              >
                View
              </button>
            )}
            <button
              onClick={() => onDownload(file.id)}
              className="text-xs text-blue-600 hover:underline"
            >
              Download
            </button>
            <button
              onClick={() => onShare(file.id)}
              className="text-xs text-green-600 hover:underline"
            >
              Share
            </button>
            <button
              onClick={() => onDelete(file.id)}
              className="text-xs text-red-500 hover:underline"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
