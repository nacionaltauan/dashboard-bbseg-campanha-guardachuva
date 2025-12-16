"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { Calendar, MapPin, ArrowUpDown } from "lucide-react"
import { fetchPinterestNacionalData } from "../../services/api"
import Loading from "../../components/Loading/Loading"
import PDFDownloadButton from "../../components/PDFDownloadButton/PDFDownloadButton"
import MediaThumbnail from "../../components/MediaThumbnail/MediaThumbnail" 
import PinterestCreativeModal, { PinterestCreativeData } from "./components/PinterestCreativeModal"
import { googleDriveApi } from "../../services/googleDriveApi"

const CriativosPinterest: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null)
  
  // Estado para dados brutos da API
  const [apiData, setApiData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const [processedData, setProcessedData] = useState<PinterestCreativeData[]>([])
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" })
  const [selectedModalidades, setSelectedModalidades] = useState<string[]>([])
  const [availableModalidades, setAvailableModalidades] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc")
  
  const [creativeMedias, setCreativeMedias] = useState<Map<string, { url: string, type: string }>>(new Map())
  const [mediasLoading, setMediasLoading] = useState(false)

  const [selectedCreative, setSelectedCreative] = useState<PinterestCreativeData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Carregar dados da API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const data = await fetchPinterestNacionalData()
        setApiData(data)
      } catch (err) {
        console.error("Erro ao carregar dados do Pinterest:", err)
        setError(err instanceof Error ? err : new Error("Erro desconhecido"))
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Carregar mídias do Google Drive
  useEffect(() => {
    const loadMedias = async () => {
      setMediasLoading(true)
      try {
        // Usando "pinterest" como plataforma no drive (assumindo que existe pasta ou mapeamento similar)
        const mediaMap = await googleDriveApi.getPlatformImages("pinterest")
        setCreativeMedias(mediaMap)
      } catch (error) {
        console.error("Error loading Pinterest medias:", error)
      } finally {
        setMediasLoading(false)
      }
    }

    loadMedias()
  }, [])

  // Processamento dos dados
  useEffect(() => {
    const values = apiData?.data?.values || apiData?.values
    if (!values || values.length <= 1) return

    const headers = values[0]
    const rows = values.slice(1)

    // Helper de parse
    const parseNumber = (v: string) => {
      if (!v?.trim()) return 0
      const clean = v
        .replace(/[R$\s]/g, "")
        .replace(/\./g, "")
        .replace(",", ".")
      return isNaN(+clean) ? 0 : +clean
    }

    const parseInteger = (v: string) => {
      if (!v?.trim()) return 0
      const clean = v.replace(/\./g, "").replace(",", "")
      const n = Number.parseInt(clean, 10)
      return isNaN(n) ? 0 : n
    }

    const mapped: PinterestCreativeData[] = rows.map((row: string[]) => {
      const get = (field: string) => {
        // Tentar encontrar case-insensitive e trim
        const idx = headers.findIndex((h: string) => h && h.toString().trim().toLowerCase() === field.toLowerCase())
        return idx >= 0 ? (row[idx] ?? "") : ""
      }
      
      // Tentativas de encontrar os campos com variações
      const getAny = (fields: string[]) => {
        for (const f of fields) {
            const val = get(f)
            if (val) return val
        }
        return ""
      }

      return {
        date: getAny(["Date", "Data", "Day"]),
        campaignName: getAny(["Campaign name", "Campaign"]),
        adGroupName: getAny(["Ad group name", "Ad group"]),
        adName: getAny(["Creative title", "Ad name", "Pin title"]),
        videoThumbnailUrl: "", // Não tem na aba tratado geralmente, mas mantemos interface
        impressions: parseInteger(getAny(["Impressions", "Impr."])),
        clicks: parseInteger(getAny(["Clicks", "Link clicks"])),
        cost: parseNumber(getAny(["Total spent", "Spend", "Cost"])),
        cpc: 0, // Será calculado
        cpm: 0, // Será calculado
        reach: parseInteger(getAny(["Reach", "Alcance"])), // Pode não ter na aba tratado, mas tentamos
        frequency: 0, // Será calculado
        results: parseInteger(getAny(["Total engagements", "Engagements", "Results"])),
        videoViews: parseInteger(getAny(["Video views", "Views"])),
        videoViews100: parseInteger(getAny(["Video views at 100%", "Video completions", "Plays at 100%"])),
        
        // Campos extras para compatibilidade
        paidLikes: 0,
        paidComments: 0,
        paidShares: 0,
        paidFollows: 0,
        profileVisits: 0
      }
    })

    // Função para validar e converter data
    const parseAndValidateDate = (dateStr: string): Date | null => {
      if (!dateStr || !dateStr.trim()) return null
      let date: Date | null = null
      
      if (dateStr.includes("/")) {
        const parts = dateStr.split("/")
        if (parts.length === 3) {
          const [day, month, year] = parts
          date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
        }
      } else if (dateStr.includes("-")) {
        date = new Date(dateStr)
      } else {
        date = new Date(dateStr)
      }
      
      if (date && !isNaN(date.getTime())) {
        return date
      }
      return null
    }

    const processed: PinterestCreativeData[] = mapped.filter((item) => Boolean(item.date))

    // Calcular métricas derivadas se não vieram da API
    processed.forEach(item => {
        if (item.impressions > 0) {
            item.cpm = (item.cost / item.impressions) * 1000
        }
        if (item.clicks > 0) {
            item.cpc = item.cost / item.clicks
        }
        if (item.reach > 0) {
            item.frequency = item.impressions / item.reach
        }
    })

    setProcessedData(processed)

    const validDates = processed
      .map((i) => parseAndValidateDate(i.date))
      .filter((date): date is Date => date !== null)
      .sort((a, b) => a.getTime() - b.getTime())

    if (validDates.length > 0) {
      setDateRange({
        start: validDates[0].toISOString().slice(0, 10),
        end: validDates[validDates.length - 1].toISOString().slice(0, 10),
      })
    }

    // Detectar modalidades
    const modalidadeSet = new Set<string>()
    processed.forEach((item) => {
      const detectedModalidade = detectModalidadeFromCreative(item.adName)
      if (detectedModalidade) {
        modalidadeSet.add(detectedModalidade)
      }
    })
    setAvailableModalidades(Array.from(modalidadeSet).filter(Boolean).sort())

  }, [apiData])

  const detectModalidadeFromCreative = (adName: string): string | null => {
    if (!adName) return null
    const lowerAdName = adName.toLowerCase()
    if (lowerAdName.includes("empresarial")) return "empresarial"
    if (lowerAdName.includes("residencial")) return "residencial"
    if (lowerAdName.includes("vida")) return "vida"
    return null
  }

  const toggleModalidade = (modalidade: string) => {
    setSelectedModalidades((prev) => {
      if (prev.includes(modalidade)) return prev.filter((m) => m !== modalidade)
      return [...prev, modalidade]
    })
  }

  // Filtragem e Agregação
  const filteredData = useMemo(() => {
    let filtered = processedData

    // Filtro Data
    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start)
      const endDate = new Date(dateRange.end)
      startDate.setHours(0,0,0,0)
      endDate.setHours(0,0,0,0)

      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.date) // Assumindo formato compatível após parse inicial ou string ISO
        // Re-parse simples se necessário
        if (item.date.includes("/")) {
           const [d, m, y] = item.date.split("/")
           itemDate.setFullYear(parseInt(y), parseInt(m)-1, parseInt(d))
        }
        itemDate.setHours(0,0,0,0)
        return itemDate >= startDate && itemDate <= endDate
      })
    }

    // Filtro Modalidade
    if (selectedModalidades.length > 0) {
      filtered = filtered.filter((item) => {
        const mod = detectModalidadeFromCreative(item.adName)
        return mod && selectedModalidades.includes(mod)
      })
    }

    // Agrupamento por Criativo (Ad Name)
    const groupedData: Record<string, PinterestCreativeData> = {}
    filtered.forEach((item) => {
      // Chave de agrupamento: Nome do anúncio
      const key = item.adName
      if (!groupedData[key]) {
        groupedData[key] = { ...item }
      } else {
        groupedData[key].impressions += item.impressions
        groupedData[key].clicks += item.clicks
        groupedData[key].cost += item.cost
        groupedData[key].reach += item.reach
        groupedData[key].results += item.results
        groupedData[key].videoViews += item.videoViews
        groupedData[key].videoViews100 += item.videoViews100
      }
    })

    const finalData = Object.values(groupedData).map((item) => ({
      ...item,
      cpm: item.impressions > 0 ? (item.cost / item.impressions) * 1000 : 0,
      cpc: item.clicks > 0 ? item.cost / item.clicks : 0,
      frequency: item.reach > 0 ? item.impressions / item.reach : 0,
    }))

    // Ordenação
    finalData.sort((a, b) => {
        if (sortOrder === "desc") return b.cost - a.cost
        return a.cost - b.cost
    })

    return finalData
  }, [processedData, dateRange, selectedModalidades, sortOrder])

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredData.slice(startIndex, endIndex)
  }, [filteredData, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)

  const totals = useMemo(() => {
    return {
      investment: filteredData.reduce((sum, item) => sum + item.cost, 0),
      impressions: filteredData.reduce((sum, item) => sum + item.impressions, 0),
      clicks: filteredData.reduce((sum, item) => sum + item.clicks, 0),
      avgCpm: 0,
      avgCpc: 0,
      ctr: 0,
    }
  }, [filteredData])

  if (filteredData.length > 0) {
    totals.avgCpm = totals.impressions > 0 ? (totals.investment / totals.impressions) * 1000 : 0
    totals.avgCpc = totals.clicks > 0 ? totals.investment / totals.clicks : 0
    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
  }

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toLocaleString("pt-BR")
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  const openCreativeModal = (creative: PinterestCreativeData) => {
    const driveMediaData = googleDriveApi.findMediaForCreative(creative.adName, creativeMedias)
    const creativeWithMedia = {
      ...creative,
      mediaUrl: driveMediaData?.url || undefined
    }
    setSelectedCreative(creativeWithMedia)
    setIsModalOpen(true)
  }

  const closeCreativeModal = () => {
    setIsModalOpen(false)
    setSelectedCreative(null)
  }

  if (loading) return <Loading message="Carregando dados do Pinterest..." />
  
  if (error) {
    return (
        <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-lg p-4">
            <p className="text-red-600">Erro ao carregar dados: {error.message}</p>
        </div>
    )
  }

  return (
    <div ref={contentRef} className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-700 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.399.165-1.495-.69-2.433-2.852-2.433-4.587 0-3.728 2.708-7.152 7.812-7.152 4.1 0 7.29 2.926 7.29 6.837 0 4.08-2.571 7.365-6.142 7.365-1.199 0-2.324-.62-2.711-1.356l-.736 2.802c-.268 1.035-.996 2.323-1.488 3.111 1.118.346 2.316.533 3.554.533 6.627 0 12.017-5.392 12.017-12.016C24.034 5.367 18.644 0 12.017 0z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 text-enhanced">Pinterest - Criativos</h1>
            <p className="text-gray-600">Performance dos criativos na plataforma Pinterest</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-4 text-sm text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-lg">
                <PDFDownloadButton contentRef={contentRef} fileName="criativos-pinterest" />
                <span>Última atualização: {new Date().toLocaleString("pt-BR")}</span>
            </div>
        </div>
      </div>

      <div className="card-overlay rounded-lg shadow-lg p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Período
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Modalidades
            </label>
            <div className="flex flex-wrap gap-2">
              {availableModalidades.map((modalidade) => (
                <button
                  key={modalidade}
                  onClick={() => toggleModalidade(modalidade)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                    selectedModalidades.includes(modalidade)
                      ? "bg-red-100 text-red-800 border border-red-300"
                      : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {modalidade}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="card-overlay rounded-lg shadow-lg p-4 text-center">
          <div className="text-sm text-gray-600 mb-1">Investimento</div>
          <div className="text-lg font-bold text-gray-900">{formatCurrency(totals.investment)}</div>
        </div>
        <div className="card-overlay rounded-lg shadow-lg p-4 text-center">
          <div className="text-sm text-gray-600 mb-1">Impressões</div>
          <div className="text-lg font-bold text-gray-900">{formatNumber(totals.impressions)}</div>
        </div>
        <div className="card-overlay rounded-lg shadow-lg p-4 text-center">
          <div className="text-sm text-gray-600 mb-1">Cliques</div>
          <div className="text-lg font-bold text-gray-900">{formatNumber(totals.clicks)}</div>
        </div>
        <div className="card-overlay rounded-lg shadow-lg p-4 text-center">
          <div className="text-sm text-gray-600 mb-1">CPM</div>
          <div className="text-lg font-bold text-gray-900">{formatCurrency(totals.avgCpm)}</div>
        </div>
        <div className="card-overlay rounded-lg shadow-lg p-4 text-center">
          <div className="text-sm text-gray-600 mb-1">CPC</div>
          <div className="text-lg font-bold text-gray-900">{formatCurrency(totals.avgCpc)}</div>
        </div>
        <div className="card-overlay rounded-lg shadow-lg p-4 text-center">
          <div className="text-sm text-gray-600 mb-1">CTR</div>
          <div className="text-lg font-bold text-gray-900">{totals.ctr.toFixed(2)}%</div>
        </div>
      </div>

      <div className="flex-1 card-overlay rounded-lg shadow-lg p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-red-600 text-white">
                <th className="text-left py-3 px-4 font-semibold w-[5rem]">Mídia</th>
                <th className="text-left py-3 px-4 font-semibold">Criativo</th>
                <th
                  className="text-right py-3 px-4 font-semibold min-w-[7.5rem] cursor-pointer hover:bg-red-700 transition-colors"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                >
                  <div className="flex items-center justify-end">
                    Investimento
                    <ArrowUpDown className="w-4 h-4 ml-2" />
                  </div>
                </th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">Impressões</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">Cliques</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">Views</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">Views 100%</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">CPM</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">CPC</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">CTR</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((creative, index) => {
                const driveMediaData = googleDriveApi.findMediaForCreative(creative.adName, creativeMedias)
                const ctr = creative.impressions > 0 ? (creative.clicks / creative.impressions) * 100 : 0
                
                return (
                  <tr key={index} className={index % 2 === 0 ? "bg-red-50" : "bg-white"}>
                    <td className="py-3 px-4 w-[5rem]">
                      <MediaThumbnail
                        mediaData={driveMediaData}
                        creativeName={creative.adName}
                        isLoading={mediasLoading}
                        size="md"
                        onClick={() => openCreativeModal(creative)}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900 text-sm leading-tight whitespace-normal break-words cursor-pointer hover:text-red-600" onClick={() => openCreativeModal(creative)}>
                          {creative.adName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 leading-tight whitespace-normal break-words">
                          {creative.campaignName}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold min-w-[7.5rem]">
                      {formatCurrency(creative.cost)}
                    </td>
                    <td className="py-3 px-4 text-right min-w-[7.5rem]">{formatNumber(creative.impressions)}</td>
                    <td className="py-3 px-4 text-right min-w-[7.5rem]">{formatNumber(creative.clicks)}</td>
                    <td className="py-3 px-4 text-right min-w-[7.5rem]">{formatNumber(creative.videoViews)}</td>
                    <td className="py-3 px-4 text-right min-w-[7.5rem]">{formatNumber(creative.videoViews100)}</td>
                    <td className="py-3 px-4 text-right min-w-[7.5rem]">{formatCurrency(creative.cpm)}</td>
                    <td className="py-3 px-4 text-right min-w-[7.5rem]">{formatCurrency(creative.cpc)}</td>
                    <td className="py-3 px-4 text-right min-w-[7.5rem]">{ctr.toFixed(2)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-500">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} -{" "}
            {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length} criativos
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo
            </button>
          </div>
        </div>
      </div>

      <PinterestCreativeModal 
        creative={selectedCreative}
        isOpen={isModalOpen}
        onClose={closeCreativeModal}
      />
    </div>
  )
}

export default CriativosPinterest