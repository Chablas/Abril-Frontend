import { ProjectSimpleDTO } from "../../../../core/dtos/project/projectSimple.model";
import { CompanySimpleDTO } from "./companySimple.model";
import { ContractOriginSimpleDTO } from "./contractOriginSimple.model";
import { ContractSimpleDTO } from "./contractSimple.model";
import { ContractTypeSimpleDTO } from "./contractTypeSimple.model";
import { CurrencySimpleDTO } from "./currencySimple.model";
import { PaymentMethodSimpleDTO } from "./paymentMethodSimple.model";
import { WorkItemSimpleDTO } from "./workItemSimple.model";

export interface ProjectSubContractorFormDataDTO {
    projects: ProjectSimpleDTO[];
    contracts: ContractSimpleDTO[];
    contractTypes: ContractTypeSimpleDTO[];
    contractOrigins: ContractOriginSimpleDTO[];
    paymentMethods: PaymentMethodSimpleDTO[];
    currencies: CurrencySimpleDTO[];
    workItems: WorkItemSimpleDTO[];
    companies: CompanySimpleDTO[];
}