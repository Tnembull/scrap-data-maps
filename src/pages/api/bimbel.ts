import type { NextApiRequest, NextApiResponse } from 'next'
import axios, { AxiosResponse } from 'axios'
import fs from 'fs'
import path from 'path'

interface BimbelPlace {
  name: string
  address: string
  phone: string
  website: string
}

// Delay helper
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

// ===== FILE CACHE HANDLER =====
const getCachePath = (key: string) =>
  path.join(process.cwd(), 'cache', `${encodeURIComponent(key)}.json`)

const readFromCache = (key: string): BimbelPlace[] | null => {
  const filePath = getCachePath(key)
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(content)
  }
  return null
}

const writeToCache = (key: string, data: BimbelPlace[]): void => {
  const filePath = getCachePath(key)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf8')
}

// ===== MAIN HANDLER =====
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const keyword = req.query.keyword as string
  const apiKey = process.env.GOOGLE_API_KEY

  if (!keyword) {
    return res.status(400).json({ success: false, message: 'Keyword is required' })
  }

  const cacheKey = keyword.toLowerCase().trim()
  const cached = readFromCache(cacheKey)
  if (cached) {
    return res.status(200).json({ success: true, keyword, cached: true, total: cached.length, data: cached })
  }

  const getPlacesByKeyword = async (keyword: string): Promise<PlaceSummary[]> => {
    let nextPageToken: string | null = null
    const allResults: PlaceSummary[] = []

    do {
      interface TextSearchResponse {
        status: string;
        results: PlaceSummary[];
        next_page_token?: string;
      }
      const response: AxiosResponse<TextSearchResponse> = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
        params: {
          query: keyword,
          region: 'id',
          key: apiKey,
          pagetoken: nextPageToken,
        },
      })

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') break

      allResults.push(...response.data.results)
      nextPageToken = response.data.next_page_token ?? null
      if (nextPageToken) await delay(2500)
    } while (nextPageToken)

    return allResults
  }

  interface PlaceSummary {
    place_id: string;
  }

  const getDetails = async (places: PlaceSummary[]): Promise<BimbelPlace[]> => {
    return Promise.all(
      places.map(async (place) => {
        interface PlaceDetailsResponse {
          result: {
            name: string;
            formatted_address: string;
            international_phone_number?: string;
            website?: string;
          };
        }

        const detail: AxiosResponse<PlaceDetailsResponse> = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
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
    writeToCache(cacheKey, detailed)
    return res.status(200).json({ success: true, keyword, total: detailed.length, data: detailed })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ success: false, message: errorMessage })
  }
}
