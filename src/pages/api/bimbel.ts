import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const keyword = req.query.keyword as string
  const apiKey = process.env.GOOGLE_API_KEY

  if (!keyword) {
    return res.status(400).json({ success: false, message: 'Keyword is required' })
  }

  const getPlacesByKeyword = async (keyword: string) => {
    let nextPageToken: string | null = null
    let allResults: any[] = []

    do {
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
        params: {
          query: keyword,
          region: 'id',
          key: apiKey,
          pagetoken: nextPageToken,
        },
      })

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') break

      allResults.push(...response.data.results)
      nextPageToken = response.data.next_page_token
      if (nextPageToken) await delay(2500)
    } while (nextPageToken)

    return allResults
  }

  const getDetails = async (places: any[]) => {
    return Promise.all(
      places.map(async (place) => {
        const detail = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
          params: {
            place_id: place.place_id,
            fields: 'name,formatted_address,international_phone_number,website',
            key: apiKey,
          },
        })

        const result = detail.data.result
        return {
          name: result.name,
          address: result.formatted_address,
          phone: result.international_phone_number || '-',
          website: result.website || '-',
        }
      })
    )
  }

  try {
    const places = await getPlacesByKeyword(keyword)
    const detailed = await getDetails(places)
    return res.status(200).json({ success: true, keyword, total: detailed.length, data: detailed })
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message })
  }
}
