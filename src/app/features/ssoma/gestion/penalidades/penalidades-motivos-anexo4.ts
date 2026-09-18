/**
 * Viñetas literales del "ANEXO 4 - OBLIGACIONES EN SEGURIDAD, SALUD EN EL TRABAJO Y MEDIO
 * AMBIENTE" (cláusula 10 del contrato), agrupadas por categoría de infracción. Es texto
 * contractual fijo -- no un catálogo editable en BD -- por eso vive como constante de código,
 * igual que las categorías/porcentajes ya sembrados en ssoma_rac_infraccion.
 */
export const MOTIVOS_ANEXO4: Record<string, string[]> = {
  Falta: [
    'Inicio de trabajos sin haber cumplido con la campaña de limpieza previa (antes de la liberación del área por SSOMA)',
    'No utilizar doble protección auditiva (tapones y orejeras) cuando se está expuesto a ruido (primer incidente)',
    'Falta de un botiquín de primeros auxilios completo en las oficinas o vestuarios',
    'No contar con un cronograma de limpieza actualizado para vestuarios y almacenes',
    'Ausencia del panel informativo de la empresa en la oficina o vestuario',
    'Oficinas o vestuarios sin señalización adecuada o en condiciones desordenadas',
    'Consumo de alimentos en los departamentos de la obra durante el horario de almuerzo',
    'Personal utilizando el celular para actividades no laborales durante sus tareas (primer incidente)',
    'Uso de herramientas no autorizadas o modificadas (hechizas)',
    'Tardanza injustificada o inasistencia de los supervisores de contratistas a la charla de seguridad (primer incidente)',
    'Falta de uso del equipo de protección básico (primer incidente)',
    'Retiro no autorizado de señalización en la obra (primer incidente)',
    'No realizar las charlas grupales a su personal (primer incidente)',
    'Retiro no autorizado de protecciones colectivas (primer incidente)',
    'Ingreso a áreas restringidas sin la debida autorización (primer incidente)',
    'Iniciar actividades sin la firma de los ATS u otras herramientas de gestión (primer incidente)',
    'Otras que no conlleven posibles multas por parte de las entidades fiscalizadoras',
  ],
  Menor: [
    'Usar equipo de protección personal en mal estado',
    'Uso de herramientas hechizas o en condiciones subestándar',
    'No presentar a tiempo los reportes o documentación solicitada por el coordinador de SST y medio ambiente',
    'No estar presente en la charla de seguridad que se realiza previo al inicio de la jornada',
    'Otras',
  ],
  Moderada: [
    'Reincidencia en una infracción menor en dos semanas',
    'No cumplir con los procedimientos de trabajo seguro entregado al ingreso de obra',
    'No presentar a tiempo el SCTR y vouchers de pago de los trabajadores, emitido por el bróker de seguro',
    'Realizar trabajos sin la documentación o permiso de trabajo',
    'Otras',
  ],
  Grave: [
    'Reincidencia en una infracción moderada en tres semanas',
    'Trabajador realizando labores sin haber recibido el entrenamiento estipulado por la obra',
    'No usar equipo de protección personal',
    'No cumplir con las normas del Plan de Seguridad y Salud en el Trabajo de Obras que resulten o podrían resultar en un accidente',
    'Riñas dentro de la misma empresa',
    'Trabajar en obra bajo efectos de alcohol o drogas no medicadas',
    'Realizar trabajos en altura sin cumplir los requisitos o elementos de seguridad',
    'Mantener deudas al personal concesionario de alimentos de la obra',
    'Robo o intento de robo',
    'Otras',
  ],
  MuyGrave: [
    'Adulteración o falsificación de documentos',
    'Agresión física o verbal a un miembro del staff, otras contratistas, personal de serenazgo, policía u otros',
    'Ocultar o intentar ocultar accidentes',
    'Otras',
  ],
};
