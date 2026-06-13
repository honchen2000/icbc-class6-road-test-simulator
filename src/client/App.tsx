import { NavLink, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Exam from './pages/Exam';
import SignalDrill from './pages/SignalDrill';
import Analytics from './pages/Analytics';
import Results from './pages/Results';

export default function App() {
  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="appbar">
        <div className="appbar-inner">
          <NavLink to="/" className="brand">
            <span className="dot" />
            ICBC Class 6 Simulator
          </NavLink>
          <nav className="nav">
            <NavLink to="/" end>
              Practice
            </NavLink>
            <NavLink to="/drill/signal">Signal Drill</NavLink>
            <NavLink to="/analytics">Analytics</NavLink>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="container" style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/exam/:scenarioId" element={<Exam />} />
          <Route path="/drill/signal" element={<SignalDrill />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/results/:sessionId" element={<Results />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      <footer className="container faint center" style={{ paddingTop: 8, paddingBottom: 24 }}>
        <small>
          Procedural practice tool — not affiliated with ICBC. Practice on a real motorcycle before
          your test.
        </small>
      </footer>
    </div>
  );
}
