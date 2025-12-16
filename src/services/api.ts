"use client"

import React, { useCallback, useEffect, useState } from "react"
import axios from "axios"

const API_BASE_URL = "https://api-google-sheets-7zph.vercel.app"
const API_NACIONAL_URL = "https://nacional-api-gray.vercel.app"

export const API_NACIONAL_URL_v2 = "https://nacional-api-gray.vercel.app"
export const PLATFORM_FOLDERS = {
  meta: "1Z6v9xdqE8KlPfhVH9-IsLbB_wmf4w5qD",
  pinterest: "1UCK269aE0Acx0WXoszm0IooXnDMQgWeX",
  tiktok: "14F3_8DxxLt7w4k5PXX0C9Re1tvVUKEj-",
} as const

// Tipos para as respostas da API
export interface DriveFile {
  id: string
  name: string
  mimeType: string
  createdTime: string
  modifiedTime: string
  size?: string
  webViewLink?: string
}

export interface DriveApiResponse {
  success: boolean
  data: DriveFile[]
  total: number
}

export interface FileDetailsResponse {
  success: boolean
  data: DriveFile & {
    parents: string[]
    webViewLink: string
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
})

export const apiNacional = axios.create({
  baseURL: API_NACIONAL_URL,
  timeout: 30000, // 30 segundos para planilhas grandes
  headers: {
    "Content-Type": "application/json",
  },
})

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error)
    return Promise.reject(error)
  },
)

apiNacional.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Nacional Error:", error)
    return Promise.reject(error)
  },
)

// Função para buscar dados consolidados dos cartões
export const fetchConsolidadoData = async () => {
  try {
    const response = await api.get("/ccbb")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados consolidados:", error)
    throw error
  }
}

// Função para buscar dados do resumo dos cartões
export const fetchResumoData = async () => {
  try {
    const response = await api.get("/cartao/resumo")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados do resumo:", error)
    throw error
  }
}

// NOVA FUNÇÃO para buscar dados da API Nacional - Estratégia Online
export const fetchEstrategiaOnlineData = async () => {
  try {
    const response = await apiNacional.get(
      "/google/sheets/1wNHPGsPX3wQuUCBs3an7iBzBY6Y7THYV7V1GijXZo44/data?range=Resumo",
    )
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados da Estratégia Online:", error)
    throw error
  }
}

// NOVO HOOK para dados da Estratégia Online
export const useEstrategiaOnlineData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchEstrategiaOnlineData()
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

// NOVAS FUNÇÕES PARA OS CRIATIVOS
// Função para buscar dados do Meta
export const fetchCartaoMetaData = async () => {
  try {
    const response = await api.get("/cartao/meta")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados do Meta:", error)
    throw error
  }
}

// Função para buscar dados do TikTok
export const fetchCartaoTikTokData = async () => {
  try {
    const response = await api.get("/cartao/tiktok")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados do TikTok:", error)
    throw error
  }
}

// Função para buscar dados do Pinterest
export const fetchCartaoPinterestData = async () => {
  try {
    const response = await api.get("/cartao/pinterest")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados do Pinterest:", error)
    throw error
  }
}

// Função para buscar dados do LinkedIn
export const fetchCartaoLinkedInData = async () => {
  try {
    const response = await api.get("/cartao/linkedin")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados do LinkedIn:", error)
    throw error
  }
}

// Função para buscar dados do CCBB (manter compatibilidade)
export const fetchCCBBData = async () => {
  try {
    const response = await api.get("/ccbb")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados do CCBB:", error)
    throw error
  }
}

// Função para buscar dados do Share CCBB
export const fetchShareCCBBData = async () => {
  try {
    const response = await api.get("/ShareCcbb")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados do CCBB:", error)
    throw error
  }
}

// Função para buscar dados do Meta CCBB
export const fetchCCBBMetaData = async () => {
  try {
    const response = await api.get("/ccbb/meta")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados do CCBB Meta:", error)
    throw error
  }
}

// Função para buscar dados do TikTok CCBB
export const fetchCCBBTikTokData = async () => {
  try {
    const response = await api.get("/ccbb/tiktok")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados do CCBB TikTok:", error)
    throw error
  }
}

// Hook personalizado para usar os dados consolidados
export const useConsolidadoData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchConsolidadoData()
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

// Função para buscar dados do GA4 resumo (corrigida)
export const fetchGA4ResumoData = async () => {
  try {
    const response = await api.get("/cartao/ga4-resumo")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados do GA4 resumo:", error)
    throw error
  }
}

// Hook personalizado para usar os dados do resumo
export const useResumoData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchResumoData()
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

// NOVOS HOOKS PARA OS CRIATIVOS
// Hook personalizado para usar os dados do Meta
export const useCartaoMetaData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchCartaoMetaData()
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

// Hook personalizado para usar os dados do TikTok
export const useCartaoTikTokData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchCartaoTikTokData()
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

// Hook personalizado para usar os dados do LinkedIn
export const useCartaoLinkedInData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchCartaoLinkedInData()
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

// Hook personalizado para usar os dados da API CCBB (manter compatibilidade)
export const useCCBBData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchCCBBData()
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

// Hook personalizado para usar os dados da API Share CCBB
export const useShareCCBBData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchShareCCBBData()
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

// Função para buscar dados do Meta CCBB
export const fetchMetaCCBBData = async () => {
  try {
    const response = await api.get("/cartao/meta")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados do Meta:", error)
    throw error
  }
}

// Hook personalizado para usar os dados da API Meta CCBB
export const useMetaCCBBData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchMetaCCBBData()
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

// Hook personalizado para usar os dados do CCBB Meta
export const useCCBBMetaData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchCCBBMetaData()
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

// Hook personalizado para usar os dados do CCBB TikTok
export const useCCBBTikTokData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchCCBBTikTokData()
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

// Hook combinado para usar ambas as APIs
export const useCombinedData = () => {
  const ccbbData = useCCBBData()
  const shareData = useShareCCBBData()

  const loading = ccbbData.loading || shareData.loading
  const error = ccbbData.error || shareData.error

  return {
    ccbbData: ccbbData.data,
    shareData: shareData.data,
    loading,
    error,
    refetch: () => {
      ccbbData.refetch()
      shareData.refetch()
    },
  }
}

// Tipos de dados para as APIs
interface GA4ResumoData {
  range: string
  majorDimension: string
  values: string[][]
}

interface GA4CompletoData {
  range: string
  majorDimension: string
  values: string[][]
}

interface CartaoPinterestData {
  range: string
  majorDimension: string
  values: string[][]
}

interface PinterestImageData {
  range: string
  majorDimension: string
  values: string[][]
}

// Hook para dados GA4 Resumo (substituir completamente)
export const useGA4ResumoData = () => {
  const [data, setData] = useState<GA4ResumoData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchGA4ResumoData()
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

// Função para buscar dados consolidados de vídeo
export const fetchConsolidadoVideoData = async () => {
  try {
    const response = await api.get("/ccbb/consolidado")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados consolidados de vídeo:", error)
    throw error
  }
}

// Hook personalizado para usar os dados consolidados de vídeo
export const useConsolidadoVideoData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchConsolidadoVideoData()
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

// NOVA FUNÇÃO para buscar dados off-line
export const fetchOfflineData = async () => {
  try {
    const response = await api.get("/cartao/off-line")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados off-line:", error)
    throw error
  }
}

// NOVAS FUNÇÕES PARA PONTUAÇÃO
export const fetchPontuacaoTikTokData = async () => {
  try {
    const response = await api.get("/cartao/pontuacao/tiktok")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados de pontuação do TikTok:", error)
    throw error
  }
}

export const fetchPontuacaoMetaData = async () => {
  try {
    const response = await api.get("/cartao/pontuacao/meta")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados de pontuação do Meta:", error)
    throw error
  }
}

export const fetchPontuacaoPinterestData = async () => {
  try {
    const response = await api.get("/cartao/pontuacao/pinterest")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados de pontuação do Pinterest:", error)
    throw error
  }
}

export const fetchPontuacaoLinkedInData = async () => {
  try {
    const response = await api.get("/cartao/pontuacao/linkedin")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados de pontuação do LinkedIn:", error)
    throw error
  }
}

// NOVO Hook personalizado para usar os dados off-line
export const useOfflineData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchOfflineData()
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

// Função para buscar dados do GA4 completo
export const fetchGA4CompletoData = async () => {
  try {
    const response = await api.get("/cartao/ga4-completo")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados do GA4 completo:", error)
    throw error
  }
}

// NOVA FUNÇÃO para buscar dados do GA4 Source
export const fetchGA4SourceData = async () => {
  try {
    const response = await api.get("/cartao/ga4-source")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados do GA4 source:", error)
    throw error
  }
}

// Função para buscar dados de imagem do Pinterest
export const fetchPinterestImageData = async () => {
  try {
    const response = await api.get("/cartao/pinterest-imagem")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados de imagem do Pinterest:", error)
    throw error
  }
}

// NOVOS HOOKS PARA PONTUAÇÃO
const usePontuacaoData = (fetcher: () => Promise<any>) => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetcher()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [fetcher])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  return { data, loading, error, refetch: loadData }
}

export const usePontuacaoTikTokData = () => usePontuacaoData(fetchPontuacaoTikTokData)
export const usePontuacaoMetaData = () => usePontuacaoData(fetchPontuacaoMetaData)
export const usePontuacaoPinterestData = () => usePontuacaoData(fetchPontuacaoPinterestData)
export const usePontuacaoLinkedInData = () => usePontuacaoData(fetchPontuacaoLinkedInData)

// Tipos de dados para as APIs
interface GA4SourceData {
  range: string
  majorDimension: string
  values: string[][]
}

// Hook para dados GA4 Completo (substituir completamente)
export const useGA4CompletoData = () => {
  const [data, setData] = useState<GA4CompletoData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchGA4CompletoData()
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

// NOVO Hook para dados GA4 Source
export const useGA4SourceData = () => {
  const [data, setData] = useState<GA4SourceData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchGA4SourceData()
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

// Hook para dados do Pinterest (substituir completamente)
export const useCartaoPinterestData = () => {
  const [data, setData] = useState<CartaoPinterestData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchCartaoPinterestData()
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

// Hook para dados de Imagem do Pinterest (substituir completamente)
export const usePinterestImageData = () => {
  const [data, setData] = useState<PinterestImageData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchPinterestImageData()
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

// Função para buscar dados de benchmark
export const fetchBenchmarkData = async () => {
  try {
    const response = await api.get("/cartao/benchmark")
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados de benchmark:", error)
    throw error
  }
}

// Hook personalizado para usar os dados de benchmark
export const useBenchmarkData = () => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchBenchmarkData()
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

// NOVAS FUNÇÕES PARA API NACIONAL
export const fetchConsolidadoNacionalData = async () => {
  try {
    const response = await apiNacional.get(
      "/google/sheets/1wNHPGsPX3wQuUCBs3an7iBzBY6Y7THYV7V1GijXZo44/data?range=CONSOLIDADO",
    )
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados consolidados nacionais:", error)
    throw error
  }
}

// Função para buscar dados de Alcance TikTok
export const fetchAlcanceTikTokData = async () => {
  try {
    const response = await apiNacional.get(
      "/google/sheets/1wNHPGsPX3wQuUCBs3an7iBzBY6Y7THYV7V1GijXZo44/data?range=Alcance_Tiktok",
    )
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados de Alcance TikTok:", error)
    throw error
  }
}

// Função para buscar dados de Alcance Meta
export const fetchAlcanceMetaData = async () => {
  try {
    const response = await apiNacional.get(
      "/google/sheets/1wNHPGsPX3wQuUCBs3an7iBzBY6Y7THYV7V1GijXZo44/data?range=Alcance_Meta",
    )
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados de Alcance Meta:", error)
    throw error
  }
}

export const fetchTikTokNacionalData = async () => {
  try {
    const response = await apiNacional.get(
      "/google/sheets/1wNHPGsPX3wQuUCBs3an7iBzBY6Y7THYV7V1GijXZo44/data?range=Tiktok_tratado",
    )
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados TikTok nacionais:", error)
    throw error
  }
}

export const fetchPinterestNacionalData = async () => {
  try {
    const rangeName = encodeURIComponent("Pinterest_nao_tratado")
    const response = await apiNacional.get(
      `/google/sheets/1wNHPGsPX3wQuUCBs3an7iBzBY6Y7THYV7V1GijXZo44/data?range=${rangeName}`,
    )
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados Pinterest nacionais:", error)
    throw error
  }
}

// Função para buscar dados de Palavras-chave Google Search
export const fetchGoogleSearchKeywordsData = async () => {
  try {
    // URL codificada para "Palavras - chave" (com espaço antes e depois do hífen)
    const rangeName = encodeURIComponent("Palavras - chave")
    const response = await apiNacional.get(
      `/google/sheets/1wNHPGsPX3wQuUCBs3an7iBzBY6Y7THYV7V1GijXZo44/data?range=${rangeName}`,
    )
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados de Palavras-chave Google Search:", error)
    throw error
  }
}

// NOVOS HOOKS PARA API NACIONAL
export const useConsolidadoNacionalData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchConsolidadoNacionalData()
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

// Hook para buscar dados de Alcance TikTok
export const useAlcanceTikTokData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchAlcanceTikTokData()
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

// Hook para buscar dados de Alcance Meta
export const useAlcanceMetaData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchAlcanceMetaData()
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

export const useTikTokNacionalData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchTikTokNacionalData()
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

export const usePinterestNacionalData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchPinterestNacionalData()
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

// Hook para buscar dados de Palavras-chave Google Search
export const useGoogleSearchKeywordsData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchGoogleSearchKeywordsData()
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

// NOVA FUNÇÃO para buscar dados do Meta - Tratado
export const fetchMetaTratadoData = async () => {
  try {
    const response = await apiNacional.get(
      "/google/sheets/1wNHPGsPX3wQuUCBs3an7iBzBY6Y7THYV7V1GijXZo44/data?range=Meta_tratado",
    )
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados do Meta - Tratado:", error)
    throw error
  }
}

// NOVA FUNÇÃO para buscar dados do Meta - Não Tratado
export const fetchMetaNaoTratadoData = async () => {
  try {
    // Usar o novo nome da aba: "Meta não tratado [Import]"
    const rangeName = encodeURIComponent("Meta não tratado [Import]")
    const response = await apiNacional.get(
      `/google/sheets/1wNHPGsPX3wQuUCBs3an7iBzBY6Y7THYV7V1GijXZo44/data?range=${rangeName}`,
    )
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados do Meta - Não Tratado:", error)
    throw error
  }
}

// NOVO HOOK para dados do Meta - Tratado
export const useMetaTratadoData = () => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchMetaTratadoData()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return { data, loading, error, refetch: loadData }
}

// NOVO HOOK para dados do Meta - Não Tratado
export const useMetaNaoTratadoData = () => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchMetaNaoTratadoData()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return { data, loading, error, refetch: loadData }
}


// NOVAS FUNÇÕES PARA GA4 COM API NACIONAL
export const fetchGA4SourceNacionalData = async () => {
  try {
    const response = await apiNacional.get(
      "/google/sheets/1HOXNr49g68lQQo4fnh5nUi3mTynUionTq7t5m-u52m0/data?range=GA4%20-Source",
    )
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados do GA4 Source Nacional:", error)
    throw error
  }
}

export const fetchGA4CompletoNacionalData = async () => {
  try {
    const response = await apiNacional.get(
      "/google/sheets/1HOXNr49g68lQQo4fnh5nUi3mTynUionTq7t5m-u52m0/data?range=GA4%20-%20Completo",
    )
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados do GA4 Completo Nacional:", error)
    throw error
  }
}

export const fetchGA4ResumoNacionalData = async () => {
  try {
    const response = await apiNacional.get(
      "/google/sheets/1HOXNr49g68lQQo4fnh5nUi3mTynUionTq7t5m-u52m0/data?range=GA4%20-Resumo",
    )
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados do GA4 Resumo Nacional:", error)
    throw error
  }
}

// NOVOS HOOKS PARA GA4 NACIONAL
export const useGA4SourceNacionalData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchGA4SourceNacionalData()
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

export const useGA4CompletoNacionalData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchGA4CompletoNacionalData()
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

export const useGA4ResumoNacionalData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchGA4ResumoNacionalData()
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

// NOVA FUNÇÃO para buscar dados de Eventos Receptivos
export const fetchEventosReceptivosData = async () => {
  try {
    const response = await apiNacional.get(
      "/google/sheets/1HOXNr49g68lQQo4fnh5nUi3mTynUionTq7t5m-u52m0/data?range=Eventos%20receptivo",
    )
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados de Eventos Receptivos:", error)
    throw error
  }
}

// NOVO HOOK para dados de Eventos Receptivos
export const useEventosReceptivosData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchEventosReceptivosData()
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

// NOVAS FUNÇÕES PARA A PLANILHA DE TRÁFEGO E ENGAJAMENTO
// Planilha: https://docs.google.com/spreadsheets/d/1i00J0lh9iSvzuVCvr6TYaka0SQ2VN4GVTBwGB02VQ7c
export const fetchGA4ReceptivosData = async () => {
  try {
    const response = await apiNacional.get(
      "/google/sheets/1i00J0lh9iSvzuVCvr6TYaka0SQ2VN4GVTBwGB02VQ7c/data?range=GA4_receptivos",
    )
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados do GA4 Receptivos:", error)
    throw error
  }
}

export const fetchEventosReceptivosNovaData = async () => {
  try {
    const response = await apiNacional.get(
      "/google/sheets/1i00J0lh9iSvzuVCvr6TYaka0SQ2VN4GVTBwGB02VQ7c/data?range=Eventos%20Receptivos",
    )
    return response.data
  } catch (error) {
    console.error("Erro ao buscar dados de Eventos Receptivos Nova:", error)
    throw error
  }
}

// NOVOS HOOKS PARA A NOVA PLANILHA
export const useGA4ReceptivosData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchGA4ReceptivosData()
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

export const useEventosReceptivosNovaData = () => {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchEventosReceptivosNovaData()
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

