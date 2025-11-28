import React from "react"
import { apiNacional } from "./api"

// Interface para dados de benchmark (Map - mantida para compatibilidade)
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

// Interface para dados brutos de benchmark (Array - para filtragem no frontend)
export interface BenchmarkDataRaw {
  veiculo: string
  modalidade: string
  custo: number
  impressoes: number
  cliques: number
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
        const clicks = parseNumber(getValueByHeaderOrIndex("click", 3) || "0") // Coluna D (índice 3)
        const cpm = parseNumber(getValueByHeaderOrIndex("cpm", 5) || "0") // Coluna F (índice 5)
        const cpc = parseNumber(getValueByHeaderOrIndex("cpc", 6) || "0") // Coluna G (índice 6)
        
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
          ctr: parseNumber(getValueByHeaderOrIndex("ctr", 10) || "0"), // Coluna K (índice 10)
          vtr: parseNumber(getValueByHeaderOrIndex("vtr", 8) || "0"), // Coluna VTR 100%
          completionRate: parseNumber(getValueByHeaderOrIndex("completion", 8) || "0"), // Coluna COMPLETION RATE
        })
      }
    })
  }
  
  return benchmarkMap
}

// Função para processar dados de benchmark em formato Array (raw)
export const processBenchmarkDataRaw = (apiData: any): BenchmarkDataRaw[] => {
  const benchmarkDataRaw: BenchmarkDataRaw[] = []
  
  if (!apiData?.values) {
    console.warn("⚠️ [DEBUG] Estrutura de dados inválida ou vazia recebida")
    return benchmarkDataRaw
  }

  const headers = apiData.values[0]
  const rows = apiData.values.slice(1) // Pular header
  
  console.log("📦 [DEBUG] Headers encontrados:", headers)
  console.log("📦 [DEBUG] Total de linhas (sem header):", rows.length)
  if (rows.length > 0) {
    console.log("🧐 [DEBUG] Exemplo da primeira linha bruta:", rows[0])
  }

  rows.forEach((row: any[], index: number) => {
    const parseNumber = (value: string | number) => {
      if (!value || value === "") return 0
      const stringValue = value.toString().trim()
      // Remover R$, pontos de milhar, trocar vírgula por ponto
      const cleanValue = stringValue.replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".")
      return Number.parseFloat(cleanValue) || 0
    }

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

    const veiculo = (getValueByHeaderOrIndex("veiculo", 0) || row[0] || "").toString().trim()
    const modalidade = (getValueByHeaderOrIndex("modalidade", 1) || row[1] || "").toString().trim().toLowerCase()
    
    // Buscar custo, impressões e cliques
    const custo = parseNumber(getValueByHeaderOrIndex("custo", 2) || getValueByHeaderOrIndex("cost", 2) || getValueByHeaderOrIndex("spent", 2) || row[2] || "0")
    const impressoes = parseNumber(getValueByHeaderOrIndex("impress", 4) || getValueByHeaderOrIndex("impressions", 4) || row[4] || "0")
    const cliques = parseNumber(getValueByHeaderOrIndex("click", 3) || getValueByHeaderOrIndex("clicks", 3) || row[3] || "0") // Coluna D (índice 3)

    if (index < 3) {
      console.log(`📝 [DEBUG] Parse Linha ${index}:`, {
        Veiculo: veiculo,
        Modalidade: modalidade,
        CustoOriginal: getValueByHeaderOrIndex("custo", 2) || row[2],
        CustoFinal: custo,
        Impressoes: impressoes,
        Cliques: cliques
      })
    }

    if (veiculo && modalidade) {
      benchmarkDataRaw.push({
        veiculo: veiculo.toUpperCase(),
        modalidade: modalidade.toLowerCase(),
        custo,
        impressoes,
        cliques,
      })
    }
  })

  console.log(`✅ [DEBUG] Total de linhas válidas carregadas: ${benchmarkDataRaw.length}`)
  if (benchmarkDataRaw.length > 0) {
    console.log("🧐 [DEBUG] Amostra dos dados:", benchmarkDataRaw.slice(0, 3))
  }

  return benchmarkDataRaw
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
