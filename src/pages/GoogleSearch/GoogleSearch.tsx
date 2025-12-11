"use client"

import type React from "react"
import { useState, useMemo, useRef, useEffect } from "react"
import { Calendar, Search, TrendingUp, MousePointer, Eye, Percent } from "lucide-react"
import { useGoogleSearchKeywordsData } from "../../services/api"
import Loading from "../../components/Loading/Loading"
import PDFDownloadButton from "../../components/PDFDownloadButton/PDFDownloadButton"

// Interface para definir a estrutura dos dados de cada palavra-chave
interface KeywordData {
  date: string
  campaignName: string
  adGroupName: string
  keyword: string
  impressions: number
  clicks: number
  ctr: number
}

const GoogleSearch: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null)
  
  // Hook de dados da API
  const { data: apiData, loading, error } = useGoogleSearchKeywordsData()
  
  // Estado para os dados processados
  const [processedData, setProcessedData] = useState<KeywordData[]>([])
  
  // Estado para o intervalo de datas do filtro
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" })
  
  // Estado para a paginação da tabela
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(15) // Aumentei um pouco o padrão

  // Função auxiliar de parse de números
  const parseNumber = (value: any): number => {
    if (typeof value === 'number') return value
    if (!value) return 0
    // Remove R$, %, espaços e converte , para .
    const clean = value.toString().replace(/[R$%\s]/g, '').replace(',', '.')
    const parsed = parseFloat(clean)
    return isNaN(parsed) ? 0 : parsed
  }

  // Função auxiliar de parse de data (dd/mm/yyyy ou yyyy-mm-dd para yyyy-mm-dd)
  const parseDate = (value: any): string => {
    if (!value) return ""
    const str = value.toString().trim()
    
    // Se já estiver em formato ISO (yyyy-mm-dd), retorna
    if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str
    
    // Se for formato Excel/Google Sheets numérico (ex: 45150)
    // Não vamos implementar complexidade excessiva aqui, assumindo string
    
    // Tenta formato dd/mm/yyyy
    const parts = str.split('/')
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
    }
    
    return str
  }

  // Processamento dos dados da API
  useEffect(() => {
    if (apiData?.values && Array.isArray(apiData.values) && apiData.values.length > 1) {
      const headers = apiData.values[0]
      const rows = apiData.values.slice(1)
      
      console.log("Headers encontrados:", headers)

      // Mapeamento dinâmico de índices (PT/EN)
      const idxDate = headers.findIndex((h: string) => ["Date", "Day", "Dia", "Data"].includes(h))
      const idxCampaign = headers.findIndex((h: string) => ["Campaign name", "Campanha"].includes(h))
      const idxAdGroup = headers.findIndex((h: string) => ["Ad group name", "Grupo de anúncios"].includes(h))
      const idxKeyword = headers.findIndex((h: string) => ["Keyword", "Search keyword", "Palavra-chave", "Termo de pesquisa"].includes(h))
      const idxImpressions = headers.findIndex((h: string) => ["Impressions", "Impr.", "Impressões"].includes(h))
      const idxClicks = headers.findIndex((h: string) => ["Clicks", "Cliques"].includes(h))
      const idxCtr = headers.findIndex((h: string) => ["CTR"].includes(h))
      
      const processed: KeywordData[] = rows.map((row: any[]) => {
        return {
          date: idxDate !== -1 ? parseDate(row[idxDate]) : "",
          campaignName: idxCampaign !== -1 ? row[idxCampaign] : "",
          adGroupName: idxAdGroup !== -1 ? row[idxAdGroup] : "",
          keyword: idxKeyword !== -1 ? row[idxKeyword] : "",
          impressions: idxImpressions !== -1 ? parseNumber(row[idxImpressions]) : 0,
          clicks: idxClicks !== -1 ? parseNumber(row[idxClicks]) : 0,
          ctr: idxCtr !== -1 ? parseNumber(row[idxCtr]) : 0
        }
      }).filter((item: KeywordData) => item.keyword) // Filtra linhas vazias sem keyword
      
      setProcessedData(processed)
      
      // Definir data inicial e final padrão baseada nos dados
      if (processed.length > 0) {
        const validDates = processed
          .map(p => p.date)
          .filter(d => d.match(/^\d{4}-\d{2}-\d{2}$/))
          .sort()
          
        if (validDates.length > 0) {
          setDateRange({
            start: validDates[0],
            end: validDates[validDates.length - 1]
          })
        }
      }
    }
  }, [apiData])

  // Memoização para filtrar e AGREGAR os dados
  const aggregatedData = useMemo(() => {
    let filtered = processedData

    // 1. Filtragem por data
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter((item) => {
        if (!item.date) return false // Ignora itens sem data se filtro ativo
        const itemDate = new Date(item.date)
        const startDate = new Date(dateRange.start)
        const endDate = new Date(dateRange.end)
        // Ajuste de timezone simples (considerando data UTC/Local)
        // Como input date retorna yyyy-mm-dd, new Date assume UTC 00:00.
        // Vamos garantir comparação correta de string ou resetar horas.
        itemDate.setHours(0,0,0,0)
        startDate.setHours(0,0,0,0)
        endDate.setHours(23,59,59,999) // Final do dia
        
        return itemDate >= startDate && itemDate <= endDate
      })
    }

    // 2. Agrupamento dos dados por palavra-chave
    const groupedMap: Record<string, { keyword: string, impressions: number, clicks: number }> = {}

    filtered.forEach((item) => {
      const key = item.keyword.trim().toLowerCase() // Normaliza chave
      if (!groupedMap[key]) {
        groupedMap[key] = {
          keyword: item.keyword, // Mantém a grafia original do primeiro encontrado
          impressions: 0,
          clicks: 0
        }
      }
      groupedMap[key].impressions += item.impressions
      groupedMap[key].clicks += item.clicks
    })

    // 3. Transformação em array e cálculo de CTR agregado
    const result = Object.values(groupedMap).map(group => ({
      keyword: group.keyword,
      impressions: group.impressions,
      clicks: group.clicks,
      ctr: group.impressions > 0 ? (group.clicks / group.impressions) * 100 : 0
    }))

    // Ordena por Impressões (padrão)
    return result.sort((a, b) => b.impressions - a.impressions)
  }, [processedData, dateRange])

  // Memoização para paginar os dados
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return aggregatedData.slice(startIndex, endIndex)
  }, [aggregatedData, currentPage, itemsPerPage])

  const totalPages = Math.ceil(aggregatedData.length / itemsPerPage)

  // Métricas Gerais (Totais do período selecionado)
  const summaryMetrics = useMemo(() => {
    const totalImpressions = aggregatedData.reduce((sum, item) => sum + item.impressions, 0)
    const totalClicks = aggregatedData.reduce((sum, item) => sum + item.clicks, 0)
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    
    return {
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: avgCtr
    }
  }, [aggregatedData])

  // Funções de formatação
  const formatNumber = (value: number): string => {
    return value.toLocaleString("pt-BR")
  }

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2).replace(".", ",")}%`
  }

  if (loading) {
    return <Loading message="Carregando palavras-chave do Google Search..." />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-600 p-8 bg-red-50 rounded-lg">
          <p className="font-bold mb-2">Erro ao carregar dados</p>
          <p>{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={contentRef} className="space-y-6 h-full flex flex-col">
      {/* 1. Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm">
            {/* Ícone Google G Colorido */}
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 text-enhanced">Google Search</h1>
            <p className="text-gray-600">Performance das palavras chave</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-4 text-sm text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-lg">
            <PDFDownloadButton contentRef={contentRef} fileName="google-search-keywords" />
          </div>
        </div>
      </div>

      {/* 2. Filtros e Totais */}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Total de Palavras-Chave Ativas</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-600 font-medium">
              {aggregatedData.length} termos encontrados no período
            </div>
          </div>
        </div>
      </div>

      {/* 3. Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Impressões */}
        <div className="card-overlay rounded-lg shadow-lg p-4 flex items-center">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full mr-4">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total de Impressões</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(summaryMetrics.impressions)}</p>
          </div>
        </div>

        {/* Cliques */}
        <div className="card-overlay rounded-lg shadow-lg p-4 flex items-center">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-full mr-4">
            <MousePointer className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total de Cliques</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(summaryMetrics.clicks)}</p>
          </div>
        </div>

        {/* CTR */}
        <div className="card-overlay rounded-lg shadow-lg p-4 flex items-center">
          <div className="p-3 bg-green-100 text-green-600 rounded-full mr-4">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">CTR Médio</p>
            <p className="text-2xl font-bold text-gray-900">{formatPercentage(summaryMetrics.ctr)}</p>
          </div>
        </div>
      </div>

      {/* 4. Tabela de Dados */}
      <div className="flex-1 card-overlay rounded-lg shadow-lg p-6 flex flex-col min-h-0">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Search className="w-5 h-5 mr-2 text-gray-500" />
          Detalhe por Palavra-Chave
        </h3>
        
        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 border-b border-gray-200">Termo de Pesquisa</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600 border-b border-gray-200">Impressões</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600 border-b border-gray-200">Cliques</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600 border-b border-gray-200">CTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{row.keyword}</td>
                    <td className="py-3 px-4 text-right text-sm text-gray-600">{formatNumber(row.impressions)}</td>
                    <td className="py-3 px-4 text-right text-sm text-gray-600">{formatNumber(row.clicks)}</td>
                    <td className="py-3 px-4 text-right text-sm font-medium text-blue-600 bg-blue-50/30 rounded-r-lg">
                      {formatPercentage(row.ctr)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    Nenhum dado encontrado para o período selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GoogleSearch

