import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { AuthProvider } from "./contexts/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute"
import Layout from "./components/Layout/Layout"
import Capa from "./pages/Capa/Capa"
// import EstrategiaDocumentacao from "./pages/EstrategiaDocumentacao/EstrategiaDocumentacao" // Removido conforme solicitação
import LinhaTempo from "./pages/LinhaTempo/LinhaTempo"
import EstrategiaOnline from "./pages/EstrategiaOnline/EstrategiaOnline"
import VisaoGeral from "./pages/VisaoGeral/VisaoGeral"
import Alcance from "./pages/Alcance/Alcance"
import Visualizacoes from "./pages/Visualizacoes/Visualizacoes"
import CriativosTikTok from "./pages/CriativosTikTok/CriativosTikTok"
import CriativosMeta from "./pages/CriativosMetaAds/CriativosMetaAds"
import MetaAnuncioCorrigido from "./pages/MetaAnuncioCorrigido/MetaAnuncioCorrigido"
import CriativosPinterest from "./pages/CriativosPinterest/CriativosPinterest"
import GoogleSearch from "./pages/GoogleSearch/GoogleSearch"
import Glossario from "./pages/Glossario/Glossario" // Nova importação para Glossario
import "./App.css"
import TrafegoEngajamento from "./pages/TrafegoEngajamento/TrafegoEngajamento"
import RankingEventos from "./pages/RankingEventos/RankingEventos"

// Substitua pelo seu Google Client ID
const GOOGLE_CLIENT_ID = "815966239613-rmc18h1asv405hk42qetehm5aten52qi.apps.googleusercontent.com"

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router>
          <ProtectedRoute>
            <Layout>
              <Routes>
                {/* Redirecionar para Capa ao invés de Dashboard */}
                <Route path="/" element={<Navigate to="/capa" replace />} />
                <Route path="/capa" element={<Capa />} />
                {/* <Route path="/estrategia-documentacao" element={<EstrategiaDocumentacao />} /> */}{" "}
                {/* Removido conforme solicitação */}
                <Route path="/linha-tempo" element={<LinhaTempo />} />
                <Route path="/estrategia-online" element={<EstrategiaOnline />} />
                <Route path="/visao-geral" element={<VisaoGeral />} />
                <Route path="/alcance" element={<Alcance />} />
                <Route path="/visualizacoes" element={<Visualizacoes />} />
                <Route path="/trafego-engajamento" element={<TrafegoEngajamento />} />
                <Route path="/ranking-eventos" element={<RankingEventos />} />
                <Route path="/criativos-meta" element={<CriativosMeta />} />
                <Route path="/meta-anuncio-corrigido" element={<MetaAnuncioCorrigido />} />
                <Route path="/criativos-tiktok" element={<CriativosTikTok />} />
                <Route path="/google-search" element={<GoogleSearch />} />
                <Route path="/criativos-pinterest" element={<CriativosPinterest />} />
                <Route path="/glossario" element={<Glossario />} /> {/* Nova rota para Glossario */}
              </Routes>
            </Layout>
          </ProtectedRoute>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}

export default App
