import { ProjectContractDTO } from '../dtos/contrato.dtos';

/**
 * Recalcula en memoria los campos derivados de los hitos, con la misma regla que el backend
 * (ProjectContractRepository.ComputeMilestoneFields): monto = % × monto del contrato, y el hito de
 * garantía es siempre el último por `order`.
 *
 * Existe para respetar "1 acción = 1 HTTP": agregar/eliminar un hito o editar el monto del
 * contrato NO recargan el detalle con otro GET — se actualiza el objeto local con la respuesta de
 * la mutación y se recalcula acá. (El POST de hitos devuelve el hito nuevo con
 * esHitoDeGarantia=false siempre, porque el backend no recalcula a los demás; por eso tampoco
 * alcanza con insertarlo tal cual.)
 */
export function recalcularHitos(contrato: ProjectContractDTO): void {
  contrato.milestones.sort((a, b) => a.order - b.order);
  const ultimo = contrato.milestones.length - 1;
  contrato.milestones.forEach((m, i) => {
    m.amount = Math.round((m.percentage / 100) * contrato.amount * 100) / 100;
    m.esHitoDeGarantia = i === ultimo;
  });
}

export function sumaPorcentajes(contrato: ProjectContractDTO): number {
  // Redondeo a 2 decimales para que 33.33 + 33.33 + 33.34 no dé 99.99999999.
  return Math.round(contrato.milestones.reduce((acc, m) => acc + Number(m.percentage), 0) * 100) / 100;
}
