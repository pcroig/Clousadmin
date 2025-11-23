export const metadata = {
  title: "Clousadmin - Sin conexión",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF9F5] px-6 text-center text-gray-800">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Sin conexión</h1>
        <p className="text-sm text-gray-600">
          Parece que no tienes conexión a internet. Guarda tus cambios si es posible
          y vuelve a intentarlo cuando recuperes la conexión.
        </p>
        <p className="text-xs text-gray-500">
          Esta versión offline te permite seguir revisando la información ya
          descargada. Las acciones se sincronizarán cuando vuelvas a estar online.
        </p>
      </div>
    </div>
  );
}



