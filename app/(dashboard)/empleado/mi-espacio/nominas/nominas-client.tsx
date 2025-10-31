'use client';

interface Nomina {
  id: number;
  mes: string;
  año: number;
  importe: number;
  fecha: string;
}

interface MiEspacioNominasClientProps {
  nominas: Nomina[];
}

export function MiEspacioNominasClient({ nominas }: MiEspacioNominasClientProps) {
  const handleDescargar = (nominaId: number) => {
    // Aquí iría la lógica de descarga
    console.log('Descargando nómina:', nominaId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Nóminas</h1>
        <p className="text-sm text-gray-500 mt-1">Descarga tus nóminas mensuales</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-900">Período</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-900">Fecha</th>
                <th className="text-right py-3 px-6 text-sm font-semibold text-gray-900">Importe Neto</th>
                <th className="text-center py-3 px-6 text-sm font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {nominas.map((nomina) => (
                <tr key={nomina.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6">
                    <p className="text-sm font-medium text-gray-900">{nomina.mes} {nomina.año}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm text-gray-500">
                      {new Date(nomina.fecha).toLocaleDateString('es-ES')}
                    </p>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {nomina.importe.toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </p>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button
                      onClick={() => handleDescargar(nomina.id)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Descargar PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {nominas.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-gray-500">No hay nóminas disponibles</p>
        </div>
      )}
    </div>
  );
}
