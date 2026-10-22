import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import Home from './pages/Home'
import Learn from './pages/Learn'
import Station from './pages/Station'
import MassBalance from './pages/MassBalance'
import OilLosses from './pages/OilLosses'
import Quality from './pages/Quality'
import Environment from './pages/Environment'
import Glossary from './pages/Glossary'
import Calculators from './pages/Calculators'
import CalculatorPage from './pages/CalculatorPage'
import Reference from './pages/Reference'
import Converter from './pages/Converter'
import ProjectPage from './pages/ProjectPage'
import Summary from './pages/Summary'
import About from './pages/About'
import HistoryPage from './pages/HistoryPage'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="learn" element={<Learn />} />
        <Route path="learn/station/:id" element={<Station />} />
        <Route path="learn/mass-balance" element={<MassBalance />} />
        <Route path="learn/oil-losses" element={<OilLosses />} />
        <Route path="learn/quality" element={<Quality />} />
        <Route path="learn/environment" element={<Environment />} />
        <Route path="learn/glossary" element={<Glossary />} />
        <Route path="calc" element={<Calculators />} />
        <Route path="calc/:id" element={<CalculatorPage />} />
        <Route path="reference" element={<Reference />} />
        <Route path="convert" element={<Converter />} />
        <Route path="project" element={<ProjectPage />} />
        <Route path="project/summary" element={<Summary />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
