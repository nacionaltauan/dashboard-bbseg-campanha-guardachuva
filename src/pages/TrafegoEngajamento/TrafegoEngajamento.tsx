"use client"

import type React from "react"
import { useState, useMemo, useRef } from "react"
import { TrendingUp, Calendar, Users, BarChart3, MessageCircle, HandHeart, Filter, MapPin, XCircle, TrendingDown, Clock, Share2, Megaphone, Headphones, FileText } from "lucide-react"
import Loading from "../../components/Loading/Loading"
import PDFDownloadButton from "../../components/PDFDownloadButton/PDFDownloadButton"
import { 
  useGA4ReceptivosData,
  useEventosReceptivosNovaData 
} from "../../services/api"
import BrazilMap from "../../components/BrazilMap/BrazilMap" // Importar novo componente de mapa

type TrafegoEngajamentoProps = {}

// Mapeamento explícito dos nomes dos estados da API para os nomes no GeoJSON
const API_TO_GEOJSON_STATE_NAMES: { [key: string]: string } = {
  Ceara: "Ceará",
  "Federal District": "Distrito Federal",
  "State of Acre": "Acre",
  "State of Alagoas": "Alagoas",
  "State of Amapa": "Amapá",
  "State of Amazonas": "Amazonas",
  "State of Bahia": "Bahia",
  "State of Espirito Santo": "Espírito Santo",
  "State of Goias": "Goiás",
  "State of Maranhao": "Maranhão",
  "State of Mato Grosso": "Mato Grosso",
  "State of Mato Grosso do Sul": "Mato Grosso do Sul",
  "State of Minas Gerais": "Minas Gerais",
  "State of Para": "Pará",
  "State of Paraiba": "Paraíba",
  "State of Parana": "Paraná",
  "State of Pernambuco": "Pernambuco",
  "State of Piaui": "Piauí",
  "State of Rio de Janeiro": "Rio de Janeiro",
  "State of Rio Grande do Norte": "Rio Grande do Norte",
  "State of Rio Grande do Sul": "Rio Grande do Sul",
  "State of Rondonia": "Rondônia",
  "State of Roraima": "Roraima",
  "State of Santa Catarina": "Santa Catarina",
  "State of Sao Paulo": "São Paulo",
  "State of Sergipe": "Sergipe",
  "State of Tocantins": "Tocantins",
  "Upper Takutu-Upper Essequibo": "Outros", // This isn't a Brazilian state
}

const TrafegoEngajamento: React.FC<TrafegoEngajamentoProps> = () => {
  const contentRef = useRef<HTMLDivElement>(null)
  const { data: ga4ReceptivosData, loading: receptivosLoading, error: receptivosError } = useGA4ReceptivosData()
  const { data: eventosReceptivosData, loading: eventosLoading, error: eventosError } = useEventosReceptivosNovaData()


  console.log("Dados ga4ReceptivosData:", ga4ReceptivosData)

  // Função para formatar a data como YYYY-MM-DD
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Adiciona um zero à esquerda se necessário
    const day = String(today.getDate()).padStart(2, '0'); // Adiciona um zero à esquerda se necessário
    return `${year}-${month}-${day}`;
  };

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "2025-07-28",
    end: getTodayDateString(), // Define o 'end' como a data de hoje
  })

  const [selectedColunaQ, setSelectedColunaQ] = useState<string[]>([])
  const [selectedModalidade, setSelectedModalidade] = useState<string[]>([])

  // Função para normalizar data para formato YYYY-MM-DD
  const normalizeDate = (dateStr: string | number | undefined | null): string | null => {
    if (!dateStr) return null

    const str = dateStr.toString().trim()
    if (!str) return null

    try {
      // Tentar diferentes formatos de data
      // Formato DD/MM/YYYY
      if (str.includes("/")) {
        const parts = str.split("/")
        if (parts.length === 3) {
          const [day, month, year] = parts
          const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
          if (!isNaN(date.getTime())) {
            return date.toISOString().split("T")[0]
          }
        }
      }

      // Formato YYYY-MM-DD
      if (str.includes("-")) {
        const parts = str.split("-")
        if (parts.length === 3) {
          const [year, month, day] = parts
          const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
          if (!isNaN(date.getTime())) {
            return date.toISOString().split("T")[0]
          }
        }
      }

      // Tentar parsing direto
      const date = new Date(str)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0]
      }
    } catch (error) {
      console.warn("Erro ao normalizar data:", str, error)
    }

    return null
  }

  // Função para verificar se uma data está dentro do range selecionado
  const isDateInRange = (dateStr: string | number | undefined | null): boolean => {
    if (!dateStr || !dateRange.start || !dateRange.end) return true

    const normalizedDate = normalizeDate(dateStr)
    if (!normalizedDate) return true // Se não conseguir normalizar, não filtra

    const startDate = normalizeDate(dateRange.start) || dateRange.start
    const endDate = normalizeDate(dateRange.end) || dateRange.end

    return normalizedDate >= startDate && normalizedDate <= endDate
  }

  // Função auxiliar para obter índice de coluna pelo nome (case-insensitive)
  const getColumnIndex = (headers: string[], columnName: string): number => {
    const index = headers.findIndex((h) => {
      if (!h) return false
      return h.toString().trim().toLowerCase() === columnName.toLowerCase()
    })
    if (index === -1) {
      // Tentar busca parcial também
      const partialIndex = headers.findIndex((h) => {
        if (!h) return false
        return h.toString().trim().toLowerCase().includes(columnName.toLowerCase())
      })
      if (partialIndex !== -1) {
        return partialIndex
      }
      console.warn(`Coluna "${columnName}" não encontrada nos headers`)
    }
    return index
  }

  // Função para obter valores únicos da coluna Origem (Session source)
  const valoresColunaQ = useMemo(() => {
    if (!ga4ReceptivosData?.data?.values || ga4ReceptivosData.data.values.length <= 1) {
      return []
    }

    const headers = ga4ReceptivosData.data.values[0]
    const rows = ga4ReceptivosData.data.values.slice(1)
    // Tentar "Session source" primeiro, depois "Session manual source"
    let colunaQIndex = getColumnIndex(headers, "Session source")
    if (colunaQIndex === -1) {
      colunaQIndex = getColumnIndex(headers, "Session manual source")
    }

    if (colunaQIndex === -1) return []

    const valores = new Set<string>()

    rows.forEach((row: any[]) => {
      const valor = row[colunaQIndex]?.toString().trim() || ""
      if (valor) {
        valores.add(valor)
      }
    })

    return Array.from(valores).sort()
  }, [ga4ReceptivosData])

  // Função para obter valores únicos da coluna Modalidade (Region) da aba GA4_receptivos
  const valoresModalidadeGA4 = useMemo(() => {
    if (!ga4ReceptivosData?.data?.values || ga4ReceptivosData.data.values.length <= 1) {
      return []
    }

    const headers = ga4ReceptivosData.data.values[0]
    const rows = ga4ReceptivosData.data.values.slice(1)
    // Usar "Region" que é o nome real da coluna
    const modalidadeIndex = getColumnIndex(headers, "Region")

    if (modalidadeIndex === -1) return []

    const valores = new Set<string>()

    rows.forEach((row: any[]) => {
      const valor = row[modalidadeIndex]?.toString().trim() || ""
      if (valor) {
        valores.add(valor)
      }
    })

    return Array.from(valores).sort()
  }, [ga4ReceptivosData])

  // Função para obter valores únicos da coluna Modalidade da aba Eventos Receptivos
  // Nota: A aba Eventos Receptivos não tem coluna Modalidade/Region, então retorna vazio
  const valoresModalidadeEventos = useMemo(() => {
    // A aba Eventos Receptivos não possui coluna Modalidade/Region
    // Retornar array vazio
    return []
  }, [eventosReceptivosData])

  // Valores únicos combinados de Modalidade
  const valoresModalidade = useMemo(() => {
    const combined = new Set([...valoresModalidadeGA4, ...valoresModalidadeEventos])
    return Array.from(combined).sort()
  }, [valoresModalidadeGA4, valoresModalidadeEventos])

  // Função para verificar se a linha passa pelo filtro da coluna Q (Origem)
  // Retorna true se a coluna não existir (não bloqueia os dados)
  const passaFiltroColunaQ = (row: any[], headers: string[]): boolean => {
    if (selectedColunaQ.length === 0) return true
    
    // Tentar diferentes nomes possíveis para a coluna Origem
    let colunaQIndex = getColumnIndex(headers, "Origem")
    if (colunaQIndex === -1) {
      colunaQIndex = getColumnIndex(headers, "Session source")
    }
    if (colunaQIndex === -1) {
      colunaQIndex = getColumnIndex(headers, "Session manual source")
    }
    
    // Se a coluna não existir, não bloqueia (retorna true)
    if (colunaQIndex === -1) return true
    
    const valorColunaQ = row[colunaQIndex]?.toString().trim() || ""
    
    return selectedColunaQ.includes(valorColunaQ)
  }

  // Função para verificar se a linha passa pelo filtro de Modalidade
  // Retorna true se a coluna não existir (não bloqueia os dados)
  const passaFiltroModalidade = (row: any[], headers: string[]): boolean => {
    if (selectedModalidade.length === 0) return true
    
    // Usar "Region" que é o nome real da coluna na aba GA4_receptivos
    // A aba Eventos Receptivos não tem essa coluna, então retorna true
    let modalidadeIndex = getColumnIndex(headers, "Region")
    
    // Se a coluna não existir (ex: na aba Eventos Receptivos), não bloqueia (retorna true)
    if (modalidadeIndex === -1) return true
    
    const valorModalidade = row[modalidadeIndex]?.toString().trim() || ""
    
    return selectedModalidade.includes(valorModalidade)
  }

  // Função para alternar seleção do filtro da coluna Q
  const toggleColunaQ = (valor: string) => {
    setSelectedColunaQ((prev) => {
      if (prev.includes(valor)) {
        return prev.filter((v) => v !== valor)
      }
      return [...prev, valor]
    })
  }

  // Função para alternar seleção do filtro de Modalidade
  const toggleModalidade = (valor: string) => {
    setSelectedModalidade((prev) => {
      if (prev.includes(valor)) {
        return prev.filter((v) => v !== valor)
      }
      return [...prev, valor]
    })
  }

  // Função para obter cor do veículo/plataforma
  const getPlataformaColor = (source: string): string => {
    const colors: { [key: string]: string } = {
      "meta": "#1877f2",
      "facebook": "#1877f2", 
      "instagram": "#E4405F",
      "tiktok": "#ff0050",
      "youtube": "#ff0000",
      "google": "#4285f4",
      "criteo": "#ff6900",
      "dms-social": "#1877f2",
      "dms-google": "#4285f4",
      "dms-youtube": "#ff0000",
      "organic": "#6b7280",
      "(not set)": "#9ca3af",
      "Outros": "#9ca3af",
    }
    
    // Converter para lowercase para match
    const lowerSource = source.toLowerCase()
    return colors[lowerSource] || "#6b7280"
  }

  // Processamento dos dados da nova planilha GA4 Receptivos - Plataformas (coluna D)
  const processedSourceData = useMemo(() => {
    
    if (!ga4ReceptivosData?.data?.values || ga4ReceptivosData.data.values.length <= 1) {
      return {
        veiculosDetalhados: [],
        fontesPorPlataforma: {},
        totalSessions: 0,
        resumoPorData: {},
      }
    }

    const headers = ga4ReceptivosData.data.values[0]
    const rows = ga4ReceptivosData.data.values.slice(1)

    // Índices das colunas usando nome da coluna real
    const dateIndex = getColumnIndex(headers, "Date")
    // Tentar "Session source" primeiro, depois "Session manual source" como fallback
    let plataformaIndex = getColumnIndex(headers, "Session source")
    if (plataformaIndex === -1) {
      plataformaIndex = getColumnIndex(headers, "Session manual source")
    }
    const sessionsIndex = getColumnIndex(headers, "Sessions")

    if (dateIndex === -1 || plataformaIndex === -1 || sessionsIndex === -1) {
      console.warn("⚠️ [DIAGNÓSTICO] Colunas essenciais não encontradas na aba GA4_receptivos:", {
        dateIndex,
        plataformaIndex,
        sessionsIndex,
        headers
      })
      return {
        veiculosDetalhados: [],
        fontesPorPlataforma: {},
        totalSessions: 0,
        resumoPorData: {},
      }
    }

    const sourceData: { [key: string]: number } = {}
    const dataResumo: { [key: string]: number } = {}
    let totalSessions = 0

    rows.forEach((row: any[], index: number) => {
      const date = row[dateIndex] || ""
      
      // Aplicar filtro de data
      if (!isDateInRange(date)) {
        return
      }

      // Aplicar filtro da coluna Q
      if (!passaFiltroColunaQ(row, headers)) {
        return
      }

      // Aplicar filtro de Modalidade
      if (!passaFiltroModalidade(row, headers)) {
        return
      }

      const sessions = Number.parseInt(row[sessionsIndex]) || 0
      const plataforma = row[plataformaIndex] || "Outros"

      if (sessions > 0) {
        totalSessions += sessions

        // Agrupar por plataforma
        sourceData[plataforma] = (sourceData[plataforma] || 0) + sessions

        // Resumo por data
        if (date) {
          dataResumo[date] = (dataResumo[date] || 0) + sessions
        }
      }
    })

    // Converter em arrays ordenados
    const veiculosDetalhados = Object.entries(sourceData)
      .map(([plataforma, sessoes]) => ({
        plataforma,
        sessoes,
        percentual: totalSessions > 0 ? (sessoes / totalSessions) * 100 : 0,
        cor: getPlataformaColor(plataforma),
      }))
      .sort((a, b) => b.sessoes - a.sessoes)

    return {
      veiculosDetalhados,
      fontesPorPlataforma: sourceData,
      totalSessions,
      resumoPorData: dataResumo,
    }
  }, [ga4ReceptivosData, dateRange, selectedColunaQ, selectedModalidade])

  const processedEventosData = useMemo(() => {
    if (!eventosReceptivosData?.data?.values || eventosReceptivosData.data.values.length <= 1) {
      return {
        bbTrack: 0,
        firstVisit: 0,
        totalCTAs: 0,
      }
    }

    const headers = eventosReceptivosData.data.values[0]
    const rows = eventosReceptivosData.data.values.slice(1)

    // Índices das colunas usando nome da coluna real
    const dateIndex = getColumnIndex(headers, "Date")
    const eventNameIndex = getColumnIndex(headers, "Event name") // Coluna correta
    const eventCountIndex = getColumnIndex(headers, "Event count")

    if (dateIndex === -1 || eventNameIndex === -1 || eventCountIndex === -1) {
      console.warn("⚠️ [DIAGNÓSTICO] Colunas essenciais não encontradas na aba Eventos Receptivos:", {
        dateIndex,
        eventNameIndex,
        eventCountIndex,
        headers
      })
      return {
        bbTrack: 0,
        firstVisit: 0,
        totalCTAs: 0,
      }
    }

    let bbTrackTotal = 0
    let firstVisitTotal = 0

    rows.forEach((row: any[]) => {
      const date = row[dateIndex] || ""
      
      // Aplicar filtro de data
      if (!isDateInRange(date)) {
        return
      }

      // Aplicar filtro de Modalidade (não bloqueia se coluna não existir)
      if (!passaFiltroModalidade(row, headers)) {
        return
      }

      const eventName = (row[eventNameIndex] || "").toString().trim()
      const eventCount = parseInt(row[eventCountIndex]) || 0

      // Lógica: IF Event name = "botao-cta", THEN somar Event count
      if (eventName === "botao-cta") {
        bbTrackTotal += eventCount
      }
    })

    // First Visit vem da planilha GA4_receptivos, coluna J
    if (ga4ReceptivosData?.data?.values && ga4ReceptivosData.data.values.length > 1) {
      const ga4Headers = ga4ReceptivosData.data.values[0]
      const ga4Rows = ga4ReceptivosData.data.values.slice(1)
      
      // 1. Log de Headers
      console.log("🔍 [DIAGNÓSTICO] Headers GA4 encontrados:", ga4Headers)
      
      const ga4DateIndex = getColumnIndex(ga4Headers, "Date")
      console.log(`🔍 [DIAGNÓSTICO] Índice da coluna 'Date': ${ga4DateIndex}`)
      
      // 2. Busca Flexível com Log - Buscar explicitamente "New users" (case-insensitive)
      let firstVisitIndex = -1
      let termoEncontrado = ""
      
      // Busca case-insensitive para "New users"
      firstVisitIndex = ga4Headers.findIndex((h: any) => {
        if (!h) return false
        const headerStr = h.toString().toLowerCase().trim()
        return headerStr === "new users"
      })
      
      if (firstVisitIndex !== -1) {
        termoEncontrado = ga4Headers[firstVisitIndex]?.toString() || ""
      } else {
        // Fallback: tentar variações
        const termosPossiveis = [
          "new users", 
          "New Users", 
          "NEW USERS",
          "novos usuários", 
          "Novos Usuários",
          "first visit",
          "First Visit",
          "first visits"
        ]
        
        for (const termo of termosPossiveis) {
          firstVisitIndex = ga4Headers.findIndex((h: any) => {
            if (!h) return false
            const headerStr = h.toString().toLowerCase().trim()
            return headerStr === termo.toLowerCase() || headerStr.includes(termo.toLowerCase())
          })
          
          if (firstVisitIndex !== -1) {
            termoEncontrado = ga4Headers[firstVisitIndex]?.toString() || ""
            break
          }
        }
      }
      
      console.log(`🔍 [DIAGNÓSTICO] Índice da coluna 'New users': ${firstVisitIndex}. Termo encontrado: ${firstVisitIndex !== -1 ? termoEncontrado : "NENHUM"}`)
      
      if (firstVisitIndex === -1) {
        console.warn("⚠️ [DIAGNÓSTICO] Coluna First Visit/New users não encontrada. Headers disponíveis:", ga4Headers)
      }

      if (ga4DateIndex !== -1 && firstVisitIndex !== -1) {
        let debugCount = 0
        let totalLinhasProcessadas = 0
        let totalLinhasFiltradas = 0
        
        console.log(`🔍 [DIAGNÓSTICO] Total de linhas para processar: ${ga4Rows.length}`)
        
        ga4Rows.forEach((row: any[], rowIndex: number) => {
          const date = row[ga4DateIndex] || ""
          
          // 3. Amostragem de Dados - Log das primeiras 3 linhas que passam pelos filtros
          if (!isDateInRange(date)) {
            if (debugCount < 3) {
              console.log(`🔍 [DIAGNÓSTICO] Linha ${rowIndex} filtrada por DATA: Data=${date}, Range=${dateRange.start} até ${dateRange.end}`)
            }
            return
          }

          // Aplicar filtro da coluna Q
          if (!passaFiltroColunaQ(row, ga4Headers)) {
            if (debugCount < 3) {
              console.log(`🔍 [DIAGNÓSTICO] Linha ${rowIndex} filtrada por COLUNA Q`)
            }
            return
          }

          // Aplicar filtro de Modalidade
          if (!passaFiltroModalidade(row, ga4Headers)) {
            if (debugCount < 3) {
              console.log(`🔍 [DIAGNÓSTICO] Linha ${rowIndex} filtrada por MODALIDADE`)
            }
            return
          }

          totalLinhasFiltradas++
          
          // 4. Verificação de Tipo - Log do valor antes do parseInt
          const valorBruto = row[firstVisitIndex]
          const tipoValor = typeof valorBruto
          const valorString = valorBruto?.toString() || ""
          
          if (debugCount < 3) {
            console.log(`🔍 [DIAGNÓSTICO] Linha ${rowIndex}: Data=${date}, Valor Bruto Coluna[${firstVisitIndex}]=${JSON.stringify(valorBruto)}, Tipo=${tipoValor}, String="${valorString}"`)
            debugCount++
          }
          
          // Parse do valor
          let firstVisitCount = 0
          if (valorBruto !== null && valorBruto !== undefined && valorBruto !== "") {
            // Tentar parse direto se for número
            if (typeof valorBruto === "number") {
              firstVisitCount = valorBruto
            } else {
              // Remover pontos de milhar e trocar vírgula por ponto
              const cleanValue = valorString.replace(/\./g, "").replace(",", ".")
              firstVisitCount = parseInt(cleanValue) || 0
            }
          }
          
          if (debugCount <= 3 && firstVisitCount > 0) {
            console.log(`🔍 [DIAGNÓSTICO] Linha ${rowIndex}: Valor parseado=${firstVisitCount}`)
          }
          
          firstVisitTotal += firstVisitCount
          totalLinhasProcessadas++
        })
        
        console.log(`🔍 [DIAGNÓSTICO] Resumo: Total linhas processadas=${totalLinhasProcessadas}, Total linhas filtradas=${totalLinhasFiltradas}, First Visit Total=${firstVisitTotal}`)
      } else {
        console.error("❌ [DIAGNÓSTICO] Não foi possível processar dados: ga4DateIndex=", ga4DateIndex, "firstVisitIndex=", firstVisitIndex)
      }
    } else {
      console.warn("⚠️ [DIAGNÓSTICO] Dados GA4 Receptivos não disponíveis ou estrutura incorreta")
    }

    return {
      bbTrack: bbTrackTotal,
      firstVisit: firstVisitTotal,
      totalCTAs: bbTrackTotal + firstVisitTotal,
    }
  }, [eventosReceptivosData, ga4ReceptivosData, dateRange, selectedColunaQ, selectedModalidade])

  // Processamento dos eventos específicos da aba Eventos Receptivos
  const processedEventosEspecificos = useMemo(() => {
    if (!eventosReceptivosData?.data?.values || eventosReceptivosData.data.values.length <= 1) {
      return {
        btnCanaisFooter: 0,
        btnOuvidoria: 0,
        btnSAC: 0,
        preenchimentoForm: 0,
      }
    }

    const headers = eventosReceptivosData.data.values[0]
    const rows = eventosReceptivosData.data.values.slice(1)

    // Índices das colunas - usar nomes reais da estrutura
    const dateIndex = getColumnIndex(headers, "Date")
    const eventNameIndex = getColumnIndex(headers, "Event name") // Nome correto da coluna
    const eventCountIndex = getColumnIndex(headers, "Event count") // Nome correto da coluna

    if (dateIndex === -1 || eventNameIndex === -1 || eventCountIndex === -1) {
      console.warn("⚠️ [DIAGNÓSTICO] Colunas essenciais não encontradas em processedEventosEspecificos:", {
        dateIndex,
        eventNameIndex,
        eventCountIndex,
        headers
      })
      return {
        btnCanaisFooter: 0,
        btnOuvidoria: 0,
        btnSAC: 0,
        preenchimentoForm: 0,
      }
    }

    let btnCanaisFooterTotal = 0
    let btnOuvidoriaTotal = 0
    let btnSACTotal = 0
    let preenchimentoFormTotal = 0

    rows.forEach((row: any[]) => {
      const date = row[dateIndex] || ""
      
      // Aplicar filtro de data
      if (!isDateInRange(date)) {
        return
      }

      // Aplicar filtro de Modalidade
      if (!passaFiltroModalidade(row, headers)) {
        return
      }

      const eventName = (row[eventNameIndex] || "").toString().trim()
      const eventCount = parseInt(row[eventCountIndex]) || 0

      // Filtrar e somar eventos específicos
      if (eventName === "Button_Canais_Digitais_Footer") {
        btnCanaisFooterTotal += eventCount
      } else if (eventName === "Button_Ouv_Footer") {
        btnOuvidoriaTotal += eventCount
      } else if (eventName === "Button_SAC_Footer") {
        btnSACTotal += eventCount
      } else if (eventName === "preenchimento_form") {
        preenchimentoFormTotal += eventCount
      }
    })

    return {
      btnCanaisFooter: btnCanaisFooterTotal,
      btnOuvidoria: btnOuvidoriaTotal,
      btnSAC: btnSACTotal,
      preenchimentoForm: preenchimentoFormTotal,
    }
  }, [eventosReceptivosData, dateRange, selectedModalidade])

  const processedResumoData = useMemo(() => {
    
    if (!ga4ReceptivosData?.data?.values || ga4ReceptivosData.data.values.length <= 1) {
      return {
        receptivo: {
          sessoesCampanha: 0,
          cliquesSaibaMais: 0,
          cliquesCTAs: 0,
          duracaoSessoes: "00:00:00",
          taxaRejeicao: 0,
          cliquesWhatsapp: 0,
          cliquesContrateAgora: 0,
          cliquesFaleConosco: 0,
        },
        dispositivos: [],
        dadosRegiao: {},
        rejeicoes: 0,
        taxaRejeicao: 0,
        duracaoMediaSessao: 0,
        engagedSessions: 0,
      }
    }

    const headers = ga4ReceptivosData.data.values[0]
    const rows = ga4ReceptivosData.data.values.slice(1)

    // Índices das colunas usando nome da coluna
    const dateIndex = getColumnIndex(headers, "Date")
    const regionIndex = getColumnIndex(headers, "Region") // Coluna E
    const deviceIndex = getColumnIndex(headers, "Device category") // Coluna H
    const sessionsIndex = getColumnIndex(headers, "Sessions") // Coluna I
    const bouncesIndex = getColumnIndex(headers, "Bounces")
    const durationIndex = getColumnIndex(headers, "Average session duration")
    const engagedIndex = getColumnIndex(headers, "Engaged sessions")

    if (dateIndex === -1 || regionIndex === -1 || deviceIndex === -1 || sessionsIndex === -1 || bouncesIndex === -1 || durationIndex === -1 || engagedIndex === -1) {
      return {
        receptivo: {
          sessoesCampanha: 0,
          cliquesSaibaMais: 0,
          cliquesCTAs: 0,
          duracaoSessoes: "00:00:00",
          taxaRejeicao: 0,
          cliquesWhatsapp: 0,
          cliquesContrateAgora: 0,
          cliquesFaleConosco: 0,
        },
        dispositivos: [],
        dadosRegiao: {},
        rejeicoes: 0,
        taxaRejeicao: 0,
        duracaoMediaSessao: 0,
        engagedSessions: 0,
      }
    }

    let totalSessions = 0
    let totalSaibaMais = 0
    let totalDuration = 0
    let totalBounceRate = 0
    let validRows = 0
    let totalCTAs = 0
    let totalWhatsapp = 0
    let totalContrateAgora = 0
    let totalFaleConosco = 0
    let totalBounces = 0
    let totalDurationSum = 0
    let durationCount = 0
    let totalEngagedSessions = 0

    const deviceData: { [key: string]: number } = {}
    const regionData: { [key: string]: number } = {}

    rows.forEach((row: any[], index: number) => {
      const date = row[dateIndex] || ""
      
      // Aplicar filtro de data
      if (!isDateInRange(date)) {
        return
      }

      // Aplicar filtro da coluna Q
      if (!passaFiltroColunaQ(row, headers)) {
        return
      }

      // Aplicar filtro de Modalidade
      if (!passaFiltroModalidade(row, headers)) {
        return
      }

      const sessions = Number.parseInt(row[sessionsIndex]) || 0
      const device = row[deviceIndex] || "Outros"
      const region = row[regionIndex] || "Outros"
      const bounces = Number.parseInt(row[bouncesIndex]) || 0
      const duration = Number.parseFloat(row[durationIndex]) || 0
      const engaged = Number.parseInt(row[engagedIndex]) || 0

      if (sessions > 0) {
        totalSessions += sessions
        validRows += sessions
        totalBounces += bounces
        totalEngagedSessions += engaged

        // Duração média ponderada por sessões (acumula duration * sessions)
        if (duration > 0) {
          totalDurationSum += duration * sessions
        }

        // Dispositivos
        deviceData[device] = (deviceData[device] || 0) + sessions

        // Regiões - Converter o nome do estado para o formato esperado pelo mapa
        if (region !== "(not set)" && region.trim() !== "" && region !== " " && region !== "Outros") {
          const normalizedRegion = API_TO_GEOJSON_STATE_NAMES[region] || region
          regionData[normalizedRegion] = (regionData[normalizedRegion] || 0) + sessions
        }
      }
    })

    // Converter em arrays ordenados
    const dispositivos = Object.entries(deviceData)
      .map(([tipo, sessoes]) => ({
        tipo,
        sessoes,
        percentual: totalSessions > 0 ? (sessoes / totalSessions) * 100 : 0,
        cor: tipo === "mobile" ? "#3b82f6" : tipo === "desktop" ? "#8b5cf6" : "#06b6d4",
      }))
      .sort((a, b) => b.sessoes - a.sessoes)

    // Calcular taxa de rejeição e duração média
    const taxaRejeicao = totalSessions > 0 ? (totalBounces / totalSessions) * 100 : 0
    const duracaoMediaSessao = totalSessions > 0 ? totalDurationSum / totalSessions : 0

    const resultado = {
      receptivo: {
        sessoesCampanha: totalSessions,
        cliquesSaibaMais: totalSaibaMais,
        cliquesCTAs: totalCTAs,
        duracaoSessoes: "00:00:00",
        taxaRejeicao: 0,
        cliquesWhatsapp: totalWhatsapp,
        cliquesContrateAgora: totalContrateAgora,
        cliquesFaleConosco: totalFaleConosco,
      },
      dispositivos,
      dadosRegiao: regionData,
      rejeicoes: totalBounces,
      taxaRejeicao: taxaRejeicao,
      duracaoMediaSessao: duracaoMediaSessao,
      engagedSessions: totalEngagedSessions,
    }

    return resultado
  }, [ga4ReceptivosData, dateRange, selectedColunaQ, selectedModalidade])


  // Função para formatar números (trunca para baixo, sem arredondar para cima)
  const formatNumber = (value: number): string => {
    if (value >= 1000000) {
      // Trunca para baixo mantendo 1 casa decimal
      const truncated = Math.floor(value / 100000) / 10
      return `${truncated} mi`
    }
    if (value >= 1000) {
      // Trunca para baixo mantendo 1 casa decimal
      const truncated = Math.floor(value / 100) / 10
      return `${truncated} mil`
    }
    return value.toLocaleString("pt-BR")
  }

  // Componente de gráfico de barras horizontais
  const HorizontalBarChart: React.FC<{
    title: string
    data: Array<{
      categoria?: string
      tipo?: string
      plataforma?: string
      campanha?: string
      sessoes: number
      percentual: number
      cor?: string
    }>
    showValues?: boolean
  }> = ({ title, data, showValues = true }) => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                {item.categoria || item.tipo || item.plataforma || item.campanha}
              </span>
              {showValues && (
                <span className="text-sm text-gray-600">
                  {formatNumber(item.sessoes)} ({item.percentual.toFixed(1)}%)
                </span>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(item.percentual, 100)}%`,
                  backgroundColor: item.cor || "#6b7280",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  if (receptivosLoading || eventosLoading) {
  return <Loading message="Carregando dados de tráfego e engajamento..." />
}

if (receptivosError || eventosError) {
    const getErrorMessage = (error: Error | null) => {
      if (!error) return ""
      
      const errorMessage = error.message.toLowerCase()
      if (errorMessage.includes("timeout")) {
        return "A requisição está demorando mais do que o esperado. Tente novamente em alguns instantes."
      }
      if (errorMessage.includes("network")) {
        return "Erro de conexão. Verifique sua internet e tente novamente."
      }
      return error.message
    }

    return (
      <div className="p-6 text-center">
        <div className="text-red-500 mb-2 font-semibold">Erro ao carregar dados</div>
        <p className="text-gray-600 mb-3">Não foi possível carregar os dados do GA4. Tente novamente.</p>
        {receptivosError && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-2">
            <p className="text-sm font-medium text-red-700 mb-1">Erro GA4 Receptivos:</p>
            <p className="text-xs text-red-600">{getErrorMessage(receptivosError)}</p>
          </div>
        )}
        {eventosError && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-sm font-medium text-red-700 mb-1">Erro Eventos Receptivos:</p>
            <p className="text-xs text-red-600">{getErrorMessage(eventosError)}</p>
          </div>
        )}
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Recarregar Página
        </button>
      </div>
    )
  }

  return (
    <div ref={contentRef} className="space-y-6 h-full flex flex-col">
      {/* Título e Botão de Download */}
        <div className="flex justify-between items-center">
            {/* Lado Esquerdo: Ícone e Título */}
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Tráfego e Engajamento</h1>
                    <p className="text-xs text-gray-600">Receptivo da campanha</p>
                </div>
            </div>
            {/* Lado Direito: Botão */}
            <PDFDownloadButton contentRef={contentRef} fileName="trafego-e-engajamento" />
        </div>
      
      {/* Header Compacto com Filtro de Data e Cards de Métricas */}
      <div className="card-overlay rounded-lg shadow-lg p-4">
        <div className="grid grid-cols-12 gap-4 items-center">
          {/* Filtro de Data */}
          <div className="col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              Período de Análise
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filtro da Coluna Q */}
          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              Filtro (Origem)
            </label>
            <div className="flex flex-wrap gap-2">
              {valoresColunaQ.map((valor) => (
                <button
                  key={valor}
                  onClick={() => toggleColunaQ(valor)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                    selectedColunaQ.includes(valor)
                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                      : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {valor}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro de Modalidade */}
          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Modalidades
            </label>
            <div className="flex flex-wrap gap-2">
              {valoresModalidade.map((modalidade) => (
                <button
                  key={modalidade}
                  onClick={() => toggleModalidade(modalidade)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                    selectedModalidade.includes(modalidade)
                      ? "bg-green-100 text-green-800 border border-green-300"
                      : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {modalidade}
                </button>
              ))}
            </div>
          </div>

          {/* Cards de Métricas - 6 cards ocupando 6 colunas */}
          <div className="col-span-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-600">Sessões</p>
                  <p className="text-lg font-bold text-green-900">
                    {formatNumber(processedResumoData.receptivo.sessoesCampanha)}
                    
                  </p>
                </div>
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-orange-600">First Visit</p>
                  <p className="text-lg font-bold text-orange-900">
                    {formatNumber(processedEventosData.firstVisit)}
                  </p>
                </div>
                <HandHeart className="w-6 h-6 text-orange-600" />
              </div>
            </div>

            {/* Card Sessões Engajadas */}
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-teal-600">Sessões Engajadas</p>
                  <p className="text-lg font-bold text-teal-900">
                    {formatNumber(processedResumoData.engagedSessions || 0)}
                  </p>
                </div>
                <BarChart3 className="w-6 h-6 text-teal-600" />
              </div>
            </div>

            {/* Card Rejeições */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-600">Rejeições</p>
                  <p className="text-lg font-bold text-red-900">
                    {formatNumber(processedResumoData.rejeicoes)}
                  </p>
                </div>
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>

            {/* Card Taxa de Rejeição */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-600">Taxa de Rejeição</p>
                  <p className="text-lg font-bold text-purple-900">
                    {processedResumoData.taxaRejeicao.toFixed(1)}%
                  </p>
                </div>
                <TrendingDown className="w-6 h-6 text-purple-600" />
              </div>
            </div>

            {/* Card Duração Média da Sessão */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-indigo-600">Duração Média</p>
                  <p className="text-lg font-bold text-indigo-900">
                    {Math.round(processedResumoData.duracaoMediaSessao)} seg
                  </p>
                </div>
                <Clock className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          {/* Nova linha de cards para eventos específicos */}
          <div className="col-span-12 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600">Btn Canais footer</p>
                  <p className="text-lg font-bold text-blue-900">
                    {formatNumber(processedEventosEspecificos.btnCanaisFooter)}
                  </p>
                </div>
                <Share2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-pink-600">Btn Ouvidoria</p>
                  <p className="text-lg font-bold text-pink-900">
                    {formatNumber(processedEventosEspecificos.btnOuvidoria)}
                  </p>
                </div>
                <Megaphone className="w-6 h-6 text-pink-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-cyan-600">Btn SAC</p>
                  <p className="text-lg font-bold text-cyan-900">
                    {formatNumber(processedEventosEspecificos.btnSAC)}
                  </p>
                </div>
                <Headphones className="w-6 h-6 text-cyan-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-600">Preenchimento de formulário</p>
                  <p className="text-lg font-bold text-amber-900">
                    {formatNumber(processedEventosEspecificos.preenchimentoForm)}
                  </p>
                </div>
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Período selecionado - linha inferior */}
        <div className="mt-2 text-xs text-gray-500">
          Período selecionado: {new Date(dateRange.start).toLocaleDateString("pt-BR")} até{" "}
          {new Date(dateRange.end).toLocaleDateString("pt-BR")} | Última atualização:{" "}
          {new Date().toLocaleString("pt-BR")}
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Dispositivos */}
        <div className="card-overlay rounded-lg shadow-lg p-6">
          <HorizontalBarChart title="Dispositivo" data={processedResumoData.dispositivos} />
        </div>

        {/* Plataformas Detalhadas (Nova funcionalidade) */}
        <div className="card-overlay rounded-lg shadow-lg p-6">
          <HorizontalBarChart title="Plataformas - Sessões Detalhadas" data={processedSourceData.veiculosDetalhados} />
        </div>

        {/* Mapa de Calor - Usando o novo componente */}
        <div className="card-overlay rounded-lg shadow-lg p-6">
          <BrazilMap
            regionData={processedResumoData.dadosRegiao}
            getIntensityColor={(sessions) => {
              const values = Object.values(processedResumoData.dadosRegiao)
              const maxSessions = values.length > 0 ? Math.max(...values) : 0

              if (sessions === 0 || maxSessions === 0) return "#e5e7eb"

              const intensity = sessions / maxSessions

              const colors = {
                muitoAlta: "#03045E",
                alta: "#023E8A",
                medio: "#0077B6",
                baixa: "#0096C7",
                muitoBaixa: "#00B4D8",
              }

              const hexToRgb = (hex: string) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
                return result
                  ? {
                      r: Number.parseInt(result[1], 16),
                      g: Number.parseInt(result[2], 16),
                      b: Number.parseInt(result[3], 16),
                    }
                  : { r: 0, g: 0, b: 0 }
              }

              const rgbToHex = (r: number, g: number, b: number) => {
                return (
                  "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1)
                )
              }

              const interpolateColor = (color1: string, color2: string, factor: number) => {
                const rgb1 = hexToRgb(color1)
                const rgb2 = hexToRgb(color2)

                const r = rgb1.r + (rgb2.r - rgb1.r) * factor
                const g = rgb1.g + (rgb2.g - rgb1.g) * factor
                const b = rgb1.b + (rgb2.b - rgb1.b) * factor

                return rgbToHex(r, g, b)
              }

              if (intensity >= 0.8) {
                const factor = (intensity - 0.8) / 0.2
                return interpolateColor(colors.alta, colors.muitoAlta, factor)
              } else if (intensity >= 0.6) {
                const factor = (intensity - 0.6) / 0.2
                return interpolateColor(colors.medio, colors.alta, factor)
              } else if (intensity >= 0.4) {
                const factor = (intensity - 0.4) / 0.2
                return interpolateColor(colors.baixa, colors.medio, factor)
              } else if (intensity >= 0.2) {
                const factor = (intensity - 0.2) / 0.2
                return interpolateColor(colors.muitoBaixa, colors.baixa, factor)
              } else {
                return colors.muitoBaixa
              }
            }}
          />
        </div>
      </div>

      /* Resumo dos CTAs */
    <div className="card-overlay rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo de Conversões (CTAs)</h3>
      
      {/* GRID CONTAINER PARA OS CARDS */}
      <div className="grid grid-cols-1 gap-4">
        
        {/* CARD FIRST VISIT */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <HandHeart className="w-5 h-5 text-orange-600 mr-2" />
              <span className="text-sm font-medium text-orange-700">First Visit</span>
            </div>
            <span className="text-2xl font-bold text-orange-900">
              {formatNumber(processedEventosData.firstVisit)}
            </span>
          </div>
          <p className="text-xs text-orange-600">
            {processedResumoData.receptivo.sessoesCampanha > 0 
              ? `${((processedEventosData.firstVisit / processedResumoData.receptivo.sessoesCampanha) * 100).toFixed(2)}% das sessões`
              : '0% das sessões'
            }
          </p>
        </div>
      </div>


        {/* Total de CTAs */}
        <div className="mt-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <TrendingUp className="w-5 h-5 text-gray-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">Total de Eventos CTA's</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-gray-900">
                {formatNumber(processedEventosData.totalCTAs)}
              </span>
              <p className="text-xs text-gray-600">
                {processedResumoData.receptivo.sessoesCampanha > 0 
                  ? `${((processedEventosData.totalCTAs / processedResumoData.receptivo.sessoesCampanha) * 100).toFixed(2)}% taxa de conversão`
                  : '0% taxa de conversão'
                }
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Observações */}
      <div className="card-overlay rounded-lg shadow-lg p-4">
        <p className="text-sm text-gray-600">
          <strong>Fontes:</strong> GA4 Receptivos e Eventos Receptivos (API Nacional). Os dados são atualizados automaticamente.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          <strong>Filtro de Data:</strong> Os dados são filtrados automaticamente com base no período selecionado. Todos
          os gráficos e métricas refletem apenas os dados do período escolhido.
        </p>
        <p className="text-xs text-gray-500 mt-1">
          <strong>CTAs:</strong> First Visit é a principal conversão monitorada.
        </p>
      </div>
    </div>
  )
}

export default TrafegoEngajamento