"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { Calendar, MapPin, Users, Search } from "lucide-react"
import { usePinterestNacionalData } from "../../services/api"
import Loading from "../../components/Loading/Loading"
import { googleDriveApi } from "../../services/googleDriveApi"
import PDFDownloadButton from "../../components/PDFDownloadButton/PDFDownloadButton"
import MediaThumbnail from "../../components/MediaThumbnail/MediaThumbnail"
import CreativeModal from "./components/CreativeModal"

interface CreativeData {
  date: string
  campaignName: string
  adGroupName: string
  promotedPinName: string
  promotedPinStatus: string
  creativeType: string
  adId: string
  destinationUrl: string
  impressions: number
  clicks: number
  outboundClicks: number
  cost: number
  cpc: number
  cpm: number
  reach: number
  frequency: number
  ctr: number
  videoStartsPaid: number
  videoViewsPaid: number
  videoAvgWatchTime: number
  videoViews100Paid: number
  videoViews25Paid: number
  videoViews50Paid: number
  videoViews75Paid: number
  engagements: number
  mediaUrl?: string
}

const CriativosPinterest: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null)
  const { data: apiData, loading, error } = usePinterestNacionalData()
  const [processedData, setProcessedData] = useState<CreativeData[]>([])
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" })
  const [selectedModalidades, setSelectedModalidades] = useState<string[]>([])
  const [availableModalidades, setAvailableModalidades] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  const [creativeMedias, setCreativeMedias] = useState<Map<string, { url: string, type: string }>>(new Map())
  const [mediasLoading, setMediasLoading] = useState(false)

  const [selectedCreative, setSelectedCreative] = useState<CreativeData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const loadMedias = async () => {
      setMediasLoading(true)
      try {
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

  useEffect(() => {
    const values = apiData?.data?.values
    if (!values || values.length <= 1) return

    const headers = values[0]
    const rows = values.slice(1)

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

    const mapped: CreativeData[] = rows.map((row: string[]) => {
      const get = (field: string) => {
        const idx = headers.findIndex((h: string) => h && h.toString().trim().toLowerCase() === field.toLowerCase())
        return idx >= 0 ? (row[idx] ?? "") : ""
      }
      
      // Tentar múltiplos nomes possíveis para cada campo
      const promotedPinName = get("Promoted Pin Name") || get("Pin promotion name") || get("promotedPinName") || ""
      const campaignName = get("Campaign name") || get("campaignName") || ""
      const adGroupName = get("Ad group name") || get("adGroupName") || ""
      const spend = get("Spend") || get("spendInMicroDollar") || get("Spend (in micro dollar)") || "0"
      const cost = spend.includes("micro") ? parseNumber(spend) / 1000000 : parseNumber(spend)
      
      return {
        date: get("Date") || "",
        campaignName,
        adGroupName,
        promotedPinName,
        promotedPinStatus: get("Promoted Pin Status") || get("promotedPinStatus") || "ACTIVE",
        creativeType: get("Creative type") || get("creativeType") || "REGULAR",
        adId: get("Ad ID") || get("adId") || "",
        destinationUrl: get("Destination URL") || get("destinationUrl") || "",
        impressions: parseInteger(get("Impressions") || get("impressions") || "0"),
        clicks: parseInteger(get("Clicks") || get("clicks") || get("Pin clicks") || "0"),
        outboundClicks: parseInteger(get("Outbound clicks") || get("outboundClicks") || get("Outbound Clicks") || "0"),
        cost,
        cpc: parseNumber(get("CPC") || get("cpc") || "0"),
        cpm: parseNumber(get("CPM") || get("cpm") || "0"),
        reach: parseInteger(get("Reach") || get("reach") || "0"),
        frequency: parseNumber(get("Frequency") || get("frequency") || "0"),
        ctr: parseNumber(get("CTR") || get("ctr") || "0"),
        videoStartsPaid: parseInteger(get("Video starts (paid)") || get("videoStartsPaid") || "0"),
        videoViewsPaid: parseInteger(get("Video views (paid)") || get("videoViewsPaid") || "0"),
        videoAvgWatchTime: parseNumber(get("Video avg watch time") || get("videoAvgWatchTime") || "0"),
        videoViews100Paid: parseInteger(get("Video views 100% (paid)") || get("videoViews100Paid") || "0"),
        videoViews25Paid: parseInteger(get("Video views 25% (paid)") || get("videoViews25Paid") || "0"),
        videoViews50Paid: parseInteger(get("Video views 50% (paid)") || get("videoViews50Paid") || "0"),
        videoViews75Paid: parseInteger(get("Video views 75% (paid)") || get("videoViews75Paid") || "0"),
        engagements: parseInteger(get("Engagements") || get("engagements") || "0"),
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

    const processed: CreativeData[] = mapped.filter((item: CreativeData): item is CreativeData => Boolean(item.date))

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

    // Detectar modalidades disponíveis
    const modalidadeSet = new Set<string>()
    processed.forEach((item) => {
      const detectedModalidade = detectModalidadeFromCreative(item.promotedPinName || item.campaignName)
      if (detectedModalidade) {
        modalidadeSet.add(detectedModalidade)
      }
    })
    const modalidades = Array.from(modalidadeSet).filter(Boolean).sort()
    setAvailableModalidades(modalidades)
  }, [apiData])

  // Função para detectar modalidade baseada no nome do criativo
  const detectModalidadeFromCreative = (name: string): string | null => {
    if (!name) return null
    
    const lowerName = name.toLowerCase()
    
    if (lowerName.includes("empresarial")) {
      return "empresarial"
    }
    
    if (lowerName.includes("residencial")) {
      return "residencial"
    }
    
    if (lowerName.includes("vida")) {
      return "vida"
    }
    
    return null
  }

  const toggleModalidade = (modalidade: string) => {
    setSelectedModalidades((prev) => {
      if (prev.includes(modalidade)) {
        return prev.filter((m) => m !== modalidade)
      }
      return [...prev, modalidade]
    })
  }

  // Lógica de filtragem
  const filteredData = useMemo(() => {
    let filtered = processedData

    // Filtro por data
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter((item) => {
        const normalizeDate = (date: Date): Date => {
          const normalized = new Date(date)
          normalized.setHours(0, 0, 0, 0)
          return normalized
        }
        
        const parseDate = (dateStr: string): Date | null => {
          if (!dateStr || !dateStr.trim()) return null
          
          if (dateStr.includes("/")) {
            const parts = dateStr.split("/")
            if (parts.length === 3) {
              const [day, month, year] = parts
              const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
              return !isNaN(date.getTime()) ? normalizeDate(date) : null
            }
          } else if (dateStr.includes("-")) {
            const parts = dateStr.split("-")
            if (parts.length === 3) {
              const [year, month, day] = parts
              const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
              return !isNaN(date.getTime()) ? normalizeDate(date) : null
            }
          } else {
            const date = new Date(dateStr)
            return !isNaN(date.getTime()) ? normalizeDate(date) : null
          }
          
          return null
        }
        
        const itemDate = parseDate(item.date)
        const startDate = normalizeDate(new Date(dateRange.start))
        const endDate = normalizeDate(new Date(dateRange.end))
        
        if (!itemDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return false
        }
        
        return itemDate >= startDate && itemDate <= endDate
      })
    }

    // Filtro por modalidade
    if (selectedModalidades.length > 0) {
      filtered = filtered.filter((item) => {
        const detectedModalidade = detectModalidadeFromCreative(item.promotedPinName || item.campaignName)
        return detectedModalidade && selectedModalidades.includes(detectedModalidade)
      })
    }

    // Filtro por busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((item) => {
        return (
          item.promotedPinName?.toLowerCase().includes(term) ||
          item.campaignName?.toLowerCase().includes(term) ||
          item.adGroupName?.toLowerCase().includes(term)
        )
      })
    }

    // Agrupamento por criativo
    const groupedData: Record<string, CreativeData> = {}
    filtered.forEach((item) => {
      const key = `${item.promotedPinName}_${item.adId || "no-id"}`
      if (!groupedData[key]) {
        groupedData[key] = { ...item }
      } else {
        groupedData[key].impressions += item.impressions
        groupedData[key].clicks += item.clicks
        groupedData[key].outboundClicks += item.outboundClicks
        groupedData[key].cost += item.cost
        groupedData[key].reach += item.reach
        groupedData[key].engagements += item.engagements
        groupedData[key].videoStartsPaid += item.videoStartsPaid
        groupedData[key].videoViewsPaid += item.videoViewsPaid
        groupedData[key].videoViews100Paid += item.videoViews100Paid
        groupedData[key].videoViews25Paid += item.videoViews25Paid
        groupedData[key].videoViews50Paid += item.videoViews50Paid
        groupedData[key].videoViews75Paid += item.videoViews75Paid
      }
    })

    const finalData = Object.values(groupedData).map((item) => ({
      ...item,
      cpm: item.impressions > 0 ? item.cost / (item.impressions / 1000) : 0,
      cpc: item.outboundClicks > 0 ? item.cost / item.outboundClicks : 0,
      frequency: item.reach > 0 ? item.impressions / item.reach : 0,
      ctr: item.impressions > 0 ? (item.outboundClicks / item.impressions) * 100 : 0,
    }))

    finalData.sort((a, b) => b.cost - a.cost)

    return finalData
  }, [processedData, dateRange, selectedModalidades, searchTerm])

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
      reach: filteredData.reduce((sum, item) => sum + item.reach, 0),
      clicks: filteredData.reduce((sum, item) => sum + item.clicks, 0),
      outboundClicks: filteredData.reduce((sum, item) => sum + item.outboundClicks, 0),
      engagements: filteredData.reduce((sum, item) => sum + item.engagements, 0),
      avgCpm: 0,
      avgCpc: 0,
      avgFrequency: 0,
      ctr: 0,
    }
  }, [filteredData])

  if (filteredData.length > 0) {
    totals.avgCpm = totals.impressions > 0 ? totals.investment / (totals.impressions / 1000) : 0
    totals.avgCpc = totals.outboundClicks > 0 ? totals.investment / totals.outboundClicks : 0
    totals.avgFrequency = totals.reach > 0 ? totals.impressions / totals.reach : 0
    totals.ctr = totals.impressions > 0 ? (totals.outboundClicks / totals.impressions) * 100 : 0
  }

  const formatNumber = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toLocaleString("pt-BR")
  }

  const formatCurrency = (value: number): string => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const openCreativeModal = (creative: CreativeData) => {
    const driveMediaData = googleDriveApi.findMediaForCreative(creative.promotedPinName, creativeMedias)
    
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

  if (loading) {
    return <Loading message="Carregando criativos Pinterest..." />
  }

  if (error) {
    return (
      <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Erro ao carregar dados: {error.message}</p>
        <p className="text-red-500 text-sm mt-2">
          Verifique se a API está funcionando corretamente:
          https://nacional-api-gray.vercel.app/google/sheets/1wNHPGsPX3wQuUCBs3an7iBzBY6Y7THYV7V1GijXZo44/data?range=Pinterest_tratado
        </p>
      </div>
    )
  }

  return (
    <div ref={contentRef} className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-red-800 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 19c-.721 0-1.418-.109-2.073-.312l.693-1.486c.483.18.992.27 1.38.27 2.561 0 4.648-2.087 4.648-4.648 0-1.459-.676-2.761-1.729-3.608l1.061-1.061c1.322 1.322 2.14 3.15 2.14 5.169 0 3.859-3.141 7-7 7zm-5.5-9c-.828 0-1.5-.672-1.5-1.5S5.672 7 6.5 7 8 7.672 8 8.5 7.328 10 6.5 10zm11 0c-.828 0-1.5-.672-1.5-1.5S16.672 7 17.5 7 19 7.672 19 8.5 18.328 10 17.5 10zm-5.5 1c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z"/>
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
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
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
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

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </label>
            <input
              type="text"
              placeholder="Buscar por criativo, campanha ou grupo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
            />
          </div>
        </div>
      </div>

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
          <div className="text-sm text-gray-600 mb-1">Cliques no Link</div>
          <div className="text-lg font-bold text-gray-900">{formatNumber(totals.outboundClicks)}</div>
        </div>

        <div className="card-overlay rounded-lg shadow-lg p-4 text-center">
          <div className="text-sm text-gray-600 mb-1">CPM</div>
          <div className="text-lg font-bold text-gray-900">{formatCurrency(totals.avgCpm)}</div>
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
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">Investimento</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">Impressões</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">Alcance</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">Cliques</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">Cliques no Link</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">Engajamentos</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">CPM</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">CPC</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">CTR</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((creative, index) => {
                const cpm = creative.impressions > 0 ? creative.cost / (creative.impressions / 1000) : 0
                const cpc = creative.outboundClicks > 0 ? creative.cost / creative.outboundClicks : 0
                const ctr = creative.impressions > 0 ? (creative.outboundClicks / creative.impressions) * 100 : 0
                const driveMediaData = googleDriveApi.findMediaForCreative(creative.promotedPinName, creativeMedias)

                return (
                  <tr 
                    key={index} 
                    className={`${index % 2 === 0 ? "bg-red-50" : "bg-white"} cursor-pointer hover:bg-red-100 transition-colors`}
                    onClick={() => openCreativeModal(creative)}
                  >
                    <td className="py-3 px-4 w-[5rem]">
                      {driveMediaData ? (
                        <MediaThumbnail
                          mediaData={driveMediaData}
                          creativeName={creative.promotedPinName}
                          isLoading={mediasLoading}
                          size="md"
                          onClick={() => openCreativeModal(creative)}
                        />
                      ) : (
                        <MediaThumbnail
                          mediaData={null}
                          creativeName={creative.promotedPinName}
                          isLoading={mediasLoading}
                          size="md"
                          onClick={() => openCreativeModal(creative)}
                        />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900 text-sm leading-tight whitespace-normal break-words">
                          {creative.promotedPinName}
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
                    <td className="py-3 px-4 text-right min-w-[7.5rem]">{formatNumber(creative.reach)}</td>
                    <td className="py-3 px-4 text-right min-w-[7.5rem]">{formatNumber(creative.clicks)}</td>
                    <td className="py-3 px-4 text-right min-w-[7.5rem]">{formatNumber(creative.outboundClicks)}</td>
                    <td className="py-3 px-4 text-right min-w-[7.5rem]">{formatNumber(creative.engagements)}</td>
                    <td className="py-3 px-4 text-right min-w-[7.5rem]">{formatCurrency(cpm)}</td>
                    <td className="py-3 px-4 text-right min-w-[7.5rem]">{formatCurrency(cpc)}</td>
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

      <CreativeModal 
        creative={selectedCreative}
        isOpen={isModalOpen}
        onClose={closeCreativeModal}
      />
    </div>
  )
}

export default CriativosPinterest

