export interface Festivo {
  id: string;
  fecha: string;
  nombre: string;
  tipo: string;
  activo: boolean;
}

export interface FestivoEditorState {
  mode: 'crear' | 'editar';
  fecha?: string;
  festivo?: Festivo;
}


