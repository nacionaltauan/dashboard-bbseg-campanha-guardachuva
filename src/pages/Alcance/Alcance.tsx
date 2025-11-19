"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { Users, Calendar, Filter, Info, MapPin } from "lucide-react"
import { useConsolidadoNacionalData, useAlcanceTikTokData, useAlcanceMetaData } from "../../services/api"
import PDFDownloadButton from "../../components/PDFDownloadButton/PDFDownloadButton"
import Loading from "../../components/Loading/Loading"

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
  linkClicks: number
  visualizacoes100: number
  cpv: number
  vtr100: number
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
  linkClicks: number
  visualizacoes100: number
  cpv: number
  vtr100: number
  color: string
  percentage: number
}

const Alcance: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null)
  const { data: apiData, loading, error } = useConsolidadoNacionalData()
  const { data: alcanceTikTokData } = useAlcanceTikTokData()
  const { data: alcanceMetaData } = useAlcanceMetaData()
  const [processedData, setProcessedData] = useState<ProcessedData[]>([])
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" })
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([])
  const [selectedModalidades, setSelectedModalidades] = useState<string[]>([])
  const [availableModalidades, setAvailableModalidades] = useState<string[]>([])

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
    Netflix: "#E50914",
    "Catraca Livre": "#3498db",
    "Carta Capital": "#2c3e50",
    Band: "#ffd700",
    "Portal Fórum": "#8b4513",
    "Brasil 247": "#ff4500",
    "Poder 360": "#4b0082",
    LinkedIn: "#0077B5",
    Pinterest: "#E60023",
    GDN: "#34A853",
    "Demand-Gen": "#EA4335",
    Default: "#6366f1",
  }

  // Adicione também esta validação no início do componente para debug:
  useEffect(() => {
    console.log("API Data structure:", apiData)
    if (apiData) {
      console.log("API Data keys:", Object.keys(apiData))
      if (apiData.data) {
        console.log("API Data.data keys:", Object.keys(apiData.data))
        if (apiData.data.values) {
          console.log("API Data.data.values length:", apiData.data.values.length)
          console.log("First few values:", apiData.data.values.slice(0, 3))
        }
      }
    }
  }, [apiData])

  // Processar dados da API - VERSÃO CORRIGIDA
  useEffect(() => {
    if (apiData && apiData.data && Array.isArray(apiData.data.values) && apiData.data.values.length > 1) {
      try {
        const [header, ...rows] = apiData.data.values

        const dataAsObjects = rows.map((row: any[]) => {
          const obj: { [key: string]: any } = {}
          header.forEach((key: string, index: number) => {
            obj[key] = row[index]
          })
          return obj
        })

        const processed: ProcessedData[] = dataAsObjects
          .map((item: any) => {
            const parseNumber = (value: any) => {
              if (!value || value === "" || value === "0") return 0
              if (typeof value === "number") return value
              const stringValue = value.toString()
              const cleanValue = stringValue
                .replace(/R\$\s*/g, "")
                .replace(/\./g, "")
                .replace(",", ".")
                .trim()
              const parsed = Number.parseFloat(cleanValue)
              return isNaN(parsed) ? 0 : parsed
            }

            const parseInteger = (value: any) => {
              if (!value || value === "" || value === "0") return 0
              if (typeof value === "number") return value
              const stringValue = value.toString()
              const cleanValue = stringValue.replace(/\./g, "").trim()
              const parsed = Number.parseInt(cleanValue)
              return isNaN(parsed) ? 0 : parsed
            }

            const parseDate = (dateStr: string) => {
              if (!dateStr) return ""
              const parts = dateStr.split("/")
              if (parts.length !== 3) return ""
              const [day, month, year] = parts
              return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
            }

            // Mapear campos da API para a interface ProcessedData
            return {
              date: parseDate(item["Date"]) || "",
              platform: item["Veículo"] || "Outros", // Mudança aqui - usar "Veículo" em vez de "Plataforma"
              campaignName: item["Campaign name"] || "",
              impressions: parseInteger(item["Impressions"]),
              cost: parseNumber(item["Total spent"]), // Mudança aqui - usar "Total spent" em vez de "Cost"
              reach: parseInteger(item["Reach"]),
              clicks: parseInteger(item["Clicks"]), // Mudança aqui - usar "Clicks" em vez de "Link clicks"
              frequency: 0, // Será calculado depois: impressions / reach
              cpm: 0, // Será calculado depois: cost / (impressions / 1000)
              linkClicks: parseInteger(item["Clicks"]),
              visualizacoes100: parseInteger(item["Video completions "]) || parseInteger(item["Video views "]), // Note o espaço no final
              cpv: 0, // Será calculado depois
              vtr100: 0, // Será calculado depois
              modalidade: item["Modalidade"] || "Outros",
            } as ProcessedData
          })
          .filter((item: ProcessedData) => item.date && item.impressions > 0)

        // Calcular métricas derivadas
        processed.forEach((item) => {
          item.frequency = item.reach > 0 ? item.impressions / item.reach : 0
          item.cpm = item.impressions > 0 ? (item.cost / item.impressions) * 1000 : 0
          item.cpv = item.visualizacoes100 > 0 ? item.cost / item.visualizacoes100 : 0
          item.vtr100 = item.impressions > 0 ? (item.visualizacoes100 / item.impressions) * 100 : 0
        })

        setProcessedData(processed)

        // Definir range de datas inicial
        if (processed.length > 0) {
          const validDates = processed
            .map((item) => item.date)
            .filter(Boolean)
            .sort()

          if (validDates.length > 0) {
            setDateRange({
              start: validDates[0],
              end: validDates[validDates.length - 1],
            })
          }
        }

        // Extrair plataformas únicas
        const platformSet = new Set<string>()
        processed.forEach((item) => {
          if (item.platform) {
            platformSet.add(item.platform)
          }
        })
        const platforms = Array.from(platformSet).filter(Boolean)
        setAvailablePlatforms(platforms)
        setSelectedPlatforms([])

        // Extrair modalidades únicas
        const modalidadeSet = new Set<string>()
        processed.forEach((item) => {
          if (item.modalidade) {
            modalidadeSet.add(item.modalidade)
          }
        })
        const modalidades = Array.from(modalidadeSet).filter(Boolean)
        setAvailableModalidades(modalidades)
        setSelectedModalidades([])
      } catch (error) {
        console.error("Erro ao processar dados:", error)
      }
    }
  }, [apiData])

  // Filtrar dados por data, plataforma e modalidade
  const filteredData = useMemo(() => {
    let filtered = processedData

    // Filtro por data
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter((item) => {
        const itemDateISO = item.date
        if (!itemDateISO) return false

        try {
          const itemDate = new Date(itemDateISO)
          const startDate = new Date(dateRange.start)
          const endDate = new Date(dateRange.end)
          return itemDate >= startDate && itemDate <= endDate
        } catch (error) {
          console.warn("Erro ao processar data:", itemDateISO)
          return false
        }
      })
    }

    // Filtro por plataforma
    if (selectedPlatforms.length > 0) {
      filtered = filtered.filter((item) => selectedPlatforms.includes(item.platform))
    }

    // Filtro por modalidade
    if (selectedModalidades.length > 0) {
      filtered = filtered.filter((item) => selectedModalidades.includes(item.modalidade))
    }

    return filtered
  }, [processedData, dateRange, selectedPlatforms, selectedModalidades])

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
          linkClicks: 0,
          visualizacoes100: 0,
          cpv: 0,
          vtr100: 0,
          color: platformColors[item.platform] || platformColors.Default,
          percentage: 0,
        }
      }

      metrics[item.platform].impressions += item.impressions
      metrics[item.platform].cost += item.cost
      // Para alcance: usar consolidado para todos (será substituído depois para TikTok e Meta)
      metrics[item.platform].reach += item.reach
      metrics[item.platform].clicks += item.clicks
      metrics[item.platform].linkClicks += item.linkClicks
      metrics[item.platform].visualizacoes100 += item.visualizacoes100
    })

    // Substituir alcance de TikTok e Meta pelos valores das abas específicas
    if (metrics["TikTok"]) {
      metrics["TikTok"].reach = alcanceTotals.tiktok.reach
    }
    if (metrics["Meta"]) {
      metrics["Meta"].reach = alcanceTotals.meta.reach
    }

    // Calcular médias e percentuais
    const totalReach = Object.values(metrics).reduce((sum, metric) => sum + metric.reach, 0)

    Object.values(metrics).forEach((metric) => {
      const platformData = filteredData.filter((item) => item.platform === metric.platform)
      if (platformData.length > 0) {
        metric.cpm = metric.impressions > 0 ? metric.cost / (metric.impressions / 1000) : 0
        
        // Para frequência: usar dados específicos para TikTok e Meta
        if (metric.platform === "TikTok") {
          metric.frequency = alcanceTotals.tiktok.frequency > 0 
            ? alcanceTotals.tiktok.frequency 
            : (alcanceTotals.tiktok.reach > 0 ? alcanceTotals.tiktok.impressions / alcanceTotals.tiktok.reach : 0)
        } else if (metric.platform === "Meta") {
          metric.frequency = alcanceTotals.meta.frequency > 0 
            ? alcanceTotals.meta.frequency 
            : (alcanceTotals.meta.reach > 0 ? alcanceTotals.meta.impressions / alcanceTotals.meta.reach : 0)
        } else {
          metric.frequency = metric.reach > 0 ? metric.impressions / metric.reach : 0
        }
        
        metric.cpv = metric.visualizacoes100 > 0 ? metric.cost / metric.visualizacoes100 : 0
        metric.vtr100 = metric.impressions > 0 ? (metric.visualizacoes100 / metric.impressions) * 100 : 0
        metric.percentage = totalReach > 0 ? (metric.reach / totalReach) * 100 : 0
      }
    })

    return Object.values(metrics).sort((a, b) => b.reach - a.reach)
  }, [filteredData, platformColors, alcanceTotals])

  // Calcular totais
  const totals = useMemo(() => {
    const totalInvestment = filteredData.reduce((sum, item) => sum + item.cost, 0)
    const totalImpressions = filteredData.reduce((sum, item) => sum + item.impressions, 0)
    
    // Para alcance: usar dados específicos de TikTok e Meta, e consolidado para outros
    const otherReach = filteredData
      .filter((item) => item.platform !== "TikTok" && item.platform !== "Meta")
      .reduce((sum, item) => sum + item.reach, 0)
    const totalReach = alcanceTotals.tiktok.reach + alcanceTotals.meta.reach + otherReach
    
    const totalVisualizacoes100 = filteredData.reduce((sum, item) => sum + item.visualizacoes100, 0)
    
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
    const avgFrequency = totalImpressionsForFreq > 0 && totalReach > 0 ? totalImpressionsForFreq / totalReach : 0

    return {
      investment: totalInvestment,
      impressions: totalImpressions,
      reach: totalReach,
      frequency: avgFrequency,
      visualizacoes100: totalVisualizacoes100,
      avgCpm: totalImpressions > 0 ? totalInvestment / (totalImpressions / 1000) : 0,
      avgCpv: totalVisualizacoes100 > 0 ? totalInvestment / totalVisualizacoes100 : 0,
    }
  }, [filteredData, alcanceTotals])

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

  // Função para formatar moeda
  const formatCurrency = (value: number): string => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  // Função para alternar seleção de plataforma
  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platform)) {
        return prev.filter((p) => p !== platform)
      }
      return [...prev, platform]
    })
  }

  // Função para alternar seleção de modalidade
  const toggleModalidade = (modalidade: string) => {
    setSelectedModalidades((prev) => {
      if (prev.includes(modalidade)) {
        return prev.filter((m) => m !== modalidade)
      }
      return [...prev, modalidade]
    })
  }

  // Componente de gráfico de barras empilhadas horizontal
  const StackedBarChart: React.FC<{ title: string; data: any[]; dataKey?: string }> = ({
    title,
    data,
    dataKey = "percentage",
  }) => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <div className="space-y-2">
        <div className="flex text-xs text-gray-600 justify-between">
          <span>0%</span>
          <span>10%</span>
          <span>20%</span>
          <span>30%</span>
          <span>40%</span>
          <span>50%</span>
          <span>60%</span>
          <span>70%</span>
          <span>80%</span>
          <span>90%</span>
          <span>100%</span>
        </div>
        <div className="flex h-8 bg-gray-100 rounded overflow-hidden">
          {data.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-center text-xs font-medium text-white"
              style={{
                width: `${item[dataKey]}%`,
                backgroundColor: item.color,
                minWidth: item[dataKey] > 3 ? "auto" : "0",
              }}
              title={`${item.platform || item.tipoCompra}: ${item[dataKey].toFixed(1)}%`}
            >
              {item[dataKey] > 5 ? item.platform || item.tipoCompra : ""}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
              <span className="text-xs text-gray-600">{item.platform || item.tipoCompra}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // Componente de gráfico de barras verticais
  const VerticalBarChart: React.FC<{
    title: string
    data: any[]
    getValue: (item: any) => number
    format?: (value: number) => string
  }> = ({ title, data, getValue, format = formatNumber }) => {
    const maxValue = Math.max(...data.map(getValue))
    const minValue = Math.min(...data.map(getValue).filter(v => v > 0))
    
    // Usar escala logarítmica para melhor visualização de grandes diferenças
    const getLogHeight = (value: number) => {
      if (value <= 0) return 0
      const logValue = Math.log10(value)
      const logMax = Math.log10(maxValue)
      const logMin = Math.log10(minValue)
      return ((logValue - logMin) / (logMax - logMin)) * 100
    }

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-end space-x-2 h-64">
          {data.slice(0, 8).map((item, index) => {
            const value = getValue(item)
            const height = getLogHeight(value)

            return (
              <div key={index} className="flex-1 flex flex-col items-center space-y-1">
                <div className="w-full flex flex-col items-center">
                  <div
                    className="w-full rounded-t transition-all duration-500 flex items-end justify-center text-xs font-medium text-white p-1"
                    style={{
                      height: `${height}%`,
                      backgroundColor: item.color,
                      minHeight: value > 0 ? "20px" : "0",
                    }}
                  >
                    {value > 0 && <span>{format(value)}</span>}
                  </div>
                </div>
                <span className="text-xs text-gray-600 text-center truncate w-full">
                  {item.platform || item.tipoCompra}
                </span>
              </div>
            )
          })}
        </div>
        <div className="text-xs text-gray-500 text-center">
          * Escala logarítmica para melhor visualização das diferenças
        </div>
      </div>
    )
  }

  if (loading) {
    return <Loading message="Carregando dados de alcance..." />
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
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 text-enhanced">Alcance</h1>
            <p className="text-gray-600">Análise de alcance da campanha</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-lg">
          <PDFDownloadButton contentRef={contentRef} fileName="alcance" />
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

          {/* Filtro de Plataforma */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              Plataforma
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

          {/* Filtro de Modalidade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Modalidade
            </label>
            <div className="flex flex-wrap gap-2">
              {availableModalidades.map((modalidade) => (
                <button
                  key={modalidade}
                  onClick={() => toggleModalidade(modalidade)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                    selectedModalidades.includes(modalidade)
                      ? "bg-green-100 text-green-800 border border-green-300"
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card-overlay rounded-lg shadow-lg p-4 text-center min-h-[100px] flex flex-col justify-center">
          <div className="text-sm text-gray-600 mb-1">Investimento total</div>
          <div className="text-2xl font-bold text-gray-900">R$ {formatNumber(totals.investment)}</div>
        </div>

        <div className="card-overlay rounded-lg shadow-lg p-4 text-center min-h-[100px] flex flex-col justify-center">
          <div className="text-sm text-gray-600 mb-1">Alcance</div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(totals.reach)}</div>
        </div>

        <div className="card-overlay rounded-lg shadow-lg p-4 text-center min-h-[100px] flex flex-col justify-center">
          <div className="text-sm text-gray-600 mb-1">Frequência</div>
          <div className="text-2xl font-bold text-gray-900">{totals.frequency.toFixed(1)}</div>
        </div>

        <div className="card-overlay rounded-lg shadow-lg p-4 text-center min-h-[100px] flex flex-col justify-center">
          <div className="text-sm text-gray-600 mb-1">CPM Médio</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totals.avgCpm)}</div>
        </div>

        <div className="card-overlay rounded-lg shadow-lg p-4 text-center min-h-[100px] flex flex-col justify-center">
          <div className="text-sm text-gray-600 mb-1">Impressões</div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(totals.impressions)}</div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Investimento por Plataforma */}
        <div className="card-overlay rounded-lg shadow-lg p-6">
          <StackedBarChart title="Investimento por Plataforma" data={platformMetrics} />
        </div>

        {/* Gráfico de Alcance por Plataforma */}
        <div className="card-overlay rounded-lg shadow-lg p-6">
          <VerticalBarChart title="Alcance por Plataforma" data={platformMetrics} getValue={(item) => item.reach} />
        </div>

        {/* Gráfico de Frequência por Plataforma */}
        <div className="card-overlay rounded-lg shadow-lg p-6">
          <VerticalBarChart
            title="Frequência média por Plataforma"
            data={platformMetrics}
            getValue={(item) => item.frequency}
            format={(value) => value.toFixed(1)}
          />
        </div>
      </div>

      {/* Tabela Detalhada */}
      <div className="flex-1 card-overlay rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Dados Detalhados por Plataforma</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="text-left py-3 px-4 font-semibold">#</th>
                <th className="text-left py-3 px-4 font-semibold">Plataforma</th>
                <th className="text-right py-3 px-4 font-semibold">Investimento</th>
                <th className="text-right py-3 px-4 font-semibold">Impressões</th>
                <th className="text-right py-3 px-4 font-semibold">Alcance</th>
                <th className="text-right py-3 px-4 font-semibold">Frequência</th>
                <th className="text-right py-3 px-4 font-semibold">CPM</th>
              </tr>
            </thead>
            <tbody>
              {platformMetrics.map((metric, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-blue-50" : "bg-white"}>
                  <td className="py-3 px-4 font-medium">{index + 1}.</td>
                  <td className="py-3 px-4 font-medium">{metric.platform}</td>
                  <td className="py-3 px-4 text-right font-semibold">{formatCurrency(metric.cost)}</td>
                  <td className="py-3 px-4 text-right">{formatNumber(metric.impressions)}</td>
                  <td className="py-3 px-4 text-right">{formatNumber(metric.reach)}</td>
                  <td className="py-3 px-4 text-right">{metric.frequency.toFixed(1)}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(metric.cpm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerta Informativo */}
      <div className="bg-blue-50/90 backdrop-blur-sm border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">Informações sobre Alcance e Frequência</h3>
            <p className="text-sm text-blue-700">
              Os valores de <strong>alcance</strong> e <strong>frequência</strong> apresentados representam uma média
              aproximada dos números reais. Devido à natureza da extração diária dos dados e às limitações técnicas das
              plataformas, não é possível calcular com precisão absoluta esses indicadores. Os valores servem como
              referência para análise de tendências e comparações relativas entre diferentes períodos e veículos.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Alcance
