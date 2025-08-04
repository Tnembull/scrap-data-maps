import { useState } from 'react'
import Papa from 'papaparse'

type Bimbel = {
  name: string
  address: string
  phone: string
  website: string
}

export default function HomePage() {
  const [keyword, setKeyword] = useState('')
  const [data, setData] = useState<Bimbel[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSearched(true)

    try {
      const res = await fetch(`/api/bimbel?keyword=${encodeURIComponent(keyword)}`)
      const json = await res.json()
      setData(json.data || [])
    } catch (error) {
      console.error('❌ Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCSV = () => {
    const csvData = data.map((item, index) => ({
      No: index + 1,
      Nama: item.name,
      Alamat: item.address,
      Telepon: item.phone,
      Website: item.website,
    }))

    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `bimbel-${keyword}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto" style={{ background: '#f9f9f9', minHeight: '100vh', color: '#111' }}>
      <h1 className="text-2xl font-bold mb-4">Cari Bimbel di Google Maps</h1>

      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Contoh: bimbel UTBK Bandar Lampung"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="border p-2 w-full rounded"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 rounded">Cari</button>
      </form>

      {loading && <p>⏳ Mengambil data...</p>}
      {searched && !loading && data.length === 0 && <p>❌ Tidak ditemukan hasil.</p>}

      {data.length > 0 && (
        <>
          <button
            onClick={handleDownloadCSV}
            className="mb-4 bg-green-600 text-white px-4 py-2 rounded"
          >
            ⬇ Download CSV
          </button>

          <table className="table-auto w-full text-sm border" style={{ backgroundColor: '#fff' }}>
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">No</th>
                <th className="border p-2">Nama</th>
                <th className="border p-2">Alamat</th>
                <th className="border p-2">Telepon</th>
                <th className="border p-2">Website</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={i}>
                  <td className="border p-2">{i + 1}</td>
                  <td className="border p-2">{item.name}</td>
                  <td className="border p-2">{item.address}</td>
                  <td className="border p-2">{item.phone}</td>
                  <td className="border p-2">
                    <a href={item.website} target="_blank" className="text-blue-500 underline">
                      {item.website}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
