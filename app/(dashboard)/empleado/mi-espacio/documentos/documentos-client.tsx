'use client';

import { useState } from 'react';

export function MiEspacioDocumentosClient({ empleado }: any) {
  const [activeTab, setActiveTab] = useState<'personales' | 'compartidos'>('personales');

  const carpetasPersonales = empleado.carpetas?.filter((c: any) => !c.compartida) || [];
  const carpetasCompartidas = empleado.carpetas?.filter((c: any) => c.compartida) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Documentos</h1>
        <p className="text-sm text-gray-500 mt-1">Accede a tus documentos personales y compartidos</p>
      </div>

      {/* Toggle Personales/Compartidos */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setActiveTab('personales')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'personales'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Personales
          </button>
          <button
            onClick={() => setActiveTab('compartidos')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'compartidos'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Compartidos
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        {activeTab === 'personales'
          ? 'Tus documentos personales y archivos'
          : 'Documentos compartidos por tu empresa'}
      </p>

      {/* Grid de carpetas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {activeTab === 'personales' ? (
          carpetasPersonales.length > 0 ? (
            carpetasPersonales.map((carpeta: any) => (
              <div key={carpeta.id} className="flex flex-col items-center cursor-pointer group">
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-2 group-hover:bg-gray-200 transition-colors">
                  <svg className="w-12 h-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 text-center">{carpeta.nombre}</p>
                {carpeta.documentos.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {carpeta.documentos.length} documento{carpeta.documentos.length !== 1 ? 's' : ''}
                  </p>
                )}
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
            <div key={carpeta.id} className="flex flex-col items-center cursor-pointer group">
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-2 group-hover:bg-gray-200 transition-colors">
                <svg className="w-12 h-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900 text-center">{carpeta.nombre}</p>
              {carpeta.documentos.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {carpeta.documentos.length} documento{carpeta.documentos.length !== 1 ? 's' : ''}
                </p>
              )}
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
