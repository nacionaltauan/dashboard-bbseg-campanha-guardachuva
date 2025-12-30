"use client"

import type React from "react"
import { useState } from "react"
import { X, Play, Pause, Volume2, VolumeX } from "lucide-react"

export interface PinterestCreativeData {
  date: string
  campaignName: string
  adGroupName: string
  adName: string
  modalidade: string
  videoThumbnailUrl: string
  impressions: number
  clicks: number
  cost: number
  cpc: number
  cpm: number
  reach: number
  frequency: number
  results: number
  videoViews: number
  videoViews100: number
  mediaUrl?: string
  // Campos opcionais que podem não vir na nova aba mas mantemos compatibilidade
  twoSecondVideoViews?: number
  videoViews25?: number
  videoViews50?: number
  videoViews75?: number
  paidLikes?: number
  paidComments?: number
  paidShares?: number
  paidFollows?: number
  profileVisits?: number
  adText?: string
}

interface PinterestCreativeModalProps {
  creative: PinterestCreativeData | null
  isOpen: boolean
  onClose: () => void
}

const PinterestCreativeModal: React.FC<PinterestCreativeModalProps> = ({ creative, isOpen, onClose }) => {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)

  if (!isOpen || !creative) return null

  const formatNumber = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toLocaleString("pt-BR")
  }

  const formatCurrency = (value: number): string => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const ctr = creative.impressions > 0 ? (creative.clicks / creative.impressions) * 100 : 0
  const vtr = creative.impressions > 0 ? (creative.videoViews100 / creative.impressions) * 100 : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header do Modal */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{creative.adName}</h2>
            <p className="text-sm text-gray-600">{creative.campaignName}</p>
            <div className="flex items-center mt-2 space-x-4">
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">PINTEREST</span>
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">VÍDEO</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Área do Criativo */}
            <div className="space-y-4">
              <div
                className="relative bg-gray-100 rounded-lg overflow-hidden"
                style={{ aspectRatio: "9/16", maxHeight: "500px" }}
              >
                {creative.mediaUrl || creative.videoThumbnailUrl ? (
                  <div className="relative w-full h-full">
                    {creative.mediaUrl ? (
                      <iframe
                        src={creative.mediaUrl}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="autoplay; encrypted-media"
                        sandbox="allow-scripts allow-same-origin allow-presentation"
                        onError={(e) => {
                          const target = e.target as HTMLIFrameElement
                          if (target.parentElement) {
                            target.parentElement.innerHTML = `
                              <div class="flex items-center justify-center h-full">
                                <div class="text-center text-gray-400">
                                  <div class="text-lg mb-2">Mídia não disponível</div>
                                  <div class="text-sm">${creative.adName}</div>
                                </div>
                              </div>
                            `
                          }
                        }}
                      />
                    ) : (
                      <img
                        src={creative.videoThumbnailUrl}
                        alt={creative.adName}
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Controles de vídeo */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black bg-opacity-50 rounded-lg p-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                          className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors"
                        >
                          {isVideoPlaying ? (
                            <Pause className="w-4 h-4 text-white" />
                          ) : (
                            <Play className="w-4 h-4 text-white" />
                          )}
                        </button>
                        <button
                          onClick={() => setIsMuted(!isMuted)}
                          className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors"
                        >
                          {isMuted ? (
                            <VolumeX className="w-4 h-4 text-white" />
                          ) : (
                            <Volume2 className="w-4 h-4 text-white" />
                          )}
                        </button>
                      </div>
                      <div className="text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                        Pinterest Video
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-400">
                      <div className="text-lg mb-2">Sem mídia disponível</div>
                      <div className="text-sm">{creative.adName}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Informações do Criativo */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Informações do Anúncio</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nome do Anúncio:</span>
                    <span className="text-gray-900 text-right max-w-[200px] truncate">{creative.adName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Grupo de Anúncios:</span>
                    <span className="text-gray-900 text-right max-w-[200px] truncate">{creative.adGroupName}</span>
                  </div>
                  {creative.adText && (
                    <div className="mt-3">
                      <span className="text-gray-600 block mb-1">Texto do Anúncio:</span>
                      <div className="text-gray-900 text-sm bg-white p-3 rounded border">
                        {creative.adText}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Métricas de Performance */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Performance</h3>

              {/* Métricas Principais */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(creative.cost)}</div>
                  <div className="text-sm text-gray-600">Investimento</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{formatNumber(creative.impressions)}</div>
                  <div className="text-sm text-gray-600">Impressões</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{formatNumber(creative.clicks)}</div>
                  <div className="text-sm text-gray-600">Cliques</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{ctr.toFixed(2)}%</div>
                  <div className="text-sm text-gray-600">CTR</div>
                </div>
              </div>

              {/* Métricas Detalhadas */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Métricas Detalhadas</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Alcance:</span>
                    <span className="font-semibold">{formatNumber(creative.reach)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Frequência:</span>
                    <span className="font-semibold">{creative.frequency.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Resultados:</span>
                    <span className="font-semibold">{formatNumber(creative.results)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CPM:</span>
                    <span className="font-semibold">{formatCurrency(creative.cpm)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CPC:</span>
                    <span className="font-semibold">{formatCurrency(creative.cpc)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Views 100% (Completos):</span>
                    <span className="font-semibold">{formatNumber(creative.videoViews100)}</span>
                  </div>
                  <div className="flex justify-between">
                     <span className="text-gray-600">VTR:</span>
                     <span className="font-semibold">{vtr.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer do Modal */}
        <div className="border-t p-4 bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Última atualização: {new Date().toLocaleString("pt-BR")}</div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PinterestCreativeModal

