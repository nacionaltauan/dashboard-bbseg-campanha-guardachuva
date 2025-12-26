"use client"
import { useState, useEffect, useMemo, useRef, type FC } from "react"
import { DollarSign, Eye, MousePointer, TrendingUp, Percent } from "lucide-react"
import { useMetaNaoTratadoData } from "../../services/api"
import Loading from "../../components/Loading/Loading"
import PDFDownloadButton from "../../components/PDFDownloadButton/PDFDownloadButton"

interface MetaAnuncioData {
  adName: string
  externalDestinationUrl: string
  cost: number
  impressions: number
  linkClicks: number
}

const MetaAnuncioCorrigido: FC = () => {
  const contentRef = useRef<HTMLDivElement>(null)
  const { data: apiData, loading, error } = useMetaNaoTratadoData()
  const [processedData, setProcessedData] = useState<MetaAnuncioData[]>([])

  useEffect(() => {
    if (apiData?.data?.values) {
      const headers = apiData.data.values[0]
      const rows = apiData.data.values.slice(1)

      // Encontrar índices das colunas
      const getColumnIndex = (headerName: string): number => {
        return headers.findIndex((h: string) => 
          h && h.toString().trim().toLowerCase() === headerName.toLowerCase()
        )
      }

      const idxAdName = getColumnIndex("Ad name")
      const idxUrl = getColumnIndex("External destination URL")
      const idxCost = getColumnIndex("Cost")
      const idxImpressions = getColumnIndex("Impressions")
      const idxLinkClicks = getColumnIndex("Link clicks")

      if (idxAdName === -1) {
        console.warn("Coluna 'Ad name' não encontrada")
        return
      }

      const parseNumber = (value: any): number => {
        if (typeof value === 'number') return value
        if (!value) return 0
        const str = value.toString().replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".")
        return parseFloat(str) || 0
      }

      const parseInteger = (value: any): number => {
        if (typeof value === 'number') return Math.floor(value)
        if (!value) return 0
        const str = value.toString().replace(/[.\s]/g, "").replace(",", "")
        return parseInt(str) || 0
      }

      const processed: MetaAnuncioData[] = rows
        .map((row: any[]) => {
          const adName = (row[idxAdName] || "").toString().trim()

          // FILTRO OBRIGATÓRIO: Apenas o anúncio específico
          if (adName !== "BBSEG | SEGURO RESIDENCIAL | META | VIDEO | 15 (12122025)") {
            return null
          }

          const cost = idxCost !== -1 ? parseNumber(row[idxCost]) : 0
          const impressions = idxImpressions !== -1 ? parseInteger(row[idxImpressions]) : 0
          const linkClicks = idxLinkClicks !== -1 ? parseInteger(row[idxLinkClicks]) : 0
          const url = idxUrl !== -1 ? (row[idxUrl] || "").toString().trim() : ""

          return {
            adName,
            externalDestinationUrl: url,
            cost,
            impressions,
            linkClicks,
          } as MetaAnuncioData
        })
        .filter((item: MetaAnuncioData | null): item is MetaAnuncioData => item !== null)

      setProcessedData(processed)
    } else if (apiData?.values) {
      // Fallback para estrutura alternativa
      const headers = apiData.values[0]
      const rows = apiData.values.slice(1)

      const getColumnIndex = (headerName: string): number => {
        return headers.findIndex((h: string) => 
          h && h.toString().trim().toLowerCase() === headerName.toLowerCase()
        )
      }

      const idxAdName = getColumnIndex("Ad name")
      const idxUrl = getColumnIndex("External destination URL")
      const idxCost = getColumnIndex("Cost")
      const idxImpressions = getColumnIndex("Impressions")
      const idxLinkClicks = getColumnIndex("Link clicks")

      if (idxAdName === -1) {
        console.warn("Coluna 'Ad name' não encontrada")
        return
      }

      const parseNumber = (value: any): number => {
        if (typeof value === 'number') return value
        if (!value) return 0
        const str = value.toString().replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".")
        return parseFloat(str) || 0
      }

      const parseInteger = (value: any): number => {
        if (typeof value === 'number') return Math.floor(value)
        if (!value) return 0
        const str = value.toString().replace(/[.\s]/g, "").replace(",", "")
        return parseInt(str) || 0
      }

      const processed: MetaAnuncioData[] = rows
        .map((row: any[]) => {
          const adName = (row[idxAdName] || "").toString().trim()

          // FILTRO OBRIGATÓRIO: Apenas o anúncio específico
          if (adName !== "BBSEG | SEGURO RESIDENCIAL | META | VIDEO | 15 (12122025)") {
            return null
          }

          const cost = idxCost !== -1 ? parseNumber(row[idxCost]) : 0
          const impressions = idxImpressions !== -1 ? parseInteger(row[idxImpressions]) : 0
          const linkClicks = idxLinkClicks !== -1 ? parseInteger(row[idxLinkClicks]) : 0
          const url = idxUrl !== -1 ? (row[idxUrl] || "").toString().trim() : ""

          return {
            adName,
            externalDestinationUrl: url,
            cost,
            impressions,
            linkClicks,
          } as MetaAnuncioData
        })
        .filter((item: MetaAnuncioData | null): item is MetaAnuncioData => item !== null)

      setProcessedData(processed)
    }
  }, [apiData])

  // Calcular totais e métricas
  const totals = useMemo(() => {
    const totalCost = processedData.reduce((sum, item) => sum + item.cost, 0)
    const totalImpressions = processedData.reduce((sum, item) => sum + item.impressions, 0)
    const totalLinkClicks = processedData.reduce((sum, item) => sum + item.linkClicks, 0)
    const avgCpc = totalLinkClicks > 0 ? totalCost / totalLinkClicks : 0
    const ctr = totalImpressions > 0 ? (totalLinkClicks / totalImpressions) * 100 : 0

    return {
      cost: totalCost,
      impressions: totalImpressions,
      linkClicks: totalLinkClicks,
      avgCpc,
      ctr,
    }
  }, [processedData])

  const formatCurrency = (value: number): string => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
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

  if (loading) {
    return <Loading message="Carregando dados do anúncio..." />
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
            <svg
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              x="0px"
              y="0px"
              width="50"
              height="50"
              viewBox="0 0 50 50"
              fill="currentColor"
            >
              <path d="M47.3,21.01c-0.58-1.6-1.3-3.16-2.24-4.66c-0.93-1.49-2.11-2.93-3.63-4.13c-1.51-1.19-3.49-2.09-5.59-2.26l-0.78-0.04	c-0.27,0.01-0.57,0.01-0.85,0.04c-0.57,0.06-1.11,0.19-1.62,0.34c-1.03,0.32-1.93,0.8-2.72,1.32c-1.42,0.94-2.55,2.03-3.57,3.15	c0.01,0.02,0.03,0.03,0.04,0.05l0.22,0.28c0.51,0.67,1.62,2.21,2.61,3.87c1.23-1.2,2.83-2.65,3.49-3.07	c0.5-0.31,0.99-0.55,1.43-0.68c0.23-0.06,0.44-0.11,0.64-0.12c0.1-0.02,0.19-0.01,0.3-0.02l0.38,0.02c0.98,0.09,1.94,0.49,2.85,1.19	c1.81,1.44,3.24,3.89,4.17,6.48c0.95,2.6,1.49,5.44,1.52,8.18c0,1.31-0.17,2.57-0.57,3.61c-0.39,1.05-1.38,1.45-2.5,1.45	c-1.63,0-2.81-0.7-3.76-1.68c-1.04-1.09-2.02-2.31-2.96-3.61c-0.78-1.09-1.54-2.22-2.26-3.37c-1.27-2.06-2.97-4.67-4.15-6.85	L25,16.35c-0.31-0.39-0.61-0.78-0.94-1.17c-1.11-1.26-2.34-2.5-3.93-3.56c-0.79-0.52-1.69-1-2.72-1.32	c-0.51-0.15-1.05-0.28-1.62-0.34c-0.18-0.02-0.36-0.03-0.54-0.03c-0.11,0-0.21-0.01-0.31-0.01l-0.78,0.04	c-2.1,0.17-4.08,1.07-5.59,2.26c-1.52,1.2-2.7,2.64-3.63,4.13C4,17.85,3.28,19.41,2.7,21.01c-1.13,3.2-1.74,6.51-1.75,9.93	c0.01,1.78,0.24,3.63,0.96,5.47c0.7,1.8,2.02,3.71,4.12,4.77c1.03,0.53,2.2,0.81,3.32,0.81c1.23,0.03,2.4-0.32,3.33-0.77	c1.87-0.93,3.16-2.16,4.33-3.4c2.31-2.51,4.02-5.23,5.6-8c0.44-0.76,0.86-1.54,1.27-2.33c-0.21-0.41-0.42-0.84-0.64-1.29	c-0.62-1.03-1.39-2.25-1.95-3.1c-0.83,1.5-1.69,2.96-2.58,4.41c-1.59,2.52-3.3,4.97-5.21,6.98c-0.95,0.98-2,1.84-2.92,2.25	c-0.47,0.2-0.83,0.27-1.14,0.25c-0.43,0-0.79-0.1-1.13-0.28c-0.67-0.35-1.3-1.1-1.69-2.15c-0.4-1.04-0.57-2.3-0.57-3.61	c0.03-2.74,0.57-5.58,1.52-8.18c0.93-2.59,2.36-5.04,4.17-6.48c0.91-0.7,1.87-1.1,2.85-1.19l0.38-0.02c0.11,0.01,0.2,0,0.3,0.02	c0.2,0.01,0.41,0.06,0.64,0.12c0.26,0.08,0.54,0.19,0.83,0.34c0.2,0.1,0.4,0.21,0.6,0.34c1,0.64,1.99,1.58,2.92,2.62	c0.72,0.81,1.41,1.71,2.1,2.63L25,25.24c0.75,1.55,1.53,3.09,2.39,4.58c1.58,2.77,3.29,5.49,5.6,8c0.68,0.73,1.41,1.45,2.27,2.1	c0.61,0.48,1.28,0.91,2.06,1.3c0.93,0.45,2.1,0.8,3.33,0.77c1.12,0,2.29-0.28,3.32-0.81c2.1-1.06,3.42-2.97,4.12-4.77	c0.72-1.84,0.95-3.69,0.96-5.47C49.04,27.52,48.43,24.21,47.3,21.01z"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 text-enhanced">Anúncio Corrigido</h1>
            <p className="text-gray-600">Performance do anúncio específico</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-lg">
          <PDFDownloadButton contentRef={contentRef} fileName="anuncio-corrigido" />
          <span>Última atualização: {new Date().toLocaleString("pt-BR")}</span>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card-overlay rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Custo Total</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totals.cost)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="card-overlay rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Impressões</p>
              <p className="text-xl font-bold text-gray-900">{formatNumber(totals.impressions)}</p>
            </div>
            <Eye className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="card-overlay rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Link Clicks</p>
              <p className="text-xl font-bold text-gray-900">{formatNumber(totals.linkClicks)}</p>
            </div>
            <MousePointer className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="card-overlay rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">CPC Médio</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totals.avgCpc)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="card-overlay rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">CTR</p>
              <p className="text-xl font-bold text-gray-900">{totals.ctr.toFixed(2)}%</p>
            </div>
            <Percent className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 card-overlay rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Dados Detalhados</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="text-left py-3 px-4 font-semibold">Ad Name</th>
                <th className="text-left py-3 px-4 font-semibold">URL de Destino</th>
                <th className="text-right py-3 px-4 font-semibold">Custo</th>
                <th className="text-right py-3 px-4 font-semibold">Impressões</th>
                <th className="text-right py-3 px-4 font-semibold">Link Clicks</th>
                <th className="text-right py-3 px-4 font-semibold">CPC</th>
                <th className="text-right py-3 px-4 font-semibold">CTR</th>
              </tr>
            </thead>
            <tbody>
              {processedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Nenhum dado encontrado para o anúncio "BBSEG | SEGURO RESIDENCIAL | META | VIDEO | 15 (12122025)"
                  </td>
                </tr>
              ) : (
                processedData.map((item, index) => {
                  const cpc = item.linkClicks > 0 ? item.cost / item.linkClicks : 0
                  const ctr = item.impressions > 0 ? (item.linkClicks / item.impressions) * 100 : 0

                  return (
                    <tr key={index} className={index % 2 === 0 ? "bg-blue-50" : "bg-white"}>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900 text-sm">{item.adName}</p>
                      </td>
                      <td className="py-3 px-4">
                        <a
                          href={item.externalDestinationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline truncate max-w-[300px] block"
                          title={item.externalDestinationUrl}
                        >
                          {item.externalDestinationUrl || "-"}
                        </a>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">{formatCurrency(item.cost)}</td>
                      <td className="py-3 px-4 text-right">{formatNumber(item.impressions)}</td>
                      <td className="py-3 px-4 text-right">{formatNumber(item.linkClicks)}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(cpc)}</td>
                      <td className="py-3 px-4 text-right">{ctr.toFixed(2)}%</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default MetaAnuncioCorrigido

