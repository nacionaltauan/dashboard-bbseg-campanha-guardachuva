"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { BarChart3, Calendar, Filter, MapPin } from "lucide-react"
import { useConsolidadoNacionalData, useAlcanceTikTokData, useAlcanceMetaData } from "../../services/api"
import { useBenchmarkNacionalData, processBenchmarkData } from "../../services/benchmarkApi"
import PDFDownloadButton from "../../components/PDFDownloadButton/PDFDownloadButton"
import Loading from "../../components/Loading/Loading"

// Interface for the raw API data
interface ApiDataItem {
  date?: string
  platform?: string
  campaignName?: string
  impressions?: number
  cost?: number
  reach?: number
  clicks?: number
  frequency?: number
  cpm?: number
  modalidade?: string
}

interface ProcessedData {
  date: string
  platform: string
  campaignName: string
  impressions: number
  cost: number
  reach: number
  clicks: number
  frequency: number
  cpm: number
  modalidade: string
}

interface PlatformMetrics {
  platform: string
  impressions: number
  cost: number
  reach: number
  clicks: number
  cpm: number
  frequency: number
  color: string
}

interface ChartDataPoint {
  platform: string
  value: number
  color: string
}

const VisaoGeral: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null)
  const { data: apiData, loading, error } = useConsolidadoNacionalData()
  const { data: benchmarkData } = useBenchmarkNacionalData()
  const { data: alcanceTikTokData } = useAlcanceTikTokData()
  const { data: alcanceMetaData } = useAlcanceMetaData()
  const [processedData, setProcessedData] = useState<ProcessedData[]>([])
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" })
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [selectedModalidades, setSelectedModalidades] = useState<string[]>([])

  // Cores para as plataformas
  const platformColors: Record<string, string> = {
    Google: "#4285f4",
    Meta: "#0668E1",
    TikTok: "#ff0050",
    YouTube: "#ff0000",
    Kwai: "#ff6b35",
    "Globo.com": "#00a86b",
    Serasa: "#9b59b6",
    "Folha de SP": "#e91e63",
    Spotify: "#1DB954",
    Default: "#6366f1",
  }

  const availablePlatforms = useMemo(() => {
    const platforms = new Set<string>()
    processedData.forEach((item) => {
      platforms.add(item.platform)
    })
    return Array.from(platforms)
  }, [processedData])

  const availableModalidades = useMemo(() => {
    const modalidades = new Set<string>()
    processedData.forEach((item) => {
      modalidades.add(item.modalidade)
    })
    return Array.from(modalidades)
  }, [processedData])

  // Processar dados de benchmark
  const benchmarkMap = useMemo(() => {
    if (benchmarkData?.data) {
      return processBenchmarkData(benchmarkData.data)
    }
    return new Map()
  }, [benchmarkData])

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platform)) {
        return prev.filter((p) => p !== platform)
      } else {
        return [...prev, platform]
      }
    })
  }

  const toggleModalidade = (modalidade: string) => {
    setSelectedModalidades((prev) => {
      if (prev.includes(modalidade)) {
        return prev.filter((m) => m !== modalidade)
      } else {
        return [...prev, modalidade]
      }
    })
  }

  const validateAndReturnDate = (dateStr: string | undefined): string => {
    if (!dateStr) return ""
    return dateStr
  }

  // Processar dados da API
  useEffect(() => {
    if (apiData?.data?.values) {
      const headers = apiData.data.values[0]
      const rows = apiData.data.values.slice(1)

      const processed: ProcessedData[] = rows
        .map((row: any[]) => {
          const parseNumber = (value: string | undefined): number => {
            if (!value || value === "") return 0
            // Remove R$, pontos e vírgulas, converte para número
            const cleanValue = value
              .toString()
              .replace(/R\$\s?/, "")
              .replace(/\./g, "")
              .replace(",", ".")
            return Number.parseFloat(cleanValue) || 0
          }

          const parseInteger = (value: string | undefined): number => {
            if (!value || value === "") return 0
            // Remove pontos de milhares
            const cleanValue = value.toString().replace(/\./g, "")
            return Number.parseInt(cleanValue) || 0
          }

          return {
            date: row[headers.indexOf("Date")] || "",
            platform: row[headers.indexOf("Veículo")] || "Outros",
            campaignName: row[headers.indexOf("Campaign name")] || "",
            impressions: parseInteger(row[headers.indexOf("Impressions")]),
            cost: parseNumber(row[headers.indexOf("Total spent")]),
            reach: parseInteger(row[headers.indexOf("Reach")]),
            clicks: parseInteger(row[headers.indexOf("Clicks")]),
            frequency: 1, // Será calculado depois
            cpm: 0, // Será calculado depois
            modalidade: row[headers.indexOf("Modalidade")] || "Nacional",
          }
        })
        .filter((item: ProcessedData) => item.date && item.impressions > 0)

      setProcessedData(processed)

      // Definir range de datas inicial
      if (processed.length > 0) {
        const validDates = processed
          .map((item) => {
            // Converter data de DD/MM/YYYY para YYYY-MM-DD
            const dateParts = item.date.split("/")
            if (dateParts.length === 3) {
              const [day, month, year] = dateParts
              return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
            }
            return item.date
          })
          .filter(Boolean)
          .sort()

        if (validDates.length > 0) {
          setDateRange({
            start: validDates[0],
            end: validDates[validDates.length - 1],
          })
        }
      }
    }
  }, [apiData])

  // Filtrar dados por data
  const [filteredData, setFilteredData] = useState<ProcessedData[]>([])

  useEffect(() => {
    if (processedData.length > 0) {
      let filtered = processedData

      if (dateRange.start && dateRange.end) {
        filtered = filtered.filter((item) => {
          if (!item.date) return false

          // Converter data de DD/MM/YYYY para Date object
          const dateParts = item.date.split("/")
          if (dateParts.length !== 3) return false

          const [day, month, year] = dateParts
          const itemDate = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
          const startDate = new Date(dateRange.start)
          const endDate = new Date(dateRange.end)

          return itemDate >= startDate && itemDate <= endDate
        })
      }

      if (selectedPlatforms.length > 0) {
        filtered = filtered.filter((item) => selectedPlatforms.includes(item.platform))
      }

      if (selectedModalidades.length > 0) {
        filtered = filtered.filter((item) => selectedModalidades.includes(item.modalidade))
      }

      setFilteredData(filtered)
    } else {
      setFilteredData([])
    }
  }, [processedData, dateRange, selectedPlatforms, selectedModalidades])

  // Identificar veículos disponíveis nos dados filtrados
  const availableVehicles = useMemo(() => {
    const vehicles = new Set<string>()
    filteredData.forEach((item) => {
      vehicles.add(item.platform)
    })
    return Array.from(vehicles)
  }, [filteredData])

  // Obter benchmarks para veículos disponíveis
  const vehicleBenchmarks = useMemo(() => {
    const benchmarks: Array<{
      vehicle: string
      mediaType: string
      cpm: number
      cpc: number
      ctr: number
      vtr: number
    }> = []

    availableVehicles.forEach((vehicle) => {
      // Mapear veículo para chave do benchmark
      let benchmarkKey = ""
      if (vehicle === "Meta") {
        benchmarkKey = "META"
      } else if (vehicle === "TikTok") {
        benchmarkKey = "TIK TOK"
      } else {
        // Para outros veículos, usar o nome como está
        benchmarkKey = vehicle.toUpperCase()
      }

      // Buscar benchmarks para DISPLAY e VÍDEO
      const displayKey = `${benchmarkKey}_DISPLAY`
      const videoKey = `${benchmarkKey}_VÍDEO`

      const displayBenchmark = benchmarkMap.get(displayKey)
      const videoBenchmark = benchmarkMap.get(videoKey)

      if (displayBenchmark) {
        benchmarks.push({
          vehicle,
          mediaType: "DISPLAY",
          cpm: displayBenchmark.cpm || 0,
          cpc: displayBenchmark.cpc || 0,
          ctr: displayBenchmark.ctr || 0,
          vtr: displayBenchmark.completionRate || 0,
        })
      }

      if (videoBenchmark) {
        benchmarks.push({
          vehicle,
          mediaType: "VÍDEO",
          cpm: videoBenchmark.cpm || 0,
          cpc: videoBenchmark.cpc || 0,
          ctr: videoBenchmark.ctr || 0,
          vtr: videoBenchmark.completionRate || 0,
        })
      }
    })

    return benchmarks
  }, [availableVehicles, benchmarkMap])

  // Calcular métricas por plataforma
  const platformMetrics = useMemo(() => {
    const metrics: Record<string, PlatformMetrics> = {}

    filteredData.forEach((item) => {
      if (!metrics[item.platform]) {
        metrics[item.platform] = {
          platform: item.platform,
          impressions: 0,
          cost: 0,
          reach: 0,
          clicks: 0,
          cpm: 0,
          frequency: 0,
          color: platformColors[item.platform] || platformColors.Default,
        }
      }

      metrics[item.platform].impressions += item.impressions
      metrics[item.platform].cost += item.cost
      metrics[item.platform].reach += item.reach
      metrics[item.platform].clicks += item.clicks
    })

    // Calcular médias
    Object.values(metrics).forEach((metric) => {
      const platformData = filteredData.filter((item) => item.platform === metric.platform)
      if (platformData.length > 0) {
        metric.cpm = metric.cost / (metric.impressions / 1000)
        metric.frequency = metric.reach > 0 ? metric.impressions / metric.reach : 0
      }
    })

    return Object.values(metrics).sort((a, b) => b.impressions - a.impressions)
  }, [filteredData])

  // Calcular alcance e frequência totais de TikTok e Meta das abas específicas
  const alcanceTotals = useMemo(() => {
    let tiktokReach = 0
    let tiktokFrequency = 0
    let tiktokImpressions = 0
    let metaReach = 0
    let metaFrequency = 0
    let metaImpressions = 0

    // Calcular totais de TikTok da aba Alcance_Tiktok
    if (alcanceTikTokData?.data?.values && alcanceTikTokData.data.values.length > 1) {
      const [headers, ...rows] = alcanceTikTokData.data.values
      const reachIndex = headers.findIndex((h: string) => 
        h && (h.toLowerCase().includes("reach") || h.toLowerCase().includes("alcance"))
      )
      const frequencyIndex = headers.findIndex((h: string) => 
        h && (h.toLowerCase().includes("frequency") || h.toLowerCase().includes("frequência") || h.toLowerCase().includes("frequencia"))
      )
      const impressionsIndex = headers.findIndex((h: string) => 
        h && (h.toLowerCase().includes("impressions") || h.toLowerCase().includes("impressões") || h.toLowerCase().includes("impressoes"))
      )

      rows.forEach((row: any[]) => {
        if (reachIndex !== -1) {
          const reach = Number.parseInt(row[reachIndex]?.toString().replace(/\./g, "") || "0") || 0
          tiktokReach += reach
        }
        if (frequencyIndex !== -1) {
          const freq = Number.parseFloat(row[frequencyIndex]?.toString().replace(",", ".") || "0") || 0
          tiktokFrequency += freq
        }
        if (impressionsIndex !== -1) {
          const imp = Number.parseInt(row[impressionsIndex]?.toString().replace(/\./g, "") || "0") || 0
          tiktokImpressions += imp
        }
      })
    }

    // Calcular totais de Meta da aba Alcance_Meta
    if (alcanceMetaData?.data?.values && alcanceMetaData.data.values.length > 1) {
      const [headers, ...rows] = alcanceMetaData.data.values
      const reachIndex = headers.findIndex((h: string) => 
        h && (h.toLowerCase().includes("reach") || h.toLowerCase().includes("alcance"))
      )
      const frequencyIndex = headers.findIndex((h: string) => 
        h && (h.toLowerCase().includes("frequency") || h.toLowerCase().includes("frequência") || h.toLowerCase().includes("frequencia"))
      )
      const impressionsIndex = headers.findIndex((h: string) => 
        h && (h.toLowerCase().includes("impressions") || h.toLowerCase().includes("impressões") || h.toLowerCase().includes("impressoes"))
      )

      rows.forEach((row: any[]) => {
        if (reachIndex !== -1) {
          const reach = Number.parseInt(row[reachIndex]?.toString().replace(/\./g, "") || "0") || 0
          metaReach += reach
        }
        if (frequencyIndex !== -1) {
          const freq = Number.parseFloat(row[frequencyIndex]?.toString().replace(",", ".") || "0") || 0
          metaFrequency += freq
        }
        if (impressionsIndex !== -1) {
          const imp = Number.parseInt(row[impressionsIndex]?.toString().replace(/\./g, "") || "0") || 0
          metaImpressions += imp
        }
      })
    }

    return {
      tiktok: { reach: tiktokReach, frequency: tiktokFrequency, impressions: tiktokImpressions },
      meta: { reach: metaReach, frequency: metaFrequency, impressions: metaImpressions },
    }
  }, [alcanceTikTokData, alcanceMetaData])

  // Calcular totais
  const totals = useMemo(() => {
    const investment = filteredData.reduce((sum, item) => sum + item.cost, 0)
    const impressions = filteredData.reduce((sum, item) => sum + item.impressions, 0)
    
    // Para alcance: usar dados específicos de TikTok e Meta, e consolidado para outros
    const otherReach = filteredData
      .filter((item) => item.platform !== "TikTok" && item.platform !== "Meta")
      .reduce((sum, item) => sum + item.reach, 0)
    const reach = alcanceTotals.tiktok.reach + alcanceTotals.meta.reach + otherReach
    
    const clicks = filteredData.reduce((sum, item) => sum + item.clicks, 0)
    
    // Para frequência: usar dados específicos quando disponíveis
    const tiktokFreq = alcanceTotals.tiktok.frequency > 0 
      ? alcanceTotals.tiktok.frequency 
      : (alcanceTotals.tiktok.reach > 0 ? alcanceTotals.tiktok.impressions / alcanceTotals.tiktok.reach : 0)
    const metaFreq = alcanceTotals.meta.frequency > 0 
      ? alcanceTotals.meta.frequency 
      : (alcanceTotals.meta.reach > 0 ? alcanceTotals.meta.impressions / alcanceTotals.meta.reach : 0)
    
    const otherImpressions = filteredData
      .filter((item) => item.platform !== "TikTok" && item.platform !== "Meta")
      .reduce((sum, item) => sum + item.impressions, 0)
    const otherReachForFreq = filteredData
      .filter((item) => item.platform !== "TikTok" && item.platform !== "Meta")
      .reduce((sum, item) => sum + item.reach, 0)
    const otherFreq = otherReachForFreq > 0 ? otherImpressions / otherReachForFreq : 0
    
    // Frequência média ponderada
    const totalImpressionsForFreq = alcanceTotals.tiktok.impressions + alcanceTotals.meta.impressions + otherImpressions
    const frequency = totalImpressionsForFreq > 0 && reach > 0 ? totalImpressionsForFreq / reach : 0
    
    const cpm = impressions > 0 ? investment / (impressions / 1000) : 0
    const cpc = clicks > 0 ? investment / clicks : 0
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0

    // CPV e VTR são placeholders
    const cpv = 0.06
    const vtr = 65

    return {
      investment,
      impressions,
      reach,
      clicks,
      frequency,
      cpm,
      cpc,
      ctr,
      cpv,
      vtr,
    }
  }, [filteredData, alcanceTotals])

  // Preparar dados para gráficos
  const impressionsChartData: ChartDataPoint[] = platformMetrics.map((metric) => ({
    platform: metric.platform,
    value: metric.impressions,
    color: metric.color,
  }))

  // Dados de alcance: usar abas específicas para TikTok e Meta
  const reachChartData: ChartDataPoint[] = useMemo(() => {
    return platformMetrics.map((metric) => {
      if (metric.platform === "TikTok") {
        return {
          platform: metric.platform,
          value: alcanceTotals.tiktok.reach,
          color: metric.color,
        }
      } else if (metric.platform === "Meta") {
        return {
          platform: metric.platform,
          value: alcanceTotals.meta.reach,
          color: metric.color,
        }
      } else {
        return {
    platform: metric.platform,
    value: metric.reach,
    color: metric.color,
        }
      }
    })
  }, [platformMetrics, alcanceTotals])

  // Dados de frequência: usar abas específicas para TikTok e Meta
  const frequencyChartData: ChartDataPoint[] = useMemo(() => {
    return platformMetrics.map((metric) => {
      if (metric.platform === "TikTok") {
        const freq = alcanceTotals.tiktok.frequency > 0 
          ? alcanceTotals.tiktok.frequency 
          : (alcanceTotals.tiktok.reach > 0 ? alcanceTotals.tiktok.impressions / alcanceTotals.tiktok.reach : 0)
        return {
          platform: metric.platform,
          value: freq,
          color: metric.color,
        }
      } else if (metric.platform === "Meta") {
        const freq = alcanceTotals.meta.frequency > 0 
          ? alcanceTotals.meta.frequency 
          : (alcanceTotals.meta.reach > 0 ? alcanceTotals.meta.impressions / alcanceTotals.meta.reach : 0)
        return {
          platform: metric.platform,
          value: freq,
          color: metric.color,
        }
      } else {
        return {
    platform: metric.platform,
    value: metric.frequency,
    color: metric.color,
        }
      }
    })
  }, [platformMetrics, alcanceTotals])

  const cpmChartData: ChartDataPoint[] = platformMetrics.map((metric) => ({
    platform: metric.platform,
    value: metric.cpm,
    color: metric.color,
  }))

  const clicksChartData: ChartDataPoint[] = platformMetrics.map((metric) => ({
    platform: metric.platform,
    value: metric.clicks,
    color: metric.color,
  }))

  // Função para formatar números
  const formatNumber = (value: number): string => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)} bi`
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)} mi`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)} mil`
    }
    return value.toLocaleString("pt-BR")
  }
  
  const formatFullNumber = (value: number): string => {
      return value.toLocaleString("pt-BR");
  }


  // Função para formatar moeda
  const formatCurrency = (value: number): string => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }


  // Componente de gráfico de barras horizontal
  const HorizontalBarChart: React.FC<{
    data: ChartDataPoint[]
    title: string
    format?: (value: number) => string
  }> = ({ data, title, format = formatNumber }) => {
    const maxValue = Math.max(...data.map((d) => d.value))

    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-16 text-xs text-gray-600 truncate">{item.platform}</div>
              <div className="flex-1 relative">
                <div
                  className="h-6 bg-gray-100 rounded"
                  style={{
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: item.color,
                  }}
                />
                <div className="absolute right-2 top-0 h-6 flex items-center">
                  <span className="text-xs font-medium text-gray-700">{format(item.value)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Componente do card de benchmarks
  const BenchmarkCard: React.FC = () => {
    if (vehicleBenchmarks.length === 0) {
      return (
        <div className="card-overlay rounded-lg shadow-lg p-4 text-center min-h-[100px] flex flex-col justify-center">
          <div className="text-sm text-gray-600 mb-1">Benchmarks</div>
          <div className="text-lg font-bold text-gray-500">Nenhum benchmark disponível</div>
        </div>
      )
    }

    // Agrupar por veículo
    const groupedBenchmarks = vehicleBenchmarks.reduce((acc, benchmark) => {
      if (!acc[benchmark.vehicle]) {
        acc[benchmark.vehicle] = []
      }
      acc[benchmark.vehicle].push(benchmark)
      return acc
    }, {} as Record<string, typeof vehicleBenchmarks>)

    return (
      <div className="card-overlay rounded-lg shadow-lg p-6">
        <div className="text-lg font-semibold text-gray-800 mb-4">Benchmarks de Mercado</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Object.entries(groupedBenchmarks).map(([vehicle, benchmarks]) => (
            <div key={vehicle} className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="text-sm font-bold text-gray-800 text-center border-b border-gray-300 pb-2">
                {vehicle}
              </div>
              {benchmarks.map((benchmark, index) => (
                <div key={index} className="space-y-2">
                  <div className="text-xs font-medium text-gray-600 text-center">
                    {benchmark.mediaType}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="text-center bg-white rounded p-2">
                      <div className="text-gray-500 text-xs">CPM</div>
                      <div className="font-semibold text-blue-600 text-sm">
                        {formatCurrency(benchmark.cpm || 0)}
                      </div>
                    </div>
                    <div className="text-center bg-white rounded p-2">
                      <div className="text-gray-500 text-xs">CPC</div>
                      <div className="font-semibold text-green-600 text-sm">
                        {formatCurrency(benchmark.cpc || 0)}
                      </div>
                    </div>
                    <div className="text-center bg-white rounded p-2">
                      <div className="text-gray-500 text-xs">CTR</div>
                      <div className="font-semibold text-purple-600 text-sm">
                        {(benchmark.ctr || 0).toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-center bg-white rounded p-2">
                      <div className="text-gray-500 text-xs">VTR</div>
                      <div className="font-semibold text-orange-600 text-sm">
                        {(benchmark.vtr || 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return <Loading message="Carregando visão geral..." />
  }

  if (error) {
    return (
      <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Erro ao carregar dados: {error.message}</p>
      </div>
    )
  }

  return (
    <div ref={contentRef} className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 text-enhanced">Visão Geral da Campanha</h1>
            <p className="text-gray-600">Dashboard de performance</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-lg">
          <PDFDownloadButton contentRef={contentRef} fileName="visao-geral" />
          <span>Última atualização: {new Date().toLocaleString("pt-BR")}</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="card-overlay rounded-lg shadow-lg p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Filtro de Data */}
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
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Filtro de Plataformas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              Plataformas
            </label>
            <div className="flex flex-wrap gap-2">
              {availablePlatforms.map((platform) => (
                <button
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                    selectedPlatforms.includes(platform)
                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                      : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                  }`}
                  style={{
                    backgroundColor: selectedPlatforms.includes(platform) ? platformColors[platform] + "20" : undefined,
                    borderColor: selectedPlatforms.includes(platform) ? platformColors[platform] : undefined,
                    color: selectedPlatforms.includes(platform) ? platformColors[platform] : undefined,
                  }}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro de Modalidades */}
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
                      ? "bg-blue-100 text-blue-800 border border-blue-300"
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

      {/* Métricas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card-overlay rounded-lg shadow-lg p-4 text-center min-h-[80px] flex flex-col justify-center">
          <div className="text-sm text-gray-600 mb-1">Investimento Total</div>
          <div className="text-xl font-bold text-green-600">{formatCurrency(totals.investment)}</div>
        </div>

        <div className="card-overlay rounded-lg shadow-lg p-4 text-center min-h-[80px] flex flex-col justify-center">
          <div className="text-sm text-gray-600 mb-1">Impressões</div>
          <div className="text-xl font-bold text-blue-600">{formatFullNumber(totals.impressions)}</div>
        </div>

        <div className="card-overlay rounded-lg shadow-lg p-4 text-center min-h-[80px] flex flex-col justify-center">
          <div className="text-sm text-gray-600 mb-1">CPM</div>
          <div className="text-xl font-bold text-purple-600">{formatCurrency(totals.cpm)}</div>
        </div>

        <div className="card-overlay rounded-lg shadow-lg p-4 text-center min-h-[80px] flex flex-col justify-center">
          <div className="text-sm text-gray-600 mb-1">Alcance</div>
          <div className="text-xl font-bold text-orange-600">{formatNumber(totals.reach)}</div>
        </div>

        <div className="card-overlay rounded-lg shadow-lg p-4 text-center min-h-[80px] flex flex-col justify-center">
          <div className="text-sm text-gray-600 mb-1">Frequência</div>
          <div className="text-xl font-bold text-red-600">{totals.frequency.toFixed(2)}</div>
        </div>

        <div className="card-overlay rounded-lg shadow-lg p-4 text-center min-h-[80px] flex flex-col justify-center">
          <div className="text-sm text-gray-600 mb-1">Cliques</div>
          <div className="text-xl font-bold text-teal-600">{formatFullNumber(totals.clicks)}</div>
        </div>
      </div>

      {/* Gráficos de Barras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 flex-1">
        {/* Impressões por Plataforma */}
        <div className="card-overlay rounded-lg shadow-lg p-4">
          <HorizontalBarChart data={impressionsChartData} title="Impressões" />
        </div>

        {/* Alcance por Plataforma - Meta e TikTok */}
        <div className="card-overlay rounded-lg shadow-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Alcance</h4>
          <div className="space-y-3">
            {/* TikTok */}
            {reachChartData.find((d) => d.platform === "TikTok") && (
              <div className="flex items-center space-x-3">
                <div className="w-20 text-xs text-gray-600 font-medium">TikTok</div>
                <div className="flex-1 relative">
                  <div
                    className="h-6 rounded"
                    style={{
                      width: `${Math.min((alcanceTotals.tiktok.reach / Math.max(alcanceTotals.tiktok.reach, alcanceTotals.meta.reach, 1)) * 100, 100)}%`,
                      backgroundColor: "#ff0050",
                    }}
                  />
                  <div className="absolute right-2 top-0 h-6 flex items-center">
                    <span className="text-xs font-medium text-gray-700">{formatNumber(alcanceTotals.tiktok.reach)}</span>
                  </div>
                </div>
              </div>
            )}
            {/* Meta */}
            {reachChartData.find((d) => d.platform === "Meta") && (
              <div className="flex items-center space-x-3">
                <div className="w-20 text-xs text-gray-600 font-medium">Meta</div>
                <div className="flex-1 relative">
                  <div
                    className="h-6 rounded"
                    style={{
                      width: `${Math.min((alcanceTotals.meta.reach / Math.max(alcanceTotals.tiktok.reach, alcanceTotals.meta.reach, 1)) * 100, 100)}%`,
                      backgroundColor: "#0668E1",
                    }}
                  />
                  <div className="absolute right-2 top-0 h-6 flex items-center">
                    <span className="text-xs font-medium text-gray-700">{formatNumber(alcanceTotals.meta.reach)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Frequência por Plataforma - Meta e TikTok */}
        <div className="card-overlay rounded-lg shadow-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Frequência</h4>
          <div className="space-y-3">
            {/* TikTok */}
            {frequencyChartData.find((d) => d.platform === "TikTok") && (
              <div className="flex items-center space-x-3">
                <div className="w-20 text-xs text-gray-600 font-medium">TikTok</div>
                <div className="flex-1 relative">
                  {(() => {
                    const tiktokFreq = alcanceTotals.tiktok.frequency > 0 
                      ? alcanceTotals.tiktok.frequency 
                      : (alcanceTotals.tiktok.reach > 0 ? alcanceTotals.tiktok.impressions / alcanceTotals.tiktok.reach : 0)
                    const metaFreq = alcanceTotals.meta.frequency > 0 
                      ? alcanceTotals.meta.frequency 
                      : (alcanceTotals.meta.reach > 0 ? alcanceTotals.meta.impressions / alcanceTotals.meta.reach : 0)
                    const maxFreq = Math.max(tiktokFreq, metaFreq, 1)
                    return (
                      <>
                        <div
                          className="h-6 rounded"
                          style={{
                            width: `${Math.min((tiktokFreq / maxFreq) * 100, 100)}%`,
                            backgroundColor: "#ff0050",
                          }}
                        />
                        <div className="absolute right-2 top-0 h-6 flex items-center">
                          <span className="text-xs font-medium text-gray-700">{tiktokFreq.toFixed(2)}</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            )}
            {/* Meta */}
            {frequencyChartData.find((d) => d.platform === "Meta") && (
              <div className="flex items-center space-x-3">
                <div className="w-20 text-xs text-gray-600 font-medium">Meta</div>
                <div className="flex-1 relative">
                  {(() => {
                    const tiktokFreq = alcanceTotals.tiktok.frequency > 0 
                      ? alcanceTotals.tiktok.frequency 
                      : (alcanceTotals.tiktok.reach > 0 ? alcanceTotals.tiktok.impressions / alcanceTotals.tiktok.reach : 0)
                    const metaFreq = alcanceTotals.meta.frequency > 0 
                      ? alcanceTotals.meta.frequency 
                      : (alcanceTotals.meta.reach > 0 ? alcanceTotals.meta.impressions / alcanceTotals.meta.reach : 0)
                    const maxFreq = Math.max(tiktokFreq, metaFreq, 1)
                    return (
                      <>
                        <div
                          className="h-6 rounded"
                          style={{
                            width: `${Math.min((metaFreq / maxFreq) * 100, 100)}%`,
                            backgroundColor: "#0668E1",
                          }}
                        />
                        <div className="absolute right-2 top-0 h-6 flex items-center">
                          <span className="text-xs font-medium text-gray-700">{metaFreq.toFixed(2)}</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CPM por Plataforma */}
        <div className="card-overlay rounded-lg shadow-lg p-4">
          <HorizontalBarChart data={cpmChartData} title="CPM Médio" format={(value) => formatCurrency(value)} />
        </div>

        {/* Cliques por Plataforma */}
        <div className="card-overlay rounded-lg shadow-lg p-4">
          <HorizontalBarChart data={clicksChartData} title="Cliques" />
        </div>

      </div>

      {/* Card de Benchmarks - Posicionado no final */}
      <div className="w-full">
        <BenchmarkCard />
      </div>
    </div>
  )
}

export default VisaoGeral