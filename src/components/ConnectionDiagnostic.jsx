import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ConnectionDiagnostic() {
  const [checks, setChecks] = useState({
    supabaseConfig: false,
    internetConnection: false,
    supabaseConnection: false,
    checking: true
  })

  useEffect(() => {
    runDiagnostics()
  }, [])

  const runDiagnostics = async () => {
    setChecks({ ...checks, checking: true })

    // Verificar configuración de Supabase
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const supabaseConfig = !!(supabaseUrl && supabaseKey)

    // Verificar conexión a internet
    let internetConnection = false
    try {
      const response = await fetch('https://www.google.com/favicon.ico', { 
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      })
      internetConnection = true
    } catch (error) {
      internetConnection = false
    }

    // Verificar conexión a Supabase
    let supabaseConnection = false
    if (supabase && supabaseConfig) {
      try {
        const { error } = await supabase.from('pets').select('id').limit(1)
        supabaseConnection = !error || error.code !== 'PGRST301'
      } catch (error) {
        supabaseConnection = false
      }
    }

    setChecks({
      supabaseConfig,
      internetConnection,
      supabaseConnection,
      checking: false
    })
  }

  if (checks.checking) {
    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border-2 border-yellow-300 max-w-md z-50">
        <div className="flex items-center space-x-2">
          <RefreshCw className="animate-spin text-yellow-600" size={20} />
          <span className="text-sm font-medium">Verificando conexión...</span>
        </div>
      </div>
    )
  }

  const allGood = checks.supabaseConfig && checks.internetConnection && checks.supabaseConnection

  if (allGood) {
    return null // No mostrar nada si todo está bien
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border-2 border-red-300 max-w-md z-50">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <h3 className="font-semibold text-red-800 mb-2">Problemas de Conexión Detectados</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              {checks.supabaseConfig ? (
                <CheckCircle className="text-green-600" size={16} />
              ) : (
                <XCircle className="text-red-600" size={16} />
              )}
              <span className={checks.supabaseConfig ? 'text-gray-700' : 'text-red-700'}>
                Configuración de Supabase
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {checks.internetConnection ? (
                <CheckCircle className="text-green-600" size={16} />
              ) : (
                <XCircle className="text-red-600" size={16} />
              )}
              <span className={checks.internetConnection ? 'text-gray-700' : 'text-red-700'}>
                Conexión a Internet
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {checks.supabaseConnection ? (
                <CheckCircle className="text-green-600" size={16} />
              ) : (
                <XCircle className="text-red-600" size={16} />
              )}
              <span className={checks.supabaseConnection ? 'text-gray-700' : 'text-red-700'}>
                Conexión a Supabase
              </span>
            </div>
          </div>

          {!checks.supabaseConfig && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <p className="font-semibold mb-1">Solución:</p>
              <p>Verifica que el archivo <code className="bg-gray-100 px-1 rounded">.env</code> tenga:</p>
              <code className="block bg-gray-100 p-1 rounded mt-1">
                VITE_SUPABASE_URL=...<br/>
                VITE_SUPABASE_ANON_KEY=...
              </code>
              <p className="mt-1">Luego reinicia el servidor: <code className="bg-gray-100 px-1 rounded">npm run dev</code></p>
            </div>
          )}

          {!checks.internetConnection && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <p className="font-semibold mb-1">Solución:</p>
              <p>Verifica tu conexión a internet y tu configuración de red/firewall.</p>
            </div>
          )}

          <button
            onClick={runDiagnostics}
            className="mt-3 w-full px-3 py-1.5 bg-primary-600 text-white rounded text-sm hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2"
          >
            <RefreshCw size={14} />
            <span>Reintentar</span>
          </button>
        </div>
      </div>
    </div>
  )
}
