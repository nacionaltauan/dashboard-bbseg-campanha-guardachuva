import React from "react"
import { apiNacional } from "./api"

// Interface para dados de benchmark
export interface BenchmarkData {
  veiculo: string
  tipoMidia: string
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
      const tipoMidia = row[1]?.toUpperCase() || ""
      
      if (veiculo && tipoMidia) {
        const parseNumber = (value: string) => {
          if (!value || value === "") return 0
          return Number.parseFloat(value.replace(/[R$\s.]/g, "").replace(",", ".")) || 0
        }
        
        const key = `${veiculo}_${tipoMidia}`
        benchmarkMap.set(key, {
          veiculo,
          tipoMidia,
          cpm: parseNumber(row[2]), // Coluna CPM
          cpc: parseNumber(row[3]), // Coluna CPC
          ctr: parseNumber(row[7]), // Coluna CTR
          vtr: parseNumber(row[8]), // Coluna VTR 100%
          completionRate: parseNumber(row[8]), // Coluna COMPLETION RATE (mesmo que VTR)
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
