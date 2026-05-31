import { useEffect, useState, useCallback, useRef } from 'react'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import FolderTree from '../components/FolderTree'
import FileList from '../components/FileList'

function TextPreview({ url }) {
  const [text, setText] = useState(null)
  useEffect(() => {
    fetch(url).then((r) => r.text()).then(setText).catch(() => setText('Could not load file.'))
  }, [url])
  if (text === null) return <p className="text-sm text-gray-400">Loading…</p>
  return (
    <pre className="w-full text-xs text-gray-700 whitespace-pre-wrap break-words bg-white rounded border border-gray-200 p-4 overflow-auto max-h-[70vh]">
      {text}
    </pre>
  )
}

export default function Dashboard() {
  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'My Files' }])
  const [folders, setFolders] = useState([])
  const [files, setFiles] = useState([])
  const [searchResults, setSearchResults] = useState(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [shareModal, setShareModal] = useState(null)
  const [previewModal, setPreviewModal] = useState(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef()
  const searchTimeout = useRef()

  const loadContent = useCallback(async (folderId) => {
    setError('')
    try {
      const [foldersRes, filesRes] = await Promise.all([
        api.get('/folders', { params: folderId ? { parent_id: folderId } : {} }),
        api.get('/files', { params: folderId ? { folder_id: folderId } : {} }),
      ])
      setFolders(foldersRes.data)
      setFiles(filesRes.data)
    } catch {
      setError('Failed to load content')
    }
  }, [])

  useEffect(() => {
    loadContent(currentFolderId)
  }, [currentFolderId, loadContent])

  const navigateToFolder = (folder) => {
    setCurrentFolderId(folder.id)
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }])
    setSearchResults(null)
  }

  const navigateToBreadcrumb = (idx) => {
    const crumb = breadcrumbs[idx]
    setBreadcrumbs((prev) => prev.slice(0, idx + 1))
    setCurrentFolderId(crumb.id)
    setSearchResults(null)
  }

  const handleSearch = (q) => {
    clearTimeout(searchTimeout.current)
    if (!q.trim()) { setSearchResults(null); return }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await api.get('/files/search', { params: { q } })
        setSearchResults(res.data)
      } catch {
        setSearchResults([])
      }
    }, 300)
  }

  const createFolder = async (e) => {
    e.preventDefault()
    if (!newFolderName.trim()) return
    try {
      await api.post('/folders', {
        name: newFolderName.trim(),
        parent_folder_id: currentFolderId,
      })
      setNewFolderName('')
      setShowNewFolder(false)
      loadContent(currentFolderId)
    } catch {
      setError('Failed to create folder')
    }
  }

  const deleteFolder = async (folderId) => {
    if (!confirm('Delete this folder and all its contents?')) return
    try {
      await api.delete(`/folders/${folderId}`)
      loadContent(currentFolderId)
    } catch {
      setError('Failed to delete folder')
    }
  }

  const uploadFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const params = currentFolderId ? { folder_id: currentFolderId } : {}
      await api.post('/files/upload', form, { params, headers: { 'Content-Type': 'multipart/form-data' } })
      loadContent(currentFolderId)
    } catch {
      setError('Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const downloadFile = async (fileId) => {
    try {
      const res = await api.get(`/files/${fileId}/download`)
      window.open(res.data.url, '_blank')
    } catch {
      setError('Download failed')
    }
  }

  const viewFile = async (fileId, mimeType, fileName) => {
    try {
      const res = await api.get(`/files/${fileId}/download`)
      setPreviewModal({ url: res.data.url, mimeType, fileName })
    } catch {
      setError('Failed to load preview')
    }
  }

  const shareFile = async (fileId) => {
    try {
      const res = await api.post(`/files/${fileId}/share`, { expires_in_hours: 24 })
      setShareModal({ url: res.data.share_url, filename: res.data.token })
    } catch {
      setError('Failed to create share link')
    }
  }

  const deleteFile = async (fileId) => {
    if (!confirm('Move this file to trash?')) return
    try {
      await api.delete(`/files/${fileId}`)
      loadContent(currentFolderId)
      if (searchResults) setSearchResults((prev) => prev.filter((f) => f.id !== fileId))
    } catch {
      setError('Failed to delete file')
    }
  }

  const displayedFiles = searchResults ?? files

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar onSearch={handleSearch} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 text-sm mb-5 flex-wrap">
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-1">
              {idx > 0 && <span className="text-gray-400">/</span>}
              <button
                onClick={() => navigateToBreadcrumb(idx)}
                className={`${
                  idx === breadcrumbs.length - 1
                    ? 'text-gray-900 font-medium'
                    : 'text-blue-600 hover:underline'
                }`}
              >
                {crumb.name}
              </button>
            </span>
          ))}
          {searchResults && (
            <span className="text-gray-400 ml-2 text-xs">(search results)</span>
          )}
        </nav>

        {/* Error */}
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Actions bar */}
        {!searchResults && (
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => setShowNewFolder((v) => !v)}
              className="text-sm bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              + New Folder
            </button>
            <button
              onClick={() => fileInputRef.current.click()}
              disabled={uploading}
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={uploadFile} />
          </div>
        )}

        {/* New folder input */}
        {showNewFolder && (
          <form onSubmit={createFolder} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              autoFocus
              className="text-sm rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 flex-1 max-w-xs"
            />
            <button
              type="submit"
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowNewFolder(false)}
              className="text-sm text-gray-500 hover:text-gray-700 px-2"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Content */}
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {!searchResults && folders.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Folders</p>
              <FolderTree
                folders={folders}
                onNavigate={navigateToFolder}
                onDelete={deleteFolder}
              />
            </div>
          )}

          {displayedFiles.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {searchResults ? 'Search Results' : 'Files'}
              </p>
              <FileList
                files={displayedFiles}
                onDownload={downloadFile}
                onView={viewFile}
                onShare={shareFile}
                onDelete={deleteFile}
              />
            </div>
          )}

          {!searchResults && folders.length === 0 && files.length === 0 && (
            <div className="px-4 py-12 text-center text-gray-400 text-sm">
              This folder is empty. Upload a file or create a folder to get started.
            </div>
          )}

          {searchResults && searchResults.length === 0 && (
            <div className="px-4 py-12 text-center text-gray-400 text-sm">
              No files found.
            </div>
          )}
        </div>
      </main>

      {/* Preview modal */}
      {previewModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-800 truncate">{previewModal.fileName}</span>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={previewModal.url}
                  download={previewModal.fileName}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Download
                </a>
                <button
                  onClick={() => setPreviewModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50 p-4">
              {previewModal.mimeType?.startsWith('image/') && (
                <img
                  src={previewModal.url}
                  alt={previewModal.fileName}
                  className="max-w-full max-h-full object-contain rounded"
                />
              )}
              {previewModal.mimeType?.startsWith('video/') && (
                <video
                  src={previewModal.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-full rounded"
                />
              )}
              {previewModal.mimeType === 'application/pdf' && (
                <iframe
                  src={previewModal.url}
                  title={previewModal.fileName}
                  className="w-full h-full min-h-[70vh] rounded border-0"
                />
              )}
              {previewModal.mimeType?.startsWith('text/') && (
                <TextPreview url={previewModal.url} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share modal */}
      {shareModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Share Link</h2>
            <p className="text-xs text-gray-500 mb-2">Expires in 24 hours</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareModal.url}
                className="flex-1 text-sm rounded-lg border-gray-300 bg-gray-50"
              />
              <button
                onClick={() => { navigator.clipboard.writeText(shareModal.url) }}
                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
              >
                Copy
              </button>
            </div>
            <button
              onClick={() => setShareModal(null)}
              className="mt-4 text-sm text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
