"use client"

import type React from "react"
import { useState, useMemo, useRef, useEffect } from "react"
import { 
  Trophy, 
  Calendar, 
  Filter, 
  MapPin, 
  List, 
  MessageCircle, 
  Share2, 
  HelpCircle, 
  MousePointer, 
  TrendingUp,
  CornerDownRight,
  Layout,
  Medal,
  Award
} from "lucide-react"
import Loading from "../../components/Loading/Loading"
import PDFDownloadButton from "../../components/PDFDownloadButton/PDFDownloadButton"
import { useEventosReceptivosNovaData } from "../../services/api"

type RankingEventosProps = {}

// Interfaces para estruturação dos dados
interface EventoItem {
  id: string
  label: string
  count: number
  children?: EventoItem[]
  color?: string
}

interface CategoriaEventos {
  id: string
  label: string
  icon: React.ElementType
  items: EventoItem[]
  color: string
}

const RankingEventos: React.FC<RankingEventosProps> = () => {
  const contentRef = useRef<HTMLDivElement>(null)
  const { data: eventosReceptivosData, loading, error } = useEventosReceptivosNovaData()

  // --- Filtros ---
  const getTodayDateString = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, "0")
    const day = String(today.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "2025-07-28",
    end: getTodayDateString(),
  })

  const [selectedModalidade, setSelectedModalidade] = useState<string[]>([])
  const [availableOrigens, setAvailableOrigens] = useState<string[]>([])
  const [selectedOrigens, setSelectedOrigens] = useState<string[]>([])

  // Constante de Data de Corte
  const DATA_CORTE = "2025-12-08"

  // --- Funções Auxiliares ---

  const normalizeDate = (dateStr: string | number | undefined | null): string | null => {
    if (!dateStr) return null
    const str = dateStr.toString().trim()
    if (!str) return null

    try {
      if (str.includes("/")) {
        const parts = str.split("/")
        if (parts.length === 3) {
          const [day, month, year] = parts
          const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
          if (!isNaN(date.getTime())) return date.toISOString().split("T")[0]
        }
      }
      if (str.includes("-")) {
        const parts = str.split("-")
        if (parts.length === 3) {
          const [year, month, day] = parts
          const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
          if (!isNaN(date.getTime())) return date.toISOString().split("T")[0]
        }
      }
      const date = new Date(str)
      if (!isNaN(date.getTime())) return date.toISOString().split("T")[0]
    } catch (error) {
      console.warn("Erro ao normalizar data:", str, error)
    }
    return null
  }

  const isDateInRange = (dateStr: string | number | undefined | null): boolean => {
    if (!dateStr || !dateRange.start || !dateRange.end) return true
    const normalizedDate = normalizeDate(dateStr)
    if (!normalizedDate) return true
    const startDate = normalizeDate(dateRange.start) || dateRange.start
    const endDate = normalizeDate(dateRange.end) || dateRange.end
    return normalizedDate >= startDate && normalizedDate <= endDate
  }

  const getColumnIndex = (headers: string[], columnName: string): number => {
    const index = headers.findIndex((h) => {
      if (!h) return false
      return h.toString().trim().toLowerCase() === columnName.toLowerCase()
    })
    if (index === -1) {
      const partialIndex = headers.findIndex((h) => {
        if (!h) return false
        return h.toString().trim().toLowerCase().includes(columnName.toLowerCase())
      })
      return partialIndex
    }
    return index
  }

  // --- Filtros Lógicos ---

  // Valores únicos de Modalidade
  const valoresModalidade = useMemo(() => {
    if (!eventosReceptivosData?.data?.values || eventosReceptivosData.data.values.length <= 1) return []
    const headers = eventosReceptivosData.data.values[0]
    const rows = eventosReceptivosData.data.values.slice(1)
    const modalidadeIndex = getColumnIndex(headers, "Modalidade")
    
    if (modalidadeIndex === -1) return []

    const valores = new Set<string>()
    rows.forEach((row: any[]) => {
      const valor = row[modalidadeIndex]?.toString().trim() || ""
      if (valor) valores.add(valor)
    })
    return Array.from(valores).sort()
  }, [eventosReceptivosData])

  const toggleModalidade = (valor: string) => {
    setSelectedModalidade((prev) => {
      if (prev.includes(valor)) return prev.filter((v) => v !== valor)
      return [...prev, valor]
    })
  }

  const passaFiltroModalidade = (row: any[], headers: string[]): boolean => {
    if (selectedModalidade.length === 0) return true
    const modalidadeIndex = getColumnIndex(headers, "Modalidade")
    if (modalidadeIndex === -1) return true
    const valorModalidade = row[modalidadeIndex]?.toString().trim() || ""
    return selectedModalidade.includes(valorModalidade)
  }

  // Valores únicos de Origem
  const valoresOrigem = useMemo(() => {
    if (!eventosReceptivosData?.data?.values || eventosReceptivosData.data.values.length <= 1) return []
    const headers = eventosReceptivosData.data.values[0]
    const rows = eventosReceptivosData.data.values.slice(1)
    const origemIndex = getColumnIndex(headers, "Origem")
    
    if (origemIndex === -1) return []

    const valores = new Set<string>()
    rows.forEach((row: any[]) => {
      const valor = row[origemIndex]?.toString().trim() || ""
      if (valor) valores.add(valor)
    })
    return Array.from(valores).sort()
  }, [eventosReceptivosData])

  // Popular availableOrigens quando valoresOrigem mudar
  useEffect(() => {
    if (valoresOrigem.length > 0) {
      setAvailableOrigens(valoresOrigem)
    }
  }, [valoresOrigem])

  const toggleOrigem = (valor: string) => {
    setSelectedOrigens((prev) => {
      if (prev.includes(valor)) return prev.filter((v) => v !== valor)
      return [...prev, valor]
    })
  }

  const passaFiltroOrigem = (row: any[], headers: string[]): boolean => {
    if (selectedOrigens.length === 0) return true
    const origemIndex = getColumnIndex(headers, "Origem")
    if (origemIndex === -1) return true
    const valorOrigem = row[origemIndex]?.toString().trim() || ""
    return selectedOrigens.includes(valorOrigem)
  }

  // --- Processamento Principal ---

  const processedData = useMemo(() => {
    if (!eventosReceptivosData?.data?.values || eventosReceptivosData.data.values.length <= 1) {
      return {} as Record<string, number>
    }

    const headers = eventosReceptivosData.data.values[0]
    const rows = eventosReceptivosData.data.values.slice(1)

    const dateIndex = getColumnIndex(headers, "Date")
    const eventNameIndex = getColumnIndex(headers, "Event name")
    const eventCountIndex = getColumnIndex(headers, "Event count")
    let linkUrlIndex = getColumnIndex(headers, "Link URL")
    if (linkUrlIndex === -1) linkUrlIndex = getColumnIndex(headers, "Link_URL")

    if (dateIndex === -1 || eventNameIndex === -1 || eventCountIndex === -1) return {} as Record<string, number>

    // Acumuladores Globais
    const counts: Record<string, number> = {}
    
    // Acumuladores Específicos para Correção (Antigo)
    let waMeResidencialAntigo = 0
    let waMeVidaAntigo = 0
    let btnWppFundoResidencialAntigo = 0
    let btnWppFundoVidaAntigo = 0

    // Acumuladores de WhatsApp Flutuante Real (Novo)
    let btnWppFlutuanteReal = 0
    let btnWppFlutuanteVidaReal = 0

    // Inicializar contadores zerados para eventos conhecidos para garantir que existam
    const knownEvents = [
        "cta_quero_contratar_1", "cta_quero_contratar_2", 
        "querocontratar1_sou_cliente_bb", "querocontratar1_nao_sou_cliente_bb",
        "btn_saiba_mais_esquerda", "btn_saiba_mais_meio", "btn_saiba_mais_direita",
        "btn_whatsapp_fundo",
        "cta_quero_contratar_1_vida", "cta_quero_contratar_2_vida",
        "querocontratar1_sou_cliente_bb_vida", "querocontratar1_nao_sou_cliente_bb_vida",
        "btn_saiba_mais_esquerda_vida", "btn_saiba_mais_meio_vida", "btn_saiba_mais_direita_vida",
        "btn_whatsapp_fundo_vida",
        "Button_Canais_Digitais_Footer", "Button_Ouv_Footer", "Button_SAC_Footer", "preenchimento_form"
    ]
    knownEvents.forEach(e => counts[e] = 0)

    rows.forEach((row: any[]) => {
      const date = row[dateIndex] || ""
      
      if (!isDateInRange(date)) return
      if (!passaFiltroModalidade(row, headers)) return
      if (!passaFiltroOrigem(row, headers)) return

      const eventName = (row[eventNameIndex] || "").toString().trim()
      const eventCount = parseInt(row[eventCountIndex]) || 0
      
      const normalizedDate = normalizeDate(date)
      const isPeriodoAntigo = normalizedDate && normalizedDate <= DATA_CORTE

      // --- Lógica de Correção WhatsApp ---
      
      // Residencial
      if (eventName === "btn_whatsapp_fundo") {
        counts[eventName] = (counts[eventName] || 0) + eventCount
        if (isPeriodoAntigo) btnWppFundoResidencialAntigo += eventCount
      }
      else if (eventName === "btn_whatsapp_flutuante") {
        if (!isPeriodoAntigo) btnWppFlutuanteReal += eventCount
      }
      else if (eventName === "internal_link_click" && isPeriodoAntigo) {
        const url = linkUrlIndex !== -1 ? (row[linkUrlIndex] || "").toString().toLowerCase() : ""
        if (url.includes("wa.me")) {
           // Precisamos tentar inferir se é Residencial ou Vida. 
           // Como 'internal_link_click' é genérico, confiamos no filtro de Modalidade da linha se existir, 
           // ou assumimos Residencial como padrão se não houver sufixo vida/modalidade explícita.
           // Na prática, se o filtro de modalidade permitir, somamos.
           // Mas precisamos separar os baldes para a subtração correta.
           // O filtro 'passaFiltroModalidade' já filtrou a linha.
           // Verificamos se o evento original tinha sufixo ou contexto vida? 
           // O 'internal_link_click' não tem sufixo.
           // Vamos assumir que se passou no filtro e não é Vida explicitamente, é Residencial.
           // Porém, para o cálculo preciso, precisamos saber qual "bucket" encher.
           
           // Simplificação: Se o filtro de modalidade estiver ativo para APENAS Vida, vai para Vida.
           // Se estiver para APENAS Residencial, vai para Residencial.
           // Se estiver misturado, vamos tentar olhar a coluna Modalidade da linha.
           
           const modalidadeIndex = getColumnIndex(headers, "Modalidade")
           const modalidadeLinha = modalidadeIndex !== -1 ? (row[modalidadeIndex] || "").toString() : ""
           
           if (modalidadeLinha === "Vida") {
             waMeVidaAntigo += eventCount
           } else {
             // Default para Residencial ou Empresarial (que usa Residencial logic)
             waMeResidencialAntigo += eventCount
           }
        }
      }

      // Vida
      else if (eventName === "btn_whatsapp_fundo_vida") {
        counts[eventName] = (counts[eventName] || 0) + eventCount
        if (isPeriodoAntigo) btnWppFundoVidaAntigo += eventCount
      }
      else if (eventName === "btn_whatsapp_flutuante_vida") {
        if (!isPeriodoAntigo) btnWppFlutuanteVidaReal += eventCount
      }

      // --- Outros Eventos ---
      else {
        counts[eventName] = (counts[eventName] || 0) + eventCount
      }
    })

    // Calcular WhatsApp Flutuante Final
    const wppFlutuanteCalculado = Math.max(0, waMeResidencialAntigo - btnWppFundoResidencialAntigo)
    const totalWppFlutuante = wppFlutuanteCalculado + btnWppFlutuanteReal
    counts["btn_whatsapp_flutuante"] = totalWppFlutuante

    const wppFlutuanteVidaCalculado = Math.max(0, waMeVidaAntigo - btnWppFundoVidaAntigo)
    const totalWppFlutuanteVida = wppFlutuanteVidaCalculado + btnWppFlutuanteVidaReal
    counts["btn_whatsapp_flutuante_vida"] = totalWppFlutuanteVida

    return counts
  }, [eventosReceptivosData, dateRange, selectedModalidade, selectedOrigens])

  // --- Top 3 Data (Podium) ---
  const top3Data = useMemo(() => {
    if (!eventosReceptivosData?.data?.values || eventosReceptivosData.data.values.length <= 1) {
      return { residencial: [], vida: [], empresarial: [] }
    }

    const headers = eventosReceptivosData.data.values[0]
    const rows = eventosReceptivosData.data.values.slice(1)

    const dateIndex = getColumnIndex(headers, "Date")
    const eventNameIndex = getColumnIndex(headers, "Event name")
    const eventCountIndex = getColumnIndex(headers, "Event count")
    const modalidadeIndex = getColumnIndex(headers, "Modalidade")
    let linkUrlIndex = getColumnIndex(headers, "Link URL")
    if (linkUrlIndex === -1) linkUrlIndex = getColumnIndex(headers, "Link_URL")

    if (dateIndex === -1 || eventNameIndex === -1 || eventCountIndex === -1) return { residencial: [], vida: [], empresarial: [] }

    // Acumuladores por modalidade
    const countsResidencial: Record<string, number> = {}
    const countsVida: Record<string, number> = {}
    const countsEmpresarial: Record<string, number> = {}

    // Auxiliares para correção (Data Patching)
    let waMeResidencialAntigo = 0
    let waMeVidaAntigo = 0
    let btnWppFundoResidencialAntigo = 0
    let btnWppFundoVidaAntigo = 0
    
    // Acumuladores de WhatsApp Flutuante Real (Novo) para somar depois da correção
    let btnWppFlutuanteResidencialReal = 0
    let btnWppFlutuanteVidaReal = 0

    // Lista de eventos ignorados para o Top 3
    const IGNORED_EVENTS = [
      "page_view", "session_start", "first_visit", "page_load_time",
      "10% Scroll", "user_engagement", "scroll", "25% Scroll",
      "internal_link_click", "50% Scroll", "75% Scroll", "100% Scroll",
      "file_download", "form_start", "click"
    ]

    rows.forEach((row: any[]) => {
      const date = row[dateIndex] || ""
      if (!isDateInRange(date)) return
      if (!passaFiltroOrigem(row, headers)) return

      const eventName = (row[eventNameIndex] || "").toString().trim()
      const eventCount = parseInt(row[eventCountIndex]) || 0
      const modalidadeLinha = modalidadeIndex !== -1 ? (row[modalidadeIndex] || "").toString().trim() : ""
      
      const normalizedDate = normalizeDate(date)
      const isPeriodoAntigo = normalizedDate && normalizedDate <= DATA_CORTE

      // Identificar modalidade da linha
      let targetCounts = countsResidencial // Default
      let isVida = false
      let isResidencial = true // Default

      if (modalidadeLinha === "Vida") {
        targetCounts = countsVida
        isVida = true
        isResidencial = false
      } else if (modalidadeLinha === "Empresarial") {
        targetCounts = countsEmpresarial
        isResidencial = false
      } else if (modalidadeLinha === "Residencial") {
        targetCounts = countsResidencial
        isResidencial = true
      }
      
      // --- Lógica de Correção WhatsApp (Similar ao processedData mas segregada) ---
      
      if (eventName === "btn_whatsapp_fundo") {
        // Soma normal
        targetCounts[eventName] = (targetCounts[eventName] || 0) + eventCount
        
        // Auxiliar para subtração (Apenas se for Residencial e Antigo)
        if (isPeriodoAntigo && isResidencial) btnWppFundoResidencialAntigo += eventCount
      }
      else if (eventName === "btn_whatsapp_fundo_vida") {
        targetCounts[eventName] = (targetCounts[eventName] || 0) + eventCount
        if (isPeriodoAntigo && isVida) btnWppFundoVidaAntigo += eventCount
      }
      else if (eventName === "btn_whatsapp_flutuante") {
        if (!isPeriodoAntigo && isResidencial) btnWppFlutuanteResidencialReal += eventCount
        // Se for empresarial ou outro, soma direto pois não tem lógica de correção complexa definida
        if (!isResidencial && !isVida) targetCounts[eventName] = (targetCounts[eventName] || 0) + eventCount
      }
      else if (eventName === "btn_whatsapp_flutuante_vida") {
        if (!isPeriodoAntigo && isVida) btnWppFlutuanteVidaReal += eventCount
      }
      else if (eventName === "internal_link_click" && isPeriodoAntigo) {
        const url = linkUrlIndex !== -1 ? (row[linkUrlIndex] || "").toString().toLowerCase() : ""
        if (url.includes("wa.me")) {
           if (isVida) {
             waMeVidaAntigo += eventCount
           } else {
             // Assume Residencial para correção (Empresarial geralmente não entra nessa correção específica de wa.me vs fundo)
             waMeResidencialAntigo += eventCount
           }
        }
      } 
      else {
        // Filtrar eventos genéricos
        if (!IGNORED_EVENTS.includes(eventName)) {
          targetCounts[eventName] = (targetCounts[eventName] || 0) + eventCount
        }
      }
    })

    // Calcular WhatsApp Flutuante Final e Inserir nos Counts
    
    // Residencial
    const wppFlutuanteResidencialCalculado = Math.max(0, waMeResidencialAntigo - btnWppFundoResidencialAntigo)
    const totalWppFlutuanteResidencial = wppFlutuanteResidencialCalculado + btnWppFlutuanteResidencialReal
    if (totalWppFlutuanteResidencial > 0) {
        countsResidencial["btn_whatsapp_flutuante"] = totalWppFlutuanteResidencial
    }

    // Vida
    const wppFlutuanteVidaCalculado = Math.max(0, waMeVidaAntigo - btnWppFundoVidaAntigo)
    const totalWppFlutuanteVida = wppFlutuanteVidaCalculado + btnWppFlutuanteVidaReal
    if (totalWppFlutuanteVida > 0) {
        countsVida["btn_whatsapp_flutuante_vida"] = totalWppFlutuanteVida
    }

    // Helper para transformar em array e ordenar
    const getTop3 = (counts: Record<string, number>) => {
      return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
    }

    return {
      residencial: getTop3(countsResidencial),
      vida: getTop3(countsVida),
      empresarial: getTop3(countsEmpresarial)
    }
  }, [eventosReceptivosData, dateRange, selectedOrigens])

  // --- Categorização e Estruturação ---

  const categories = useMemo<CategoriaEventos[]>(() => {
    if (!processedData) return []

    const cats: CategoriaEventos[] = []

    // Helper para criar item
    const createItem = (id: string, label: string, color?: string): EventoItem => ({
      id,
      label,
      count: processedData[id] || 0,
      color
    })

    // 1. Conversão Principal
    const conversaoItems: EventoItem[] = []
    
    // Residencial - Pai
    const queroContratar1 = createItem("cta_quero_contratar_1", "Quero Contratar 1 (Residencial)")
    // Filhos
    queroContratar1.children = [
      createItem("querocontratar1_sou_cliente_bb", "Sou Cliente BB"),
      createItem("querocontratar1_nao_sou_cliente_bb", "Não Sou Cliente")
    ]
    conversaoItems.push(queroContratar1)
    conversaoItems.push(createItem("cta_quero_contratar_2", "Quero Contratar 2 (Residencial)"))

    // Vida - Pai
    const queroContratar1Vida = createItem("cta_quero_contratar_1_vida", "Quero Contratar 1 (Vida)")
    // Filhos
    queroContratar1Vida.children = [
      createItem("querocontratar1_sou_cliente_bb_vida", "Sou Cliente BB (Vida)"),
      createItem("querocontratar1_nao_sou_cliente_bb_vida", "Não Sou Cliente (Vida)")
    ]
    conversaoItems.push(queroContratar1Vida)
    conversaoItems.push(createItem("cta_quero_contratar_2_vida", "Quero Contratar 2 (Vida)"))

    // Filtrar itens com 0 se desejar, ou manter para visibilidade. Vou manter apenas > 0 no pai ou se tiver filhos > 0
    const filterValid = (items: EventoItem[]) => items.filter(i => i.count > 0 || (i.children && i.children.some(c => c.count > 0)))
    
    cats.push({
      id: "conversao",
      label: "Conversão Principal",
      icon: Trophy,
      items: filterValid(conversaoItems).sort((a, b) => b.count - a.count),
      color: "bg-green-100 text-green-800 border-green-200"
    })

    // 2. WhatsApp
    const wppItems = [
      createItem("btn_whatsapp_flutuante", "WhatsApp Flutuante"),
      createItem("btn_whatsapp_fundo", "WhatsApp Fundo"),
      createItem("btn_whatsapp_flutuante_vida", "WhatsApp Flutuante (Vida)"),
      createItem("btn_whatsapp_fundo_vida", "WhatsApp Fundo (Vida)"),
    ]
    cats.push({
      id: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      items: filterValid(wppItems).sort((a, b) => b.count - a.count),
      color: "bg-teal-100 text-teal-800 border-teal-200"
    })

    // 3. Engajamento e Navegação
    const engajamentoItems = [
      createItem("btn_saiba_mais_esquerda", "Saiba Mais (Esq)"),
      createItem("btn_saiba_mais_meio", "Saiba Mais (Meio)"),
      createItem("btn_saiba_mais_direita", "Saiba Mais (Dir)"),
      createItem("btn_saiba_mais_esquerda_vida", "Saiba Mais (Esq - Vida)"),
      createItem("btn_saiba_mais_meio_vida", "Saiba Mais (Meio - Vida)"),
      createItem("btn_saiba_mais_direita_vida", "Saiba Mais (Dir - Vida)"),
      createItem("clique_header_planos", "Header: Planos"),
      createItem("clique_header_coberturas", "Header: Coberturas"),
      createItem("clique_header_depoimentos", "Header: Depoimentos"),
      createItem("clique_header_faq", "Header: FAQ"),
      createItem("clique_header_planos_vida", "Header: Planos (Vida)"),
      createItem("clique_header_coberturas_vida", "Header: Coberturas (Vida)"),
      createItem("clique_header_depoimentos_vida", "Header: Depoimentos (Vida)"),
      createItem("clique_header_faq_vida", "Header: FAQ (Vida)"),
    ]
    cats.push({
      id: "engajamento",
      label: "Engajamento e Navegação",
      icon: MousePointer,
      items: filterValid(engajamentoItems).sort((a, b) => b.count - a.count),
      color: "bg-blue-100 text-blue-800 border-blue-200"
    })

    // 4. FAQ (Dinâmico)
    const faqKeys = Object.keys(processedData).filter(k => k.startsWith("btn_faq_"))
    const faqItems = faqKeys.map(k => createItem(k, k.replace("btn_faq_", "FAQ: ").replace(/_/g, " ")))
    cats.push({
      id: "faq",
      label: "Dúvidas (FAQ)",
      icon: HelpCircle,
      items: filterValid(faqItems).sort((a, b) => b.count - a.count),
      color: "bg-amber-100 text-amber-800 border-amber-200"
    })

    // 5. Redes Sociais (Dinâmico)
    const socialKeys = Object.keys(processedData).filter(k => k.startsWith("clique_") && !k.includes("header"))
    const socialItems = socialKeys.map(k => createItem(k, k.replace("clique_", "Social: ").replace(/_/g, " ")))
    cats.push({
      id: "social",
      label: "Redes Sociais",
      icon: Share2,
      items: filterValid(socialItems).sort((a, b) => b.count - a.count),
      color: "bg-pink-100 text-pink-800 border-pink-200"
    })

    // 6. Outros
    const outrosItems = [
      createItem("Button_Canais_Digitais_Footer", "Footer: Canais Digitais"),
      createItem("Button_Ouv_Footer", "Footer: Ouvidoria"),
      createItem("Button_SAC_Footer", "Footer: SAC"),
      createItem("preenchimento_form", "Preenchimento Formulário"),
    ]
    cats.push({
      id: "outros",
      label: "Outros / Institucional",
      icon: Layout,
      items: filterValid(outrosItems).sort((a, b) => b.count - a.count),
      color: "bg-gray-100 text-gray-800 border-gray-200"
    })

    // Retorna apenas categorias que tenham itens
    return cats.filter(c => c.items.length > 0)

  }, [processedData])

  // --- Renderização ---

  if (loading) return <Loading message="Carregando ranking de eventos..." />
  
  if (error) return (
    <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-600">
      Erro ao carregar dados: {error.message}
    </div>
  )

  return (
    <div ref={contentRef} className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <List className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ranking de Eventos</h1>
            <p className="text-xs text-gray-600">Contagem detalhada de cliques por categoria</p>
          </div>
        </div>
        <PDFDownloadButton contentRef={contentRef} fileName="ranking-eventos" />
      </div>

      {/* Filtros */}
      <div className="card-overlay rounded-lg shadow-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center">
              <Calendar className="w-3 h-3 mr-1" /> Período
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-purple-500"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-purple-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center">
              <MapPin className="w-3 h-3 mr-1" /> Modalidade
            </label>
            <div className="flex flex-wrap gap-2">
              {valoresModalidade.map((mod) => (
                <button
                  key={mod}
                  onClick={() => toggleModalidade(mod)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedModalidade.includes(mod)
                      ? "bg-purple-100 text-purple-800 border border-purple-300"
                      : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {mod}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center">
              <Filter className="w-3 h-3 mr-1" /> Origem
            </label>
            <div className="flex flex-wrap gap-2">
              {availableOrigens.map((origem) => (
                <button
                  key={origem}
                  onClick={() => toggleOrigem(origem)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedOrigens.includes(origem)
                      ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                      : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {origem}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Podium Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Residencial", data: top3Data.residencial, color: "blue", icon: <MapPin className="w-5 h-5 text-blue-600" /> },
          { title: "Vida", data: top3Data.vida, color: "green", icon: <MapPin className="w-5 h-5 text-green-600" /> },
          { title: "Empresarial", data: top3Data.empresarial, color: "orange", icon: <MapPin className="w-5 h-5 text-orange-600" /> }
        ].map((podium) => (
          <div key={podium.title} className={`card-overlay rounded-lg shadow-lg border-t-4 border-${podium.color}-500 overflow-hidden`}>
            <div className="p-4 bg-gradient-to-br from-gray-50 to-white">
              <div className="flex items-center space-x-2 mb-4">
                {podium.icon}
                <h3 className="font-bold text-gray-800 uppercase tracking-wide text-sm">{podium.title}</h3>
              </div>
              
              <div className="space-y-3">
                {podium.data.length > 0 ? (
                  podium.data.map((item, index) => {
                    const isFirst = index === 0
                    const Icon = index === 0 ? Trophy : index === 1 ? Medal : Award
                    const iconColor = index === 0 ? "text-yellow-500" : index === 1 ? "text-gray-400" : "text-amber-700"
                    
                    // Formatação simples do nome
                    const formattedName = item.name
                      .replace(/_/g, " ")
                      .replace(/cta /gi, "")
                      .replace(/btn /gi, "")
                      .replace(/vida/gi, "") // Remove redundância no card de Vida
                      .replace(/flutuante/gi, "Flut.") // Abreviação
                      
                    return (
                      <div key={index} className={`flex items-center justify-between p-2 rounded-lg ${isFirst ? `bg-${podium.color}-50 border border-${podium.color}-100` : "hover:bg-gray-50"}`}>
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${isFirst ? "bg-white shadow-sm" : ""}`}>
                            <Icon className={`w-5 h-5 ${iconColor}`} />
                          </div>
                          <div className="min-w-0">
                            <p className={`text-xs font-medium truncate ${isFirst ? `text-${podium.color}-900 font-bold` : "text-gray-700"}`} title={item.name}>
                              {formattedName}
                            </p>
                            {isFirst && <p className="text-[10px] text-gray-500 uppercase font-semibold">Líder</p>}
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${isFirst ? `text-${podium.color}-700` : "text-gray-600"}`}>
                          {item.count.toLocaleString("pt-BR")}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    Sem dados para o período
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Grid de Categorias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {categories.map((category) => (
          <div key={category.id} className="card-overlay rounded-lg shadow-lg flex flex-col h-full overflow-hidden">
            {/* Cabeçalho do Card */}
            <div className={`p-4 border-b ${category.color} flex items-center space-x-2`}>
              <category.icon className="w-5 h-5 opacity-75" />
              <h3 className="font-bold">{category.label}</h3>
            </div>
            
            {/* Lista de Itens */}
            <div className="p-4 space-y-4 flex-1">
              {category.items.map((item, idx) => {
                // Calcula percentual relativo ao maior item da categoria para a barra de progresso
                const maxCount = category.items[0].count || 1
                const percent = (item.count / maxCount) * 100

                return (
                  <div key={item.id} className="space-y-2">
                    {/* Item Principal */}
                    <div className="relative">
                      <div className="flex justify-between items-end mb-1 z-10 relative">
                        <span className="text-sm font-medium text-gray-700 truncate mr-2" title={item.label}>
                          {item.label}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {item.count.toLocaleString("pt-BR")}
                        </span>
                      </div>
                      {/* Barra de Progresso */}
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full opacity-80"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Sub-itens (Filhos) */}
                    {item.children && item.children.length > 0 && (
                      <div className="ml-4 pl-3 border-l-2 border-gray-200 space-y-3 mt-2">
                        {item.children.map(child => {
                          // Percentual do filho em relação ao pai
                          const childPercent = item.count > 0 ? (child.count / item.count) * 100 : 0
                          
                          return (
                            <div key={child.id} className="relative">
                              <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center text-gray-500">
                                  <CornerDownRight className="w-3 h-3 mr-1" />
                                  <span className="text-xs truncate max-w-[150px]" title={child.label}>{child.label}</span>
                                </div>
                                <span className="text-xs font-semibold text-gray-600">
                                  {child.count.toLocaleString("pt-BR")}
                                </span>
                              </div>
                              <div className="w-full bg-gray-50 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="h-full bg-gray-400 rounded-full"
                                  style={{ width: `${childPercent}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RankingEventos

