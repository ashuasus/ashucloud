import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/axios'

export default function Share() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/share/${token}`)
      .then((res) => setData(res.data))
      .catch((err) => {
        const msg = err.response?.data?.detail || 'Link is invalid or has expired'
        setError(msg)
      })
  }, [token])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-blue-600 mb-4">AshuCloud</h1>

        {error ? (
          <p className="text-red-500 text-sm">{error}</p>
        ) : data ? (
          <>
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-800 font-medium mb-1 truncate">{data.filename}</p>
            <p className="text-xs text-gray-400 mb-5">Link expires in ~1 hour</p>
            <a
              href={data.url}
              target="_blank"
              rel="noreferrer"
              className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Download
            </a>
          </>
        ) : (
          <p className="text-gray-400 text-sm">Loading...</p>
        )}
      </div>
    </div>
  )
}
