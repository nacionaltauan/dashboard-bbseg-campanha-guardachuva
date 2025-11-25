"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { Play, Calendar, Filter, MapPin, Info } from "lucide-react"
import { useConsolidadoNacionalData } from "../../services/api"
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
  videoViews: number
  videoViews25: number
  videoViews50: number
  videoViews75: number
  videoCompletions: number
  cpv: number
  cpvc: number
  vtr100: number
  tipoCompra: string
  modalidade: string
  tipoFormato: string // Adicionado para filtrar melhor os tipos
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
  videoViews: number
  videoViews25: number
  videoViews50: number
  videoViews75: number
  videoCompletions: number
  cpv: number
  cpvc: number
  vtr100: number
  color: string
  percentage: number
  vtrPercentage: number
  visualizacoesPercentage: number
  tiposCompra: string[]
  modalidades: string[]
  tipoFormato: string
}

const Visualizacoes: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null)
  const { data: apiData, loading, error } = useConsolidadoNacionalData()
  const [processedData, setProcessedData] = useState<ProcessedData[]>([])
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" })
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [selectedTiposCompra, setSelectedTiposCompra] = useState<string[]>([])
  const [selectedModalidades, setSelectedModalidades] = useState<string[]>([])
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([])
  const [availableTiposCompra, setAvailableTiposCompra] = useState<string[]>([])
  const [availableModalidades, setAvailableModalidades] = useState<string[]>([])

  // Cores para as plataformas (seguindo o modelo da imagem)
  const platformColors: Record<string, string> = {
    YouTube: "#ff6b6b",
    TikTok: "#ff4757",
    Google: "#5f27cd",
    Netflix: "#341f97",
    Meta: "#74b9ff",
    Spotify: "#1DB954",
    Kwai: "#fdcb6e",
    Band: "#e17055",
    "Catraca Livre": "#00b894",
    "Globo.com": "#00a085",
    Pinterest: "#bd081c",
    LinkedIn: "#0077B5",
    GDN: "#34A853",
    "Demand-Gen": "#EA4335",
    Default: "#6c5ce7",
  }

  // Cores para tipos de compra
  const tipoCompraColors: Record<string, string> = {
    CPM: "#3B82F6",
    CPC: "#10B981",
    CPV: "#F59E0B",
    Default: "#6B7280",
  }

  // Função para ordenar tipos de compra na ordem correta
  const sortTiposCompra = (tipos: string[]): string[] => {
    const ordem = ["CPM", "CPC", "CPV"]
    return tipos.sort((a, b) => {
      const indexA = ordem.indexOf(a)
      const indexB = ordem.indexOf(b)
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })
  }

  // Função para converter data de dd/MM/yyyy para yyyy-MM-dd
  const convertDateFormat = (dateStr: string): string => {
    if (!dateStr) return ""
    const [day, month, year] = dateStr.split("/")
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }

  // Função para converter data de yyyy-MM-dd para dd/MM/yyyy
  const convertDateToDisplay = (dateStr: string): string => {
    if (!dateStr) return ""
    const [year, month, day] = dateStr.split("-")
    return `${day}/${month}/${year}`
  }

  // Adicione também esta validação no início do componente para debug:
  useEffect(() => {
    console.log("API Data structure (Visualizações):", apiData)
    if (apiData) {
      console.log("API Data keys:", Object.keys(apiData))
      if (apiData.data) {
        console.log("API Data.data keys:", Object.keys(apiData.data))
        if (apiData.data.values) {
          console.log("API Data.data.values length:", apiData.data.values.length)
          console.log("Header:", apiData.data.values[0])
          console.log("First data row:", apiData.data.values[1])
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
            const impressions = parseInteger(item["Impressions"])
            const videoViews = parseInteger(item["Video views "]) // Note o espaço no final
            const videoCompletions = parseInteger(item["Video completions "]) // Note o espaço no final
            const cost = parseNumber(item["Total spent"])
            const platform = item["Veículo"] || ""
            const campaignName = item["Campaign name"] || ""
            const reach = parseInteger(item["Reach"])

            // Converter data para formato ISO
            const originalDate = item["Date"]
            const convertedDate = parseDate(originalDate)

            // Extrair tipo de compra da API
            const tipoCompra = item["Tipo de Compra"] || "CPM"

            // Para modalidade, vamos extrair da coluna Modalidade se existir, senão do nome da campanha
            let modalidade = "Nacional" // Default
            // Verificar se há coluna Modalidade na planilha
            if (item["Modalidade"]) {
              modalidade = item["Modalidade"].toString().trim() || "Nacional"
            } else if (campaignName.includes("| SP |")) modalidade = "São Paulo"
            else if (campaignName.includes("| RJ |")) modalidade = "Rio de Janeiro"
            else if (campaignName.includes("| MG |")) modalidade = "Minas Gerais"
            else if (campaignName.includes("| RS |")) modalidade = "Rio Grande do Sul"
            else if (campaignName.includes("| NAC |")) modalidade = "Nacional"

            return {
              date: convertedDate,
              platform: platform,
              campaignName: campaignName,
              impressions: impressions,
              cost: cost,
              reach: reach,
              clicks: parseInteger(item["Clicks"]),
              frequency: reach > 0 ? impressions / reach : 1,
              cpm: impressions > 0 ? (cost / impressions) * 1000 : 0,
              linkClicks: parseInteger(item["Clicks"]),
              videoViews: videoViews,
              videoViews25: parseInteger(item["Video views at 25%"]),
              videoViews50: parseInteger(item["Video views at 50%"]),
              videoViews75: parseInteger(item["Video views at 75%"]),
              videoCompletions: videoCompletions,
              cpv: videoViews > 0 ? cost / videoViews : 0,
              cpvc: videoCompletions > 0 ? cost / videoCompletions : 0,
              vtr100: impressions > 0 && videoCompletions > 0 ? (videoCompletions / impressions) * 100 : 0,
              tipoCompra: tipoCompra,
              modalidade: modalidade,
              tipoFormato: (() => {
                // Se o campo video_estatico_audio estiver preenchido, usar ele
                if (item["video_estatico_audio"] === "Video") return "Vídeo"
                if (item["video_estatico_audio"] === "Audio") return "Audio"
                // Se não estiver preenchido, mas houver visualizações de vídeo, considerar como vídeo
                if (videoViews > 0 || videoCompletions > 0) return "Vídeo"
                // Caso contrário, é estático
                return "Estático"
              })(),
            } as ProcessedData
          })
          .filter((item: ProcessedData) => {
            // Filtrar apenas dados com impressões e que tenham dados de vídeo ou áudio
            return (
              item.date &&
              item.impressions > 0 &&
              (item.videoViews > 0 || item.videoCompletions > 0) && // Deve ter pelo menos uma métrica de vídeo/áudio
              item.platform &&
              (item.tipoFormato === "Vídeo" || item.tipoFormato === "Audio") // Vídeos e áudios para esta página
            )
          })

        console.log("Dados processados (vídeo/áudio):", processed.length)
        console.log("Amostra dos dados:", processed.slice(0, 3))
        
        // Debug específico para Spotify
        const spotifyData = processed.filter(item => item.platform === "Spotify")
        console.log("Dados do Spotify:", spotifyData)
        console.log("Total de registros Spotify:", spotifyData.length)
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

        // Extrair plataformas únicas (apenas as que têm video views)
        const platformSet = new Set<string>()
        processed.forEach((item) => {
          if (item.platform && (item.videoViews > 0 || item.videoCompletions > 0)) {
            platformSet.add(item.platform)
          }
        })
        const platforms = Array.from(platformSet).filter(Boolean)
        console.log("Plataformas disponíveis:", platforms)
        console.log("Spotify está nas plataformas?", platforms.includes("Spotify"))
        setAvailablePlatforms(platforms)
        setSelectedPlatforms([])

        // Extrair tipos de compra únicos
        const tipoCompraSet = new Set<string>()
        processed.forEach((item) => {
          if (item.tipoCompra) {
            tipoCompraSet.add(item.tipoCompra)
          }
        })
        const tiposCompra = Array.from(tipoCompraSet).filter(Boolean)
        setAvailableTiposCompra(tiposCompra)
        setSelectedTiposCompra([])

        // Extrair modalidades únicas
        const modalidadeSet = new Set<string>()
        processed.forEach((item) => {
          if (item.modalidade) {
            modalidadeSet.add(item.modalidade)
          }
        })
        const modalidades = Array.from(modalidadeSet).filter(Boolean).sort()
        setAvailableModalidades(modalidades)
        setSelectedModalidades([])
      } catch (error) {
        console.error("Erro ao processar dados:", error)
      }
    } else {
      console.log("Dados da API não disponíveis ou estrutura incorreta:", apiData)
    }
  }, [apiData])



  // Filtrar dados por data, plataforma, tipo de compra e modalidade
  const filteredData = useMemo(() => {
    let filtered = processedData

    // Filtro por data
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter((item) => {
        try {
          // Função para normalizar data para comparação (apenas data, sem hora)
          const normalizeDate = (date: Date): Date => {
            const normalized = new Date(date)
            normalized.setHours(0, 0, 0, 0)
            return normalized
          }

          const itemDate = normalizeDate(new Date(item.date))
          const startDate = normalizeDate(new Date(dateRange.start))
          const endDate = normalizeDate(new Date(dateRange.end))
          return itemDate >= startDate && itemDate <= endDate
        } catch (error) {
          console.warn("Erro ao processar data:", item.date)
          return false
        }
      })
    }

    // Filtro por plataforma
    if (selectedPlatforms.length > 0) {
      filtered = filtered.filter((item) => selectedPlatforms.includes(item.platform))
    }

    // Filtro por tipo de compra
    if (selectedTiposCompra.length > 0) {
      filtered = filtered.filter((item) => selectedTiposCompra.includes(item.tipoCompra))
    }

    // Filtro por modalidade
    if (selectedModalidades.length > 0) {
      filtered = filtered.filter((item) => selectedModalidades.includes(item.modalidade))
    }

    return filtered
  }, [processedData, dateRange, selectedPlatforms, selectedTiposCompra, selectedModalidades])

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
          videoViews: 0,
          videoViews25: 0,
          videoViews50: 0,
          videoViews75: 0,
          videoCompletions: 0,
          cpv: 0,
          cpvc: 0,
          vtr100: 0,
          color: platformColors[item.platform] || platformColors.Default,
          percentage: 0,
          vtrPercentage: 0,
          visualizacoesPercentage: 0,
          tiposCompra: [],
          modalidades: [],
          tipoFormato: item.tipoFormato,
        }
      }
      
      // Debug específico para Spotify
      if (item.platform === "Spotify") {
        console.log("Processando item Spotify:", {
          creativeTitle: item.campaignName,
          videoViews: item.videoViews,
          videoCompletions: item.videoCompletions,
          tipoFormato: item.tipoFormato
        })
      }

      metrics[item.platform].impressions += item.impressions
      metrics[item.platform].cost += item.cost
      metrics[item.platform].reach += item.reach
      metrics[item.platform].clicks += item.clicks
      metrics[item.platform].linkClicks += item.linkClicks
      metrics[item.platform].videoViews += item.videoViews
      metrics[item.platform].videoViews25 += item.videoViews25
      metrics[item.platform].videoViews50 += item.videoViews50
      metrics[item.platform].videoViews75 += item.videoViews75
      metrics[item.platform].videoCompletions += item.videoCompletions

      // Adicionar tipo de compra se não existir
      if (!metrics[item.platform].tiposCompra.includes(item.tipoCompra)) {
        metrics[item.platform].tiposCompra.push(item.tipoCompra)
      }
      // Adicionar modalidade se não existir
      if (!metrics[item.platform].modalidades.includes(item.modalidade)) {
        metrics[item.platform].modalidades.push(item.modalidade)
      }
    })

    // Calcular médias e percentuais
    const totalCost = Object.values(metrics).reduce((sum, metric) => sum + metric.cost, 0)
    const totalVisualizacoes = Object.values(metrics).reduce((sum, metric) => sum + metric.videoCompletions, 0)
    const maxVtr = Math.max(...Object.values(metrics).map((m) => m.vtr100))

    Object.values(metrics).forEach((metric) => {
      const platformData = filteredData.filter((item) => item.platform === metric.platform)
      if (platformData.length > 0) {
        metric.cpm = metric.impressions > 0 ? metric.cost / (metric.impressions / 1000) : 0
        metric.frequency = metric.reach > 0 ? metric.impressions / metric.reach : 0
        metric.cpv = metric.videoViews > 0 ? metric.cost / metric.videoViews : 0
        metric.cpvc = metric.videoCompletions > 0 ? metric.cost / metric.videoCompletions : 0
        metric.vtr100 = metric.impressions > 0 ? (metric.videoCompletions / metric.impressions) * 100 : 0
        metric.percentage = totalCost > 0 ? (metric.cost / totalCost) * 100 : 0
        metric.visualizacoesPercentage =
          totalVisualizacoes > 0 ? (metric.videoCompletions / totalVisualizacoes) * 100 : 0
        metric.vtrPercentage = maxVtr > 0 ? (metric.vtr100 / maxVtr) * 100 : 0
        // Ordenar tipos de compra
        metric.tiposCompra = sortTiposCompra(metric.tiposCompra)
        metric.modalidades.sort()
      }
    })

    const result = Object.values(metrics).sort((a, b) => b.cost - a.cost)
    console.log("Métricas finais calculadas:", result.map(m => m.platform))
    console.log("Spotify nas métricas finais?", result.some(m => m.platform === "Spotify"))
    return result
  }, [filteredData, platformColors])

  // Calcular totais
  const totals = useMemo(() => {
    const totalInvestment = filteredData.reduce((sum, item) => sum + item.cost, 0)
    const totalImpressions = filteredData.reduce((sum, item) => sum + item.impressions, 0)
    const totalVideoViews = filteredData.reduce((sum, item) => sum + item.videoCompletions, 0)
    const avgVtr100 = totalImpressions > 0 ? (totalVideoViews / totalImpressions) * 100 : 0
    const avgCpv = totalVideoViews > 0 ? totalInvestment / totalVideoViews : 0
    const avgCpvc = avgCpv // CPVc é igual ao CPV quando consideramos visualizações 100%

    return {
      investment: totalInvestment,
      impressions: totalImpressions,
      videoViews: totalVideoViews,
      vtr100: avgVtr100,
      cpv: avgCpv,
      cpvc: avgCpvc,
    }
  }, [filteredData])

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

  // Função para alternar seleção de tipo de compra
  const toggleTipoCompra = (tipoCompra: string) => {
    setSelectedTiposCompra((prev) => {
      if (prev.includes(tipoCompra)) {
        return prev.filter((t) => t !== tipoCompra)
      }
      return [...prev, tipoCompra]
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

  // Componente de curva de retenção (agora gráfico de barras)
  const RetentionCurveChart: React.FC<{ data: PlatformMetrics[] }> = ({ data }) => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Curva de Retenção por Veículo</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-md">
            <div className="text-sm text-blue-800">
              <strong>VTR/LTR (Video/Listen Through Rate):</strong> Percentual de pessoas que consumiram o conteúdo completo (vídeo ou áudio) em
              relação ao total de impressões.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.map((platform, index) => {
            // Calcular percentuais de retenção baseados nas visualizações totais
            const totalViews = Math.max(
              platform.videoViews,
              platform.videoViews25,
              platform.videoViews50,
              platform.videoViews75,
              platform.videoCompletions,
            )

            const retention25 = totalViews > 0 ? (platform.videoViews25 / totalViews) * 100 : 0
            const retention50 = totalViews > 0 ? (platform.videoViews50 / totalViews) * 100 : 0
            const retention75 = totalViews > 0 ? (platform.videoViews75 / totalViews) * 100 : 0
            const retention100 = totalViews > 0 ? (platform.videoCompletions / totalViews) * 100 : 0

            // Determine if 25%, 50%, 75% data is all zero
            const hasIntermediateData =
              platform.videoViews25 > 0 || platform.videoViews50 > 0 || platform.videoViews75 > 0

            const retentionPoints = hasIntermediateData
              ? [
                  { x: 0, y: 100, label: "Início" },
                  { x: 25, y: Math.min(retention25, 100), label: "25%" },
                  { x: 50, y: Math.min(retention50, 100), label: "50%" },
                  { x: 75, y: Math.min(retention75, 100), label: "75%" },
                  { x: 100, y: Math.min(retention100, 100), label: "100%" },
                ]
              : [
                  { x: 0, y: 100, label: "Início" },
                  { x: 100, y: Math.min(retention100, 100), label: "100%" },
                ]

            const chartWidth = 300
            const chartHeight = 100
            const barWidth = hasIntermediateData ? 30 : 60
            const barSpacing = hasIntermediateData ? 20 : 100
            const totalBarsWidth = retentionPoints.length * barWidth + (retentionPoints.length - 1) * barSpacing
            const startX = (chartWidth - totalBarsWidth) / 2

            return (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: platform.color }} />
                    <h4 className="font-semibold text-gray-900">{platform.platform}</h4>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      {platform.tipoFormato === "Audio" ? "LTR" : "VTR"}
                    </div>
                    <div className="text-lg font-bold" style={{ color: platform.color }}>
                      {platform.vtr100.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="relative h-32 bg-gray-50 rounded-lg p-2 flex items-end justify-center">
                  <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="overflow-visible"
                  >
                    {/* Y-axis labels */}
                    {[0, 25, 50, 75, 100].map((value) => (
                      <text
                        key={value}
                        x={-10}
                        y={chartHeight - value + 3}
                        textAnchor="end"
                        className="text-xs fill-gray-500"
                      >
                        {value}%
                      </text>
                    ))}

                    {/* Bars */}
                    {retentionPoints.map((point, i) => {
                      const barHeight = (point.y / 100) * chartHeight
                      const xPos = startX + i * (barWidth + barSpacing)
                      const yPos = chartHeight - barHeight
                      return (
                        <g key={i}>
                          <rect
                            x={xPos}
                            y={yPos}
                            width={barWidth}
                            height={Math.max(barHeight, 0)}
                            fill={platform.color}
                            rx="4"
                            ry="4"
                          />
                          <text
                            x={xPos + barWidth / 2}
                            y={yPos - 5}
                            textAnchor="middle"
                            className="text-xs font-medium"
                            fill={platform.color}
                          >
                            {point.y.toFixed(1)}%
                          </text>
                          <text
                            x={xPos + barWidth / 2}
                            y={chartHeight + 15}
                            textAnchor="middle"
                            className="text-xs fill-gray-500"
                          >
                            {point.label}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">
                      {platform.tipoFormato === "Audio" ? "Total Listens:" : "Total Views:"}
                    </span> {formatNumber(platform.videoViews)}
                  </div>
                  <div>
                    <span className="font-medium">Completions:</span> {formatNumber(platform.videoCompletions)}
                  </div>
                  <div>
                    <span className="font-medium">CPV:</span> {formatCurrency(platform.cpv)}
                  </div>
                  <div>
                    <span className="font-medium">Investimento:</span> {formatCurrency(platform.cost)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Como interpretar a curva de retenção:</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p>
              • <strong>Início (0%):</strong> 100% das pessoas que começaram a assistir ou escutar a peça
            </p>
            <p>
              • <strong>25%, 50%, 75%:</strong> Percentual de pessoas que continuaram consumindo até esse ponto
            </p>
            <p>
              • <strong>100%:</strong> Percentual de pessoas que consumiram a peça completa (áudio ou vídeo)
            </p>
            <p>
              • <strong>VTR/LTR:</strong> Video Through Rate/Listen Through Rate - percentual de visualizações ou escutas completas em relação às impressões totais
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Componente de gráfico de barras verticais
  const VerticalBarChart: React.FC<{
    title: string
    data: PlatformMetrics[]
    getValue: (item: PlatformMetrics) => number
    format?: (value: number) => string
    showPercentage?: boolean
  }> = ({ title, data, getValue, format = formatNumber, showPercentage = false }) => {
    const maxValue = Math.max(...data.map(getValue))

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-end space-x-2 h-32">
          {data.slice(0, 8).map((item, index) => {
            const value = getValue(item)
            const height = maxValue > 0 ? (value / maxValue) * 100 : 0

            return (
              <div key={index} className="flex-1 flex flex-col items-center space-y-1">
                <div className="w-full flex flex-col items-center">
                  <div
                    className="w-full rounded-t transition-all duration-500 flex items-end justify-center text-xs font-medium text-white p-1"
                    style={{
                      height: `${Math.max(height, 0)}%`,
                      backgroundColor: item.color,
                      minHeight: value > 0 ? "20px" : "0",
                    }}
                  >
                    {value > 0 && (
                      <span className="text-center">{showPercentage ? `${value.toFixed(2)}%` : format(value)}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-600 text-center truncate w-full">{item.platform}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (loading) {
    return <Loading message="Carregando dados de retenção..." />
  }

  if (error) {
    return (
      <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Erro ao carregar dados: {error.message}</p>
      </div>
    )
  }

  if (processedData.length === 0) {
    return (
      <div className="bg-yellow-50/90 backdrop-blur-sm border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">Nenhum dado de retenção de vídeo ou áudio encontrado no período selecionado.</p>
      </div>
    )
  }

  return (
    <div ref={contentRef} className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-red-600 rounded-lg flex items-center justify-center">
            <Play className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 text-enhanced">Análise de Retenção</h1>
            <p className="text-gray-600">Análise de retenção de vídeo e áudio</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-lg">
          <PDFDownloadButton contentRef={contentRef} fileName="visualizacoes" />
          <span>Última atualização: {new Date().toLocaleString("pt-BR")}</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="card-overlay rounded-lg shadow-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Filtro de Data */}
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Período:
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-auto"
            />
            <span className="text-sm text-gray-700">até</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-auto"
            />
          </div>

          {/* Filtro de Plataforma */}
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              Plataformas:
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

          {/* Filtro de Tipo de Compra */}
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              <Info className="w-4 h-4 mr-2" />
              Tipo de Compra:
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTiposCompra.map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => toggleTipoCompra(tipo)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                    selectedTiposCompra.includes(tipo)
                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                      : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro de Modalidade */}
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Modalidades:
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

      {/* Gráficos */}
      <RetentionCurveChart data={platformMetrics} />
      
    </div>
  )
}

export default Visualizacoes

