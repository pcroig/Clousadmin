'use client';

import { useState } from 'react';

export function DocumentosTab({ empleado }: any) {
  const [activeDocTab, setActiveDocTab] = useState<'personales' | 'compartidos'>('personales');

  const carpetasPersonales = empleado.carpetas?.filter((c: any) => !c.compartida) || [];
  const carpetasCompartidas = empleado.carpetas?.filter((c: any) => c.compartida) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Mis Documentos</h2>
        <p className="text-sm text-gray-500 mt-1">Accede a tus documentos personales y compartidos</p>
      </div>

      {/* Toggle Personales/Compartidos */}
      <div className="inline-flex rounded-lg border border-gray-200 p-1">
        <button
          onClick={() => setActiveDocTab('personales')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeDocTab === 'personales'
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Personales
        </button>
        <button
          onClick={() => setActiveDocTab('compartidos')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeDocTab === 'compartidos'
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Compartidos
        </button>
      </div>

      {/* Grid de carpetas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {activeDocTab === 'personales' ? (
          carpetasPersonales.length > 0 ? (
            carpetasPersonales.map((carpeta: any) => (
              <div key={carpeta.id} className="cursor-pointer group">
                <div className="bg-gray-50/50 rounded-3xl p-6 group-hover:bg-gray-100/50 transition-all duration-200 border border-gray-200">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-300 transition-all duration-200 shadow-sm">
                      <svg className="w-14 h-14 text-gray-600 group-hover:text-gray-700 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div className="text-center w-full">
                      <p className="text-sm font-semibold text-gray-900 mb-1">{carpeta.nombre}</p>
                      {carpeta.documentos.length > 0 && (
                        <p className="text-xs text-gray-500">
                          {carpeta.documentos.length} doc{carpeta.documentos.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 bg-white rounded-lg border border-gray-200">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <p className="text-sm text-gray-500">No hay carpetas personales</p>
            </div>
          )
        ) : carpetasCompartidas.length > 0 ? (
          carpetasCompartidas.map((carpeta: any) => (
            <div key={carpeta.id} className="cursor-pointer group">
              <div className="bg-gray-50/50 rounded-3xl p-6 group-hover:bg-gray-100/50 transition-all duration-200 border border-gray-200">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-300 transition-all duration-200 shadow-sm">
                    <svg className="w-14 h-14 text-gray-600 group-hover:text-gray-700 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div className="text-center w-full">
                    <p className="text-sm font-semibold text-gray-900 mb-1">{carpeta.nombre}</p>
                    {carpeta.documentos.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {carpeta.documentos.length} doc{carpeta.documentos.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 bg-white rounded-lg border border-gray-200">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-sm text-gray-500">No hay documentos compartidos</p>
          </div>
        )}
      </div>
    </div>
  );
}
