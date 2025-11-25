"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { ResponsiveLine } from "@nivo/line"
import { Calendar, Filter, TrendingUp, Play, Info, DollarSign, MousePointer, Eye, BarChart3, Target, Percent, MapPin } from "lucide-react"
import { useConsolidadoNacionalData } from "../../services/api"
import PDFDownloadButton from "../../components/PDFDownloadButton/PDFDownloadButton"
import AnaliseSemanal from "./components/AnaliseSemanal"
import Loading from "../../components/Loading/Loading"

interface DataPoint {
  date: string
  campaignName: string
  creativeTitle: string
  platform: string
  reach: number
  impressions: number
  clicks: number
  totalSpent: number
  videoViews: number
  videoViews25: number
  videoViews50: number
  videoViews75: number
  videoCompletions: number
  videoStarts: number
  totalEngagements: number
  veiculo: string
  tipoCompra: string
  modalidade: string
}

interface ChartData {
  id: string
  data: Array<{
    x: string
    y: number
  }>
}

// Interface atualizada para incluir a data de término
interface VehicleEntry {
  platform: string
  firstDate: string
  lastDate: string
  color: string
}

const LinhaTempo: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null)
  const { data: apiData, loading, error } = useConsolidadoNacionalData()
  const [processedData, setProcessedData] = useState<DataPoint[]>([])
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" })
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])
  const [availableVehicles, setAvailableVehicles] = useState<string[]>([])
  const [isWeeklyAnalysis, setIsWeeklyAnalysis] = useState(false)
  const [filteredData, setFilteredData] = useState<DataPoint[]>([])
  const [selectedMetric, setSelectedMetric] = useState<
    "impressions" | "clicks" | "totalSpent" | "videoViews" | "cpm" | "cpc" | "ctr" | "vtr"
  >("impressions")
  const [availableModalidades, setAvailableModalidades] = useState<string[]>([])
  const [selectedModalidades, setSelectedModalidades] = useState<string[]>([])

  const platformColors: Record<string, string> = {
    TikTok: "#ff0050",
    LinkedIn: "#0077b5",
    Meta: "#0668E1",
    Spotify: "#1DB954",
    Band: "#ffd700",
    "Brasil 247": "#ff4500",
    GDN: "#4285f4",
    "Demand-Gen": "#34a853",
    "Portal Forum": "#8b4513",
    YouTube: "#ff0000",
    Pinterest: "#bd081c",
    Default: "#6366f1",
  }

  const createLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date()
    const parts = dateStr.split("-")
    if (parts.length !== 3) return new Date()
    const [year, month, day] = parts
    return new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
  }

  useEffect(() => {
    if (apiData && apiData.data && Array.isArray(apiData.data.values) && apiData.data.values.length > 1) {
      const [header, ...rows] = apiData.data.values

      const dataAsObjects = rows.map((row: any[]) => {
        const obj: { [key: string]: any } = {}
        header.forEach((key: string, index: number) => {
          obj[key] = row[index]
        })
        return obj
      })

      const processed: DataPoint[] = dataAsObjects.map((item: any) => {
        const parseNumber = (value: string | number) => {
          if (!value) return 0
          const stringValue = value.toString()
          const cleanValue = stringValue
            .replace(/R\$\s*/g, "")
            .replace(/\./g, "")
            .replace(",", ".")
            .trim()
          const parsed = Number.parseFloat(cleanValue)
          // Arredondar para 2 casas decimais para evitar erros de precisão
          return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100
        }

        const parseInteger = (value: string | number) => {
          if (!value) return 0
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

        const date = item["Date"]
        const campaignName = item["Campaign name"]
        const creativeTitle = item["Creative title"]
        const platform = item["Veículo"]
        const reach = item["Reach"]
        const impressions = item["Impressions"]
        const clicks = item["Clicks"]
        const totalSpent = item["Total spent"]
        const videoViews = item["Video views "]
        const videoViews25 = item["Video views at 25%"]
        const videoViews50 = item["Video views at 50%"]
        const videoViews75 = item["Video views at 75%"]
        const videoCompletions = item["Video completions "]
        const tipoCompra = item["Tipo de Compra"]
        const veiculo = item["Veículo"]
        const modalidade = item["Modalidade"] || "Nacional"

        const dataPoint: DataPoint = {
          date: parseDate(date) || "",
          campaignName: campaignName || "",
          creativeTitle: creativeTitle || "",
          platform: platform || "Outros",
          reach: parseInteger(reach),
          impressions: parseInteger(impressions),
          clicks: parseInteger(clicks),
          totalSpent: parseNumber(totalSpent),
          videoViews: parseInteger(videoViews),
          videoViews25: parseInteger(videoViews25),
          videoViews50: parseInteger(videoViews50),
          videoViews75: parseInteger(videoViews75),
          videoCompletions: parseInteger(videoCompletions),
          videoStarts: parseInteger(item["Video starts"]) || 0,
          totalEngagements: parseInteger(item["Total engagements"]) || 0,
          veiculo: veiculo || "Outros",
          tipoCompra: tipoCompra || "",
          modalidade: modalidade,
        }

        return dataPoint
      })

      processed.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      setProcessedData(processed)

      if (processed.length > 0) {
        const dates = processed
          .map((item) => item.date)
          .filter((date) => date && date.match(/^\d{4}-\d{2}-\d{2}$/))
          .sort()

        if (dates.length > 0) {
          const firstDate = dates[0]
          const lastDate = dates[dates.length - 1]
          setDateRange({ start: firstDate, end: lastDate })
        }
      }

      const vehicleSet = new Set<string>()
      processed.forEach((item) => {
        if (item.platform && item.platform.trim() !== "") {
          vehicleSet.add(item.platform)
        }
      })
      const vehicles = Array.from(vehicleSet).filter(Boolean)
      setAvailableVehicles(vehicles)
      setSelectedVehicles([])
    }
  }, [apiData])

  useEffect(() => {
    if (processedData.length > 0) {
      let filtered = processedData

      if (dateRange.start && dateRange.end) {
        filtered = filtered.filter((item) => {
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
        })
      }

      if (selectedVehicles.length > 0) {
        filtered = filtered.filter((item) => selectedVehicles.includes(item.platform))
      }

      if (selectedModalidades.length > 0) {
        filtered = filtered.filter((item) => selectedModalidades.includes(item.modalidade))
      }

      setFilteredData(filtered)
    } else {
      setFilteredData([])
    }
  }, [processedData, dateRange, selectedVehicles, selectedModalidades])

  const getMetricValue = (item: DataPoint, metric: typeof selectedMetric): number => {
    switch (metric) {
      case "impressions": return item.impressions || 0
      case "clicks": return item.clicks || 0
      case "totalSpent": return item.totalSpent || 0
      case "videoViews": return item.videoViews || item.videoCompletions || 0
      case "cpm":
      case "cpc":
      case "ctr":
      case "vtr": return 0
      default: return 0
    }
  }

  const chartData: ChartData[] = useMemo(() => {
    const calculateCompositeMetric = (dayData: DataPoint[], metric: typeof selectedMetric): number => {
      if (!dayData || dayData.length === 0) return 0

      // Usar arredondamento para evitar erros de precisão em valores monetários
      const totalCostInCents = dayData.reduce((sum, item) => {
        const cents = Math.round((item.totalSpent || 0) * 100)
        return sum + cents
      }, 0)
      const totalCost = totalCostInCents / 100
      
      const totalImpressions = dayData.reduce((sum, item) => sum + (item.impressions || 0), 0)
      const totalClicks = dayData.reduce((sum, item) => sum + (item.clicks || 0), 0)
      const totalViews = dayData.reduce((sum, item) => sum + (item.videoViews || item.videoCompletions || 0), 0)

      switch (metric) {
        case "impressions": return totalImpressions
        case "clicks": return totalClicks
        case "totalSpent": return totalCost
        case "videoViews": return totalViews
        case "cpm": return totalImpressions > 0 ? (totalCost / totalImpressions) * 1000 : 0
        case "cpc": return totalClicks > 0 ? totalCost / totalClicks : 0
        case "ctr": return totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
        case "vtr": return totalImpressions > 0 ? (totalViews / totalImpressions) * 100 : 0
        default: return 0
      }
    }

    if (selectedVehicles.length === 0) {
      const groupedByDate = filteredData.reduce(
        (acc, item) => {
          const date = item.date
          if (!acc[date]) { acc[date] = [] }
          acc[date].push(item)
          return acc
        }, {} as Record<string, DataPoint[]>
      )

      const data = Object.entries(groupedByDate)
        .map(([date, dayData]) => ({ x: date, y: calculateCompositeMetric(dayData, selectedMetric) }))
        .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime())

      return [{ id: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1), data }]
    } else {
      const seriesMap: Record<string, Record<string, DataPoint[]>> = {}
      selectedVehicles.forEach((vehicle) => { seriesMap[vehicle] = {} })
      filteredData.forEach((item) => {
        if (selectedVehicles.includes(item.platform)) {
          const date = item.date
          if (!seriesMap[item.platform][date]) { seriesMap[item.platform][date] = [] }
          seriesMap[item.platform][date].push(item)
        }
      })
      const result: ChartData[] = []
      Object.entries(seriesMap).forEach(([platform, dataByDate]) => {
        const data = Object.entries(dataByDate)
          .map(([date, dayData]) => ({ x: date, y: calculateCompositeMetric(dayData, selectedMetric) }))
          .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime())
        result.push({ id: platform, data })
      })
      return result.sort((a, b) => a.id.localeCompare(b.id))
    }
  }, [filteredData, selectedVehicles, selectedMetric])

  // Lógica atualizada para capturar data de início e fim
  const vehicleEntries: VehicleEntry[] = useMemo(() => {
    const entries: Record<string, { firstDate: string; lastDate: string }> = {}

    processedData.forEach((item) => {
      if (!item.platform || !item.date) return

      if (!entries[item.platform]) {
        entries[item.platform] = { firstDate: item.date, lastDate: item.date }
      } else {
        if (new Date(item.date) < new Date(entries[item.platform].firstDate)) {
          entries[item.platform].firstDate = item.date
        }
        if (new Date(item.date) > new Date(entries[item.platform].lastDate)) {
          entries[item.platform].lastDate = item.date
        }
      }
    })

    return Object.entries(entries)
      .map(([platform, dates]) => ({
        platform,
        firstDate: dates.firstDate,
        lastDate: dates.lastDate,
        color: platformColors[platform] || platformColors.Default,
      }))
      .sort((a, b) => new Date(a.firstDate).getTime() - new Date(b.firstDate).getTime())
  }, [processedData])

  // Cálculos para as métricas principais
  // Usar arredondamento para evitar erros de precisão de ponto flutuante em valores monetários
  const totalInvestment = useMemo(() => {
    // Converter para centavos, somar, e converter de volta para reais
    const totalInCents = filteredData.reduce((sum, item) => {
      const cents = Math.round(item.totalSpent * 100)
      return sum + cents
    }, 0)
    return totalInCents / 100
  }, [filteredData])
  const totalImpressions = useMemo(() => filteredData.reduce((sum, item) => sum + item.impressions, 0), [filteredData])
  const totalClicks = useMemo(() => filteredData.reduce((sum, item) => sum + item.clicks, 0), [filteredData])

  // Novos cálculos para CPC, CTR e CPM
  const cpc = useMemo(() => (totalClicks > 0 ? totalInvestment / totalClicks : 0), [totalInvestment, totalClicks])
  const ctr = useMemo(() => (totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0), [totalClicks, totalImpressions])
  const cpm = useMemo(() => (totalImpressions > 0 ? (totalInvestment / totalImpressions) * 1000 : 0), [totalInvestment, totalImpressions])

  // Funções de formatação atualizadas e novas
  const formatCurrency = (value: number): string => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatFullNumber = (value: number): string => {
    return value.toLocaleString("pt-BR")
  }

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2).replace(".", ",")}%`
  }
  
  // Função para formatar valores do eixo Y e tooltip
  const formatChartValue = (value: number): string => {
    if (["totalSpent", "cpm", "cpc"].includes(selectedMetric)) {
      return formatCurrency(value)
    }
    if (["ctr", "vtr"].includes(selectedMetric)) {
      return `${value.toFixed(2)}%`
    }
    return formatFullNumber(value)
  }

  const toggleVehicle = (vehicle: string) => {
    setSelectedVehicles((prev) => {
      if (prev.includes(vehicle)) {
        return prev.filter((v) => v !== vehicle)
      }
      return [...prev, vehicle]
    })
  }

  const toggleModalidade = (modalidade: string) => {
    setSelectedModalidades((prev) => {
      if (prev.includes(modalidade)) {
        return prev.filter((m) => m !== modalidade)
      }
      return [...prev, modalidade]
    })
  }

  useEffect(() => {
    if (processedData.length > 0) {
      const modalidadeSet = new Set<string>()
      processedData.forEach((item) => {
        if (item.modalidade && item.modalidade.trim() !== "") { modalidadeSet.add(item.modalidade) }
      })
      const modalidades = Array.from(modalidadeSet).filter(Boolean)
      setAvailableModalidades(modalidades)
      setSelectedModalidades([])
    }
  }, [processedData])

  if (isWeeklyAnalysis) {
    return (
      <div className="space-y-4">
        <AnaliseSemanal
          processedData={processedData}
          availableVehicles={availableVehicles}
          platformColors={platformColors}
          onBack={() => setIsWeeklyAnalysis(false)}
        />
      </div>
    )
  }

  if (loading) { return <Loading message="Carregando linha do tempo..." /> }

  if (error) {
    return (
      <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Erro ao carregar dados: {error.message}</p>
      </div>
    )
  }

  return (
    <div ref={contentRef} className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 text-enhanced">Linha do Tempo</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-lg">
            <TrendingUp className="w-4 h-4" />
            <span>Evolução de {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}</span>
          </div>
          <PDFDownloadButton contentRef={contentRef} fileName="linha-tempo" />
          <button
            onClick={() => setIsWeeklyAnalysis(true)}
            className="px-4 py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-200 text-sm font-medium"
          >
            Análise Semanal
          </button>
        </div>
      </div>

      <div className="card-overlay rounded-lg shadow-lg p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Calendar className="w-4 h-4 mr-2" /> Período
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Filter className="w-4 h-4 mr-2" /> Veículos de Mídia
            </label>
            <div className="flex flex-wrap gap-2">
              {availableVehicles.map((vehicle) => (
                <button
                  key={vehicle}
                  onClick={() => toggleVehicle(vehicle)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${ selectedVehicles.includes(vehicle) ? "bg-blue-100 text-blue-800 border border-blue-300" : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200" }`}
                  style={{
                    backgroundColor: selectedVehicles.includes(vehicle) ? platformColors[vehicle] + "20" : undefined,
                    borderColor: selectedVehicles.includes(vehicle) ? platformColors[vehicle] : undefined,
                    color: selectedVehicles.includes(vehicle) ? platformColors[vehicle] : undefined,
                  }}
                >
                  {vehicle}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" /> Métrica do Gráfico
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "impressions", label: "Impressões", icon: Eye },
                { key: "clicks", label: "Cliques", icon: MousePointer },
                { key: "totalSpent", label: "Investimento", icon: DollarSign },
                { key: "videoViews", label: "Visualizações", icon: Play },
                { key: "cpm", label: "CPM", icon: Target },
                { key: "cpc", label: "CPC", icon: MousePointer },
                { key: "ctr", label: "CTR", icon: Percent },
                { key: "vtr", label: "VTR", icon: Percent },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setSelectedMetric(key as typeof selectedMetric)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 flex items-center ${ selectedMetric === key ? "bg-purple-100 text-purple-800 border border-purple-300" : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200" }`}
                >
                  <Icon className="w-3 h-3 mr-1.5" /> {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <MapPin className="w-4 h-4 mr-2" /> Modalidades
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

      {/* Seção de Estatísticas atualizada para 6 colunas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="card-overlay rounded-lg shadow-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg"><DollarSign className="w-5 h-5 text-green-600" /></div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Investimento Total</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalInvestment)}</p>
            </div>
          </div>
        </div>
        <div className="card-overlay rounded-lg shadow-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg"><Eye className="w-5 h-5 text-blue-600" /></div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total de Impressões</p>
              <p className="text-xl font-bold text-gray-900">{formatFullNumber(totalImpressions)}</p>
            </div>
          </div>
        </div>
        <div className="card-overlay rounded-lg shadow-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg"><MousePointer className="w-5 h-5 text-purple-600" /></div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total de Cliques</p>
              <p className="text-xl font-bold text-gray-900">{formatFullNumber(totalClicks)}</p>
            </div>
          </div>
        </div>
        {/* Novos cards */}
        <div className="card-overlay rounded-lg shadow-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg"><MousePointer className="w-5 h-5 text-yellow-600" /></div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">CPC</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(cpc)}</p>
            </div>
          </div>
        </div>
        <div className="card-overlay rounded-lg shadow-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg"><Percent className="w-5 h-5 text-indigo-600" /></div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">CTR</p>
              <p className="text-xl font-bold text-gray-900">{formatPercentage(ctr)}</p>
            </div>
          </div>
        </div>
        <div className="card-overlay rounded-lg shadow-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg"><Target className="w-5 h-5 text-red-600" /></div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">CPM</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(cpm)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        <div className="lg:col-span-3 card-overlay rounded-lg shadow-lg p-4 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Evolução de {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} por Data</h3>
          <div className="flex-1" style={{ minHeight: "400px" }}>
            {chartData.length > 0 && chartData.some((series) => series.data.length > 0) ? (
              <ResponsiveLine
                data={chartData}
                margin={{ top: 30, right: 30, bottom: 80, left: 100 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: "auto", max: "auto" }}
                axisBottom={{ tickSize: 5, tickPadding: 15, tickRotation: -45, legend: "Data", legendOffset: 60, legendPosition: "middle" }}
                axisLeft={{ tickSize: 5, tickPadding: 10, tickRotation: 0, legend: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1), legendOffset: -85, legendPosition: "middle", format: (value) => formatChartValue(value) }}
                pointSize={8}
                pointBorderWidth={2}
                pointBorderColor={{ from: "serieColor" }}
                useMesh={true}
                colors={ selectedVehicles.length > 0 ? (serie) => platformColors[serie.id] || platformColors.Default : ["#3b82f6"] }
                lineWidth={3}
                enableArea={true}
                areaOpacity={0.1}
                theme={{ axis: { ticks: { text: { fontSize: 11, fill: "#6b7280" } }, legend: { text: { fontSize: 12, fill: "#374151", fontWeight: 600 } } }, grid: { line: { stroke: "#e5e7eb", strokeWidth: 1 } } }}
                legends={ selectedVehicles.length > 0 ? [{ anchor: "top-right", direction: "row", justify: false, translateX: 0, translateY: -25, itemsSpacing: 10, itemDirection: "left-to-right", itemWidth: 120, itemHeight: 20, itemOpacity: 0.85, symbolSize: 12, symbolShape: "circle", effects: [{ on: "hover", style: { itemBackground: "rgba(0, 0, 0, .03)", itemOpacity: 1 } }] }] : [] }
                tooltip={({ point }) => (
                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <div className="text-sm font-medium text-gray-900">Data: {createLocalDate(point.data.x as string).toLocaleDateString("pt-BR")}</div>
                    <div className="text-sm text-gray-600">{point.seriesId}: {formatChartValue(point.data.y as number)}</div>
                  </div>
                )}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum dado disponível para o período ou filtros selecionados</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Painel Lateral atualizado */}
        <div className="card-overlay rounded-lg shadow-lg p-4 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
            <Info className="w-4 h-4 mr-2" />
            Entrada/Saída de Veículos
          </h3>
          <div className="space-y-3 flex-1 overflow-auto">
            {vehicleEntries.map((entry, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{entry.platform}</p>
                  <p className="text-xs text-gray-500">
                    Início: {createLocalDate(entry.firstDate).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LinhaTempo