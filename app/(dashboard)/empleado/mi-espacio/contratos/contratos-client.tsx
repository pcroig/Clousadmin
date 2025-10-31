'use client';

export function MiEspacioContratosClient({ empleado }: any) {
  const contratoActual = empleado.contratos?.[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Contratos</h1>
        <p className="text-sm text-gray-500 mt-1">Información sobre tu contrato actual e histórico</p>
      </div>

      {contratoActual && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Contrato Actual</h3>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Descargar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Contrato</label>
              <p className="text-sm text-gray-900">{contratoActual.tipoContrato || 'Indefinido'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
              <p className="text-sm text-gray-900">
                {new Date(contratoActual.fechaInicio).toLocaleDateString('es-ES')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Puesto</label>
              <p className="text-sm text-gray-900">{empleado.puesto}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salario Bruto Anual</label>
              <p className="text-sm text-gray-900">
                {Number(contratoActual.salarioBrutoAnual).toLocaleString('es-ES')} €
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Histórico de contratos */}
      {empleado.contratos && empleado.contratos.length > 1 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico</h3>
          <div className="space-y-3">
            {empleado.contratos.slice(1).map((contrato: any) => (
              <div key={contrato.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{contrato.tipoContrato}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(contrato.fechaInicio).toLocaleDateString('es-ES')}
                    {contrato.fechaFin && ` - ${new Date(contrato.fechaFin).toLocaleDateString('es-ES')}`}
                  </p>
                </div>
                <button className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50">
                  Descargar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
