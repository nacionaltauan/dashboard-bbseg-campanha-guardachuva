import React from "react"
import { apiNacional } from "./api"

// Interface para dados de benchmark
export interface BenchmarkData {
  veiculo: string
  modalidade: string
  impressions: number
  clicks: number
  cost: number // Custo total
  cpm: number
  cpc: number
  ctr: number
  vtr: number
  completionRate: number
}

// Função para buscar dados de benchmark
export const fetchBenchmarkNacionalData = async () => {
  try {
    const response = await apiNacional.get(
      "/google/sheets/1wNHPGsPX3wQuUCBs3an7iBzBY6Y7THYV7V1GijXZo44/data?range=BENCHMARK",
    )
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados de benchmark:", error)
    throw error
  }
}

// Hook para dados de benchmark
export const useBenchmarkNacionalData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchBenchmarkNacionalData()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  return { data, loading, error, refetch: loadData }
}

// Função para processar dados de benchmark
export const processBenchmarkData = (apiData: any): Map<string, BenchmarkData> => {
  const benchmarkMap = new Map<string, BenchmarkData>()
  
  if (apiData?.values) {
    const headers = apiData.values[0]
    const rows = apiData.values.slice(1)
    
    rows.forEach((row: any[]) => {
      const veiculo = row[0]?.toUpperCase() || ""
      const modalidade = row[1]?.toLowerCase() || "" // Modalidade em minúsculo para matching
      
      if (veiculo && modalidade) {
        const parseNumber = (value: string) => {
          if (!value || value === "") return 0
          return Number.parseFloat(value.replace(/[R$\s.]/g, "").replace(",", ".")) || 0
        }
        
        const key = `${veiculo}_${modalidade}`
        // Tentar encontrar colunas por nome do header primeiro, depois por índice
        const getValueByHeaderOrIndex = (headerName: string, defaultIndex: number) => {
          if (headers && Array.isArray(headers)) {
            const headerIndex = headers.findIndex((h: string) => 
              h && h.toString().toLowerCase().includes(headerName.toLowerCase())
            )
            if (headerIndex >= 0 && row[headerIndex] !== undefined) {
              return row[headerIndex]
            }
          }
          return row[defaultIndex]
        }
        
        const impressions = parseNumber(getValueByHeaderOrIndex("impress", 4) || "0")
        const clicks = parseNumber(getValueByHeaderOrIndex("click", 5) || "0")
        const cpm = parseNumber(getValueByHeaderOrIndex("cpm", 2) || "0")
        const cpc = parseNumber(getValueByHeaderOrIndex("cpc", 3) || "0")
        
        // Calcular custo total: tentar coluna direta, senão calcular a partir de CPM ou CPC
        let cost = parseNumber(getValueByHeaderOrIndex("cost", 6) || getValueByHeaderOrIndex("spent", 6) || "0")
        if (cost === 0) {
          // Calcular a partir de CPM (mais preciso) ou CPC
          if (impressions > 0 && cpm > 0) {
            cost = (impressions * cpm) / 1000
          } else if (clicks > 0 && cpc > 0) {
            cost = clicks * cpc
          }
        }
        
        benchmarkMap.set(key, {
          veiculo,
          modalidade,
          impressions,
          clicks,
          cost,
          cpm,
          cpc,
          ctr: parseNumber(getValueByHeaderOrIndex("ctr", 7) || "0"), // Coluna CTR
          vtr: parseNumber(getValueByHeaderOrIndex("vtr", 8) || "0"), // Coluna VTR 100%
          completionRate: parseNumber(getValueByHeaderOrIndex("completion", 8) || "0"), // Coluna COMPLETION RATE
        })
      }
    })
  }
  
  return benchmarkMap
}

// Função para calcular variação
export const calculateVariation = (
  currentValue: number,
  benchmarkValue: number,
  metricType: 'cost' | 'performance'
): { value: string; color: string } => {
  if (benchmarkValue === 0) {
    return { value: "-", color: "text-gray-500" }
  }
  
  const difference = currentValue - benchmarkValue
  let isBetter: boolean
  
  if (metricType === 'cost') {
    // Para CPM e CPC: menor é melhor (diferença negativa é melhor)
    isBetter = difference < 0
  } else {
    // Para CTR e VTR: maior é melhor (diferença positiva é melhor)
    isBetter = difference > 0
  }
  
  const sign = difference > 0 ? "+" : ""
  const formattedValue = difference.toFixed(2)
  
  return {
    value: `${sign}${formattedValue}`,
    color: isBetter ? "text-green-600" : "text-red-600"
  }
}
