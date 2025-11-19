"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { Calendar, MapPin, Users } from "lucide-react"
import { useTikTokNacionalData } from "../../services/api"
import { useBenchmarkNacionalData, processBenchmarkData, calculateVariation } from "../../services/benchmarkApi"
import Loading from "../../components/Loading/Loading"
import { googleDriveApi } from "../../services/googleDriveApi"
import PDFDownloadButton from "../../components/PDFDownloadButton/PDFDownloadButton"
import MediaThumbnail from "../../components/MediaThumbnail/MediaThumbnail" // Importe o novo componente
import TikTokCreativeModal from "./components/TikTokCreativeModal" // Importe o modal

interface CreativeData {
  date: string
  campaignName: string
  adGroupName: string
  adName: string
  adText: string
  videoThumbnailUrl: string
  impressions: number
  clicks: number
  cost: number
  cpc: number
  cpm: number
  reach: number
  frequency: number
  results: number
  videoViews: number
  twoSecondVideoViews: number
  videoViews25: number
  videoViews50: number
  videoViews75: number
  videoViews100: number
  profileVisits: number
  paidLikes: number
  paidComments: number
  paidShares: number
  paidFollows: number
}

const CriativosTikTok: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null)
  const { data: apiData, loading, error } = useTikTokNacionalData()
  const { data: benchmarkData, loading: benchmarkLoading } = useBenchmarkNacionalData()
  const [processedData, setProcessedData] = useState<CreativeData[]>([])
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" })
  const [selectedModalidades, setSelectedModalidades] = useState<string[]>([])
  const [availableModalidades, setAvailableModalidades] = useState<string[]>([])
  const [selectedTipos, setSelectedTipos] = useState<string[]>([])
  const [availableTipos, setAvailableTipos] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  

  const [creativeMedias, setCreativeMedias] = useState<Map<string, { url: string, type: string }>>(new Map())
  const [mediasLoading, setMediasLoading] = useState(false)

  const [selectedCreative, setSelectedCreative] = useState<CreativeData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Processar dados de benchmark
  const benchmarkMap = useMemo(() => {
    if (benchmarkData?.data) {
      return processBenchmarkData(benchmarkData.data)
    }
    return new Map()
  }, [benchmarkData])

  // Função para obter dados de benchmark do TikTok
  const getBenchmarkData = (creative: CreativeData) => {
    // TikTok sempre é vídeo
    const key = `TIK TOK_VÍDEO`
    return benchmarkMap.get(key)
  }

  useEffect(() => {
    const loadMedias = async () => {
      setMediasLoading(true)
      try {
        const mediaMap = await googleDriveApi.getPlatformImages("tiktok")
        setCreativeMedias(mediaMap)
      } catch (error) {
        console.error("Error loading TikTok medias:", error)
      } finally {
        setMediasLoading(false)
      }
    }

    loadMedias()
  }, [])

  useEffect(() => {
    const values = apiData?.data?.values
    if (!values || values.length <= 1) {
      console.log("TikTok: Dados não disponíveis ou estrutura incorreta:", apiData)
      return
    }

    const headers = values[0]
    const rows = values.slice(1)
    
    console.log("TikTok: Headers encontrados:", headers)
    console.log("TikTok: Total de linhas:", rows.length)
    if (rows.length > 0) {
      console.log("TikTok: Primeira linha de dados:", rows[0])
    }

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
        const idx = headers.indexOf(field)
        return idx >= 0 ? (row[idx] ?? "") : ""
      }
      
      // Obter valores básicos da planilha (aba: Tiktok_tratado)
      const impressions = parseInteger(get("Impressions"))
      const clicks = parseInteger(get("Clicks")) // Existe na planilha
      const cost = parseNumber(get("Total spent"))
      const reach = parseInteger(get("Reach"))
      const videoViews = parseInteger(get("Video views ") || get("Video views")) // Com ou sem espaço
      const videoCompletions = parseInteger(get("Video completions ") || get("Video completions")) // Com ou sem espaço
      
      // Calcular valores derivados (não existem na planilha, precisam ser calculados)
      const cpc = clicks > 0 ? cost / clicks : 0
      const cpm = impressions > 0 ? (cost / impressions) * 1000 : 0
      const frequency = reach > 0 ? impressions / reach : 0
      
      return {
        date: get("Date"),
        campaignName: get("Campaign name"),
        adGroupName: get("Ad group name") || "", // Pode não existir
        adName: get("Creative title") || get("Ad name"), // Usar Creative title se Ad name não existir
        adText: get("Ad text") || "", // Pode não existir
        videoThumbnailUrl: get("Video thumbnail URL") || "", // Pode não existir
        impressions: impressions,
        clicks: clicks,
        cost: cost,
        cpc: cpc,
        cpm: cpm,
        reach: reach,
        frequency: frequency,
        results: parseInteger(get("Results") || get("Total engagements")), // Usar Total engagements se Results não existir
        videoViews: videoViews,
        twoSecondVideoViews: parseInteger(get("2-second video views") || get("Video starts")), // Usar Video starts se não existir
        videoViews25: parseInteger(get("Video views at 25%")),
        videoViews50: parseInteger(get("Video views at 50%")),
        videoViews75: parseInteger(get("Video views at 75%")),
        videoViews100: parseInteger(get("Video views at 100%") || get("Video completions ") || get("Video completions")), // Usar Video completions se não existir
        profileVisits: parseInteger(get("Profile visits")), // Pode não existir
        paidLikes: parseInteger(get("Paid likes")), // Pode não existir
        paidComments: parseInteger(get("Paid comments")), // Pode não existir
        paidShares: parseInteger(get("Paid shares")), // Pode não existir
        paidFollows: parseInteger(get("Paid follows")), // Pode não existir
      }
    })

    const processed: CreativeData[] = mapped.filter((item: CreativeData): item is CreativeData => Boolean(item.date))

    setProcessedData(processed)

    // Função para validar e converter data
    const parseAndValidateDate = (dateStr: string): Date | null => {
      if (!dateStr || !dateStr.trim()) return null
      
      // Tentar diferentes formatos de data
      let date: Date | null = null
      
      // Formato DD/MM/YYYY
      if (dateStr.includes("/")) {
        const parts = dateStr.split("/")
        if (parts.length === 3) {
          const [day, month, year] = parts
          date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
        }
      }
      // Formato YYYY-MM-DD
      else if (dateStr.includes("-")) {
        date = new Date(dateStr)
      }
      // Tentar parse direto
      else {
        date = new Date(dateStr)
      }
      
      // Verificar se a data é válida
      if (date && !isNaN(date.getTime())) {
        return date
      }
      
      return null
    }

    // Filtrar e converter apenas datas válidas
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

    // Detectar modalidades disponíveis baseadas nos criativos
    const modalidadeSet = new Set<string>()
    processed.forEach((item) => {
      const detectedModalidade = detectModalidadeFromCreative(item.adName)
      if (detectedModalidade) {
        modalidadeSet.add(detectedModalidade)
      }
    })
    const modalidades = Array.from(modalidadeSet).filter(Boolean).sort()
    setAvailableModalidades(modalidades)

    // Detectar tipos disponíveis baseados nos criativos
    const tipoSet = new Set<string>()
    processed.forEach((item) => {
      const detectedTipo = detectTipoFromCreative(item.adName)
      tipoSet.add(detectedTipo)
    })
    const tipos = Array.from(tipoSet).filter(Boolean).sort()
    setAvailableTipos(tipos)
  }, [apiData])

  // Função para detectar modalidade baseada no nome do criativo
  const detectModalidadeFromCreative = (adName: string): string | null => {
    if (!adName) return null
    
    // Converter para minúsculo para padronizar a checagem
    const lowerAdName = adName.toLowerCase()
    
    // Regras de modalidade
    if (lowerAdName.includes("empresarial")) {
      return "empresarial"
    }
    
    if (lowerAdName.includes("residencial")) {
      return "residencial"
    }
    
    if (lowerAdName.includes("vida")) {
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

  // Função para detectar tipo baseado no nome do criativo
  const detectTipoFromCreative = (adName: string): string => {
    if (!adName) return "Proprietários"
    
    const upperAdName = adName.toUpperCase()
    
    // Regra para Influencers
    if (upperAdName.includes("TTCX")) {
      return "Influencers"
    }
    
    return "Proprietários"
  }

  const toggleTipo = (tipo: string) => {
    setSelectedTipos((prev) => {
      if (prev.includes(tipo)) {
        return prev.filter((t) => t !== tipo)
      }
      return [...prev, tipo]
    })
  }

  // 3. ATUALIZAÇÃO DA LÓGICA DE FILTRAGEM
  const filteredData = useMemo(() => {
    let filtered = processedData

    // Filtro por data (lógica existente)
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter((item) => {
        // Função auxiliar para validar e converter data
        const parseDate = (dateStr: string): Date | null => {
          if (!dateStr || !dateStr.trim()) return null
          
          if (dateStr.includes("/")) {
            const parts = dateStr.split("/")
            if (parts.length === 3) {
              const [day, month, year] = parts
              const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
              return !isNaN(date.getTime()) ? date : null
            }
          } else if (dateStr.includes("-")) {
            const date = new Date(dateStr)
            return !isNaN(date.getTime()) ? date : null
          } else {
            const date = new Date(dateStr)
            return !isNaN(date.getTime()) ? date : null
          }
          
          return null
        }
        
        const itemDate = parseDate(item.date)
        const startDate = new Date(dateRange.start)
        const endDate = new Date(dateRange.end)
        
        if (!itemDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return false
        }
        
        return itemDate >= startDate && itemDate <= endDate
      })
    }

    // Filtro por modalidade
    if (selectedModalidades.length > 0) {
      filtered = filtered.filter((item) => {
        const detectedModalidade = detectModalidadeFromCreative(item.adName)
        return detectedModalidade && selectedModalidades.includes(detectedModalidade)
      })
    }

    // Filtro por tipo (Influencers/Proprietários)
    if (selectedTipos.length > 0) {
      filtered = filtered.filter((item) => {
        const detectedTipo = detectTipoFromCreative(item.adName)
        return selectedTipos.includes(detectedTipo)
      })
    }

    const groupedData: Record<string, CreativeData> = {}
    filtered.forEach((item) => {
      const key = `${item.adName}_${item.videoThumbnailUrl || "no-thumbnail"}`
      if (!groupedData[key]) {
        groupedData[key] = { ...item }
      } else {
        // Agrupamento de métricas (lógica existente)
        groupedData[key].impressions += item.impressions
        groupedData[key].clicks += item.clicks
        groupedData[key].cost += item.cost
        groupedData[key].reach += item.reach
        groupedData[key].results += item.results
        groupedData[key].videoViews += item.videoViews
        groupedData[key].twoSecondVideoViews += item.twoSecondVideoViews
        groupedData[key].videoViews25 += item.videoViews25
        groupedData[key].videoViews50 += item.videoViews50
        groupedData[key].videoViews75 += item.videoViews75
        groupedData[key].videoViews100 += item.videoViews100
        groupedData[key].profileVisits += item.profileVisits
        groupedData[key].paidLikes += item.paidLikes
        groupedData[key].paidComments += item.paidComments
        groupedData[key].paidShares += item.paidShares
        groupedData[key].paidFollows += item.paidFollows
      }
    })

    const finalData = Object.values(groupedData).map((item) => ({
      ...item,
      cpm: item.impressions > 0 ? item.cost / (item.impressions / 1000) : 0,
      cpc: item.clicks > 0 ? item.cost / item.clicks : 0,
      frequency: item.reach > 0 ? item.impressions / item.reach : 0,
    }))

    finalData.sort((a, b) => b.cost - a.cost)

    return finalData
  }, [processedData, dateRange, selectedModalidades, selectedTipos])

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
      videoViews: filteredData.reduce((sum, item) => sum + item.videoViews, 0),
      videoViews100: filteredData.reduce((sum, item) => sum + item.videoViews100, 0),
      paidLikes: filteredData.reduce((sum, item) => sum + item.paidLikes, 0),
      totalEngagements: filteredData.reduce((sum, item) => sum + item.paidLikes + item.paidComments + item.paidShares + item.paidFollows + item.profileVisits, 0),
      avgCpm: 0,
      avgCpc: 0,
      avgFrequency: 0,
      ctr: 0,
      vtr: 0,
      txEngaj: 0,
    }
  }, [filteredData])

  if (filteredData.length > 0) {
    totals.avgCpm = totals.impressions > 0 ? totals.investment / (totals.impressions / 1000) : 0
    totals.avgCpc = totals.clicks > 0 ? totals.investment / totals.clicks : 0
    totals.avgFrequency = totals.reach > 0 ? totals.impressions / totals.reach : 0
    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
    totals.vtr = totals.impressions > 0 ? (totals.videoViews100 / totals.impressions) * 100 : 0
    totals.txEngaj = totals.impressions > 0 ? (totals.totalEngagements / totals.impressions) * 100 : 0
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
    const driveMediaData = googleDriveApi.findMediaForCreative(creative.adName, creativeMedias)
    
    const creativeWithMedia = {
      ...creative,
      mediaUrl: driveMediaData?.url || creative.videoThumbnailUrl || undefined
    }
    
    setSelectedCreative(creativeWithMedia)
    setIsModalOpen(true)
  }

  const closeCreativeModal = () => {
    setIsModalOpen(false)
    setSelectedCreative(null)
  }

  if (loading) {
    return <Loading message="Carregando criativos TikTok..." />
  }

  if (error) {
    return (
      <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Erro ao carregar dados: {error.message}</p>
        <p className="text-red-500 text-sm mt-2">
          Verifique se a API está funcionando corretamente:
          https://nacional-api-gray.vercel.app/google/sheets/1wNHPGsPX3wQuUCBs3an7iBzBY6Y7THYV7V1GijXZo44/data?range=Tiktok_tratado
        </p>
      </div>
    )
  }

  return (
    <div ref={contentRef} className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-red-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 text-enhanced">TikTok - Criativos</h1>
            <p className="text-gray-600">Performance dos criativos na plataforma TikTok</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-4 text-sm text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-lg">
            <PDFDownloadButton contentRef={contentRef} fileName="criativos-tiktok" />
            <span>Última atualização: {new Date().toLocaleString("pt-BR")}</span>
          </div>
        </div>
      </div>

      <div className="card-overlay rounded-lg shadow-lg p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
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
                      ? "bg-pink-100 text-pink-800 border border-pink-300"
                      : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {modalidade}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Tipo
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTipos.map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => toggleTipo(tipo)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                    selectedTipos.includes(tipo)
                      ? "bg-pink-100 text-pink-800 border border-pink-300"
                      : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
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

        <div className="card-overlay rounded-lg shadow-lg p-4 text-center">
          <div className="text-sm text-gray-600 mb-1">Frequência</div>
          <div className="text-lg font-bold text-gray-900">{totals.avgFrequency.toFixed(2)}</div>
        </div>

        <div className="card-overlay rounded-lg shadow-lg p-4 text-center">
          <div className="text-sm text-gray-600 mb-1">Tx. Engaj.</div>
          <div className="text-lg font-bold text-gray-900">{totals.impressions > 0 ? ((totals.totalEngagements / totals.impressions) * 100).toFixed(2) : 0}%</div>
        </div>
      </div>

      <div className="flex-1 card-overlay rounded-lg shadow-lg p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-pink-600 text-white">
                <th className="text-left py-3 px-4 font-semibold w-[5rem]">Mídia</th>
                <th className="text-left py-3 px-4 font-semibold">Criativo</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">Investimento</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">Impressões</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">Alcance</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">Cliques</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">Views 100%</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">Tx. Engaj.</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">CPM</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[4rem] text-[15px]">Δ CPM</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">CPC</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[4rem] text-[15px]">Δ CPC</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[7.5rem]">VTR</th>
                <th className="text-right py-3 px-4 font-semibold min-w-[4rem] text-[15px]">Δ VTR</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((creative, index) => {
                const vtr = creative.impressions > 0 ? (creative.videoViews100 / creative.impressions) * 100 : 0
                const txEngaj = creative.impressions > 0 ? ((creative.paidLikes + creative.paidComments + creative.paidShares + creative.paidFollows + creative.profileVisits) / creative.impressions) * 100 : 0
                const cpm = creative.impressions > 0 ? creative.cost / (creative.impressions / 1000) : 0
                const cpc = creative.clicks > 0 ? creative.cost / creative.clicks : 0
                const driveMediaData = googleDriveApi.findMediaForCreative(creative.adName, creativeMedias)
                const tiktokThumbnail = creative.videoThumbnailUrl
                
                // Obter dados de benchmark
                const benchmark = getBenchmarkData(creative)
                const cpmVariation = benchmark ? calculateVariation(cpm, benchmark.cpm, 'cost') : { value: "-", color: "text-gray-500" }
                const cpcVariation = benchmark ? calculateVariation(cpc, benchmark.cpc, 'cost') : { value: "-", color: "text-gray-500" }
                const vtrVariation = benchmark ? calculateVariation(vtr, benchmark.vtr, 'performance') : { value: "-", color: "text-gray-500" }

                return (
                  <tr key={index} className={index % 2 === 0 ? "bg-pink-50" : "bg-white"}>
                    <td className="py-3 px-4 w-[5rem]">
                      {driveMediaData ? (
                        <MediaThumbnail
                          mediaData={driveMediaData}
                          creativeName={creative.adName}
                          isLoading={mediasLoading}
                          size="md"
                          onClick={() => openCreativeModal(creative)}
                        />
                      ) : tiktokThumbnail ? (
                        <div 
                          className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center relative cursor-pointer group"
                          onClick={() => openCreativeModal(creative)}
                        >
                          <img
                            src={tiktokThumbnail}
                            alt="Thumbnail TikTok"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = "none"
                              if (target.parentElement) {
                                target.parentElement.innerHTML =
                                  '<div class="text-gray-400 text-xs text-center">Sem mídia</div>'
                              }
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black bg-opacity-40">
                            <div className="bg-white bg-opacity-90 rounded-full p-2 shadow-sm">
                              <svg className="w-4 h-4 text-gray-700 fill-gray-700" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <MediaThumbnail
                          mediaData={null}
                          creativeName={creative.adName}
                          isLoading={mediasLoading}
                          size="md"
                          onClick={() => openCreativeModal(creative)}
                        />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900 text-sm leading-tight whitespace-normal break-words">
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
                    <td className="py-3 px-4 text-right min-w-[7.5rem]">{formatNumber(creative.reach)}</td>
                    <td className="py-3 px-4 text-right min-w-[7.5rem]">{formatNumber(creative.clicks)}</td>
                    <td className="py-3 px-4 text-right min-w-[7.5rem]">{formatNumber(creative.videoViews100)}</td>
                    <td className="py-3 px-4 text-right min-w-[7.5rem]">{txEngaj.toFixed(2)}%</td>
                    <td className="py-3 px-4 text-right min-w-[7.5rem]">{formatCurrency(cpm)}</td>
                    <td className="py-3 px-4 text-right min-w-[4rem] text-[15px]">
                      <span className={cpmVariation.color}>{cpmVariation.value}</span>
                    </td>
                    <td className="py-3 px-4 text-right min-w-[7.5rem]">{formatCurrency(cpc)}</td>
                    <td className="py-3 px-4 text-right min-w-[4rem] text-[15px]">
                      <span className={cpcVariation.color}>{cpcVariation.value}</span>
                    </td>
                    <td className="py-3 px-4 text-right min-w-[7.5rem]">{vtr.toFixed(2)}%</td>
                    <td className="py-3 px-4 text-right min-w-[4rem] text-[15px]">
                      <span className={vtrVariation.color}>{vtrVariation.value}</span>
                    </td>
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

      <TikTokCreativeModal 
        creative={selectedCreative}
        isOpen={isModalOpen}
        onClose={closeCreativeModal}
      />
    </div>
  )
}

export default CriativosTikTok